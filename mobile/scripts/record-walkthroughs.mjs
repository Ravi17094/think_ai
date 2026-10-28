/**
 * Records a video walkthrough of each of the five learner-facing screens.
 *
 * Same harness as verify-app.mjs — real Expo web export, real Chromium, the
 * 390x844 touch viewport — but instead of asserting, it drives each screen
 * through its story and lets Playwright capture the result as WebM.
 *
 * One video per screen: each gets its own browser context so Playwright emits a
 * separate video file, which is then renamed to the screen it belongs to.
 *
 * Usage:
 *   node scripts/serve-web-build.js 8099
 *   node scripts/record-walkthroughs.mjs http://localhost:8099
 */
import { chromium } from 'playwright';
import { mkdir, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.argv[2] || 'http://localhost:8099';
const OUT = path.resolve(process.cwd(), 'demo-artifacts', 'walkthroughs');
const TMP = path.resolve(process.cwd(), '.walkthrough-tmp');
const VIEWPORT = { width: 390, height: 844 };

const sel = (testId) => `[data-testid="${testId}"]`;

async function waitFor(page, testId, timeout = 15000) {
  await page.waitForSelector(sel(testId), { timeout, state: 'attached' });
  return page.locator(sel(testId)).first();
}

async function tap(page, testId, { timeout = 10000 } = {}) {
  const locator = page.locator(sel(testId)).first();
  await locator.waitFor({ state: 'attached', timeout });
  await locator.scrollIntoViewIfNeeded();
  await locator.click({ timeout });
}

async function swipe(page, testId, { steps = 6, dy = 600 } = {}) {
  const moved = await page.evaluate(
    async ({ id, steps, dy }) => {
      const node = document.querySelector(`[data-testid="${id}"]`);
      let el = node;
      while (el && el !== document.body) {
        const style = getComputedStyle(el);
        if (/(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 4) {
          const before = el.scrollTop;
          const max = el.scrollHeight - el.clientHeight;
          for (let i = 1; i <= steps; i += 1) {
            el.scrollTop = Math.max(0, Math.min(max, before + (dy * i) / steps));
            await new Promise((resolve) => requestAnimationFrame(resolve));
          }
          return el.scrollTop > before;
        }
        el = el.parentElement;
      }
      return false;
    },
    { id: testId, steps, dy }
  );
  if (moved) await page.waitForTimeout(350);
  return moved;
}

/** Lets the encoder settle so the tail of the video is not a frozen frame. */
async function beat(page, ms = 700) {
  await page.waitForTimeout(ms);
}

const SCREENS = [
  {
    slug: '01-learner-dashboard',
    route: '/learner/dashboard',
    ready: ['learner-dashboard', 'dashboard-enrollment-count', 'dashboard-course-list'],
    async play(page) {
      await beat(page, 1400);
      await swipe(page, 'dashboard-course-list');
      await beat(page, 900);
      await swipe(page, 'dashboard-course-list');
      await beat(page, 1400);
    },
  },
  {
    slug: '02-my-courses',
    route: '/learner/courses',
    ready: ['my-courses-results'],
    async play(page) {
      await beat(page, 1200);
      await tap(page, 'search-bar-input');
      await page.keyboard.type('react', { delay: 55 });
      await beat(page, 1200);
      await tap(page, 'search-bar-clear');
      await beat(page, 800);
      await tap(page, 'filter-tabs-in-progress');
      await beat(page, 1200);
      await tap(page, 'filter-tabs-completed');
      await beat(page, 1200);
      await tap(page, 'filter-tabs-all');
      await beat(page, 1200);
    },
  },
  {
    slug: '03-course-detail',
    route: '/learner/courses/course-1?moduleId=mod-0-1',
    ready: ['course-detail', 'hero-banner', 'course-detail-footer'],
    async play(page) {
      await beat(page, 1400);
      await tap(page, 'module-accordion-header-0');
      await beat(page, 1000);
      await tap(page, 'module-accordion-header-2');
      await beat(page, 1000);
      await swipe(page, 'course-detail-scroll-view', { steps: 8, dy: 500 });
      await beat(page, 1400);
    },
  },
  {
    slug: '04-global-search',
    route: '/search',
    ready: ['global-search', 'global-search-results', 'global-search-forum-link'],
    async play(page) {
      await beat(page, 1200);
      await tap(page, 'search-input-field');
      await page.keyboard.type('node', { delay: 70 });
      // Enter is what commits the term into recent searches, so the replay tap
      // below has a chip to hit.
      await page.keyboard.press('Enter');
      await beat(page, 1600);
      await tap(page, 'search-input-clear');
      await beat(page, 1000);
      await tap(page, 'recent-searches-item-node');
      await beat(page, 1600);
      await tap(page, 'global-search-tabs-Forum');
      await beat(page, 1200);
      await tap(page, 'global-search-tabs-Courses');
      await beat(page, 1400);
    },
  },
  {
    slug: '05-forum-home',
    route: '/forum',
    ready: ['forum-home', 'forum-thread-list'],
    async play(page) {
      await beat(page, 1400);
      for (let i = 0; i < 5; i += 1) {
        await swipe(page, 'forum-thread-list', { steps: 8, dy: 900 });
      }
      await beat(page, 1600);
      await swipe(page, 'forum-thread-list', { steps: 8, dy: -6000 });
      await tap(page, 'sort-dropdown-trigger');
      await beat(page, 700);
      await tap(page, 'sort-dropdown-option-most-voted');
      await beat(page, 1300);
      await tap(page, 'category-chips-cat-2');
      await beat(page, 1300);
      await tap(page, 'tag-filter-jest');
      await beat(page, 1300);
      await tap(page, 'category-chips-all');
      await beat(page, 900);
      await tap(page, 'tag-filter-jest');
      await beat(page, 900);
      await tap(page, 'forum-fab');
      await waitFor(page, 'create-post-modal-title');
      await tap(page, 'create-post-modal-title');
      await page.keyboard.type('Walkthrough: shipping the forum composer', { delay: 25 });
      await tap(page, 'create-post-modal-body-input');
      await page.keyboard.type(
        'This discussion was posted by the automated walkthrough recorder to show the composer end to end.',
        { delay: 8 }
      );
      await beat(page, 1200);
      await tap(page, 'create-post-modal-submit');
      await beat(page, 2200);
      await swipe(page, 'forum-thread-list', { steps: 8, dy: -6000 });
      await beat(page, 1800);
    },
  },
];

async function onlyRecording(dir) {
  const entries = await readdir(dir);
  const videos = entries.filter((name) => name.endsWith('.webm'));
  if (videos.length !== 1) {
    throw new Error(`expected exactly one video in ${dir}, found ${videos.length}: ${videos.join(', ')}`);
  }
  return path.join(dir, videos[0]);
}

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({
    channel: 'chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const recorded = [];

  for (const screen of SCREENS) {
    // Playwright names each context's video after a random id, so every screen
    // gets its own temp dir to keep the rename step unambiguous.
    const scratch = path.join(TMP, screen.slug);
    await rm(scratch, { recursive: true, force: true });
    await mkdir(scratch, { recursive: true });

    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      recordVideo: { dir: scratch, size: VIEWPORT },
    });
    const page = await context.newPage();

    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(String(err)));

    console.log(`record ${screen.slug} ...`);
    await page.goto(`${BASE}${screen.route}`, { waitUntil: 'load' });
    for (const testId of screen.ready) await waitFor(page, testId);
    await screen.play(page);
    await beat(page, 800);

    // The video file is only complete once the context closes.
    await context.close();

    const src = await onlyRecording(scratch);
    const dest = path.join(OUT, `${screen.slug}.webm`);
    await rename(src, dest);
    await rm(scratch, { recursive: true, force: true });

    const { size } = await stat(dest);
    recorded.push({
      screen: screen.slug,
      route: screen.route,
      file: path.relative(process.cwd(), dest),
      bytes: size,
      consoleErrors: errors,
    });
    console.log(`  -> ${screen.slug}.webm (${Math.round(size / 1024)} KB, ${errors.length} error(s))`);
  }

  await browser.close();
  await rm(TMP, { recursive: true, force: true });

  await writeFile(
    path.join(OUT, 'walkthrough-report.json'),
    JSON.stringify(
      {
        base: BASE,
        viewport: VIEWPORT,
        recordedAt: new Date().toISOString(),
        recordings: recorded,
        summary: {
          screens: recorded.length,
          totalBytes: recorded.reduce((sum, r) => sum + r.bytes, 0),
          consoleErrors: recorded.reduce((sum, r) => sum + r.consoleErrors.length, 0),
        },
      },
      null,
      2
    )
  );

  console.log('');
  console.log(
    `summary: ${recorded.length} walkthrough video(s), ${recorded.reduce((sum, r) => sum + r.consoleErrors.length, 0)} console error(s)`
  );
}

main().catch((err) => {
  console.error('walkthrough recording crashed:', err);
  process.exitCode = 1;
});
