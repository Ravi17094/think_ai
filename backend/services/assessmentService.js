const repository = require("../repositories/assessmentRepository");

// ============================================================
// VALIDATION HELPER
// ============================================================

// ============================================================
// VALIDATION
// ============================================================

const validateId = (value, name) => {
    const id = Number(value);

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error(`${name} must be a positive integer`);
    }

    return id;
};

// ============================================================
// CREATE ASSESSMENT
// ============================================================

const createAssessment = async (data) => {
    if (!data || typeof data !== "object") {
        throw new Error("Assessment data is required");
    }

    if (!Array.isArray(data.questions)) {
        throw new Error("Assessment questions must be an array");
    }

    if (data.questions.length === 0) {
        throw new Error("Assessment must contain at least one question");
    }

    return await repository.createAssessment(data);
};

// ============================================================
// GET ALL ASSESSMENTS
// ============================================================

const getAllAssessments = async (moduleId) => {
    const parsedModuleId = moduleId ? validateId(moduleId, "Module ID") : undefined;
    return await repository.getAllAssessments(parsedModuleId);
};

// ============================================================
// GET ASSESSMENT BY ID
// ============================================================

const getAssessmentById = async (id) => {
    const assessmentId = validateId(id, "Assessment ID");
    return await repository.getAssessmentById(assessmentId);
};

// ============================================================
// UPDATE ASSESSMENT
// ============================================================

const updateAssessment = async (id, data) => {
    const assessmentId = validateId(id, "Assessment ID");

    const existing = await repository.getAssessmentById(assessmentId);
    if (!existing) {
        throw new Error("Assessment not found");
    }

    if (!data || typeof data !== "object") {
        throw new Error("Update data is required");
    }

    return await repository.updateAssessment(assessmentId, data);
};

// ============================================================
// DELETE ASSESSMENT
// ============================================================

const deleteAssessment = async (id) => {
    const assessmentId = validateId(id, "Assessment ID");

    const existing = await repository.getAssessmentById(assessmentId);
    if (!existing) {
        throw new Error("Assessment not found");
    }

    return await repository.deleteAssessment(assessmentId);
};

// ============================================================
// START ASSESSMENT
// ============================================================

const startAssessment = async (assessmentId, enrollmentId) => {
    const id = validateId(assessmentId, "Assessment ID");
    const enrollment = validateId(enrollmentId, "Enrollment ID");

    return await repository.startAssessment(id, enrollment);
};

// ============================================================
// SUBMIT ASSESSMENT
// ============================================================

const submitAssessment = async (assessmentId, data) => {
    const id = validateId(assessmentId, "Assessment ID");

    if (!data || typeof data !== "object") {
        throw new Error("Assessment submission data is required");
    }

    const enrollmentId = validateId(data.enrollmentId, "Enrollment ID");

    if (!Array.isArray(data.answers)) {
        throw new Error("Answers must be an array");
    }

    if (data.answers.length === 0) {
        throw new Error("At least one answer is required");
    }

    return await repository.submitAssessment(id, {
        ...data,
        enrollmentId
    });
};

// ============================================================
// ASSESSMENT ANALYTICS
// ============================================================

const getAssessmentAnalytics = async (id) => {
    const assessmentId = validateId(id, "Assessment ID");
    return await repository.getAssessmentAnalytics(assessmentId);
};

// ============================================================
// GET SUBMISSIONS BY ASSESSMENT ID
// ============================================================

const getSubmissionsByAssessmentId = async (assessmentId) => {
    const id = validateId(assessmentId, "Assessment ID");

    const existing = await repository.getAssessmentById(id);
    if (!existing) {
        throw new Error("Assessment not found");
    }

    return await repository.getSubmissionsByAssessmentId(id);
};

// ============================================================
// JUDGE0 & SUBMISSION STATUS
// ============================================================

const saveJudge0Token = async (submissionId, judge0Token) => {
    const id = validateId(submissionId, "Submission ID");

    if (!judge0Token || typeof judge0Token !== "string") {
        throw new Error("Judge0 token is required");
    }

    return await repository.saveJudge0Token(id, judge0Token.trim());
};

const getSubmissionByJudge0Token = async (judge0Token) => {
    if (!judge0Token || typeof judge0Token !== "string") {
        throw new Error("Judge0 token is required");
    }

    return await repository.getSubmissionByJudge0Token(judge0Token.trim());
};

const updateAssessmentSubmissionStatus = async (submissionId, data) => {
    const id = validateId(submissionId, "Submission ID");

    if (!data || typeof data !== "object") {
        throw new Error("Judge0 result data is required");
    }

    return await repository.updateAssessmentSubmissionStatus(id, data);
};

// ============================================================
// CODING TEST CASE EXECUTION
// ============================================================

const createCodingTestCaseExecution = async ({
    submissionId,
    questionId,
    testCaseId,
    judge0Token
}) => {
    const parsedSubmissionId = validateId(submissionId, "Submission ID");
    const parsedQuestionId = validateId(questionId, "Question ID");
    const parsedTestCaseId = validateId(testCaseId, "Test Case ID");

    if (!judge0Token || typeof judge0Token !== "string") {
        throw new Error("Judge0 token is required");
    }

    return await repository.createCodingTestCaseExecution({
        submissionId: parsedSubmissionId,
        questionId: parsedQuestionId,
        testCaseId: parsedTestCaseId,
        judge0Token: judge0Token.trim()
    });
};

const getCodingTestCaseExecutionByToken = async (judge0Token) => {
    if (!judge0Token || typeof judge0Token !== "string") {
        throw new Error("Judge0 token is required");
    }

    return await repository.getCodingTestCaseExecutionByToken(judge0Token.trim());
};

const updateCodingTestCaseExecution = async (executionId, data) => {
    const id = validateId(executionId, "Coding execution ID");

    if (!data || typeof data !== "object") {
        throw new Error("Judge0 execution result is required");
    }

    return await repository.updateCodingTestCaseExecution(id, data);
};

const recalculateCodingQuestionScore = async (submissionId, questionId) => {
    const parsedSubmissionId = validateId(submissionId, "Submission ID");
    const parsedQuestionId = validateId(questionId, "Question ID");

    return await repository.recalculateCodingQuestionScore(
        parsedSubmissionId,
        parsedQuestionId
    );
};

const getCodingTestCasesByQuestion = async (questionId) => {
    const parsedQuestionId = validateId(questionId, "Question ID");
    return await repository.getCodingTestCasesByQuestion(parsedQuestionId);
};

// ============================================================
// ADMIN - CODING QUESTION MANAGEMENT
// ============================================================

const createCodingQuestion = async (data) => {
    if (!data || typeof data !== "object") {
        throw new Error("Coding question data is required");
    }

    const assessmentId = validateId(data.assessmentId, "Assessment ID");

    if (
        typeof data.questionText !== "string" ||
        !data.questionText.trim()
    ) {
        throw new Error("Question text is required");
    }

    if (data.testCases !== undefined && !Array.isArray(data.testCases)) {
        throw new Error("Test cases must be an array");
    }

    return await repository.createCodingQuestion({
        ...data,
        assessmentId,
        questionText: data.questionText.trim(),
        questionType: "CODING"
    });
};

const getCodingQuestions = async (assessmentId) => {
    const id = validateId(assessmentId, "Assessment ID");
    return await repository.getCodingQuestions(id);
};

const getCodingQuestionById = async (questionId) => {
    const id = validateId(questionId, "Question ID");
    return await repository.getCodingQuestionById(id);
};

const updateCodingQuestion = async (questionId, data) => {
    const id = validateId(questionId, "Question ID");

    if (!data || typeof data !== "object") {
        throw new Error("Coding question data is required");
    }

    return await repository.updateCodingQuestion(id, data);
};

const deleteCodingQuestion = async (questionId) => {
    const id = validateId(questionId, "Question ID");
    return await repository.deleteCodingQuestion(id);
};

// ============================================================
// ADMIN - CODING TEST CASE MANAGEMENT
// ============================================================

const createCodingTestCase = async (questionId, data) => {
    const id = validateId(questionId, "Question ID");

    if (!data || typeof data !== "object") {
        throw new Error("Test case data is required");
    }

    if (
        data.expectedOutput === undefined ||
        data.expectedOutput === null
    ) {
        throw new Error("Expected output is required");
    }

    return await repository.createCodingTestCase(id, data);
};

const getCodingTestCases = async (questionId) => {
    const id = validateId(questionId, "Question ID");
    return await repository.getCodingTestCases(id);
};

const updateCodingTestCase = async (testCaseId, data) => {
    const id = validateId(testCaseId, "Test Case ID");

    if (!data || typeof data !== "object") {
        throw new Error("Test case data is required");
    }

    return await repository.updateCodingTestCase(id, data);
};

const deleteCodingTestCase = async (testCaseId) => {
    const id = validateId(testCaseId, "Test Case ID");
    return await repository.deleteCodingTestCase(id);
};

// ============================================================
// ENROLLMENT ASSESSMENT STATUS
// ============================================================

const getEnrollmentAssessmentStatus = async (enrollmentId) => {
    const id = validateId(enrollmentId, "Enrollment ID");
    return await repository.getEnrollmentAssessmentStatus(id);
};

// ============================================================
// GET SUBMISSION RESULT
// ============================================================

const getAssessmentSubmissionResult = async (submissionId) => {
    const id = validateId(submissionId, "Submission ID");
    return await repository.getAssessmentSubmissionResult(id);
};

const getTaGradingQueue = async () => {
    return await repository.getTaGradingQueue();
};

const gradeSubmission = async (submissionId, data) => {
    const id = validateId(submissionId, "Submission ID");
    if (!data || typeof data !== "object") throw new Error("Grading data is required");

    const score = Number(data.score);
    if (!Number.isFinite(score)) throw new Error("score must be a number");

    return await repository.gradeSubmission(id, {
        score,
        feedback: data.feedback,
        gradedBy: data.gradedBy
    });
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    createAssessment,
    getAllAssessments,
    getAssessmentById,
    updateAssessment,
    deleteAssessment,
    submitAssessment,
    startAssessment,
    getAssessmentAnalytics,
    getSubmissionsByAssessmentId,

    // Judge0 & flow
    saveJudge0Token,
    getSubmissionByJudge0Token,
    updateAssessmentSubmissionStatus,

    // Coding test case execution & scoring
    createCodingTestCaseExecution,
    getCodingTestCaseExecutionByToken,
    updateCodingTestCaseExecution,
    recalculateCodingQuestionScore,
    getCodingTestCasesByQuestion,

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
    deleteCodingTestCase,

    // Enrollment & Results
    getEnrollmentAssessmentStatus,
    getAssessmentSubmissionResult,
    getTaGradingQueue,
    gradeSubmission
};
