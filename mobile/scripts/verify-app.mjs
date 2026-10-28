/**
 * Drives the exported web build of the Expo app in a real browser to verify
 * runtime behaviour and capture the per-screen demo screenshots.
 *
 * This is the closest verification available on a machine with no Android
 * SDK/JDK and no Xcode: same React Native source, same React Navigation graph,
 * rendered by react-native-web in a touch-enabled mobile viewport.
 *
 * Usage:
 *   node scripts/serve-web-build.js 8099
 *   node scripts/verify-app.mjs http://localhost:8099
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.argv[2] || 'http://localhost:8099';
const OUT = path.resolve(process.cwd(), 'demo-artifacts');
const VIEWPORT = { width: 390, height: 844 };

const report = {
  base: BASE,
  viewport: VIEWPORT,
  startedAt: new Date().toISOString(),
  consoleErrors: [],
  consoleWarnings: [],
  expectedWebWarnings: [],
  pageErrors: [],
  checks: [],
  frames: null,
};

/**
 * Warnings React Native emits on every web build, whatever the app code does.
 *
 * The native animation module only exists on device, so an `Animated` opacity
 * loop asking for `useNativeDriver: true` (the loading shimmer) always falls
 * back to JS on web. Nothing in the bundle can fix that, so these are recorded
 * separately instead of failing the run.
 */
const EXPECTED_WEB_WARNINGS = [/useNativeDriver` is not supported/i];

function check(name, passed, detail) {
  report.checks.push({ name, passed, detail: detail ?? null });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

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

async function scrollableFor(page, testId) {
  return page.evaluate((id) => {
    const node = document.querySelector(`[data-testid="${id}"]`);
    let el = node;
    while (el && el !== document.body) {
      const style = getComputedStyle(el);
      const scrollable =
        /(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 4;
      if (scrollable) return true;
      el = el.parentElement;
    }
    return false;
  }, testId);
}

/** Rendered pixel height of `testId`, or 0 when it is not in the DOM. */
async function renderedHeight(page, testId) {
  return page.evaluate((id) => {
    const node = document.querySelector(`[data-testid="${id}"]`);
    return node ? node.getBoundingClientRect().height : 0;
  }, testId);
}

/**
 * Scrolls the scroll container that owns `testId`, one animation frame per step.
 *
 * react-native-web maps ScrollView/FlatList onto real overflow containers, so
 * driving `scrollTop` is what actually moves them — a mouse drag does not. A
 * negative `dy` scrolls back up.
 */
async function swipe(page, testId, { steps = 6, dy = 600 } = {}) {
  const box = await page.evaluate(
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
          return { found: true, before, after: el.scrollTop, max };
        }
        el = el.parentElement;
      }
      return { found: false, before: 0, after: 0, max: 0 };
    },
    { id: testId, steps, dy }
  );

  if (box.found) {
    await page.waitForTimeout(350);
  }
  return box;
}

/** Samples requestAnimationFrame deltas while `action` runs. */
async function measureFrames(page, action) {
  await page.evaluate(() => {
    window.__frames = [];
    window.__sampling = true;
    const tick = (t) => {
      if (!window.__sampling) return;
      window.__frames.push(t);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  await action();

  const frames = await page.evaluate(() => {
    window.__sampling = false;
    return window.__frames;
  });

  const deltas = [];
  for (let i = 1; i < frames.length; i += 1) {
    deltas.push(frames[i] - frames[i - 1]);
  }
  const longFrames = deltas.filter((d) => d > 50).length;
  const avg = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
  const p95 = deltas.length
    ? [...deltas].sort((a, b) => a - b)[Math.floor(deltas.length * 0.95)]
    : 0;
  return {
    frames: frames.length,
    averageFrameMs: Number(avg.toFixed(2)),
    p95FrameMs: Number(p95.toFixed(2)),
    longFramesOver50ms: longFrames,
    effectiveFps: avg ? Number((1000 / avg).toFixed(1)) : null,
  };
}

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file });
  console.log(`shot  ${name}.png`);
  return file;
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
    isMobile: true,
    hasTouch: true,
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

  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');

  // ---------------------------------------------------------------- 1. Dashboard
  await page.goto(`${BASE}/learner/dashboard`, { waitUntil: 'load' });
  await waitFor(page, 'learner-dashboard');
  const summary = await waitFor(page, 'dashboard-enrollment-count');
  const cards = await waitFor(page, 'dashboard-course-list');
  await page.waitForTimeout(600);

  const dashboardScrollable = await scrollableFor(page, 'dashboard-course-list');
  // The card root carries the enrollment id; its children share one testID.
  const enrolledCards = await page.getByTestId(/^course-card-enr-\d+$/).count();
  check(
    'Dashboard: enrollment summary renders',
    (await summary.innerText()).trim().length > 0,
    (await summary.innerText()).replace(/\s+/g, ' ').trim()
  );
  check(
    'Dashboard: enrolled course list renders',
    (await cards.innerText()).trim().length > 0 && enrolledCards > 0,
    `${enrolledCards} enrolled card(s) with content`
  );
  check('Dashboard: content is scrollable', dashboardScrollable);
  await shot(page, '01-dashboard');

  const dashboardSwipe = await swipe(page, 'dashboard-course-list');
  await swipe(page, 'dashboard-course-list');
  check(
    'Dashboard: scrolling the list actually moves it',
    dashboardSwipe.found && dashboardSwipe.after > dashboardSwipe.before,
    `scrollTop ${Math.round(dashboardSwipe.before)} -> ${Math.round(dashboardSwipe.after)} of ${Math.round(dashboardSwipe.max)}`
  );
  await shot(page, '01-dashboard-scrolled');

  // --------------------------------------------------- 2. My Courses + search/tabs
  await page.goto(`${BASE}/learner/courses`, { waitUntil: 'load' });
  await waitFor(page, 'my-courses-results');
  await page.waitForTimeout(500);
  const gridCard = '[data-testid^="course-grid-card-"]';
  const allCards = await page.locator(gridCard).count();
  check('My Courses: grid renders cards', allCards > 0, `${allCards} cards`);

  await tap(page, 'search-bar-input');
  await page.keyboard.type('react', { delay: 40 });
  await page.waitForTimeout(700);
  const filtered = await page.locator(gridCard).count();
  check('My Courses: typing filters the grid', filtered !== allCards, `${allCards} -> ${filtered} cards`);
  await shot(page, '02-my-courses-search');

  await tap(page, 'search-bar-clear');
  await page.waitForTimeout(600);
  await tap(page, 'filter-tabs-in-progress');
  await page.waitForTimeout(700);
  const inProgress = await page.locator(gridCard).count();
  await tap(page, 'filter-tabs-all');
  await page.waitForTimeout(700);
  const restored = await page.locator(gridCard).count();
  check(
    'My Courses: status filter tab applies',
    inProgress > 0 && inProgress < allCards && restored === allCards,
    `All ${allCards} -> In-progress ${inProgress} -> All ${restored} cards`
  );
  await shot(page, '02-my-courses-filtered');

  // ------------------------------------------------------------- 3. Course Detail
  // `mod-0-1` is a real module of `course-1` in the mock catalogue, so the deep
  // link exercises the auto-expand path instead of an unmatched id.
  await page.goto(`${BASE}/learner/courses/course-1?moduleId=mod-0-1`, {
    waitUntil: 'load',
  });
  await waitFor(page, 'course-detail');
  const hero = await waitFor(page, 'hero-banner');
  await waitFor(page, 'course-detail-footer');
  await page.waitForTimeout(600);
  check(
    'Course Detail: deep link with moduleId renders',
    (await hero.innerText()).trim().length > 0,
    (await hero.innerText()).replace(/\s+/g, ' ').trim()
  );

  const linkedModuleHeight = await renderedHeight(page, 'module-accordion-body-1');
  check(
    'Course Detail: moduleId deep link auto-expands that module',
    linkedModuleHeight > 0,
    `module 1 body is ${Math.round(linkedModuleHeight)}px tall`
  );

  const collapsedHeight = await renderedHeight(page, 'module-accordion-body-0');
  await tap(page, 'module-accordion-header-0');
  await page.waitForTimeout(500);
  const expandedHeight = await renderedHeight(page, 'module-accordion-body-0');
  check(
    'Course Detail: accordion expands a module',
    expandedHeight > collapsedHeight,
    `module 0 body ${Math.round(collapsedHeight)}px -> ${Math.round(expandedHeight)}px`
  );

  // `course-1` is one of the learner's own enrollments, so the footer button must
  // read "Enrolled" and stay disabled.
  const enrolledLabel = await page.locator(sel('enroll-button-label')).innerText();
  const enrolledDisabled = await page
    .locator(sel('enroll-button'))
    .first()
    .evaluate((el) => el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true');
  check(
    'Course Detail: already-enrolled course shows a disabled Enrolled button',
    enrolledLabel.trim() === 'Enrolled' && enrolledDisabled,
    `label "${enrolledLabel.trim()}", disabled=${enrolledDisabled}`
  );
  await shot(page, '03-course-detail');

  // A catalogue course is not enrolled, so this is the path where the enroll
  // button is live and its submitting state is observable.
  await page.goto(`${BASE}/learner/courses/catalog-3`, { waitUntil: 'load' });
  await waitFor(page, 'course-detail');
  await waitFor(page, 'enroll-button');
  await page.waitForTimeout(600);
  const catalogLabel = await page.locator(sel('enroll-button-label')).innerText();
  await tap(page, 'enroll-button');
  const sawSubmitting = await page
    .waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="enroll-button-label"]');
        return el ? /Enrolling/.test(el.textContent || '') : false;
      },
      undefined,
      { timeout: 4000 }
    )
    .then(() => true)
    .catch(() => false);
  check(
    'Course Detail: enroll button submits from a catalogue course',
    catalogLabel.trim() === 'Enroll now' && sawSubmitting,
    `label "${catalogLabel.trim()}", submitting state seen=${sawSubmitting}`
  );
  await shot(page, '03b-course-detail-enroll');

  // -------------------------------------------------------- 4. Global Search page
  await page.goto(`${BASE}/search`, { waitUntil: 'load' });
  await waitFor(page, 'global-search');
  await waitFor(page, 'global-search-results');
  await waitFor(page, 'global-search-forum-link');
  check(
    'Global Search: idle state prompts a search',
    (await page.locator(sel('global-search-results')).innerText()).trim().length > 0
  );
  await shot(page, '04-search-idle');

  await tap(page, 'search-input-field');
  await page.keyboard.type('node', { delay: 40 });
  // Enter commits the term into recent searches (onSubmitEditing), which the
  // recents strip below needs before it has anything to show.
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1200); // 300 ms debounce + mock latency
  await waitFor(page, 'global-search-results');
  const rows = await page.locator('[data-testid^="result-row-"]:not([data-testid*="-match-"])').count();
  check('Global Search: debounced query returns results', rows > 0, `${rows} rows`);
  await shot(page, '04-search-results');

  // The recents strip only renders for an empty query, so clear the field first.
  await tap(page, 'search-input-clear');
  await page.waitForTimeout(500);
  const recents = await waitFor(page, 'recent-searches');
  const recentChips = await page.locator('[data-testid^="recent-searches-item-"]').count();
  check(
    'Global Search: submitted term lands in recent searches',
    (await recents.innerText()).includes('node') && recentChips > 0,
    `${recentChips} recent chip(s)`
  );
  await shot(page, '04-search-recent');

  // Replay before switching tabs: the result set depends on the active tab, and
  // "node" only matches course results.
  await tap(page, 'recent-searches-item-node');
  await page.waitForTimeout(1200);
  const replayed = await page.locator('[data-testid^="result-row-"]:not([data-testid*="-match-"])').count();
  check(
    'Global Search: tapping a recent search re-runs it',
    replayed > 0,
    `${replayed} rows after replaying "node"`
  );

  const tabState = () =>
    page.evaluate(() => {
      const root = document.querySelector('[data-testid="global-search"]');
      const text = root ? root.textContent || '' : '';
      const total = /(\d+)\s+results?/.exec(text);
      return {
        total: total ? Number(total[1]) : null,
        rows: document.querySelectorAll('[data-testid^="result-row-"]:not([data-testid*="-match-"])').length,
        empty: document.querySelectorAll('[data-testid="global-search-empty-state"]').length,
      };
    });
  const beforeTab = await tabState();
  await tap(page, 'global-search-tabs-Forum');
  await page.waitForTimeout(800);
  const afterTab = await tabState();
  check(
    'Global Search: result type tabs switch',
    afterTab.total !== beforeTab.total || afterTab.rows !== beforeTab.rows || afterTab.empty > 0,
    `Courses ${beforeTab.total} results (${beforeTab.rows} rows) -> Forum ${afterTab.total} results (${afterTab.rows} rows, ${afterTab.empty} empty state(s))`
  );
  await shot(page, '04-search-forum-tab');

  // --------------------------------------------------------------- 5. Forum Home
  const threadTitleSel = '[data-testid^="forum-thread-list-"][data-testid$="-title"]';
  const communityTotal = async () => {
    const text = await page.locator(sel('forum-home')).first().innerText();
    const match = /(\d+)\s+threads?\s+in the community/.exec(text);
    return match ? Number(match[1]) : null;
  };
  const threadRows = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('[data-testid^="forum-thread-list-"][data-testid$="-title"]')].map(
        (title) => {
          // The title's own testID also matches the card prefix, so address the
          // card by dropping the `-title` suffix instead of walking up the tree.
          const id = (title.getAttribute('data-testid') || '').replace(/-title$/, '');
          const card = document.querySelector(`[data-testid="${id}"]`);
          const text = card ? card.textContent || '' : '';
          const votes = /▲\s*(\d+)/.exec(text);
          return {
            title: (title.textContent || '').trim(),
            upvotes: votes ? Number(votes[1]) : null,
            pinned: card ? card.querySelector('[data-testid$="-pinned"]') !== null : false,
          };
        }
      )
    );

  await page.goto(`${BASE}/forum`, { waitUntil: 'load' });
  await waitFor(page, 'forum-home');
  await waitFor(page, 'forum-thread-list');
  await page.waitForTimeout(800);

  const firstThread = await page.locator(threadTitleSel).first().innerText();
  const unfilteredTotal = await communityTotal();
  check('Forum Home: thread list renders', firstThread.trim().length > 0, firstThread.trim());
  check(
    'Forum Home: community total is shown',
    unfilteredTotal !== null && unfilteredTotal > 0,
    `${unfilteredTotal} threads in the community`
  );

  const rowsBefore = await page.locator(threadTitleSel).count();
  report.frames = await measureFrames(page, async () => {
    for (let i = 0; i < 6; i += 1) {
      await swipe(page, 'forum-thread-list', { steps: 8, dy: 900 });
    }
  });
  // The mock client answers in 250 ms, so page 2 lands shortly after the last
  // scroll step; wait for the DOM instead of guessing a sleep duration.
  await page
    .waitForFunction(
      ({ selector, previous }) => document.querySelectorAll(selector).length > previous,
      { selector: threadTitleSel, previous: rowsBefore },
      { timeout: 8000 }
    )
    .catch(() => {});
  const afterScroll = await page.locator(threadTitleSel).count();
  check(
    'Forum Home: infinite scroll keeps loading rows',
    afterScroll > rowsBefore,
    `${rowsBefore} -> ${afterScroll} rows after scrolling to the end`
  );
  await shot(page, '05-forum-scrolled');

  // --------------------------------------------------------------- 6. Forum filters
  await swipe(page, 'forum-thread-list', { steps: 8, dy: -4000 });
  const unpinnedBefore = (await threadRows()).filter((row) => !row.pinned);
  const bestBefore = unpinnedBefore.length
    ? Math.max(...unpinnedBefore.map((row) => row.upvotes ?? 0))
    : 0;

  await tap(page, 'sort-dropdown-trigger');
  await page.waitForTimeout(400);
  await tap(page, 'sort-dropdown-option-most-voted');
  await page.waitForTimeout(900);
  const sortedRows = await threadRows();
  const bestAfter = sortedRows.find((row) => !row.pinned);
  const sortLabel = await page.locator(sel('sort-dropdown-trigger')).innerText();
  check(
    'Forum Home: sort dropdown orders by votes',
    bestAfter !== undefined &&
      bestAfter.upvotes !== null &&
      bestAfter.upvotes >= bestBefore &&
      /Most voted/.test(sortLabel),
    `top unpinned ${bestBefore} -> ${bestAfter ? bestAfter.upvotes : 'n/a'} votes, trigger "${sortLabel.trim()}"`
  );

  await tap(page, 'sort-dropdown-trigger');
  await page.waitForTimeout(400);
  await tap(page, 'sort-dropdown-option-newest');
  await page.waitForTimeout(700);

  await tap(page, 'category-chips-cat-2');
  await page.waitForTimeout(900);
  const categoryTotal = await communityTotal();
  check(
    'Forum Home: category chip filters the list',
    categoryTotal !== null && categoryTotal > 0 && categoryTotal < (unfilteredTotal ?? 0),
    `${unfilteredTotal} -> ${categoryTotal} threads in the selected category`
  );

  await tap(page, 'tag-filter-jest');
  await page.waitForTimeout(900);
  const taggedTotal = await communityTotal();
  check(
    'Forum Home: tag filter narrows the list further',
    taggedTotal !== null && taggedTotal <= (categoryTotal ?? 0),
    `category ${categoryTotal} -> category + jest ${taggedTotal} threads`
  );
  await shot(page, '05-forum-filtered');

  // ------------------------------------------------------------- 7. Forum composer
  // Drop the filters again: a new post lands in the first category with no tags,
  // so it would be filtered out of the list that follows.
  await tap(page, 'category-chips-all');
  await page.waitForTimeout(700);
  await tap(page, 'tag-filter-jest');
  await page.waitForTimeout(700);
  await swipe(page, 'forum-thread-list', { steps: 8, dy: -4000 });

  await tap(page, 'forum-fab');
  await waitFor(page, 'create-post-modal-title');
  // The composer does not autofocus its title field, so focus it the way a user
  // would: click the field, then type.
  await tap(page, 'create-post-modal-title');
  await page.keyboard.type('Verification run: new discussion from the browser check', {
    delay: 15,
  });
  await tap(page, 'create-post-modal-body-input');
  await page.keyboard.type(
    'Posted by the automated verification run to prove the composer works end to end.',
    { delay: 5 }
  );
  await shot(page, '05-forum-composer');
  await tap(page, 'create-post-modal-submit');
  await page.waitForTimeout(1500);
  const validationError = await page.locator(sel('create-post-modal-validation-error')).count();
  if (validationError > 0) {
    console.log('composer validation error:', await page.locator(sel('create-post-modal-validation-error')).innerText());
  }
  const modalGone = (await page.locator(sel('create-post-modal-title')).count()) === 0;
  check('Forum Home: composer submits and closes', modalGone);
  const posted = await page.locator('text=Verification run: new discussion').count();
  check('Forum Home: new thread appears in the list', posted > 0, `${posted} matching row(s)`);
  await shot(page, '05-forum-after-post');

  // CDP performance counters for the whole session.
  const { metrics } = await cdp.send('Performance.getMetrics');
  const pick = (name) => metrics.find((m) => m.name === name)?.value ?? null;
  report.performance = {
    taskDurationSeconds: pick('TaskDuration'),
    layoutDurationSeconds: pick('LayoutDuration'),
    recalcStyleDurationSeconds: pick('RecalcStyleDuration'),
    scriptDurationSeconds: pick('ScriptDuration'),
    frames: pick('Frames'),
    nodes: pick('Nodes'),
  };

  await browser.close();

  // ------------------------------------------------------------------- Verdict
  check('No uncaught page errors', report.pageErrors.length === 0, report.pageErrors.join(' | '));
  check(
    'No console errors',
    report.consoleErrors.length === 0,
    report.consoleErrors.slice(0, 3).join(' | ')
  );
  check(
    'No console warnings',
    report.consoleWarnings.length === 0,
    report.consoleWarnings.slice(0, 3).join(' | ')
  );

  report.summary = {
    total: report.checks.length,
    passed: report.checks.filter((c) => c.passed).length,
    failed: report.checks.filter((c) => !c.passed).length,
  };
  report.finishedAt = new Date().toISOString();

  await writeFile(path.join(OUT, 'verification-report.json'), JSON.stringify(report, null, 2));
  console.log('');
  if (report.expectedWebWarnings.length > 0) {
    console.log(
      `note: ${report.expectedWebWarnings.length} expected web-only warning(s) from the animation layer were ignored`
    );
  }
  console.log(
    `summary: ${report.summary.passed}/${report.summary.total} checks passed, ${report.summary.failed} failed`
  );
  if (report.frames) console.log('frames:', JSON.stringify(report.frames));
  process.exitCode = report.summary.failed === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error('verification run crashed:', err);
  process.exitCode = 1;
});