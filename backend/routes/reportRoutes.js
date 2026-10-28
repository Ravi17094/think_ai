const express = require("express");
const prisma = require("../config/database");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

function sendReport(req, res, filename, rows) {
  if (req.query.format !== "csv") return res.json({ success: true, data: rows });
  const headers = Object.keys(rows[0] || {});
  const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
  return res.send(csv);
}

router.get("/grading-progress", requireRole(["TA", "Instructor", "Admin"]), async (_req, res) => {
  try {
    const assessments = await prisma.assessment.findMany({ select: { id: true, title: true, totalMarks: true, submissions: { select: { status: true } } } });
    const data = assessments.map((assessment) => ({ assessmentId: assessment.id, title: assessment.title, totalMarks: assessment.totalMarks, graded: assessment.submissions.filter((item) => item.status === "GRADED").length, pending: assessment.submissions.filter((item) => item.status === "SUBMITTED").length, total: assessment.submissions.length }));
    return sendReport(req, res, "grading-progress", data);
  } catch (error) { res.status(500).json({ success: false, message: "Could not load grading progress" }); }
});

router.get("/student-engagement", requireRole(["TA", "Instructor", "Admin"]), async (_req, res) => {
  try {
    const enrollments = await prisma.enrollment.findMany({ select: { id: true, studentName: true, studentEmail: true, attendanceRecords: { select: { status: true } }, assessmentSubmissions: { select: { percentage: true } } } });
    const data = enrollments.map((item) => { const records = item.attendanceRecords; const present = records.filter((record) => record.status === "PRESENT" || record.status === "TARDY").length; const scores = item.assessmentSubmissions.map((submission) => submission.percentage).filter(Number.isFinite); return { enrollmentId: item.id, studentName: item.studentName, studentEmail: item.studentEmail, attendancePercentage: records.length ? Number(((present / records.length) * 100).toFixed(1)) : null, averageScore: scores.length ? Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1)) : null, submissions: item.assessmentSubmissions.length }; });
    return sendReport(req, res, "student-engagement", data);
  } catch (error) { res.status(500).json({ success: false, message: "Could not load student engagement" }); }
});

module.exports = router;
