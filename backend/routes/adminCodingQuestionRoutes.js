const express = require("express");

const router = express.Router();
const { authenticateToken, authorizeRoles } = require("../middleware/lmsLegacyAccess");

const {
    createCodingQuestion,
    getCodingQuestions,
    getCodingQuestionById,
    updateCodingQuestion,
    deleteCodingQuestion,

    createCodingTestCase,
    getCodingTestCases,
    updateCodingTestCase,
    deleteCodingTestCase
} = require("../controllers/assessmentController");


// ============================================================
// SWAGGER
// ============================================================

/**
 * @swagger
 * tags:
 *   name: Admin Coding Questions
 *   description: Admin APIs for managing coding questions and test cases
 */


// ============================================================
// CREATE CODING QUESTION
// ============================================================

/**
 * @swagger
 * /api/admin/coding-questions:
 *   post:
 *     summary: Create a coding question
 *     description: Create a GeeksforGeeks-style coding problem.
 *     tags: [Admin Coding Questions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assessmentId
 *               - questionText
 *             properties:
 *               assessmentId:
 *                 type: integer
 *                 example: 1
 *               questionText:
 *                 type: string
 *                 example: Find the maximum element in an array.
 *               marks:
 *                 type: integer
 *                 example: 10
 *               order:
 *                 type: integer
 *                 example: 1
 *               testCases:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - expectedOutput
 *                   properties:
 *                     input:
 *                       type: string
 *                       example: "5\n10 20 5 40 30"
 *                     expectedOutput:
 *                       type: string
 *                       example: "40"
 *                     marks:
 *                       type: number
 *                       example: 2
 *                     isHidden:
 *                       type: boolean
 *                       example: false
 *     responses:
 *       201:
 *         description: Coding question created successfully
 *       400:
 *         description: Invalid coding question
 *       404:
 *         description: Assessment not found
 *       500:
 *         description: Internal server error
 */

router.post(
    "/coding-questions",
    authenticateToken,
    authorizeRoles('ADMIN'),
    createCodingQuestion
);


// ============================================================
// GET CODING QUESTIONS FOR ASSESSMENT
// ============================================================

/**
 * @swagger
 * /api/admin/assessments/{assessmentId}/coding-questions:
 *   get:
 *     summary: Get coding questions for an assessment
 *     tags: [Admin Coding Questions]
 *     parameters:
 *       - in: path
 *         name: assessmentId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Coding questions retrieved successfully
 *       400:
 *         description: Invalid assessment ID
 *       500:
 *         description: Internal server error
 */

router.get(
    "/assessments/:assessmentId/coding-questions",
    authenticateToken,
    authorizeRoles('ADMIN'),
    getCodingQuestions
);


// ============================================================
// GET CODING QUESTION
// ============================================================

/**
 * @swagger
 * /api/admin/coding-questions/{questionId}:
 *   get:
 *     summary: Get coding question by ID
 *     tags: [Admin Coding Questions]
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Coding question retrieved successfully
 *       400:
 *         description: Invalid question ID
 *       404:
 *         description: Coding question not found
 *       500:
 *         description: Internal server error
 */

router.get(
    "/coding-questions/:questionId",
    authenticateToken,
    authorizeRoles('ADMIN'),
    getCodingQuestionById
);


// ============================================================
// UPDATE CODING QUESTION
// ============================================================

/**
 * @swagger
 * /api/admin/coding-questions/{questionId}:
 *   put:
 *     summary: Update coding question
 *     tags: [Admin Coding Questions]
 *     parameters:
 *       - in: path
 *         name: questionId
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
 *               questionText:
 *                 type: string
 *                 example: Find the largest number in an array.
 *               marks:
 *                 type: integer
 *                 example: 10
 *               order:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Coding question updated successfully
 *       400:
 *         description: Invalid question
 *       404:
 *         description: Coding question not found
 *       500:
 *         description: Internal server error
 */

router.put(
    "/coding-questions/:questionId",
    authenticateToken,
    authorizeRoles('ADMIN'),
    updateCodingQuestion
);


// ============================================================
// DELETE CODING QUESTION
// ============================================================

/**
 * @swagger
 * /api/admin/coding-questions/{questionId}:
 *   delete:
 *     summary: Delete coding question
 *     tags: [Admin Coding Questions]
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Coding question deleted successfully
 *       404:
 *         description: Coding question not found
 *       500:
 *         description: Internal server error
 */

router.delete(
    "/coding-questions/:questionId",
    authenticateToken,
    authorizeRoles('ADMIN'),
    deleteCodingQuestion
);


// ============================================================
// CREATE TEST CASE
// ============================================================

/**
 * @swagger
 * /api/admin/coding-questions/{questionId}/test-cases:
 *   post:
 *     summary: Create a test case for a coding question
 *     tags: [Admin Coding Questions]
 *     parameters:
 *       - in: path
 *         name: questionId
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
 *             required:
 *               - expectedOutput
 *             properties:
 *               input:
 *                 type: string
 *                 example: "5\n10 20 5 40 30"
 *               expectedOutput:
 *                 type: string
 *                 example: "40"
 *               marks:
 *                 type: number
 *                 example: 2
 *               isHidden:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Test case created successfully
 *       400:
 *         description: Invalid test case
 *       404:
 *         description: Coding question not found
 *       500:
 *         description: Internal server error
 */

router.post(
    "/coding-questions/:questionId/test-cases",
    authenticateToken,
    authorizeRoles('ADMIN'),
    createCodingTestCase
);


// ============================================================
// GET TEST CASES
// ============================================================

/**
 * @swagger
 * /api/admin/coding-questions/{questionId}/test-cases:
 *   get:
 *     summary: Get test cases for a coding question
 *     tags: [Admin Coding Questions]
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Test cases retrieved successfully
 *       404:
 *         description: Coding question not found
 *       500:
 *         description: Internal server error
 */

router.get(
    "/coding-questions/:questionId/test-cases",
    authenticateToken,
    authorizeRoles('ADMIN'),
    getCodingTestCases
);


// ============================================================
// UPDATE TEST CASE
// ============================================================

/**
 * @swagger
 * /api/admin/coding-test-cases/{testCaseId}:
 *   put:
 *     summary: Update a coding test case
 *     tags: [Admin Coding Questions]
 *     parameters:
 *       - in: path
 *         name: testCaseId
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
 *               input:
 *                 type: string
 *                 example: "3\n1 2 3"
 *               expectedOutput:
 *                 type: string
 *                 example: "3"
 *               marks:
 *                 type: number
 *                 example: 2
 *               isHidden:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Test case updated successfully
 *       404:
 *         description: Test case not found
 *       500:
 *         description: Internal server error
 */

router.put(
    "/coding-test-cases/:testCaseId",
    authenticateToken,
    authorizeRoles('ADMIN'),
    updateCodingTestCase
);


// ============================================================
// DELETE TEST CASE
// ============================================================

/**
 * @swagger
 * /api/admin/coding-test-cases/{testCaseId}:
 *   delete:
 *     summary: Delete a coding test case
 *     tags: [Admin Coding Questions]
 *     parameters:
 *       - in: path
 *         name: testCaseId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Test case deleted successfully
 *       404:
 *         description: Test case not found
 *       500:
 *         description: Internal server error
 */

router.delete(
    "/coding-test-cases/:testCaseId",
    authenticateToken,
    authorizeRoles('ADMIN'),
    deleteCodingTestCase
);


// ============================================================
// EXPORT
// ============================================================

module.exports = router;
