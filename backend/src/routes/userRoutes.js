/**
 * Required user-facing aliases used by the React Native client:
 *   GET   /api/users/search?q=...
 *   GET   /api/users/:id/notification-preferences
 *   PATCH /api/users/:id/notification-preferences
 *
 * Search delegates to the existing moderation user directory and preference
 * reads/writes go through the mobile projection service, so no other module's
 * route or storage is touched.
 */

const express = require("express");

const router = express.Router();

const User = require("../models/User");
const { resolveUserId } = require("../middleware/authMiddleware");
const notificationPreferencesService = require("../services/notificationPreferencesService");

router.get("/search", (req, res) => {
    const q = String(req.query.q || "").trim().toLowerCase();
    const users = User.list();
    const data = q
        ? users.filter(
              (user) =>
                  user.username.toLowerCase().includes(q) ||
                  user.name.toLowerCase().includes(q) ||
                  (user.email || "").toLowerCase().includes(q)
          )
        : users;
    res.status(200).json({ success: true, data });
});

router.get("/:id/notification-preferences", (req, res) => {
    const userId = String(req.params.id || "").trim() || resolveUserId(req);
    res.status(200).json({
        success: true,
        data: notificationPreferencesService.getPreferences(userId),
    });
});

router.patch("/:id/notification-preferences", (req, res) => {
    const userId = String(req.params.id || "").trim() || resolveUserId(req);
    res.status(200).json({
        success: true,
        data: notificationPreferencesService.savePreferences(userId, req.body),
    });
});

module.exports = router;
