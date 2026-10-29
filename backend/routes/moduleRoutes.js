const express = require("express");

const router = express.Router();
const { authenticateToken, authorizeRoles } = require("../middleware/lmsLegacyAccess");


const {
    getAllModules,
    getModuleById,
    getModulesByCourseId,
    createModule,
    updateModule,
    deleteModule
} = require("../controllers/moduleController");


const {
    validateModuleCreate,
    validateModuleUpdate,
    validateModuleId,
    validateCourseId
} = require("../validations/moduleValidation");


// ----------------------------------------------------
// Swagger
// ----------------------------------------------------

/**
 * @swagger
 * tags:
 *   name: Modules
 *   description: Course Module Management APIs
 */


/**
 * @swagger
 * /api/modules:
 *   get:
 *     summary: Get all modules
 *     description: Returns all modules with their associated course and lessons.
 *     tags: [Modules]
 *     responses:
 *       200:
 *         description: Modules retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get(
    "/",
    getAllModules
);


/**
 * @swagger
 * /api/modules/{id}:
 *   get:
 *     summary: Get module by ID
 *     description: Returns a specific module with its course and lessons.
 *     tags: [Modules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Module ID
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 1
 *     responses:
 *       200:
 *         description: Module retrieved successfully
 *       400:
 *         description: Invalid module ID
 *       404:
 *         description: Module not found
 *       500:
 *         description: Internal server error
 */
router.get(
    "/:id",
    validateModuleId,
    getModuleById
);


/**
 * @swagger
 * /api/modules/course/{courseId}:
 *   get:
 *     summary: Get modules by course
 *     description: Returns all modules belonging to a specific course.
 *     tags: [Modules]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         description: Course ID
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 1
 *     responses:
 *       200:
 *         description: Course modules retrieved successfully
 *       400:
 *         description: Invalid course ID
 *       500:
 *         description: Internal server error
 */
router.get(
    "/course/:courseId",
    validateCourseId,
    getModulesByCourseId
);


/**
 * @swagger
 * /api/modules:
 *   post:
 *     summary: Create a new module
 *     description: Creates a module under an existing course.
 *     tags: [Modules]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - courseId
 *             properties:
 *               title:
 *                 type: string
 *                 example: Java Basics
 *               description:
 *                 type: string
 *                 nullable: true
 *                 example: Introduction to Java programming
 *               courseId:
 *                 type: integer
 *                 minimum: 1
 *                 example: 1
 *     responses:
 *       201:
 *         description: Module created successfully
 *       400:
 *         description: Module validation failed
 *       500:
 *         description: Internal server error
 */
router.post(
    "/",
    authenticateToken,
    authorizeRoles('ADMIN'),
    validateModuleCreate,
    createModule
);


/**
 * @swagger
 * /api/modules/{id}:
 *   put:
 *     summary: Update a module
 *     description: Updates the title and/or description of an existing module.
 *     tags: [Modules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Module ID
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
 *                 example: Advanced Java concepts
 *     responses:
 *       200:
 *         description: Module updated successfully
 *       400:
 *         description: Module validation failed
 *       404:
 *         description: Module not found
 *       500:
 *         description: Internal server error
 */
router.put(
    "/:id",
    authenticateToken,
    authorizeRoles('ADMIN'),
    validateModuleId,
    validateModuleUpdate,
    updateModule
);


/**
 * @swagger
 * /api/modules/{id}:
 *   delete:
 *     summary: Delete a module
 *     description: Deletes an existing module.
 *     tags: [Modules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Module ID
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 1
 *     responses:
 *       200:
 *         description: Module deleted successfully
 *       400:
 *         description: Invalid module ID
 *       404:
 *         description: Module not found
 *       500:
 *         description: Internal server error
 */
router.delete(
    "/:id",
    authenticateToken,
    authorizeRoles('ADMIN'),
    validateModuleId,
    deleteModule
);


module.exports = router;