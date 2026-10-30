const express = require("express");

const router = express.Router();
const { authenticateToken, authorizeRoles } = require("../middleware/lmsLegacyAccess");


const {
    getCourses,
    getCourseById,
    createCourse,
    updateCourse,
    deleteCourse,
    getCourseBatches
} = require("../controllers/courseController");

/**
 * @swagger
 * tags:
 *   name: Courses
 *   description: Course Management APIs
 */

/**
 * @swagger
 * /api/courses:
 *   get:
 *     summary: Get all courses
 *     tags: [Courses]
 *     responses:
 *       200:
 *         description: List of courses
 */
router.get("/", getCourses);

/**
 * @swagger
 * /api/courses/{id}:
 *   get:
 *     summary: Get course by ID
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Course found
 *       404:
 *         description: Course not found
 */
router.get("/:id", getCourseById);

/**
 * @swagger
 * /api/courses:
 *   post:
 *     summary: Create a new course
 *     tags: [Courses]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - category
 *               - price
 *               - duration
 *             properties:
 *               title:
 *                 type: string
 *                 example: Node.js Masterclass
 *               description:
 *                 type: string
 *                 example: Complete Node.js Course
 *               category:
 *                 type: string
 *                 example: Backend
 *               price:
 *                 type: number
 *                 example: 4999
 *               duration:
 *                 type: string
 *                 example: 60 Hours
 *               thumbnail:
 *                 type: string
 *                 example: node.png
 *               status:
 *                 type: string
 *                 example: ACTIVE
 *     responses:
 *       201:
 *         description: Course created successfully
 */
router.post("/", createCourse);

/**
 * @swagger
 * /api/courses/{id}:
 *   put:
 *     summary: Update course
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: Advanced Node.js
 *               description:
 *                 type: string
 *                 example: Updated Course
 *               category:
 *                 type: string
 *                 example: Backend
 *               price:
 *                 type: number
 *                 example: 5999
 *               duration:
 *                 type: string
 *                 example: 70 Hours
 *               thumbnail:
 *                 type: string
 *                 example: node-new.png
 *               status:
 *                 type: string
 *                 example: ACTIVE
 *     responses:
 *       200:
 *         description: Course updated successfully
 */
router.put("/:id", updateCourse);
router.put(
    "/:id",
    authenticateToken,
    authorizeRoles('ADMIN'),
    validateCourseId,
    validateCourseUpdate,
    updateCourse
);


/**
 * @swagger
 * /api/courses/{id}:
 *   delete:
 *     summary: Delete course
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Course deleted successfully
 *       404:
 *         description: Course not found
 */
router.delete("/:id", deleteCourse);
router.delete(
    "/:id",
    authenticateToken,
    authorizeRoles('ADMIN'),
    validateCourseId,
    deleteCourse
);

/**
 * @swagger
 * /api/courses/{courseId}/batches:
 *   get:
 *     summary: Get all batches of a course
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: List of batches
 */
router.get("/:courseId/batches", getCourseBatches);

module.exports = router;