const express = require("express");

const router = express.Router();

const {
    createAssessment,
    getAllAssessments,
    updateAssessment,
    deleteAssessment,
    getAssessmentById,
    submitAssessment,
    startAssessment,
    getAssessmentAnalytics,
    getAssessmentSubmissions,
    getEnrollmentAssessmentStatus,
    getTaGradingQueue,
    gradeSubmission,

    // Admin coding questions
    createCodingQuestion,
    getCodingQuestions,
    getCodingQuestionById,
    updateCodingQuestion,
    deleteCodingQuestion,

    // Admin coding test cases
    createCodingTestCase,
    getCodingTestCases,
    updateCodingTestCase,
    deleteCodingTestCase
} = require("../controllers/assessmentController");

const {
    validateAssessmentCreate,
    validateAssessmentId,
    validateAssessmentSubmit
} = require("../validations/assessmentValidation");

const prisma = require("../config/database"); // Your Prisma client
const requireRole = require("../middleware/requireRole");

// ============================================================
// SWAGGER
// ============================================================

/**
 * @swagger
 * tags:
 *   name: Assessments
 *   description: Assessment Engine APIs
 */

/**
 * @swagger
 * tags:
 *   name: Admin Coding Questions
 *   description: Admin APIs for GeeksforGeeks-style coding questions
 */

// ============================================================
// CREATE ASSESSMENT
// ============================================================

/**
 * @swagger
 * /api/assessments:
 *   post:
 *     summary: Create a new assessment
 *     tags: [Assessments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - type
 *               - totalMarks
 *               - moduleId
 *               - questions
 *             properties:
 *               title:
 *                 type: string
 *                 example: Java Fundamentals Assessment
 *               description:
 *                 type: string
 *                 example: Basic Java assessment
 *               type:
 *                 type: string
 *                 enum:
 *                   - MCQ
 *                   - CODING
 *                 example: MCQ
 *                 description: Type of assessment
 *               totalMarks:
 *                 type: integer
 *                 example: 10
 *               duration:
 *                 type: integer
 *                 example: 30
 *               status:
 *                 type: string
 *                 example: ACTIVE
 *               moduleId:
 *                 type: integer
 *                 example: 1
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     questionText:
 *                       type: string
 *                       example: Which keyword is used to inherit a class in Java?
 *                     questionType:
 *                       type: string
 *                       enum:
 *                         - MCQ
 *                         - CODING
 *                       example: MCQ
 *                     marks:
 *                       type: integer
 *                       example: 1
 *                     order:
 *                       type: integer
 *                       example: 1
 *                     options:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           optionText:
 *                             type: string
 *                             example: extends
 *                           isCorrect:
 *                             type: boolean
 *                             example: true
 *     responses:
 *       201:
 *         description: Assessment created successfully
 *       400:
 *         description: Assessment validation failed
 *       500:
 *         description: Internal server error
 */

router.post(
    "/",
    validateAssessmentCreate,
    createAssessment
);

// ============================================================
// EVALUATE CODING ASSESSMENT (Automatic Output Match & Grade Sync)
// ============================================================

/**
 * @swagger
 * /api/assessments/evaluate-coding:
 *   post:
 *     summary: Automatically evaluate student code output against expected output and award marks
 *     tags: [Assessments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - enrollmentId
 *               - assessmentId
 *               - studentOutput
 *               - expectedOutput
 *             properties:
 *               enrollmentId:
 *                 type: integer
 *                 example: 1
 *               assessmentId:
 *                 type: integer
 *                 example: 1
 *               studentOutput:
 *                 type: string
 *                 example: "40"
 *               expectedOutput:
 *                 type: string
 *                 example: "40"
 *               maxScore:
 *                 type: number
 *                 example: 10
 *     responses:
 *       200:
 *         description: Evaluation processed and marks updated successfully
 *       500:
 *         description: Internal server error during evaluation
 */
router.post("/evaluate-coding", requireRole(["Learner", "Instructor", "Admin"]), async (req, res) => {
    try {
        const { enrollmentId, assessmentId, studentOutput, expectedOutput, maxScore } = req.body;
        const isMatch = studentOutput?.trim() === expectedOutput?.trim();
        const totalPossibleMarks = maxScore || 10;
        const awardedMarks = isMatch ? totalPossibleMarks : 0;
        
        const rawPercentage = totalPossibleMarks > 0 ? (awardedMarks / totalPossibleMarks) * 100 : 0;
        const percentage = Math.min(Math.max(rawPercentage, 0), 100);

        // 3. Save or update the submission result in the database via Prisma upsert
        const submission = await prisma.assessmentSubmission.upsert({
            where: { enrollmentId_assessmentId: { enrollmentId, assessmentId } },
            update: {
                score: awardedMarks,
                percentage: percentage,
                status: isMatch ? "PASSED" : "FAILED",
                codeOutput: studentOutput,
                updatedAt: new Date()
            },
            create: {
                enrollmentId: Number(enrollmentId),
                assessmentId: Number(assessmentId),
                score: awardedMarks,
                percentage: percentage,
                status: isMatch ? "PASSED" : "FAILED",
                codeOutput: studentOutput
            }
        });

        return res.status(200).json({
            success: true,
            matched: isMatch,
            data: submission,
            message: isMatch ? "Test cases passed! Marks updated." : "Output mismatch. Try again."
        });

    } catch (error) {
        console.error("Evaluation error:", error);
        return res.status(500).json({ success: false, message: "Internal server error during evaluation" });
    }
});

// ============================================================
// ASSESSMENT ANALYTICS
// ============================================================

// ============================================================
// ASSESSMENT ANALYTICS
// ============================================================

/**
 * @swagger
 * /api/assessments/{id}/analytics:
 *   get:
 *     summary: Get assessment analytics
 *     tags: [Assessments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Assessment analytics
 *       400:
 *         description: Invalid assessment ID
 *       404:
 *         description: Assessment not found
 *       500:
 *         description: Internal server error
 */

router.get(
    "/:id/analytics",
    validateAssessmentId,
    getAssessmentAnalytics
);

// ============================================================
// START ASSESSMENT
// ============================================================

/**
 * @swagger
 * /api/assessments/{id}/start:
 *   post:
 *     summary: Start an assessment
 *     description: |
 *       Creates or returns the current assessment submission
 *       for the student's enrollment.
 *
 *       The student does not manually create a submission.
 *       The backend creates the assessment attempt and
 *       returns its submission ID.
 *
 *     tags: [Assessments]
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 7
 *         description: Assessment ID
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - enrollmentId
 *             properties:
 *               enrollmentId:
 *                 type: integer
 *                 example: 17
 *
 *     responses:
 *       200:
 *         description: Assessment started successfully
 *       400:
 *         description: Invalid assessment or enrollment
 *       404:
 *         description: Assessment or enrollment not found
 *       500:
 *         description: Failed to start assessment
 */
router.post(
    "/:id/start",
    validateAssessmentId,
    startAssessment
);

// ============================================================
// GET SUBMISSIONS & ASSESSMENT BY ID
// ============================================================

/**
 * @swagger
 * /api/assessments/{id}/submissions:
 *   get:
 *     summary: List all submissions for an assessment
 *     description: >
 *       Returns every submission for the given assessment, joined with
 *       the enrollment's student name/email. Used by the instructor's
 *       "Student Submissions" page.
 *     tags: [Assessments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: List of submissions
 *       400:
 *         description: Invalid assessment ID
 *       404:
 *         description: Assessment not found
 *       500:
 *         description: Internal server error
 */
router.get(
    "/:id/submissions",
    validateAssessmentId,
    getAssessmentSubmissions
);

/**
 * @swagger
 * /api/assessments/{id}:
 *   get:
 *     summary: Get assessment by ID
 *     tags: [Assessments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Assessment details
 *       400:
 *         description: Invalid assessment ID
 *       404:
 *         description: Assessment not found
 *       500:
 *         description: Internal server error
 */

router.get(
    "/ta/grading-queue",
    requireRole(["TA", "Instructor", "Admin"]),
    getTaGradingQueue
);

router.patch(
    "/submissions/:submissionId/grade",
    requireRole(["TA", "Instructor", "Admin"]),
    gradeSubmission
);

router.get(
    "/:id",
    validateAssessmentId,
    getAssessmentById
);

// ============================================================
// SUBMIT ASSESSMENT
// ============================================================

// ============================================================
// SUBMIT ASSESSMENT
// ============================================================

/**
 * @swagger
 * /api/assessments/{id}/submit:
 *   post:
 *     summary: Submit assessment
 *     tags: [Assessments]
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
 *             required:
 *               - enrollmentId
 *               - answers
 *             properties:
 *               enrollmentId:
 *                 type: integer
 *                 example: 1
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - questionId
 *                   properties:
 *                     questionId:
 *                       type: integer
 *                       example: 1
 *                     selectedOptionId:
 *                       type: integer
 *                       nullable: true
 *                       example: 2
 *                     code:
 *                       type: string
 *                       nullable: true
 *                       example: |
 *                         def solution(arr):
 *                             return max(arr)
 *     responses:
 *       201:
 *         description: Assessment submitted successfully
 *       400:
 *         description: Invalid assessment submission
 *       500:
 *         description: Internal server error
 */

router.post(
    "/:id/submit",
    validateAssessmentId,
    validateAssessmentSubmit,
    submitAssessment
);

// ============================================================
// GENERAL ASSESSMENT CRUD & STATUS ROUTES
// ============================================================

router.get("/", getAllAssessments);
router.put("/:id", validateAssessmentId, updateAssessment);
router.delete("/:id", validateAssessmentId, deleteAssessment);
router.get("/enrollment/:enrollmentId/status", getEnrollmentAssessmentStatus);

// ============================================================
// ADMIN - CREATE CODING QUESTION
// ============================================================

/**
 * @swagger
 * /api/admin/coding-questions:
 *   post:
 *     summary: Create a GeeksforGeeks-style coding question
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
 *               - testCases
 *             properties:
 *               assessmentId:
 *                 type: integer
 *                 example: 1
 *               title:
 *                 type: string
 *                 example: Find Maximum Element
 *               questionText:
 *                 type: string
 *                 example: Find the maximum element in an array.
 *               difficulty:
 *                 type: string
 *                 enum:
 *                   - EASY
 *                   - MEDIUM
 *                   - HARD
 *                 example: EASY
 *               marks:
 *                 type: number
 *                 example: 10
 *               order:
 *                 type: integer
 *                 example: 1
 *               problemStatement:
 *                 type: string
 *                 example: Given an array of integers, find the largest element.
 *               inputFormat:
 *                 type: string
 *                 example: First line contains N. Second line contains N integers.
 *               outputFormat:
 *                 type: string
 *                 example: Print the largest element.
 *               constraints:
 *                 type: string
 *                 example: 1 <= N <= 100000
 *               explanation:
 *                 type: string
 *                 example: Iterate through the array and keep track of the maximum.
 *               examples:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     input:
 *                       type: string
 *                       example: "5\n10 20 5 40 30"
 *                     output:
 *                       type: string
 *                       example: "40"
 *                     explanation:
 *                       type: string
 *                       example: "40 is the maximum element."
 *               supportedLanguages:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example:
 *                   - python
 *                   - javascript
 *                   - java
 *                   - cpp
 *               starterCode:
 *                 type: object
 *                 example:
 *                   python: "# Write your solution here"
 *                   javascript: "// Write your solution here"
 *                   java: "public class Main {}"
 *                   cpp: "#include <iostream>"
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
    "/admin/coding-questions",
    createCodingQuestion
);

// ============================================================
// ADMIN - GET CODING QUESTIONS
// ============================================================

/**
 * @swagger
 * /api/admin/assessments/{assessmentId}/coding-questions:
 *   get:
 *     summary: Get all coding questions for an assessment
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
    "/admin/assessments/:assessmentId/coding-questions",
    getCodingQuestions
);

// ============================================================
// ADMIN - GET CODING QUESTION
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
    "/admin/coding-questions/:questionId",
    getCodingQuestionById
);

// ============================================================
// ADMIN - UPDATE CODING QUESTION
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
 *               title:
 *                 type: string
 *               questionText:
 *                 type: string
 *               difficulty:
 *                 type: string
 *                 enum:
 *                   - EASY
 *                   - MEDIUM
 *                   - HARD
 *               marks:
 *                 type: number
 *               problemStatement:
 *                 type: string
 *               inputFormat:
 *                 type: string
 *               outputFormat:
 *                 type: string
 *               constraints:
 *                 type: string
 *               explanation:
 *                 type: string
 *               examples:
 *                 type: array
 *               supportedLanguages:
 *                 type: array
 *               starterCode:
 *                 type: object
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
    "/admin/coding-questions/:questionId",
    updateCodingQuestion
);

// ============================================================
// ADMIN - DELETE CODING QUESTION
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
 *       400:
 *         description: Invalid question ID
 *       404:
 *         description: Coding question not found
 *       500:
 *         description: Internal server error
 */
router.delete(
    "/admin/coding-questions/:questionId",
    deleteCodingQuestion
);

// ============================================================
// ADMIN - CREATE TEST CASE
// ============================================================

/**
 * @swagger
 * /api/admin/coding-questions/{questionId}/test-cases:
 *   post:
 *     summary: Create a coding test case
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
    "/admin/coding-questions/:questionId/test-cases",
    createCodingTestCase
);

// ============================================================
// ADMIN - GET TEST CASES
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
 *       400:
 *         description: Invalid question ID
 *       404:
 *         description: Coding question not found
 *       500:
 *         description: Internal server error
 */
router.get(
    "/admin/coding-questions/:questionId/test-cases",
    getCodingTestCases
);

// ============================================================
// ADMIN - UPDATE TEST CASE
// ============================================================

/**
 * @swagger
 * /api/admin/coding-test-cases/{testCaseId}:
 *   put:
 *     summary: Update coding test case
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
 *               expectedOutput:
 *                 type: string
 *               marks:
 *                 type: number
 *               isHidden:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Test case updated successfully
 *       400:
 *         description: Invalid test case
 *       404:
 *         description: Coding test case not found
 *       500:
 *         description: Internal server error
 */
router.put(
    "/admin/coding-test-cases/:testCaseId",
    updateCodingTestCase
);

// ============================================================
// ADMIN - DELETE TEST CASE
// ============================================================

/**
 * @swagger
 * /api/admin/coding-test-cases/{testCaseId}:
 *   delete:
 *     summary: Delete coding test case
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
 *       400:
 *         description: Invalid test case ID
 *       404:
 *         description: Coding test case not found
 *       500:
 *         description: Internal server error
 */
router.delete(
    "/admin/coding-test-cases/:testCaseId",
    deleteCodingTestCase
);

// ============================================================
// EXPORT
// ============================================================

// ============================================================
// ADMIN - CREATE CODING QUESTION
// ============================================================

/**
 * @swagger
 * /api/admin/coding-questions:
 *   post:
 *     summary: Create a GeeksforGeeks-style coding question
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
 *               - testCases
 *             properties:
 *               assessmentId:
 *                 type: integer
 *                 example: 1
 *               title:
 *                 type: string
 *                 example: Find Maximum Element
 *               questionText:
 *                 type: string
 *                 example: Find the maximum element in an array.
 *               difficulty:
 *                 type: string
 *                 enum:
 *                   - EASY
 *                   - MEDIUM
 *                   - HARD
 *                 example: EASY
 *               marks:
 *                 type: number
 *                 example: 10
 *               order:
 *                 type: integer
 *                 example: 1
 *               problemStatement:
 *                 type: string
 *                 example: Given an array of integers, find the largest element.
 *               inputFormat:
 *                 type: string
 *                 example: First line contains N. Second line contains N integers.
 *               outputFormat:
 *                 type: string
 *                 example: Print the largest element.
 *               constraints:
 *                 type: string
 *                 example: 1 <= N <= 100000
 *               explanation:
 *                 type: string
 *                 example: Iterate through the array and keep track of the maximum.
 *               examples:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     input:
 *                       type: string
 *                       example: "5\n10 20 5 40 30"
 *                     output:
 *                       type: string
 *                       example: "40"
 *                     explanation:
 *                       type: string
 *                       example: "40 is the maximum element."
 *               supportedLanguages:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example:
 *                   - python
 *                   - javascript
 *                   - java
 *                   - cpp
 *               starterCode:
 *                 type: object
 *                 example:
 *                   python: "# Write your solution here"
 *                   javascript: "// Write your solution here"
 *                   java: "public class Main {}"
 *                   cpp: "#include <iostream>"
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
    "/admin/coding-questions",
    createCodingQuestion
);


// ============================================================
// ADMIN - GET CODING QUESTIONS
// ============================================================

/**
 * @swagger
 * /api/admin/assessments/{assessmentId}/coding-questions:
 *   get:
 *     summary: Get all coding questions for an assessment
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
    "/admin/assessments/:assessmentId/coding-questions",
    getCodingQuestions
);


// ============================================================
// ADMIN - GET CODING QUESTION
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
    "/admin/coding-questions/:questionId",
    getCodingQuestionById
);


// ============================================================
// ADMIN - UPDATE CODING QUESTION
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
 *               title:
 *                 type: string
 *               questionText:
 *                 type: string
 *               difficulty:
 *                 type: string
 *                 enum:
 *                   - EASY
 *                   - MEDIUM
 *                   - HARD
 *               marks:
 *                 type: number
 *               problemStatement:
 *                 type: string
 *               inputFormat:
 *                 type: string
 *               outputFormat:
 *                 type: string
 *               constraints:
 *                 type: string
 *               explanation:
 *                 type: string
 *               examples:
 *                 type: array
 *               supportedLanguages:
 *                 type: array
 *               starterCode:
 *                 type: object
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
    "/admin/coding-questions/:questionId",
    updateCodingQuestion
);


// ============================================================
// ADMIN - DELETE CODING QUESTION
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
 *       400:
 *         description: Invalid question ID
 *       404:
 *         description: Coding question not found
 *       500:
 *         description: Internal server error
 */

router.delete(
    "/admin/coding-questions/:questionId",
    deleteCodingQuestion
);


// ============================================================
// ADMIN - CREATE TEST CASE
// ============================================================

/**
 * @swagger
 * /api/admin/coding-questions/{questionId}/test-cases:
 *   post:
 *     summary: Create a coding test case
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
    "/admin/coding-questions/:questionId/test-cases",
    createCodingTestCase
);


// ============================================================
// ADMIN - GET TEST CASES
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
 *       400:
 *         description: Invalid question ID
 *       404:
 *         description: Coding question not found
 *       500:
 *         description: Internal server error
 */

router.get(
    "/admin/coding-questions/:questionId/test-cases",
    getCodingTestCases
);


// ============================================================
// ADMIN - UPDATE TEST CASE
// ============================================================

/**
 * @swagger
 * /api/admin/coding-test-cases/{testCaseId}:
 *   put:
 *     summary: Update coding test case
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
 *               expectedOutput:
 *                 type: string
 *               marks:
 *                 type: number
 *               isHidden:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Test case updated successfully
 *       400:
 *         description: Invalid test case
 *       404:
 *         description: Coding test case not found
 *       500:
 *         description: Internal server error
 */

router.put(
    "/admin/coding-test-cases/:testCaseId",
    updateCodingTestCase
);


// ============================================================
// ADMIN - DELETE TEST CASE
// ============================================================

/**
 * @swagger
 * /api/admin/coding-test-cases/{testCaseId}:
 *   delete:
 *     summary: Delete coding test case
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
 *       400:
 *         description: Invalid test case ID
 *       404:
 *         description: Coding test case not found
 *       500:
 *         description: Internal server error
 */

router.delete(
    "/admin/coding-test-cases/:testCaseId",
    deleteCodingTestCase
);


// ============================================================
// EXPORT
// ============================================================

module.exports = router;
