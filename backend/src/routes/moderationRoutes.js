const express = require("express");

const router = express.Router();

const moderationController = require("../controllers/moderationController");
const User = require("../models/User");

router.get("/flagged", moderationController.flaggedQueue);
router.get("/hidden", moderationController.hiddenContent);
router.get("/policy", moderationController.policy);
router.get("/roles", moderationController.roles);
router.get("/reports", moderationController.reportLedger);
router.get("/users", moderationController.listUsers);
router.get("/users/search", (req, res) => {
    const q = String(req.query.q || "").toLowerCase();
    if (!q) return res.status(200).json({ success: true, data: User.list() });
    const results = User.list().filter(
        (u) => u.username.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)
    );
    res.status(200).json({ success: true, data: results });
});
router.get("/audit-log", moderationController.getAuditLog);
router.post("/users/:id/ban", moderationController.banUser);
router.post("/users/:id/unban", moderationController.unbanUser);
router.post("/users/:id/warn", moderationController.warnUser);
router.post("/users/:id/mute", moderationController.muteUser);
router.patch("/content/:id", moderationController.setContentVisibility);
router.post("/content/:id/resolve", moderationController.resolveContent);

module.exports = router;
