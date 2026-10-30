const repository =
    require("../repositories/assessmentRepository");


const validateId = (value, name) => {

    const id = Number(value);

    if (
        !Number.isInteger(id) ||
        id <= 0
    ) {
        throw new Error(
            `${name} must be a positive integer`
        );
    }

    return id;
};


/*
 * Create assessment
 */
const createAssessment = async (data) => {

    if (!data || typeof data !== "object") {
        throw new Error(
            "Assessment data is required"
        );
    }

    if (!Array.isArray(data.questions)) {
        throw new Error(
            "Assessment questions must be an array"
        );
    }

    if (data.questions.length === 0) {
        throw new Error(
            "Assessment must contain at least one question"
        );
    }

    return await repository.createAssessment(data);
};


/*
 * Get assessment by ID
 */
const getAssessmentById = async (id) => {

    const assessmentId =
        validateId(
            id,
            "Assessment ID"
        );

    return await repository.getAssessmentById(
        assessmentId
    );
};


/*
 * Submit assessment
 */
const submitAssessment = async (
    assessmentId,
    data
) => {

    const id =
        validateId(
            assessmentId,
            "Assessment ID"
        );

    if (!data || typeof data !== "object") {
        throw new Error(
            "Assessment submission data is required"
        );
    }

    const enrollmentId =
        validateId(
            data.enrollmentId,
            "Enrollment ID"
        );

    if (!Array.isArray(data.answers)) {
        throw new Error(
            "Answers must be an array"
        );
    }

    if (data.answers.length === 0) {
        throw new Error(
            "At least one answer is required"
        );
    }

    return await repository.submitAssessment(
        id,
        {
            ...data,
            enrollmentId
        }
    );
};


/*
 * Get assessment analytics
 */
const getAssessmentAnalytics = async (id) => {

    const assessmentId =
        validateId(
            id,
            "Assessment ID"
        );

    return await repository.getAssessmentAnalytics(
        assessmentId
    );
};


/*
 * Save Judge0 token against an
 * assessment submission.
 */
const saveJudge0Token = async (
    submissionId,
    judge0Token
) => {

    const id =
        validateId(
            submissionId,
            "Submission ID"
        );

    if (
        !judge0Token ||
        typeof judge0Token !== "string"
    ) {
        throw new Error(
            "Judge0 token is required"
        );
    }

    return await repository.saveJudge0Token(
        id,
        judge0Token
    );
};


/*
 * Find assessment submission
 * using Judge0 token.
 */
const getSubmissionByJudge0Token = async (
    judge0Token
) => {

    if (
        !judge0Token ||
        typeof judge0Token !== "string"
    ) {
        throw new Error(
            "Judge0 token is required"
        );
    }

    return await repository
        .getSubmissionByJudge0Token(
            judge0Token
        );
};

/*
 * Update assessment submission
 * with Judge0 execution result.
 */
const updateAssessmentSubmissionStatus = async (
    submissionId,
    data
) => {

    const id = validateId(
        submissionId,
        "Submission ID"
    );

    if (!data || typeof data !== "object") {
        throw new Error(
            "Judge0 result data is required"
        );
    }

    return await repository.updateAssessmentSubmissionStatus(
        id,
        data
    );
};


/*
 * Check whether all assessments
 * for the enrolled course are passed.
 *
 * Passing percentage = 40%.
 */
const getEnrollmentAssessmentStatus =
    async (enrollmentId) => {

        const id =
            validateId(
                enrollmentId,
                "Enrollment ID"
            );

        return await repository
            .getEnrollmentAssessmentStatus(
                id
            );
    };

    /*
 * Get assessment submission result
 */
const getAssessmentSubmissionResult = async (
    submissionId
) => {

    const id = validateId(
        submissionId,
        "Submission ID"
    );

    return await repository.getAssessmentSubmissionResult(
        id
    );
};


module.exports = {

    createAssessment,

    getAssessmentById,

    submitAssessment,

    getAssessmentAnalytics,

    saveJudge0Token,

    getSubmissionByJudge0Token,

    updateAssessmentSubmissionStatus,

    getEnrollmentAssessmentStatus,

    getAssessmentSubmissionResult
};