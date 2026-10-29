const express = require('express');
const prisma = require('../config/database');
const requireRole = require('../middleware/requireRole');

const router = express.Router();
const staffOnly = requireRole(['Instructor', 'Admin', 'TA']);
const defaultControls = { muted: false, chatDisabled: false, spotlight: false, recording: false };

function safeChecklist(value) { return Array.isArray(value) ? value.filter((item) => typeof item === 'string').slice(0, 30) : []; }
function safeControls(value) { const next = { ...defaultControls }; for (const key of Object.keys(defaultControls)) if (typeof value?.[key] === 'boolean') next[key] = value[key]; return next; }
function serialize(row) { return { checklist: safeChecklist(row?.checklist), controls: safeControls(row?.controls), updatedAt: row?.updatedAt ?? null }; }

router.get('/:sessionId', staffOnly, async (req, res) => {
  try { const row = await prisma.instructorSessionControl.findUnique({ where: { userId_sessionId: { userId: String(req.user.id), sessionId: req.params.sessionId } } }); return res.json({ success: true, data: serialize(row) }); }
  catch { return res.status(500).json({ success: false, message: 'Could not load instructor controls.' }); }
});

router.put('/:sessionId', staffOnly, async (req, res) => {
  try {
    const row = await prisma.instructorSessionControl.upsert({ where: { userId_sessionId: { userId: String(req.user.id), sessionId: req.params.sessionId } }, create: { userId: String(req.user.id), sessionId: req.params.sessionId, checklist: safeChecklist(req.body?.checklist), controls: safeControls(req.body?.controls) }, update: { checklist: safeChecklist(req.body?.checklist), controls: safeControls(req.body?.controls) } });
    return res.json({ success: true, data: serialize(row), message: 'Instructor controls saved.' });
  } catch { return res.status(500).json({ success: false, message: 'Could not save instructor controls.' }); }
});

module.exports = router;
