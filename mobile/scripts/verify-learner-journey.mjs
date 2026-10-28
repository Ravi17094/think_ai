/**
 * Drives the exported web build through the full learner journey in a real
 * browser: sign in, browse, enroll, play a lesson, take the assessment, view
 * results, and open the certificate.
 *
 * Usage:
 *   node scripts/serve-web-build.js 8099
 *   node scripts/verify-learner-journey.mjs http://127.0.0.1:8099
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.argv[2] || 'http://127.0.0.1:8099';
const OUT = path.resolve(process.cwd(), 'demo-artifacts', 'learner-journey');
const VIEWPORT = { width: 390, height: 844 };
const EXPECTED_WEB_WARNINGS = [/useNativeDriver` is not supported/i];

const report = {
  base: BASE,
  viewport: VIEWPORT,
  startedAt: new Date().toISOString(),
  checks: [],
  steps: [],
  screenshots: [],
  consoleErrors: [],
  consoleWarnings: [],
  expectedWebWarnings: [],
  pageErrors: [],
};

const sel = (testId) => `[data-testid="${testId}"]`;

function check(name, passed, detail) {
  report.checks.push({ name, passed, detail: detail ?? null });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` - ${detail}` : ''}`);
}

async function waitFor(page, testId, timeout = 15000) {
  await page.waitForSelector(sel(testId), { timeout, state: 'attached' });
  return page.locator(sel(testId)).first();
}

async function tap(page, testId, { timeout = 10000 } = {}) {
  // React Navigation keeps previous stack screens mounted, so the same testID
  // can exist twice (e.g. `take-assessment` on Course Detail and Video Player).
  // Only the active screen's copy is visible.
  const locator = page.locator(sel(testId)).filter({ visible: true }).first();
  await locator.waitFor({ state: 'visible', timeout });
  await locator.scrollIntoViewIfNeeded();
  await locator.click({ timeout });
}

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file });
  report.screenshots.push(file);
}

function mark(step, startedAt) {
  const ms = Date.now() - startedAt;
  report.steps.push({ step, ms });
  check(`${step}: screen transition settles within 2s`, ms < 2000, `${ms}ms`);
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({
    channel: 'chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();

  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error') {
      report.consoleErrors.push(text);
    } else if (msg.type() === 'warning') {
      if (EXPECTED_WEB_WARNINGS.some((pattern) => pattern.test(text))) {
        report.expectedWebWarnings.push(text);
      } else {
        report.consoleWarnings.push(text);
      }
    }
  });
  page.on('pageerror', (err) => report.pageErrors.push(String(err)));

  await page.goto(BASE, { waitUntil: 'load' });
  await waitFor(page, 'login-screen');
  await shot(page, '01-login');
  check('Login: auth gate renders', await page.locator(sel('login-screen')).isVisible());

  const tLogin = Date.now();
  await tap(page, 'login-email');
  await page.keyboard.type('learner@test.com', { delay: 10 });
  await tap(page, 'login-password');
  await page.keyboard.type('password123', { delay: 10 });
  await tap(page, 'login-submit');
  await waitFor(page, 'learner-dashboard');
  await page.waitForTimeout(300);
  check(
    'Login: dashboard enrollment summary renders',
    (await page.locator(sel('dashboard-enrollment-count')).innerText()).trim().length > 0
  );
  await shot(page, '02-dashboard');
  mark('Login', tLogin);

  const tBrowse = Date.now();
  await tap(page, 'browse-tab');
  await waitFor(page, 'my-courses');
  await waitFor(page, 'course-grid-card-catalog-3');
  const courseCards = await page
    .locator('[data-testid^="course-grid-card-"], [data-testid^="course-card-"]')
    .count();
  check('Browse: course catalogue renders cards', courseCards > 0, `${courseCards} cards`);
  await shot(page, '03-my-courses');
  await tap(page, 'course-grid-card-catalog-3');
  await waitFor(page, 'course-detail');
  mark('Browse', tBrowse);
  await waitFor(page, 'enroll-button');
  check(
    'Browse: selected course detail renders',
    (await page.locator(sel('hero-banner')).innerText()).trim().length > 0
  );
  await shot(page, '04-course-detail');

  const tEnroll = Date.now();
  const enrollLabel = (await page.locator(sel('enroll-button-label')).innerText()).trim();
  check('Enroll: catalogue course offers enrollment', enrollLabel === 'Enroll now', enrollLabel);
  await tap(page, 'enroll-button');
  await waitFor(page, 'enrollment-confirmed', 5000);
  check(
    'Enroll: confirmation is shown',
    (await page.locator(sel('enrollment-confirmed')).innerText()).trim().length > 0
  );
  await shot(page, '05-enrolled');
  mark('Enroll', tEnroll);

  const tPlay = Date.now();
  await tap(page, 'play-video');
  await waitFor(page, 'video-player');
  check('Play video: lesson player opens', await page.locator(sel('video-player')).isVisible());
  await shot(page, '06-video-player');
  mark('PlayVideo', tPlay);

  const tAssess = Date.now();
  await tap(page, 'take-assessment');
  await waitFor(page, 'assessment-form');
  await tap(page, 'answer-0');
  await tap(page, 'submit-assessment');
  await waitFor(page, 'assessment-results');
  check(
    'Assessment: submitting an answer opens results',
    await page.locator(sel('assessment-results')).isVisible()
  );
  await shot(page, '07-assessment-results');
  mark('Assessment', tAssess);

  const tResults = Date.now();
  const score = (await page.locator(sel('score-value')).innerText()).trim();
  check('Results: score is rendered', score === '100%', score);
  await shot(page, '08-results');
  mark('Results', tResults);

  const tCert = Date.now();
  await tap(page, 'view-certificate');
  await waitFor(page, 'certificate-view');
  const certificate = (await page.locator(sel('certificate-view')).innerText()).trim();
  check(
    'Certificate: completion certificate renders',
    /certificate of completion/i.test(certificate) && /catalog-3/.test(certificate)
  );
  await shot(page, '09-certificate');
  mark('Certificate', tCert);

  check('Runtime: no page errors', report.pageErrors.length === 0);
  check('Runtime: no console errors', report.consoleErrors.length === 0);

  report.finishedAt = new Date().toISOString();
  await writeFile(
    path.join(OUT, 'learner-journey-report.json'),
    JSON.stringify(report, null, 2)
  );

  const failed = report.checks.filter((entry) => !entry.passed);
  console.log(
    `\n${report.checks.length - failed.length}/${report.checks.length} checks passed; ` +
      `${report.screenshots.length} screenshots; total ${report.steps.reduce((sum, s) => sum + s.ms, 0)}ms`
  );
  if (failed.length > 0) {
    console.log(failed.map((entry) => `FAILED: ${entry.name}`).join('\n'));
    process.exitCode = 1;
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
