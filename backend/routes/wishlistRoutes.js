const express = require("express");
const prisma = require("../config/database");
const requireRole = require("../middleware/requireRole");

const router = express.Router();
router.use(requireRole(["Learner", "TA", "Instructor", "Admin"]));

function userId(req) {
  const id = Number(req.user?.id);
  if (!Number.isInteger(id) || id <= 0) throw new Error("A numeric authenticated user id is required.");
  return id;
}

router.get("/", async (req, res) => {
  try {
    const rows = await prisma.wishlistItem.findMany({ where: { userId: userId(req) }, orderBy: { createdAt: "desc" } });
    return res.json({ success: true, data: rows.map((row) => String(row.courseId)) });
  } catch (error) { return res.status(400).json({ success: false, message: error.message || "Could not load wishlist." }); }
});

router.put("/", async (req, res) => {
  try {
    const id = userId(req);
    const raw = Array.isArray(req.body?.courseIds) ? req.body.courseIds : null;
    if (!raw || raw.length > 500) return res.status(400).json({ success: false, message: "courseIds must contain between 0 and 500 course ids." });
    const courseIds = [...new Set(raw.map(Number))];
    if (courseIds.some((courseId) => !Number.isInteger(courseId) || courseId <= 0)) return res.status(400).json({ success: false, message: "courseIds must contain positive integer ids." });
    if (courseIds.length) {
      const count = await prisma.course.count({ where: { id: { in: courseIds } } });
      if (count !== courseIds.length) return res.status(404).json({ success: false, message: "One or more courses were not found." });
    }
    await prisma.$transaction([
      prisma.wishlistItem.deleteMany({ where: { userId: id } }),
      ...(courseIds.length ? [prisma.wishlistItem.createMany({ data: courseIds.map((courseId) => ({ userId: id, courseId })) })] : []),
    ]);
    return res.json({ success: true, data: courseIds.map(String) });
  } catch (error) { return res.status(400).json({ success: false, message: error.message || "Could not save wishlist." }); }
});

module.exports = router;
