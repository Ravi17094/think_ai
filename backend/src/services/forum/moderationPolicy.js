/**
 * Community moderation policy (client-specific thresholds).
 *
 * Applies the configured report thresholds to a piece of forum content:
 *
 *   - >= autoFlagReports reports (3)          -> flagged for moderator review
 *   - >= hideReports reports (5) within 1 hour -> auto-hidden + flagged
 *
 * The thresholds live in config/forum.config.js (moderationThresholds) and the
 * policy is intentionally data-driven: no magic numbers here.
 */

const { moderationThresholds } = require("../../../config/forum.config");
const db = require("../../data/mockData");
const Discussion = require("../../models/Discussion");
const Comment = require("../../models/Comment");

const { autoFlagReports, hideReports, hideWindowMs } = moderationThresholds;

/**
 * Resolve a piece of content by type. Returns the raw record or null.
 */
function resolveContent(contentType, contentId) {
    if (contentType === "discussion") return Discussion.findById(contentId);
    if (contentType === "comment") return Comment.findById(contentId);
    return null;
}

/**
 * Reports for `contentId` still inside the hide window (first report + window).
 * Only these count towards the auto-flag/hide thresholds.
 */
function reportsInWindow(contentType, contentId) {
    const now = Date.now();
    return db.reports
        .filter((r) => r.contentType === contentType && r.contentId === contentId)
        .filter((r) => {
            const created = new Date(r.createdAt).getTime();
            return now - created <= hideWindowMs;
        });
}

/** All reports ever recorded for a piece of content (for the reports queue). */
function listReports(contentType, contentId) {
    return db.reports
        .filter((r) => r.contentType === contentType && r.contentId === contentId)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function reportCount(contentType, contentId) {
    return reportsInWindow(contentType, contentId).length;
}

/**
 * Records a user report and evaluates the auto-flag / auto-hide thresholds.
 *
 * Returns the fully-resolved status so callers (flag endpoints) can respond
 * with the correct code and message. Idempotent per (content, reporter) within
 * the current process — repeat reports by the same user today are de-duplicated.
 */
function applyReport({ contentType, contentId, reporterUserId, reason }) {
    const content = resolveContent(contentType, contentId);
    if (!content) {
        return { ok: false, error: `${contentType} not found` };
    }
    if (content.hidden) {
        return { ok: true, action: "hidden-existing", reportCount: 0, flagged: content.flagged, hidden: true };
    }

    const fresh = { createdAt: new Date().toISOString() };
    if (
        reporterUserId &&
        db.reports.some(
            (r) =>
                r.contentType === contentType &&
                r.contentId === contentId &&
                r.reporterUserId === reporterUserId &&
                new Date(r.createdAt).getTime() >= Date.now() - hideWindowMs
        )
    ) {
        return { ok: true, action: "already-reported", reportCount: reportCount(contentType, contentId), flagged: content.flagged, hidden: false };
    }

    const report = {
        id: db.makeId("rep"),
        contentType,
        contentId,
        reporterUserId: reporterUserId || null,
        reason: reason || "Reported by user",
        createdAt: fresh.createdAt
    };
    db.reports.push(report);

    const inWindow = reportsInWindow(contentType, contentId);
    const total = inWindow.length;

    let action = "recorded";
    let flagged = content.flagged;
    let hidden = Boolean(content.hidden);

    if (total >= hideReports) {
        const reason = `${total} reports (auto-hidden by community policy)`;
        if (contentType === "discussion") {
            Discussion.setFlagged(contentId, true, reason);
            Discussion.setHidden(contentId, true);
        } else if (contentType === "comment") {
            Comment.setFlagged(contentId, true, reason);
            Comment.setHidden(contentId, true);
        }
        flagged = true;
        hidden = true;
        action = "auto-hidden";
    } else if (total >= autoFlagReports) {
        const setter = contentType === "discussion" ? Discussion : Comment;
        setter.setFlagged(contentId, true, `${total} reports (auto-flagged by community policy)`);
        flagged = true;
        action = "flagged";
    }

    return {
        ok: true,
        action,
        reportCount: total,
        flagged,
        hidden,
        autoFlagReports,
        hideReports
    };
}

/**
 * Current policy state for a piece of content: report count + status flags.
 * Used by the flag/moderate UI ("Reported (3/3)" style hints).
 */
function contentStatus(contentType, contentId) {
    const content = resolveContent(contentType, contentId);
    if (!content) return null;
    return {
        contentType,
        contentId,
        reportCount: reportCount(contentType, contentId),
        flagged: Boolean(content.flagged),
        hidden: Boolean(content.hidden),
        autoFlagReports,
        hideReports,
        hideWindowMs
    };
}

/** Read-only snapshot of the policy thresholds (exposed via /moderation/policy). */
function policySummary() {
    return {
        autoFlagReports,
        hideReports,
        hideWindowMs,
        autoHideIsPermanent: moderationThresholds.autoHideIsPermanent,
        windowLabel: "1 hour"
    };
}

const moderationPolicy = { applyReport, contentStatus, policySummary, listReports, reportCount, reportsInWindow };

module.exports = moderationPolicy;