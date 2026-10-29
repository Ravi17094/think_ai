const express = require('express');
const prisma = require('../config/database');
const requireRole = require('../middleware/requireRole');

const router = express.Router();
const staffOnly = requireRole(['TA', 'Instructor', 'Admin']);

function serialize(submission) {
  return {
    id: submission.id,
    assessmentTitle: submission.assessment.title,
    learnerName: submission.enrollment.studentName,
    learnerEmail: submission.enrollment.studentEmail,
    score: submission.score,
    totalMarks: submission.totalMarks,
    feedback: submission.feedback,
    submittedAt: submission.submittedAt,
    status: submission.status,
  };
}

router.get('/grading-queue', staffOnly, async (_req, res) => {
  try {
    const rows = await prisma.assessmentSubmission.findMany({
      where: { status: { in: ['SUBMITTED', 'GRADED'] } },
      include: {
        assessment: { select: { title: true } },
        enrollment: { select: { studentName: true, studentEmail: true } },
      },
      orderBy: { submittedAt: 'asc' },
    });
    res.json({ success: true, data: rows.map(serialize) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not load the grading queue.' });
  }
});

router.patch('/submissions/:id/grade', staffOnly, async (req, res) => {
  const id = Number(req.params.id);
  const score = Number(req.body?.score);
  const feedback = typeof req.body?.feedback === 'string' ? req.body.feedback.trim() : '';
  if (!Number.isInteger(id) || id <= 0 || !Number.isFinite(score) || score < 0) {
    return res.status(400).json({ success: false, message: 'A valid submission and non-negative score are required.' });
  }
  try {
    const existing = await prisma.assessmentSubmission.findUnique({ where: { id }, select: { totalMarks: true } });
    if (!existing) return res.status(404).json({ success: false, message: 'Submission not found.' });
    if (score > existing.totalMarks) return res.status(400).json({ success: false, message: `Score cannot exceed ${existing.totalMarks}.` });
    const row = await prisma.assessmentSubmission.update({
      where: { id },
      data: {
        score,
        percentage: existing.totalMarks ? Number(((score / existing.totalMarks) * 100).toFixed(2)) : 0,
        feedback: feedback || null,
        gradedBy: req.user?.email || req.user?.id || req.user?.role || 'TA',
        gradedAt: new Date(),
        status: 'GRADED',
      },
      include: {
        assessment: { select: { title: true } },
        enrollment: { select: { studentName: true, studentEmail: true } },
      },
    });
    res.json({ success: true, data: serialize(row), message: 'Grade saved.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not save the grade.' });
  }
});

// Batch grading keeps validation and audit fields identical to single grading.
// The transaction makes the action all-or-nothing for the selected learners.
router.post('/submissions/bulk-grade', staffOnly, async (req, res) => {
  const submissions = Array.isArray(req.body?.submissions) ? req.body.submissions : [];
  if (!submissions.length || submissions.length > 100) {
    return res.status(400).json({ success: false, message: 'Select between 1 and 100 submissions.' });
  }
  try {
    const ids = submissions.map((item) => Number(item?.id));
    if (ids.some((id) => !Number.isInteger(id) || id <= 0) || new Set(ids).size !== ids.length) {
      return res.status(400).json({ success: false, message: 'Each selected submission must have a unique valid id.' });
    }
    const existing = await prisma.assessmentSubmission.findMany({ where: { id: { in: ids } }, select: { id: true, totalMarks: true } });
    if (existing.length !== ids.length) return res.status(404).json({ success: false, message: 'One or more submissions were not found.' });
    const marks = new Map(existing.map((item) => [item.id, item.totalMarks]));
    const now = new Date();
    await prisma.$transaction(submissions.map((item) => {
      const id = Number(item.id); const score = Number(item.score); const totalMarks = marks.get(id);
      if (!Number.isFinite(score) || score < 0 || score > totalMarks) throw new Error(`Invalid score for submission ${id}.`);
      const feedback = typeof item.feedback === 'string' ? item.feedback.trim() : '';
      return prisma.assessmentSubmission.update({ where: { id }, data: { score, percentage: totalMarks ? Number(((score / totalMarks) * 100).toFixed(2)) : 0, feedback: feedback || null, gradedBy: req.user?.email || req.user?.id || req.user?.role || 'TA', gradedAt: now, status: 'GRADED' } });
    }));
    const rows = await prisma.assessmentSubmission.findMany({ where: { id: { in: ids } }, include: { assessment: { select: { title: true } }, enrollment: { select: { studentName: true, studentEmail: true } } } });
    return res.json({ success: true, data: rows.map(serialize), message: `${rows.length} grades saved.` });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || 'Could not save selected grades.' });
  }
});

module.exports = router;
