import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Module independence guard (Phase 9).
 *
 * The Forum module must remain fully self-contained: it may use React,
 * react-router-dom and socket.io-client, but must NOT depend on other
 * app features (redux store, shared axios client, auth/admin/learner
 * pages or components) so it can be lifted out of the codebase as a unit.
 */

const SRC_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const FORUM_SERVICES = [
    "forumApi.js",
    "categoryApi.js",
    "bookmarkApi.js",
    "moderationApi.js",
    "studioApi.js",
    "tagApi.js",
    "websocket.js",
    "forumSocketClient.js"
];

const FORUM_HOOKS = ["useDiscussions.js", "useVoting.js", "useBookmarks.js", "useWebSocket.js", "useForumSocket.js"];

const MODULE_DIRS = [
    path.join(SRC_ROOT, "components", "forum"),
    path.join(SRC_ROOT, "components", "liveStudio"),
    path.join(SRC_ROOT, "components", "moderation"),
    path.join(SRC_ROOT, "pages", "forum"),
    path.join(SRC_ROOT, "pages", "liveStudio"),
    path.join(SRC_ROOT, "pages", "moderation"),
    ...FORUM_SERVICES.map((file) => path.join(SRC_ROOT, "services", file)),
    ...FORUM_HOOKS.map((file) => path.join(SRC_ROOT, "hooks", file)),
    path.join(SRC_ROOT, "routes", "ForumModuleRoutes.jsx")
];

const FORBIDDEN = [
    /(^|\/)axios(\/|$)/, // shared axios client lives in src/api — forum uses fetch
    /^react-redux/,
    /^@reduxjs/,
    /(pages|components)\/(auth|admin|learner|public)/,
    /store\//,
    /payment|billing|stripe|razorpay|paypal|subscription/i,
    /email.*transport|sms.*twilio|sendgrid|nodemailer|mailer/i,
];

const ALLOWED_PREFIXES = ["react", "react-dom", "react-router", "socket.io-client", "lucide-react"];

function collectFiles(target, acc = []) {
    const stat = statSync(target);
    if (stat.isFile()) {
        if (/\.(jsx?|js)$/.test(target)) acc.push(target);
        return acc;
    }
    for (const entry of readdirSync(target)) {
        collectFiles(path.join(target, entry), acc);
    }
    return acc;
}

function moduleFiles() {
    return MODULE_DIRS.flatMap((dir) => {
        try {
            return collectFiles(dir);
        } catch {
            return [];
        }
    });
}

function importSpecifiers(source) {
    const specifiers = [];
    const patterns = [
        /import\s+[^'"]*?from\s*['"]([^'"]+)['"]/g,
        /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
        /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
    ];
    for (const pattern of patterns) {
        let match = pattern.exec(source);
        while (match !== null) {
            specifiers.push(match[1]);
            match = pattern.exec(source);
        }
    }
    return specifiers;
}

describe("Forum module independence", () => {
    const files = moduleFiles();

    it("finds the module source files to scan", () => {
        expect(files.length).toBeGreaterThan(20);
    });

    it("never imports the shared axios client or redux store", () => {
        const violations = [];
        for (const file of files) {
            const source = readFileSync(file, "utf8");
            for (const specifier of importSpecifiers(source)) {
                for (const rule of FORBIDDEN) {
                    if (rule.test(specifier)) violations.push(`${path.relative(SRC_ROOT, file)} → ${specifier}`);
                }
            }
        }
        expect(violations).toEqual([]);
    });

    it("only relies on react, react-router-dom and socket.io-client as external runtime deps", () => {
        const external = new Set();
        for (const file of files) {
            const source = readFileSync(file, "utf8");
            for (const specifier of importSpecifiers(source)) {
                if (!specifier.startsWith(".") && !specifier.startsWith("/")) external.add(specifier.split("/")[0]);
            }
        }
        for (const pkg of external) {
            expect(ALLOWED_PREFIXES.some((prefix) => pkg.startsWith(prefix))).toBe(true);
        }
    });

    it("keeps all forum services self-contained with their own fetch wrapper", () => {
        const forumApi = readFileSync(path.join(SRC_ROOT, "services", "forumApi.js"), "utf8");
        expect(forumApi).toContain("fetch(");
        expect(forumApi).not.toMatch(/from\s+['"].*axios/);

        for (const service of ["categoryApi.js", "bookmarkApi.js", "moderationApi.js", "studioApi.js"]) {
            const source = readFileSync(path.join(SRC_ROOT, "services", service), "utf8");
            expect(source).not.toMatch(/from\s+['"].*api\/axios/);
        }
    });
});
