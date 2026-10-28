/**
 * Community moderation policy configuration (client-specific).
 *
 * All thresholds and moderator permissions referenced by the task live here so
 * the moderation pipeline is data-driven rather than hard-coded.
 */

const moderationThresholds = {
  /** Number of user reports required before a post is auto-flagged for review. */
  autoFlagReports: 3,

  /** Number of reports required (within the window below) for an auto-hide. */
  hideReports: 5,

  /** The auto-hide window: 5 reports *within 1 hour* of the first report. */
  hideWindowMs: 60 * 60 * 1000,

  /** Content remains hidden permanently after an auto-hide (manual review can unshelve). */
  autoHideIsPermanent: false
};

/**
 * Moderator role definition.
 *
 * id and permissions are the client-mandated values from the task:
 *   id = "moderator"
 *   permissions = ["forum:read", "forum:hide-post", "forum:warn-user", "forum:view-reports"]
 */
const moderatorRole = {
  id: "moderator",
  name: "Moderator",
  description: "Client community manager assigned to moderate the community forum.",
  permissions: [
    "forum:read",
    "forum:hide-post",
    "forum:warn-user",
    "forum:view-reports"
  ]
};

/** Client support + review contacts used across moderation, checkout and guidelines. */
const communityConfig = {
  clientDomain: "clientdomain.com",
  supportEmail: "learning-support@clientdomain.com",
  legalReviewStatus: "submitted",
  legalReviewOwner: "Client Legal Team <legal@clientdomain.com>"
};

const forumConfig = { moderationThresholds, moderatorRole, communityConfig };

module.exports = forumConfig;