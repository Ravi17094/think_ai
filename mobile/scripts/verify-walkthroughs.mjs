/**
 * Validates the recorded walkthrough videos by decoding them in Chromium.
 *
 * A file size alone does not prove a walkthrough is watchable: a truncated or
 * zero-length WebM still has bytes on disk. This opens each file as a video
 * element and reports the decoded duration, dimensions and frame count, which
 * only resolve if the container and the media stream are both intact.
 *
 * Usage:
 *   node scripts/verify-walkthroughs.mjs
 */
import { chromium } from 'playwright';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve(process.cwd(), 'demo-artifacts', 'walkthroughs');

/** EBML header magic every Matroska/WebM file starts with. */
const EBML_MAGIC = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);

async function main() {
  const entries = (await readdir(OUT)).filter((name) => name.endsWith('.webm')).sort();
  if (entries.length === 0) throw new Error(`no .webm files in ${OUT}`);

  const browser = await chromium.launch({
    channel: 'chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage();
  const results = [];

  for (const name of entries) {
    const file = path.join(OUT, name);
    const buffer = await readFile(file);
    const { size } = await stat(file);

    const magicOk = buffer.subarray(0, 4).equals(EBML_MAGIC);

    const meta = await page.evaluate(async (dataUrl) => {
      const video = document.createElement('video');
      video.muted = true;
      video.src = dataUrl;
      try {
        await new Promise((resolve, reject) => {
          video.onloadedmetadata = resolve;
          video.onerror = () => reject(new Error('decode failed'));
          setTimeout(() => reject(new Error('metadata timeout')), 15000);
        });
        // Seeking forces the demuxer to walk the whole cluster chain, which is
        // what actually proves the stream is complete and not just a header.
        const duration = Number.isFinite(video.duration) ? video.duration : null;
        if (duration && duration > 0) {
          await new Promise((resolve) => {
            video.onseeked = resolve;
            video.onerror = resolve;
            video.currentTime = Math.max(0, duration - 0.25);
            setTimeout(resolve, 8000);
          });
        }
        // Samples frames across the clip and counts distinct pixels. A video of
        // the right length that never redraws is a frozen frame, which is the
        // failure mode a duration check alone would miss.
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 128;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const samples = [];
        const steps = 8;
        for (let i = 0; i < steps; i += 1) {
          const t = duration ? (duration * (i + 0.5)) / steps : 0;
          await new Promise((resolve) => {
            video.onseeked = resolve;
            video.onerror = resolve;
            video.currentTime = Math.min(t, Math.max(0, duration - 0.05));
            setTimeout(resolve, 8000);
          });
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let hash = 0;
          for (let p = 0; p < data.length; p += 4) {
            hash = (hash * 31 + data[p] + data[p + 1] * 3 + data[p + 2] * 7) >>> 0;
          }
          samples.push(hash);
        }
        const distinctFrames = new Set(samples).size;

        return {
          durationSeconds: duration,
          width: video.videoWidth,
          height: video.videoHeight,
          readyState: video.readyState,
          seekable: duration ? Number(video.seekable.length.toFixed(2)) : null,
          sampledFrames: samples.length,
          distinctFrames,
        };
      } catch (err) {
        return { error: String(err.message || err) };
      }
    }, `data:video/webm;base64,${buffer.toString('base64')}`);

    const result = {
      file: `demo-artifacts/walkthroughs/${name}`,
      bytes: size,
      ebmlHeaderOk: magicOk,
      ...meta,
    };
    // 8 samples that resolve to fewer than 3 distinct hashes means the clip is
    // essentially static — a failed recording, not a walkthrough.
    result.playable =
      magicOk &&
      !meta.error &&
      meta.durationSeconds !== null &&
      meta.durationSeconds > 1 &&
      meta.width === 390 &&
      meta.height === 844 &&
      meta.distinctFrames >= 3;

    results.push(result);
    console.log(
      `${result.playable ? 'PASS' : 'FAIL'}  ${name} — ` +
        (meta.error
          ? meta.error
          : `${meta.durationSeconds?.toFixed(1)}s, ${meta.width}x${meta.height}, ${meta.distinctFrames}/${meta.sampledFrames} distinct frames, ${Math.round(size / 1024)} KB`)
    );
  }

  await browser.close();

  const report = {
    checkedAt: new Date().toISOString(),
    recordings: results,
    summary: {
      total: results.length,
      passed: results.filter((r) => r.playable).length,
      failed: results.filter((r) => !r.playable).length,
      totalSeconds: Number(results.reduce((s, r) => s + (r.durationSeconds || 0), 0).toFixed(1)),
    },
  };
  await writeFile(path.join(OUT, 'walkthrough-validation.json'), JSON.stringify(report, null, 2));
  console.log('');
  console.log(
    `summary: ${report.summary.passed}/${report.summary.total} walkthrough video(s) decodable, ${report.summary.totalSeconds}s total`
  );
  process.exitCode = report.summary.failed === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error('walkthrough validation crashed:', err);
  process.exitCode = 1;
});
