const express = require("express");
const router = express.Router();
const { getQueueStatus } = require("../services/notificationQueueService");
const {
  getPreferencesByUserId,
  upsertPreferences,
} = require("../services/notificationPreferenceService");

/**
 * GET /notifications/preferences/:userId
 * Returns a user's notification preferences.
 * Used by Karthik's notification dropdown UI to load current settings.
 */
router.get("/preferences/:userId", (req, res, next) => {
  const userId = parseInt(req.params.userId, 10);

  // Non-numeric ids (e.g. the Forum module's "u1") are owned by the Forum
  // notification router, mounted later at `/api`. Pass the request through.
  if (Number.isNaN(userId)) {
    return next();
  }

  const prefs = getPreferencesByUserId(userId);

  if (!prefs) {
    return res.status(404).json({
      success: false,
      message: "No preferences found for this user",
    });
  }

  res.status(200).json({ success: true, data: prefs });
});

/**
 * PUT /notifications/preferences/:userId
 * Creates or updates a user's notification preferences.
 * Body: { emailEnabled, smsEnabled, pushEnabled, categories: {...} }
 * Any fields omitted are left unchanged (or defaulted, if new user).
 */
router.put("/preferences/:userId", (req, res, next) => {
  const userId = parseInt(req.params.userId, 10);

  // Forum-style string ids are handled by the Forum notification router.
  if (Number.isNaN(userId)) {
    return next();
  }

  const updates = req.body;

  const updated = upsertPreferences(userId, updates);

  res.status(200).json({
    success: true,
    message: "Preferences updated",
    data: updated,
  });
});
/**
 * GET /notifications/queue/status
 * Returns current queue state — pending count and recent jobs.
 * Useful for demo/debugging.
 */
router.get("/queue/status", (req, res) => {
  res.status(200).json({ success: true, data: getQueueStatus() });
});

module.exports = router;