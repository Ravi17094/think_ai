const express = require("express");
const router = express.Router();
const requireRole = require("../middleware/requireRole");
const { getEntries, toCSV } = require("../services/auditLogService");

router.get("/", requireRole(["Admin"]), (req, res) => {
  const { role, action, from, to } = req.query;
  const entries = getEntries({ role, action, from, to });
  res.status(200).json({ success: true, count: entries.length, data: entries });
});

router.get("/export", requireRole(["Admin"]), (req, res) => {
  const { role, action, from, to } = req.query;
  const entries = getEntries({ role, action, from, to });
  const csv = toCSV(entries);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=audit-log.csv");
  res.status(200).send(csv);
});

module.exports = router;