/* eslint-disable @typescript-eslint/no-explicit-any */
// Detox globals are provided by the Detox runtime when the suite runs.
declare const device: any;
declare const element: any;
declare const by: any;

describe('Learner Journey E2E', () => {
  const timings: { step: string; ms: number }[] = [];
  const takeScreenshot = async (name: string) => {
    try {
      if (typeof device.takeScreenshot === 'function') {
        await device.takeScreenshot(name);
      }
    } catch {
      // Screenshot capture is best-effort; ignore runner differences.
    }
  };
  const mark = (step: string, start: number) => {
    timings.push({ step, ms: Date.now() - start });
    void takeScreenshot(step);
  };

  beforeAll(async () => {
    try {
      await device.launchApp({ permissions: { notifications: 'YES' } });
    } catch {
      // App may already be running in the test harness.
    }
  });

  it('runs full journey with real API', async () => {
    const t0 = Date.now();

    const tLogin = Date.now();
    await expect(element(by.id('login-email'))).toBeVisible();
    await element(by.id('login-email')).typeText('learner@test.com');
    await element(by.id('login-password')).typeText('password123');
    await element(by.id('login-submit')).tap();
    await expect(element(by.id('learner-dashboard'))).toBeVisible();
    mark('Login', tLogin);

    const tBrowse = Date.now();
    await element(by.id('browse-tab')).tap();
    await expect(element(by.id('course-list'))).toBeVisible();
    await element(by.id('course-card-0')).tap();
    await expect(element(by.id('course-detail'))).toBeVisible();
    mark('Browse', tBrowse);

    const tEnroll = Date.now();
    await element(by.id('enroll-button')).tap();
    await expect(element(by.id('enrollment-confirmed'))).toBeVisible();
    mark('Enroll', tEnroll);

    const tPlay = Date.now();
    await element(by.id('play-video')).tap();
    await expect(element(by.id('video-player'))).toBeVisible();
    mark('PlayVideo', tPlay);

    const tAssess = Date.now();
    await element(by.id('take-assessment')).tap();
    await expect(element(by.id('assessment-form'))).toBeVisible();
    await element(by.id('answer-0')).tap();
    await element(by.id('submit-assessment')).tap();
    await expect(element(by.id('assessment-results'))).toBeVisible();
    mark('Assessment', tAssess);

    const tResults = Date.now();
    await expect(element(by.id('score-value'))).toBeVisible();
    mark('Results', tResults);

    const tCert = Date.now();
    await element(by.id('view-certificate')).tap();
    await expect(element(by.id('certificate-view'))).toBeVisible();
    mark('Certificate', tCert);

    const total = Date.now() - t0;
    const slow = timings.filter((x) => x.ms > 2000);
    if (slow.length > 0) {
      console.warn('SLOW TRANSITIONS (>2000ms):', slow, 'total:', total);
    } else {
      console.log('Journey timings (ms):', timings, 'total:', total);
    }

    // Performance budget: every screen transition must settle within 2 s.
    expect(slow).toEqual([]);
    expect(total).toBeLessThan(120_000);
  });
});

