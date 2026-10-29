const express = require("express");
const router = express.Router();
const { getQueueStatus } = require("../services/notificationQueueService");
const {
  getPreferencesByUserId,
  upsertPreferences,
} = require("../services/notificationPreferenceService");
const prisma = require("../config/database");
const requireRole = require("../middleware/requireRole");

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

router.put("/device-token", requireRole(["Admin", "Instructor", "TA", "Learner"]), async (req, res) => {
  const expoPushToken = String(req.body?.expoPushToken || "").trim();
  const platform = String(req.body?.platform || "unknown").slice(0, 20);
  if (!/^ExponentPushToken\[.+\]$|^ExpoPushToken\[.+\]$/.test(expoPushToken)) {
    return res.status(400).json({ success: false, message: "A valid Expo push token is required." });
  }
  try {
    const token = await prisma.devicePushToken.upsert({
      where: { expoPushToken },
      create: { expoPushToken, platform, userId: String(req.user.id) },
      update: { platform, userId: String(req.user.id) },
    });
    return res.json({ success: true, data: { id: token.id, updatedAt: token.updatedAt } });
  } catch {
    return res.status(500).json({ success: false, message: "Could not register this device." });
  }
});

module.exports = router;
