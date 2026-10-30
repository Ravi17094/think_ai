const express = require("express");

const router = express.Router();
const { authenticateToken, authorizeRoles } = require("../middleware/lmsLegacyAccess");

const {
    getBatches,
    getBatchById,
    createBatch,
    updateBatch,
    deleteBatch,
    getBatchEnrollments
} = require("../controllers/batchController");

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
 *     tags: [Batches]
 *     responses:
 *       200:
 *         description: List of batches
 */
router.get("/", getBatches);

/**
 * @swagger
 * /api/batches/{id}:
 *   get:
 *     summary: Get batch by ID
 *     tags: [Batches]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Batch details
 *       404:
 *         description: Batch not found
 */
router.get("/:id", getBatchById);
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
 *                 example: 1
 *               instructorName:
 *                 type: string
 *                 example: John Doe
 *               capacity:
 *                 type: integer
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
 *                 example: ACTIVE
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
router.post("/", createBatch);

/**
 * @swagger
 * /api/batches/{id}:
 *   put:
 *     summary: Update batch
 *     tags: [Batches]
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
 *               name:
 *                 type: string
 *                 example: MERN Stack Batch
 *               courseId:
 *                 type: integer
 *                 example: 2
 *               instructorName:
 *                 type: string
 *                 example: Jane Smith
 *               capacity:
 *                 type: integer
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
 *                 example: ACTIVE
 *     responses:
 *       200:
 *         description: Batch updated successfully
 *       404:
 *         description: Batch not found
 */
router.put("/:id", updateBatch);
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
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Batch deleted successfully
 *       404:
 *         description: Batch not found
 */
router.delete("/:id", deleteBatch);
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
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: List of enrollments
 */
router.get("/:batchId/enrollments", getBatchEnrollments);

module.exports = router;