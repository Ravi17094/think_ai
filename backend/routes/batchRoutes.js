const express = require("express");

const router = express.Router();
const { authenticateToken, authorizeRoles } = require("../middleware/lmsLegacyAccess");


const {
    getBatches,
    getBatchById,
    createBatch,
    updateBatch,
    deleteBatch,
    getBatchEnrollments,
    autoAllocateStudent
} = require("../controllers/batchController");


const {
    validateBatchCreate,
    validateBatchUpdate,
    validateBatchId,
    validateBatchEnrollmentId
} = require("../validations/batchValidation");


// ----------------------------------------------------
// Swagger
// ----------------------------------------------------

/**
 * @swagger
 * tags:
 *   name: Batches
 *   description: Batch Management APIs
 */


/**
 * @swagger
 * /api/batches:
 *   get:
 *     summary: Get all batches
 *     description: Returns all batches with course information and enrollment count.
 *     tags: [Batches]
 *     responses:
 *       200:
 *         description: Batches retrieved successfully
 *       500:
 *         description: Failed to retrieve batches
 */
router.get(
    "/",
    getBatches
);


/**
 * @swagger
 * /api/batches/auto-allocate:
 *   post:
 *     summary: Automatically allocate a student to a batch
 *     description: >
 *       Finds an active batch belonging to the selected course that has
 *       available capacity and automatically enrolls the student.
 *     tags: [Batches]
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentName
 *               - studentEmail
 *               - courseId
 *             properties:
 *               studentName:
 *                 type: string
 *                 example: Rahul Kumar
 *               studentEmail:
 *                 type: string
 *                 format: email
 *                 example: rahul@gmail.com
 *               courseId:
 *                 type: integer
 *                 minimum: 1
 *                 example: 1
 *
 *     responses:
 *       201:
 *         description: Student automatically allocated successfully
 *       400:
 *         description: Invalid student or course information
 *       409:
 *         description: No suitable batch available
 *       500:
 *         description: Internal server error
 */
router.post(
    "/auto-allocate",
    authenticateToken,
    authorizeRoles('ADMIN'),
    autoAllocateStudent
);


/**
 * @swagger
 * /api/batches:
 *   post:
 *     summary: Create a new batch
 *     tags: [Batches]
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - courseId
 *               - instructorName
 *               - capacity
 *               - startDate
 *               - endDate
 *             properties:
 *               name:
 *                 type: string
 *                 example: Node.js Weekend Batch
 *               courseId:
 *                 type: integer
 *                 minimum: 1
 *                 example: 1
 *               instructorName:
 *                 type: string
 *                 example: John Doe
 *               capacity:
 *                 type: integer
 *                 minimum: 1
 *                 example: 50
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-08-15T00:00:00.000Z"
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-10-15T00:00:00.000Z"
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
 *         description: Batch created successfully
 *       400:
 *         description: Batch validation failed
 *       500:
 *         description: Internal server error
 */
router.post(
    "/",
    authenticateToken,
    authorizeRoles('ADMIN'),
    validateBatchCreate,
    createBatch
);


/**
 * @swagger
 * /api/batches/{id}:
 *   get:
 *     summary: Get batch by ID
 *     tags: [Batches]
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
 *         description: Batch found
 *       400:
 *         description: Invalid batch ID
 *       404:
 *         description: Batch not found
 *       500:
 *         description: Internal server error
 */
router.get(
    "/:id",
    validateBatchId,
    getBatchById
);


/**
 * @swagger
 * /api/batches/{id}:
 *   put:
 *     summary: Update batch
 *     tags: [Batches]
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
 *               name:
 *                 type: string
 *                 example: MERN Stack Batch
 *               courseId:
 *                 type: integer
 *                 minimum: 1
 *                 example: 2
 *               instructorName:
 *                 type: string
 *                 example: Jane Smith
 *               capacity:
 *                 type: integer
 *                 minimum: 1
 *                 example: 60
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-09-01T00:00:00.000Z"
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-11-01T00:00:00.000Z"
 *               status:
 *                 type: string
 *                 enum:
 *                   - ACTIVE
 *                   - INACTIVE
 *                 example: ACTIVE
 *
 *     responses:
 *       200:
 *         description: Batch updated successfully
 *       400:
 *         description: Batch validation failed
 *       404:
 *         description: Batch not found
 *       500:
 *         description: Internal server error
 */
router.put(
    "/:id",
    authenticateToken,
    authorizeRoles('ADMIN'),
    validateBatchId,
    validateBatchUpdate,
    updateBatch
);


/**
 * @swagger
 * /api/batches/{id}:
 *   delete:
 *     summary: Delete batch
 *     tags: [Batches]
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
 *         description: Batch deleted successfully
 *       400:
 *         description: Invalid batch ID
 *       404:
 *         description: Batch not found
 *       409:
 *         description: Batch has existing enrollments
 *       500:
 *         description: Internal server error
 */
router.delete(
    "/:id",
    authenticateToken,
    authorizeRoles('ADMIN'),
    validateBatchId,
    deleteBatch
);


/**
 * @swagger
 * /api/batches/{batchId}/enrollments:
 *   get:
 *     summary: Get all enrollments of a batch
 *     tags: [Batches]
 *
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 1
 *
 *     responses:
 *       200:
 *         description: Batch enrollments retrieved successfully
 *       400:
 *         description: Invalid batch ID
 *       500:
 *         description: Failed to retrieve batch enrollments
 */
router.get(
    "/:batchId/enrollments",
    validateBatchEnrollmentId,
    getBatchEnrollments
);


module.exports = router;