const express = require("express");

const router = express.Router();
const { authenticateToken, authorizeRoles } = require("../middleware/lmsLegacyAccess");


const {
    getEnrollments,
    getEnrollmentById,
    createEnrollment,
    updateEnrollment,
    unlockCourseAccess,
    deleteEnrollment
} = require("../controllers/enrollmentController");


const {
    validateEnrollmentCreate,
    validateEnrollmentUpdate,
    validateEnrollmentId
} = require("../validations/enrollmentValidation");


/**
 * @swagger
 * tags:
 *   name: Enrollments
 *   description: Enrollment Management APIs
 */


/**
 * @swagger
 * /api/enrollments:
 *   get:
 *     summary: Get all enrollments
 *     description: Returns all student enrollments with batch and course information.
 *     tags: [Enrollments]
 *     responses:
 *       200:
 *         description: Enrollments retrieved successfully
 *       500:
 *         description: Failed to retrieve enrollments
 */
router.get(
    "/",
    getEnrollments
);


/**
 * @swagger
 * /api/enrollments:
 *   post:
 *     summary: Create a new enrollment
 *     description: Enrolls a student into the selected batch. If the selected batch is full, the service may allocate another available batch for the same course.
 *     tags: [Enrollments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentName
 *               - studentEmail
 *               - batchId
 *             properties:
 *               studentName:
 *                 type: string
 *                 example: Roopesh
 *               studentEmail:
 *                 type: string
 *                 format: email
 *                 example: roopesh@gmail.com
 *               batchId:
 *                 type: integer
 *                 minimum: 1
 *                 example: 1
 *               enrollmentStatus:
 *                 type: string
 *                 enum:
 *                   - ENROLLED
 *                   - COMPLETED
 *                   - CANCELLED
 *                 default: ENROLLED
 *                 example: ENROLLED
 *     responses:
 *       201:
 *         description: Enrollment created successfully
 *       400:
 *         description: Invalid enrollment data or unavailable batch
 *       409:
 *         description: Student is already enrolled in this batch
 *       500:
 *         description: Failed to create enrollment
 */
router.post(
    "/",
    authenticateToken,
    authorizeRoles('ADMIN'),
    validateEnrollmentCreate,
    createEnrollment
);


/**
 * @swagger
 * /api/enrollments/{id}/course-access:
 *   patch:
 *     summary: Unlock course access
 *     description: Unlocks course access after successful payment verification.
 *     tags: [Enrollments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Enrollment ID
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 17
 *     responses:
 *       200:
 *         description: Course access unlocked successfully
 *       400:
 *         description: Invalid enrollment ID
 *       404:
 *         description: Enrollment not found
 *       500:
 *         description: Failed to unlock course access
 */
router.patch(
    "/:id/course-access",
    authenticateToken,
    authorizeRoles('ADMIN'),
    validateEnrollmentId,
    (req, res) => res.status(503).json({
        success: false,
        code: "PAYMENT_WEBHOOK_REQUIRED",
        message: "Course access can only be unlocked by the approved payment webhook."
    })
);


/**
 * @swagger
 * /api/enrollments/{id}:
 *   get:
 *     summary: Get enrollment by ID
 *     tags: [Enrollments]
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
 *         description: Enrollment details retrieved successfully
 *       400:
 *         description: Invalid enrollment ID
 *       404:
 *         description: Enrollment not found
 *       500:
 *         description: Failed to retrieve enrollment
 */
router.get(
    "/:id",
    validateEnrollmentId,
    getEnrollmentById
);


/**
 * @swagger
 * /api/enrollments/{id}:
 *   put:
 *     summary: Update enrollment
 *     tags: [Enrollments]
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
 *               studentName:
 *                 type: string
 *                 example: Roopesh H
 *               studentEmail:
 *                 type: string
 *                 format: email
 *                 example: roopesh@gmail.com
 *               batchId:
 *                 type: integer
 *                 minimum: 1
 *                 example: 1
 *               enrollmentStatus:
 *                 type: string
 *                 enum:
 *                   - ENROLLED
 *                   - COMPLETED
 *                   - CANCELLED
 *                 example: COMPLETED
 *     responses:
 *       200:
 *         description: Enrollment updated successfully
 *       400:
 *         description: Invalid enrollment data
 *       404:
 *         description: Enrollment not found
 *       500:
 *         description: Failed to update enrollment
 */
router.put(
    "/:id",
    authenticateToken,
    authorizeRoles('ADMIN'),
    validateEnrollmentId,
    validateEnrollmentUpdate,
    updateEnrollment
);


/**
 * @swagger
 * /api/enrollments/{id}:
 *   delete:
 *     summary: Delete enrollment
 *     tags: [Enrollments]
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
 *         description: Enrollment deleted successfully
 *       400:
 *         description: Invalid enrollment ID
 *       404:
 *         description: Enrollment not found
 *       409:
 *         description: Enrollment cannot be deleted because related data exists
 *       500:
 *         description: Failed to delete enrollment
 */
router.delete(
    "/:id",
    authenticateToken,
    authorizeRoles('ADMIN'),
    validateEnrollmentId,
    deleteEnrollment
);


module.exports = router;