const service = require("../services/assessmentService");

// ============================================================
// VALIDATION HELPERS
// ============================================================

const isValidationError = (message = "") => {
    return (
        message.includes("must be a positive integer") ||
        message.includes("must be an array") ||
        message.includes("is required") ||
        message.includes("At least one answer is required") ||
        message.includes("At least one coding test case is required") ||
        message.includes("must be greater than 0")
    );
};

const sendControllerError = (
    res,
    error,
    notFoundMessages = []
) => {
    const message =
        error?.message ||
        "Internal server error";

    if (isValidationError(message)) {
        return res.status(400).json({
            success: false,
            message
        });
    }

    if (notFoundMessages.includes(message)) {
        return res.status(404).json({
            success: false,
            message
        });
    }

    return res.status(500).json({
        success: false,
        message
    });
};


// ============================================================
// CREATE ASSESSMENT
// ============================================================

const createAssessment = async (req, res) => {
    try {
        const assessment =
            await service.createAssessment(
                req.body
            );

        return res.status(201).json({

            success: true,
            message: "Assessment created successfully",
            data: assessment
        });

    } catch (error) {
        console.error(
            "Create assessment error:",
            error
        );

        return sendControllerError(
            res,
            error,
            [
                "Assessment not found"
            ]
        );
    }
};


// ============================================================
// GET ENROLLMENT ASSESSMENT STATUS
// ============================================================

const getEnrollmentAssessmentStatus = async (req, res) => {
    try {
        const status =
            await service.getEnrollmentAssessmentStatus(
                req.params.enrollmentId
            );

        return res.status(200).json({
            success: true,
            data: status
        });

    } catch (error) {
        console.error(
            "Enrollment assessment status error:",
            error
        );

        if (error.message === "Enrollment not found") {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// ============================================================
// GET ALL ASSESSMENTS
// ============================================================

const getAllAssessments = async (req, res) => {
    try {
        const { moduleId } = req.query;

        const assessments =
            await service.getAllAssessments(moduleId);

        return res.status(200).json({
            success: true,
            data: assessments
        });

    } catch (error) {
        console.error(
            "Get all assessments error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// ============================================================
// UPDATE ASSESSMENT
// ============================================================

const updateAssessment = async (req, res) => {
    try {
        const assessment =
            await service.updateAssessment(
                req.params.id,
                req.body
            );

        return res.status(200).json({
            success: true,
            data: assessment
        });

    } catch (error) {
        console.error(
            "Update assessment error:",
            error
        );

        if (error.message === "Assessment not found") {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// ============================================================
// DELETE ASSESSMENT
// ============================================================

const deleteAssessment = async (req, res) => {
    try {
        await service.deleteAssessment(
            req.params.id
        );

        return res.status(200).json({
            success: true,
            message: "Assessment deleted successfully"
        });

    } catch (error) {
        console.error(
            "Delete assessment error:",
            error
        );

        if (error.message === "Assessment not found") {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// ============================================================
// GET ASSESSMENT BY ID
// ============================================================

const getAssessmentById = async (req, res) => {
    try {
        const assessment =
            await service.getAssessmentById(
                req.params.id
            );

        if (!assessment) {

            return res.status(404).json({

                success: false,
                message: "Assessment not found"
            });
        }

        return res.status(200).json({

            success: true,

            data: assessment
        });

    } catch (error) {
        console.error(
            "Get assessment error:",
            error
        );

        return sendControllerError(
            res,
            error,
            [
                "Assessment not found"
            ]
        );
    }
};


// ============================================================
// START ASSESSMENT
// ============================================================

const startAssessment = async (req, res) => {
    try {
        const submission =
            await service.startAssessment(
                req.params.id,
                req.body.enrollmentId
            );

        return res.status(200).json({
            success: true,
            message: "Assessment started successfully",
            data: {
                submissionId: submission.id,
                assessmentId: submission.assessmentId,
                enrollmentId: submission.enrollmentId,
                status: submission.status,
                totalMarks: submission.totalMarks,
                score: submission.score,
                percentage: submission.percentage
            }
        });

    } catch (error) {
        console.error(
            "Start assessment error:",
            error
        );

        const message =
            error?.message ||
            "Failed to start assessment";

        if (isValidationError(message)) {
            return res.status(400).json({
                success: false,
                message
            });
        }

        if (
            message === "Assessment not found" ||
            message === "Enrollment not found"
        ) {
            return res.status(404).json({
                success: false,
                message
            });
        }

        if (
            message === "Assessment is not active" ||
            message === "Enrollment is not active" ||
            message === "Batch is not active" ||
            message === "Course is not active" ||
            message ===
                "This assessment does not belong to the enrolled course"
        ) {

            return res.status(400).json({

                success: false,
                message
            });
        }


        if (
            message ===
                "Assessment not found" ||

            message ===
                "Enrollment not found"
        ) {

            return res.status(404).json({

                success: false,

                message

            });
        }


        if (
            message ===
                "Assessment is not active" ||

            message ===
                "Enrollment is not active" ||

            message ===
                "Batch is not active" ||

            message ===
                "Course is not active" ||

            message ===
                "This assessment does not belong to the enrolled course"
        ) {

            return res.status(400).json({

                success: false,

                message

            });
        }


        return res.status(500).json({

            success: false,
            message: "Failed to start assessment"
        });
    }
};


// ============================================================
// SUBMIT ASSESSMENT
// ============================================================

const submitAssessment = async (req, res) => {
    try {
        const submission =
            await service.submitAssessment(
                req.params.id,
                req.body
            );

        return res.status(201).json({

            success: true,
            message: "Assessment submitted successfully",
            data: submission
        });

    } catch (error) {
        console.error(
            "Submit assessment error:",
            error
        );

        if (isValidationError(error.message)) {
            return res.status(400).json({

                success: false,

                message:
                    error.message
            });
        }

        if (
            error.message === "Assessment not found" ||
            error.message === "Enrollment not found"
        ) {

            return res.status(404).json({

                success: false,

                message:
                    error.message
            });
        }

        if (
            error.message === "Enrollment is not active" ||
            error.message === "Batch is not active" ||
            error.message === "Course is not active" ||
            error.message ===
                "This assessment does not belong to the enrolled course"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    error.message
            });
        }

        if (
            error.message.startsWith("Question ") ||
            error.message.startsWith(
                "Invalid option for question"
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    error.message
            });
        }

        return res.status(500).json({

            success: false,

            message:
                error.message
        });
    }
};


// ============================================================
// GET ASSESSMENT ANALYTICS
// ============================================================

const getAssessmentAnalytics = async (req, res) => {
    try {
        const analytics =
            await service.getAssessmentAnalytics(
                req.params.id
            );

        return res.status(200).json({

            success: true,

            data: analytics
        });

    } catch (error) {
        console.error(
            "Assessment analytics error:",
            error
        );

        return sendControllerError(
            res,
            error,
            [
                "Assessment not found"
            ]
        );
    }
};


// ============================================================
// GET ASSESSMENT SUBMISSION RESULT
// ============================================================

const getAssessmentSubmissionResult = async (req, res) => {
    try {
        const { submissionId } = req.params;

        const result =
            await service.getAssessmentSubmissionResult(
                submissionId
            );

        if (!result) {
            return res.status(404).json({
                success: false,
                message: "Assessment submission not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error(
            "Get assessment submission result error:",
            error
        );

        return sendControllerError(
            res,
            error,
            [
                "Assessment submission not found"
            ]
        );
    }
};


// ============================================================
// GET ASSESSMENT SUBMISSIONS
// Instructor - Student Submissions Page
// ============================================================

const getAssessmentSubmissions = async (req, res) => {
    try {
        const submissions =
            await service.getSubmissionsByAssessmentId(
                req.params.id
            );

        return res.status(200).json({

            success: true,
            data: submissions
        });

    } catch (error) {
        console.error(
            "Get assessment submissions error:",
            error
        );

        if (
            error.message ===
            "Assessment not found"
        ) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
           }

        };

// ============================================================
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }


// ADMIN - CREATE CODING QUESTION
// ============================================================

const createCodingQuestion = async (
    req,
    res
) => {

    try {

        const question =
            await service.createCodingQuestion(
                req.body
            );

        return res.status(201).json({

            success: true,

            message:
                "Coding question created successfully",

            data: question
        });

    } catch (error) {

        console.error(
            "Create coding question error:",
            error
        );

        return sendControllerError(
            res,
            error,
            [
                "Assessment not found"
            ]
        );
    }
};


// ============================================================
// ADMIN - GET CODING QUESTIONS
// ============================================================

const getCodingQuestions = async (req, res) => {
    try {
        const questions =
            await service.getCodingQuestions(
                req.params.assessmentId
            );

        return res.status(200).json({
            success: true,
            data: questions
        });

    } catch (error) {
        console.error(
            "Get coding questions error:",
            error
        );

        return sendControllerError(
            res,
            error,
            [
                "Assessment not found"
            ]
        );
    }
};


// ============================================================
// ADMIN - GET CODING QUESTION BY ID
// ============================================================

const getCodingQuestionById = async (req, res) => {
    try {
        const question =
            await service.getCodingQuestionById(
                req.params.questionId
            );

        return res.status(200).json({
            success: true,
            data: question
        });

    } catch (error) {
        console.error(
            "Get coding question error:",
            error
        );

        return sendControllerError(
            res,
            error,
            [
                "Coding question not found"
            ]
        );
    }
};


// ============================================================
// ADMIN - UPDATE CODING QUESTION
// ============================================================

const updateCodingQuestion = async (req, res) => {
    try {
        const question =
            await service.updateCodingQuestion(
                req.params.questionId,
                req.body
            );

        return res.status(200).json({
            success: true,
            message: "Coding question updated successfully",
            data: question
        });

    } catch (error) {
        console.error(
            "Update coding question error:",
            error
        );

        return sendControllerError(
            res,
            error,
            [
                "Coding question not found"
            ]
        );
    }
};


// ============================================================
// ADMIN - DELETE CODING QUESTION
// ============================================================

const deleteCodingQuestion = async (req, res) => {
    try {
        await service.deleteCodingQuestion(
            req.params.questionId
        );

        return res.status(200).json({
            success: true,
            message: "Coding question deleted successfully"
        });

    } catch (error) {
        console.error(
            "Delete coding question error:",
            error
        );

        return sendControllerError(
            res,
            error,
            [
                "Coding question not found"
            ]
        );
    }
};


// ============================================================
// ADMIN - CREATE CODING TEST CASE
// ============================================================

const createCodingTestCase = async (req, res) => {
    try {
        const testCase =
            await service.createCodingTestCase(
                req.params.questionId,
                req.body
            );

        return res.status(201).json({
            success: true,
            message: "Coding test case created successfully",
            data: testCase
        });

    } catch (error) {
        console.error(
            "Create coding test case error:",
            error
        );

        return sendControllerError(
            res,
            error,
            [
                "Coding question not found"
            ]
        );
    }
};


// ============================================================
// ADMIN - GET CODING TEST CASES
// ============================================================

const getCodingTestCases = async (req, res) => {
    try {
        const testCases =
            await service.getCodingTestCases(
                req.params.questionId
            );

        return res.status(200).json({
            success: true,
            data: testCases
        });

    } catch (error) {
        console.error(
            "Get coding test cases error:",
            error
        );

        return sendControllerError(
            res,
            error,
            [
                "Coding question not found"
            ]
        );
    }
};


// ============================================================
// ADMIN - UPDATE CODING TEST CASE
// ============================================================

const updateCodingTestCase = async (req, res) => {
    try {
        const testCase =
            await service.updateCodingTestCase(
                req.params.testCaseId,
                req.body
            );

        return res.status(200).json({
            success: true,
            message: "Coding test case updated successfully",
            data: testCase
        });

    } catch (error) {
        console.error(
            "Update coding test case error:",
            error
        );

        return sendControllerError(
            res,
            error,
            [
                "Coding test case not found"
            ]
        );
    }
};


// ============================================================
// ADMIN - DELETE CODING TEST CASE
// ============================================================

const deleteCodingTestCase = async (req, res) => {
    try {
        await service.deleteCodingTestCase(
            req.params.testCaseId
        );

        return res.status(200).json({
            success: true,
            message: "Coding test case deleted successfully"
        });

    } catch (error) {
        console.error(
            "Delete coding test case error:",
            error
        );

        return sendControllerError(
            res,
            error,
            [
                "Coding test case not found"
            ]
        );
    }
};


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

    // Assessment APIs
    createAssessment,
    getAllAssessments,
    updateAssessment,
    deleteAssessment,
    getAssessmentById,
    getEnrollmentAssessmentStatus,
    startAssessment,
    submitAssessment,
    getAssessmentAnalytics,
    getAssessmentSubmissions,
    getAssessmentSubmissionResult,

    // Coding Question APIs
    createCodingQuestion,
    getCodingQuestions,
    getCodingQuestionById,
    updateCodingQuestion,
    deleteCodingQuestion,

    // Coding Test Case APIs
    createCodingTestCase,
    getCodingTestCases,
    updateCodingTestCase,
    deleteCodingTestCase,
};
