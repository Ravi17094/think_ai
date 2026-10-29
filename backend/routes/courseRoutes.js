const express = require("express");

const router = express.Router();
const { authenticateToken, authorizeRoles } = require("../middleware/lmsLegacyAccess");


const {
    getCourses,
    getCourseById,
    createCourse,
    updateCourse,
    deleteCourse,
    getCourseBatches,
    getCourseContent
} = require("../controllers/courseController");


const {
    validateCourseCreate,
    validateCourseUpdate,
    validateCourseId,
    validateCourseParamId
} = require("../validations/courseValidation");


// ----------------------------------------------------
// Swagger
// ----------------------------------------------------

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
 *     description: Returns paginated courses with optional title search.
 *     tags: [Courses]
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         example: 1
 *
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         example: 10
 *
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *         example: Java
 *
 *     responses:
 *       200:
 *         description: Courses retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get(
    "/",
    getCourses
);


/**
 * @swagger
 * /api/courses/{courseId}/content:
 *   get:
 *     summary: Get complete course content
 *     description: Returns course details including modules and lessons.
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 1
 *
 *     responses:
 *       200:
 *         description: Course content retrieved successfully
 *       400:
 *         description: Invalid course ID
 *       404:
 *         description: Course not found
 *       500:
 *         description: Internal server error
 */
router.get(
    "/:courseId/content",
    validateCourseParamId,
    getCourseContent
);


/**
 * @swagger
 * /api/courses/{courseId}/batches:
 *   get:
 *     summary: Get all batches of a course
 *     description: Returns all batches belonging to the specified course.
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 1
 *
 *     responses:
 *       200:
 *         description: Course batches retrieved successfully
 *       400:
 *         description: Invalid course ID
 *       500:
 *         description: Internal server error
 */
router.get(
    "/:courseId/batches",
    validateCourseParamId,
    getCourseBatches
);


/**
 * @swagger
 * /api/courses:
 *   post:
 *     summary: Create a new course
 *     tags: [Courses]
 *
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
 *                 minimum: 0
 *                 example: 4999
 *               duration:
 *                 type: string
 *                 example: 60 Hours
 *               thumbnail:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *                 example: https://example.com/node-thumbnail.jpg
 *               videoUrl:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *                 example: https://example.com/node-course.mp4
 *               instructorName:
 *                 type: string
 *                 nullable: true
 *                 example: John Doe
 *               instructorDetails:
 *                 type: string
 *                 nullable: true
 *                 example: Senior Backend Developer
 *               status:
 *                 type: string
 *                 enum:
 *                   - ACTIVE
 *                   - INACTIVE
 *                 default: ACTIVE
 *                 example: ACTIVE
 *
 *     responses:
 *       201:
 *         description: Course created successfully
 *       400:
 *         description: Course validation failed
 *       500:
 *         description: Internal server error
 */
router.post(
    "/",
    authenticateToken,
    authorizeRoles(['Admin']),
    validateCourseCreate,
    createCourse
);


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
 *           minimum: 1
 *         example: 1
 *
 *     responses:
 *       200:
 *         description: Course found
 *       400:
 *         description: Invalid course ID
 *       404:
 *         description: Course not found
 *       500:
 *         description: Internal server error
 */
router.get(
    "/:id",
    validateCourseId,
    getCourseById
);


/**
 * @swagger
 * /api/courses/{id}:
 *   put:
 *     summary: Update course
 *     tags: [Courses]
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 1
 *
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
 *                 example: Updated Node.js Course
 *               category:
 *                 type: string
 *                 example: Backend
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 example: 5999
 *               duration:
 *                 type: string
 *                 example: 70 Hours
 *               thumbnail:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *               videoUrl:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *               instructorName:
 *                 type: string
 *                 nullable: true
 *               instructorDetails:
 *                 type: string
 *                 nullable: true
 *               status:
 *                 type: string
 *                 enum:
 *                   - ACTIVE
 *                   - INACTIVE
 *
 *     responses:
 *       200:
 *         description: Course updated successfully
 *       400:
 *         description: Course validation failed
 *       404:
 *         description: Course not found
 *       500:
 *         description: Internal server error
 */
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
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 1
 *
 *     responses:
 *       200:
 *         description: Course deleted successfully
 *       400:
 *         description: Invalid course ID
 *       404:
 *         description: Course not found
 *       409:
 *         description: Course has related records
 *       500:
 *         description: Internal server error
 */
router.delete(
    "/:id",
    authenticateToken,
    authorizeRoles('ADMIN'),
    validateCourseId,
    deleteCourse
);


module.exports = router;