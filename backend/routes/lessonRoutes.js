const express = require("express");

const router = express.Router();
const { authenticateToken, authorizeRoles } = require("../middleware/lmsLegacyAccess");


const {
    getAllLessons,
    getLessonById,
    getLessonsByModuleId,
    createLesson,
    updateLesson,
    deleteLesson
} = require("../controllers/lessonController");


const {
    validateLessonCreate,
    validateLessonUpdate,
    validateLessonId,
    validateModuleLessonId
} = require("../validations/lessonValidation");


// ----------------------------------------------------
// Swagger
// ----------------------------------------------------

/**
 * @swagger
 * tags:
 *   name: Lessons
 *   description: Course Lesson Management APIs
 */


/**
 * @swagger
 * /api/lessons:
 *   get:
 *     summary: Get all lessons
 *     description: Returns all lessons ordered by module and lesson order.
 *     tags: [Lessons]
 *     responses:
 *       200:
 *         description: Lessons retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get(
    "/",
    getAllLessons
);


/**
 * @swagger
 * /api/lessons/module/{moduleId}:
 *   get:
 *     summary: Get lessons by module
 *     description: Returns all lessons belonging to a specific module.
 *     tags: [Lessons]
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 1
 *     responses:
 *       200:
 *         description: Lessons retrieved successfully
 *       400:
 *         description: Invalid module ID
 *       500:
 *         description: Internal server error
 */
router.get(
    "/module/:moduleId",
    validateModuleLessonId,
    getLessonsByModuleId
);


/**
 * @swagger
 * /api/lessons:
 *   post:
 *     summary: Create a lesson
 *     tags: [Lessons]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - moduleId
 *             properties:
 *               title:
 *                 type: string
 *                 example: Introduction to Java
 *               description:
 *                 type: string
 *                 nullable: true
 *                 example: Learn the basics of Java
 *               content:
 *                 type: string
 *                 nullable: true
 *                 example: Java is a programming language...
 *               videoUrl:
 *                 type: string
 *                 nullable: true
 *                 example: https://example.com/videos/java-introduction.mp4
 *               duration:
 *                 type: string
 *                 nullable: true
 *                 example: 30 minutes
 *               order:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *                 example: 1
 *               moduleId:
 *                 type: integer
 *                 minimum: 1
 *                 example: 1
 *     responses:
 *       201:
 *         description: Lesson created successfully
 *       400:
 *         description: Lesson validation failed
 *       500:
 *         description: Internal server error
 */
router.post(
    "/",
    authenticateToken,
    authorizeRoles('ADMIN'),
    validateLessonCreate,
    createLesson
);


/**
 * @swagger
 * /api/lessons/{id}:
 *   get:
 *     summary: Get lesson by ID
 *     tags: [Lessons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 1
 *     responses:
 *       200:
 *         description: Lesson retrieved successfully
 *       400:
 *         description: Invalid lesson ID
 *       404:
 *         description: Lesson not found
 *       500:
 *         description: Internal server error
 */
router.get(
    "/:id",
    validateLessonId,
    getLessonById
);


/**
 * @swagger
 * /api/lessons/{id}:
 *   put:
 *     summary: Update a lesson
 *     tags: [Lessons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
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
 *                 example: Advanced Java
 *               description:
 *                 type: string
 *                 nullable: true
 *                 example: Advanced Java concepts
 *               content:
 *                 type: string
 *                 nullable: true
 *                 example: Learn advanced Java concepts...
 *               videoUrl:
 *                 type: string
 *                 nullable: true
 *                 example: https://example.com/videos/advanced-java.mp4
 *               duration:
 *                 type: string
 *                 nullable: true
 *                 example: 45 minutes
 *               order:
 *                 type: integer
 *                 minimum: 0
 *                 example: 2
 *               moduleId:
 *                 type: integer
 *                 minimum: 1
 *                 example: 1
 *     responses:
 *       200:
 *         description: Lesson updated successfully
 *       400:
 *         description: Lesson validation failed
 *       404:
 *         description: Lesson not found
 *       500:
 *         description: Internal server error
 */
router.put(
    "/:id",
    authenticateToken,
    authorizeRoles('ADMIN'),
    validateLessonId,
    validateLessonUpdate,
    updateLesson
);


/**
 * @swagger
 * /api/lessons/{id}:
 *   delete:
 *     summary: Delete a lesson
 *     tags: [Lessons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 1
 *     responses:
 *       200:
 *         description: Lesson deleted successfully
 *       400:
 *         description: Invalid lesson ID
 *       404:
 *         description: Lesson not found
 *       409:
 *         description: Lesson cannot be deleted because related data exists
 *       500:
 *         description: Internal server error
 */
router.delete(
    "/:id",
    authenticateToken,
    authorizeRoles('ADMIN'),
    validateLessonId,
    deleteLesson
);


module.exports = router;