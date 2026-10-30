const express = require("express");

const router = express.Router();

const {
    executeCode,
    gradingCallback
} = require("../controllers/codeExecutionController");

const {
    getAssessmentSubmissionResult
} = require("../controllers/assessmentController");

const {
    validateCodeExecution
} = require("../validations/codeExecutionValidation");

const { practiceRun } = require("../controllers/codeExecutionController");
const { authenticateToken, authorizeRoles } = require("../middleware/lmsLegacyAccess");
const { requireOwnedCodeAttempt, redactLearnerAnswers } = require("../middleware/lmsLegacyOwnership");
const { internalCallbackAuth } = require("../middleware/internalCallbackAuth");
const learnerOnly = [authenticateToken, authorizeRoles("Learner")];
router.post("/practice-run", ...learnerOnly, practiceRun);


// ----------------------------------------------------
// Swagger
// ----------------------------------------------------

/**
 * @swagger
 * tags:
 *   name: Code Execution
 *   description: Judge0 Code Execution Proxy APIs
 */


/**
 * @swagger
 * /api/code/execute:
 *   post:
 *     summary: Execute source code using Judge0
 *     tags: [Code Execution]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - language
 *               - code
 *               - submissionId
 *             properties:
 *               language:
 *                 type: string
 *                 example: javascript
 *                 description: Programming language
 *               code:
 *                 type: string
 *                 example: console.log("Hello World");
 *                 description: Source code to execute
 *               stdin:
 *                 type: string
 *                 example: ""
 *                 description: Standard input for the program
 *               submissionId:
 *                 type: integer
 *                 example: 1
 *                 description: Assessment submission ID
 *
 *     responses:
 *       201:
 *         description: Code submission created successfully
 *       400:
 *         description: Invalid code execution request
 *       502:
 *         description: Judge0 execution service failed
 *       503:
 *         description: Judge0 is not configured
 */
router.post(
    "/execute",
    "/run",
    ...learnerOnly,
    requireOwnedCodeAttempt({ publicTestCase: true }),
    redactLearnerAnswers,
    validateCodeExecution,
    executeCode
);


/**
 * @swagger
 * /api/code/submit:
 *   post:
 *     summary: Submit coding solution
 *     description: |
 *       Submits a coding solution in GeeksforGeeks style.
 *
 *       The student's code is executed against every
 *       test case belonging to the coding question.
 *
 *       Both public and hidden test cases are executed.
 *
 *       Hidden test case input and expected output
 *       are never returned to the student.
 *
 *       Marks are calculated after all Judge0
 *       executions are completed.
 *
 *     tags: [Code Execution]
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *
 *             required:
 *               - submissionId
 *               - questionId
 *               - language
 *               - code
 *
 *             properties:
 *
 *               submissionId:
 *                 type: integer
 *                 example: 6
 *                 description: Assessment submission ID
 *
 *               questionId:
 *                 type: integer
 *                 example: 23
 *                 description: Coding question ID
 *
 *               language:
 *                 type: string
 *                 example: python
 *                 description: Programming language
 *
 *               code:
 *                 type: string
 *                 example: |
 *                   n = int(input())
 *                   arr = list(map(int, input().split()))
 *                   print(max(arr))
 *                 description: Student source code
 *
 *     responses:
 *
 *       202:
 *         description: Code submitted and all test cases are being evaluated
 *
 *       400:
 *         description: Invalid coding submission
 *
 *       404:
 *         description: Assessment submission, question, or test case not found
 *
 *       502:
 *         description: Judge0 execution service failed
 *
 *       503:
 *         description: Judge0 is not configured
 *
 *       500:
 *         description: Code submission service failed
 */
router.post(
    "/submit",
    ...learnerOnly,
    requireOwnedCodeAttempt(),
    redactLearnerAnswers,
    submitCode
);


/**
 * @swagger
 * /api/code/callback:
 *   put:
 *     summary: Receive Judge0 grading callback
 *     tags: [Code Execution]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 example: "8a5f5d9b-edff-48c1-8172-c4c315b3d28e"
 *               status:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 3
 *                   description:
 *                     type: string
 *                     example: Accepted
 *               stdout:
 *                 type: string
 *                 example: "Hello World"
 *               stderr:
 *                 type: string
 *                 nullable: true
 *               compile_output:
 *                 type: string
 *                 nullable: true
 *               time:
 *                 type: string
 *                 example: "0.015"
 *               memory:
 *                 type: integer
 *                 example: 10240
 *
 *     responses:
 *       200:
 *         description: Grading result processed successfully
 *       400:
 *         description: Judge0 token is missing
 *       404:
 *         description: Assessment submission not found
 *       500:
 *         description: Failed to process grading result
 */
router.put(
    "/callback",
    internalCallbackAuth("judge0"),
    gradingCallback
);


/**
 * @swagger
 * /api/code/submissions/{submissionId}:
 *   get:
 *     summary: Get code execution result
 *     description: Returns the Judge0 execution result and assessment submission status.
 *     tags: [Code Execution]
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Assessment submission ID
 *
 *     responses:
 *       200:
 *         description: Code execution result retrieved successfully
 *
 *       400:
 *         description: Invalid submission ID
 *
 *       404:
 *         description: Assessment submission not found
 *
 *       500:
 *         description: Failed to get assessment submission result
 */
router.get(
    "/submissions/:submissionId",
    ...learnerOnly,
    requireOwnedCodeAttempt({ readOnly: true }),
    redactLearnerAnswers,
    getAssessmentSubmissionResult
);


module.exports = router;