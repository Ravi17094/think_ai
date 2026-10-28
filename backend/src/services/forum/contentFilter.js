/**
 * Community content filter.
 *
 * Loads the client-provided blocked-terms list (config/client-blocked-terms.json)
 * and applies it to forum content submissions and edits. When a blocked term is
 * found the caller typically holds the content for review instead of publishing.
 */

const blockedTermsConfig = require("../../../config/client-blocked-terms.json");

const BLOCKED_TERMS = (blockedTermsConfig.terms || [])
    .map((term) => String(term).trim().toLowerCase())
    .filter(Boolean);

/** Exported for tooling/tests so the config source is introspectable. */
const TERM_SOURCE = {
    source: blockedTermsConfig.source,
    provider: blockedTermsConfig.provider,
    version: blockedTermsConfig.version,
    lastUpdated: blockedTermsConfig.lastUpdated,
    count: BLOCKED_TERMS.length
};

/**
 * Returns every client blocked term present in `text` (case-insensitive,
 * multi-term phrases matched as whole substrings).
 */
function findBlockedTerms(text) {
    const haystack = String(text || "").toLowerCase();
    const matches = [];
    for (const term of BLOCKED_TERMS) {
        if (haystack.includes(term)) matches.push(term);
    }
    return matches;
}

/**
 * True when `text` triggers at least one client blocked term.
 */
function hasBlockedContent(text) {
    return findBlockedTerms(text).length > 0;
}

/** Sanitizes content for display: strips control chars + collapses whitespace. */
function sanitizeContent(text) {
    return String(text || "")
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
        .replace(/[ \t]+/g, " ")
        .trim();
}

const contentFilter = { BLOCKED_TERMS, TERM_SOURCE, findBlockedTerms, hasBlockedContent, sanitizeContent };

module.exports = contentFilter;