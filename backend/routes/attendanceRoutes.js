const express = require("express");
const prisma = require("../config/database");
const requireRole = require("../middleware/requireRole");

const router = express.Router();
const allowedStatuses = ["PRESENT", "LATE", "ABSENT", "EXCUSED"];

function parseSessionDate(value) {
  const dateText = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    throw new Error("sessionDate must use YYYY-MM-DD format");
  }
  return new Date(`${dateText}T00:00:00.000Z`);
}

router.get("/ta/register", requireRole(["TA", "Instructor", "Admin"]), async (req, res) => {
  try {
    const sessionDate = parseSessionDate(req.query.sessionDate || new Date().toISOString().slice(0, 10));
    const sessionTitle = String(req.query.sessionTitle || "TA session").trim() || "TA session";
    const enrollments = await prisma.enrollment.findMany({
      where: { courseAccess: true, enrollmentStatus: "ENROLLED" },
      include: {
        batch: { include: { course: { select: { title: true } } } },
        attendanceRecords: { where: { sessionDate, sessionTitle }, select: { id: true, status: true, notes: true } }
      },
      orderBy: { studentName: "asc" }
    });

    const data = enrollments.map((enrollment) => ({
      enrollmentId: enrollment.id,
      studentName: enrollment.studentName,
      studentEmail: enrollment.studentEmail,
      courseTitle: enrollment.batch.course.title,
      status: enrollment.attendanceRecords[0]?.status || "PRESENT",
      notes: enrollment.attendanceRecords[0]?.notes || ""
    }));
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || "Could not load attendance register" });
  }
});

router.put("/ta/record", requireRole(["TA", "Instructor", "Admin"]), async (req, res) => {
  try {
    const enrollmentId = Number(req.body?.enrollmentId);
    const sessionTitle = String(req.body?.sessionTitle || "").trim();
    const status = String(req.body?.status || "").toUpperCase();
    const sessionDate = parseSessionDate(req.body?.sessionDate);

    if (!Number.isInteger(enrollmentId) || enrollmentId <= 0) throw new Error("A valid enrollmentId is required");
    if (!sessionTitle) throw new Error("sessionTitle is required");
    if (!allowedStatuses.includes(status)) throw new Error("Status must be PRESENT, LATE, ABSENT, or EXCUSED");

    const record = await prisma.attendanceRecord.upsert({
      where: { enrollmentId_sessionDate_sessionTitle: { enrollmentId, sessionDate, sessionTitle } },
      create: {
        enrollmentId,
        sessionDate,
        sessionTitle,
        status,
        notes: typeof req.body?.notes === "string" ? req.body.notes.trim() || null : null,
        recordedBy: req.user?.email || req.user?.id || "TA"
      },
      update: {
        status,
        notes: typeof req.body?.notes === "string" ? req.body.notes.trim() || null : null,
        recordedBy: req.user?.email || req.user?.id || "TA"
      }
    });
    return res.status(200).json({ success: true, message: "Attendance saved", data: record });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || "Could not save attendance" });
  }
});

router.get("/ta/report", requireRole(["TA", "Instructor", "Admin"]), async (req, res) => {
  try {
    const [attendanceGroups, pendingGrades, gradedSubmissions, activeModules, activeAssessments] = await Promise.all([
      prisma.attendanceRecord.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.assessmentSubmission.count({ where: { status: "SUBMITTED" } }),
      prisma.assessmentSubmission.aggregate({
        where: { status: "GRADED" },
        _count: { _all: true },
        _avg: { percentage: true }
      }),
      prisma.module.count(),
      prisma.assessment.count({ where: { status: "ACTIVE" } })
    ]);

    const attendance = { PRESENT: 0, LATE: 0, ABSENT: 0, EXCUSED: 0 };
    attendanceGroups.forEach((group) => { attendance[group.status] = group._count._all; });

    return res.status(200).json({
      success: true,
      data: {
        attendance: { ...attendance, total: Object.values(attendance).reduce((sum, count) => sum + count, 0) },
        grading: {
          pending: pendingGrades,
          graded: gradedSubmissions._count._all,
          averagePercentage: gradedSubmissions._avg.percentage ? Number(gradedSubmissions._avg.percentage.toFixed(1)) : null
        },
        coursework: { activeModules, activeAssessments }
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load TA report" });
  }
});

module.exports = router;
