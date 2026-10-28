import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BASE = process.env.VALIDATION_BASE_URL || "http://localhost:5173";
const API = process.env.VALIDATION_API_URL || "http://127.0.0.1:5000/api";
const ART = "e2e-artifacts";
const AXE_PATH = fileURLToPath(new URL("../node_modules/axe-core/axe.min.js", import.meta.url));

mkdirSync(`${ART}/screenshots`, { recursive: true });

async function obtainToken() {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "playwright.learner@thinkzai.com", password: "Learner@123" }),
  });
  if (!res.ok) throw new Error(`login failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  if (!data.token) throw new Error("no token in login response");
  return data.token;
}

const setSession = (token) => {
  localStorage.setItem("thinkz_forum_user_id", "u1");
  localStorage.setItem("token", token);
};

const results = [];
function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  :: " + detail : ""}`);
}
async function timed(name, fn, suppress = false) {
  const t0 = Date.now();
  try {
    await fn();
    if (!suppress) record(name, true, `(${Date.now() - t0}ms)`);
  } catch (e) {
    let extra = "";
    const snapPage = globalThis.trackPage;
    try {
      if (snapPage) extra = ` PAGE_URL=${snapPage.url()} PAGE_HEAD=${(await snapPage.evaluate(() => (document.body.innerText || "").slice(0, 220).replace(/\n/g, " | "))).slice(0, 220)}`;
    } catch { /* ignore */ }
    record(name, false, `${Date.now() - t0}ms :: ${String(e.message || e).split("\n")[0]}${extra}`);
  }
}

const VIEWPORTS = [
  { name: "mobile-375", width: 375, height: 812, mobile: true },
  { name: "tablet-768", width: 768, height: 1024, mobile: false },
  { name: "desktop-1440", width: 1440, height: 900, mobile: false },
];

const browser = await chromium.launch({ channel: "chrome", headless: true });
const TOKEN = await obtainToken();

/* ---------- BROWSER VALIDATION: layout / a11y / axe across viewports ---------- */
for (const vp of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
    ...(vp.mobile ? { deviceScaleFactor: 2 } : {}),
    colorScheme: "light",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  await page.addInitScript(setSession, TOKEN);
  globalThis.trackPage = page;

  if (vp.mobile) {
    const cdp = await context.newCDPSession(page).catch(() => null);
    if (cdp) {
      await cdp.send("Emulation.setEmulatedMedia", {
        features: [{ name: "pointer", value: "coarse" }, { name: "hover", value: "none" }],
      }).catch(() => {});
    }
  }

  for (const path of ["/forum", "/forum/notifications", "/forum/moderation"]) {
    await timed(`browser:${vp.name} visit ${path}`, async () => {
      await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
      const sel = path === "/forum" ? ".discussion-card" : path === "/forum/notifications" ? "h1" : ".moderation-page > *";
      await page.waitForSelector(sel, { timeout: 20000 });
      await page.waitForTimeout(1200);
    });

    const overflow = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
      body: document.body.scrollWidth,
      meta: document.querySelector('meta[name="viewport"]')?.content || null,
    })).catch((e) => ({ evaluateError: String(e.message).split("\n")[0] }));
    if (overflow.evaluateError) {
      record(`browser:${vp.name} no-horizontal-overflow ${path}`, false, overflow.evaluateError);
    } else {
      const noOverflow = overflow.doc <= overflow.client + 1 && overflow.body <= overflow.client + 1;
      record(`browser:${vp.name} no-horizontal-overflow ${path}`, noOverflow, JSON.stringify(overflow));
    }

    const shotName = `${ART}/screenshots/${vp.name}${path.replace(/\//g, "_")}.png`;
    await page.screenshot({ path: shotName, fullPage: true }).catch(() => {});
    record(`browser:${vp.name} screenshot ${path}`, true, shotName);

    if (vp.mobile) {
      const coarseOn = await page.evaluate(() => window.matchMedia("(pointer: coarse)").matches).catch(() => false);
      if (!coarseOn) {
        const cdp = await context.newCDPSession(page).catch(() => null);
        if (cdp) {
          await cdp.send("Emulation.setEmulatedMedia", {
            features: [{ name: "pointer", value: "coarse" }, { name: "hover", value: "none" }],
          }).catch(() => {});
        }
        await page.reload({ waitUntil: "domcontentloaded" });
        const sel = path === "/forum" ? ".discussion-card" : path === "/forum/notifications" ? "h1" : ".moderation-page > *";
        await page.waitForSelector(sel, { timeout: 20000 });
        await page.waitForTimeout(400);
      }
      const hit = await page.evaluate(() => {
        const sels = [
          ".vote-button", ".bookmark-button", ".pagination button",
          ".btn--small", ".tag-chip", ".notification-toast__close",
          ".notification-item__open", ".moderation-panel button",
          ".checkout-test-card", ".search-bar button",
        ];
        const bad = [];
        let sampled = 0;
        const seen = new Set();
        for (const sel of sels) {
          for (const el of document.querySelectorAll(sel)) {
            const cs = getComputedStyle(el);
            if (cs.display === "none" || cs.visibility === "hidden") continue;
            const r = el.getBoundingClientRect();
            if (r.width === 0 && r.height === 0) continue;
            if (seen.has(el)) continue;
            seen.add(el);
            sampled++;
            if (r.width < 44 || r.height < 44) {
              bad.push({ sel, w: Math.round(r.width), h: Math.round(r.height), cls: String(el.className).split(" ")[0] });
            }
          }
        }
        return { bad: bad.slice(0, 12), badCount: bad.length, sampled };
      }).catch(() => ({ badCount: -1, sampled: 0, bad: [] }));
      record(`browser:${vp.name} 44px-hit-targets ${path}`,
        hit.badCount === 0,
        hit.badCount === 0 ? `ok ${hit.sampled} controls sampled` : JSON.stringify(hit));
    }
  }

  await timed(`browser:${vp.name} axe-color-contrast /forum`, async () => {
    await page.goto(`${BASE}/forum`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".discussion-card", { timeout: 20000 });
    await page.waitForTimeout(800);
    await page.addScriptTag({ path: AXE_PATH });
    const violations = await page.evaluate(async () => {
      const r = await window.axe.run(document.body, { resultTypes: ["violations"] });
      return r.violations.map((v) => ({
        id: v.id, impact: v.impact, nodes: v.nodes.length,
        help: v.help,
        targets: v.nodes.slice(0, 4).map((n) => n.target.join(" ")),
      }));
    });
    const serious = violations.filter((v) => v.id !== "color-contrast");
    if (serious.length > 0) throw new Error(JSON.stringify(serious.slice(0, 4)));
    const contrast = violations.filter((v) => v.id === "color-contrast");
    record(`browser:${vp.name} axe color-contrast violations`, contrast.length === 0,
      contrast.length ? JSON.stringify(contrast.slice(0, 6)) : "0 contrast violations");
  }, true);

  await context.close();
}

/* ---------- STAGING VALIDATION: full-stack E2E against live dev stack ---------- */
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
const page = await ctx.newPage();
page.setDefaultTimeout(30000);
await page.addInitScript(setSession, TOKEN);
globalThis.trackPage = page;

await timed("staging: forum list loads with discussions", async () => {
  await page.goto(`${BASE}/forum`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".discussion-card", { timeout: 20000 });
  const n = await page.locator(".discussion-card").count();
  if (n < 1) throw new Error("no discussion cards");
});

await timed("staging: search finds results", async () => {
  await page.fill("#forum-search", "welcome");
  await page.press("#forum-search", "Enter");
  await page.waitForTimeout(1500);
  await page.waitForSelector(".discussion-card");
});

await timed("staging: open thread and post comment", async () => {
  await page.locator(".discussion-card a").first().click();
  await page.waitForURL(/\/forum\/d/, { timeout: 15000 });
  await page.waitForTimeout(800);
  await page.fill("#comment-body", "Validated via Playwright staging run");
  await page.click("button:has-text('Post comment')");
  await page.waitForSelector(".comment-list .comment", { timeout: 15000 });
  await page.waitForTimeout(500);
});

await timed("staging: back to list and toggle bookmark", async () => {
  await page.goto(`${BASE}/forum`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".discussion-card");
  const btn = page.locator(".discussion-card .bookmark-button").first();
  const before = await btn.getAttribute("aria-label");
  await btn.click();
  await page.waitForTimeout(600);
  const after = await btn.getAttribute("aria-label");
  if (before === after) throw new Error(`bookmark did not toggle: ${before}`);
});

await timed("staging: notification center renders", async () => {
  await page.goto(`${BASE}/forum/notifications`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("h1", { timeout: 15000 });
  await page.waitForTimeout(400);
});

await timed("staging: moderation dashboard shows flagged content", async () => {
  await page.goto(`${BASE}/forum/moderation`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".moderation-page", { timeout: 15000 });
  await page.waitForTimeout(800);
  const flaggedHeading = await page.getByText(/Flagged content/).count();
  if (flaggedHeading < 1) throw new Error("flagged content heading missing");
});

await timed("staging: create a discussion Publish", async () => {
  await page.goto(`${BASE}/forum/new`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#discussion-title", { timeout: 15000 });
  const title = `Playwright staging ${Date.now()}`;
  await page.fill("#discussion-title", title);
  await page.fill("#discussion-body", "Created by the Playwright browser validation run.");
  await page.click("button:has-text('Publish discussion')");
  await page.waitForURL(/\/forum\/d/, { timeout: 20000 });
  const heading = (await page.locator("h1").first().innerText());
  if (!heading.includes("Playwright staging")) throw new Error(`detail heading mismatch: ${heading}`);
});

async function goToCheckout() {
  await page.goto(`${BASE}/learner`, { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/learner$/, { timeout: 20000 });
  await page.waitForSelector("a[href='/learner/courses']", { timeout: 20000 });
  await page.click("a[href='/learner/courses']");
  await page.waitForURL(/\/learner\/courses$/, { timeout: 15000 });
  try {
    await page.locator(".course-card").first().waitFor({ timeout: 12000 });
  } catch {
    await page.waitForTimeout(1500);
    await page.locator(".course-card").first().waitFor({ timeout: 15000 });
  }
  await page.locator(".course-card").first().click();
  await page.waitForURL(/courseDetails/, { timeout: 15000 });
  await page.click("button:has-text('Buy Now')");
  await page.waitForURL(/checkout/, { timeout: 15000 });
}

await timed("staging: checkout loads for seeded course", async () => {
  await goToCheckout();
  await page.waitForSelector(".checkout-test-cards, button:has-text('Pay now')", { timeout: 20000 });
  await page.waitForTimeout(500);
});

await timed("staging: checkout success card → receipt", async () => {
  await page.locator("button.checkout-test-card:has-text('Successful')").first().click();
  await page.click("button:has-text('Pay now')");
  await page.waitForSelector("text=/Payment successful/", { timeout: 20000 });
  const orderId = await page.locator("text=/Order ID/").count();
  const enroll = await page.locator("text=/Enrollment/").count();
  const access = await page.locator("a:has-text('Access your course')").count();
  if (orderId < 1 || enroll < 1 || access < 1) throw new Error("receipt rows / access CTA missing");
  await page.screenshot({ path: `${ART}/screenshots/checkout-success.png`, fullPage: true });
  await page.waitForTimeout(500);
});

await timed("staging: declined card → FAILED → retry returns to checkout", async () => {
  await goToCheckout();
  await page.waitForSelector("button.checkout-test-card");
  await page.locator("button.checkout-test-card:has-text('Declined')").first().click();
  await page.click("button:has-text('Pay now')");
  await page.waitForSelector("text=/Payment failed/", { timeout: 20000 });
  await page.screenshot({ path: `${ART}/screenshots/checkout-declined.png`, fullPage: true });
  await page.click("button:has-text('Try again')");
  await page.waitForSelector("button:has-text('Pay now')", { timeout: 15000 });
});

await timed("staging: network-error card → FAILED screen", async () => {
  await goToCheckout();
  await page.waitForSelector("button.checkout-test-card");
  await page.locator("button.checkout-test-card:has-text('Network error')").first().click();
  await page.click("button:has-text('Pay now')");
  await page.waitForSelector("text=/Payment failed/", { timeout: 20000 });
});

await timed("staging: timeout card resolves to FAILED", async () => {
  await goToCheckout();
  await page.waitForSelector("button.checkout-test-card");
  await page.locator("button.checkout-test-card:has-text('Timeout')").first().click();
  await page.click("button:has-text('Pay now')");
  await page.waitForSelector("text=/Payment failed|timed out/i", { timeout: 25000 });
});

await ctx.close();
await browser.close();

const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok).length;
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE,
  browser: "chromium (channel: chrome)",
  summary: { passed, failed, total: results.length },
  checks: results,
};
writeFileSync(`${ART}/validation-report.json`, JSON.stringify(report, null, 2));
console.log(`\n=== Browser + Staging Validation complete: ${passed} passed / ${failed} failed ===`);
console.log(`Report: ${ART}/validation-report.json`);
process.exit(failed > 0 ? 1 : 0);