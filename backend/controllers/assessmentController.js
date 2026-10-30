const service =
    require("../services/assessmentService");


const isValidationError = (message) => {
    return (
        message.includes(
            "must be a positive integer"
        ) ||
        message.includes(
            "must be an array"
        ) ||
        message.includes(
            "must be a required"
        ) ||
        message.includes(
            "is required"
        ) ||
        message.includes(
            "At least one answer is required"
        )
    );
};


/**
 * Create Assessment
 */
const createAssessment = async (
    req,
    res
) => {

    try {

        const assessment =
            await service.createAssessment(
                req.body
            );

        return res.status(201).json({
            success: true,
            message:
                "Assessment created successfully",
            data: assessment
        });

    } catch (error) {

        console.error(
            "Create assessment error:",
            error
        );

        if (
            isValidationError(
                error.message
            )
        ) {
            return res.status(400).json({
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


/**
 * Get Assessment By ID
 */
const getAssessmentById = async (
    req,
    res
) => {

    try {

        const assessment =
            await service.getAssessmentById(
                req.params.id
            );

        if (!assessment) {
            return res.status(404).json({
                success: false,
                message:
                    "Assessment not found"
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

        if (
            error.message.includes(
                "must be a positive integer"
            )
        ) {
            return res.status(400).json({
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


/**
 * Submit Assessment
 */
const submitAssessment = async (
    req,
    res
) => {

    try {

        const submission =
            await service.submitAssessment(
                req.params.id,
                req.body
            );

        return res.status(201).json({
            success: true,
            message:
                "Assessment submitted successfully",
            data: submission
        });

    } catch (error) {

        console.error(
            "Submit assessment error:",
            error
        );


        /*
         * Invalid IDs / request data
         */
        if (
            isValidationError(
                error.message
            )
        ) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }


        /*
         * Assessment / enrollment not found
         */
        if (
            error.message ===
                "Assessment not found" ||

            error.message ===
                "Enrollment not found"
        ) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }


        /*
         * Enrollment/course/assessment
         * business rules.
         */
        if (
            error.message ===
                "Enrollment is not active" ||

            error.message ===
                "Batch is not active" ||

            error.message ===
                "Course is not active" ||

            error.message ===
                "This assessment does not belong to the enrolled course"
        ) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }


        /*
         * Invalid question/option submitted.
         */
        if (
            error.message.startsWith(
                "Question "
            ) ||

            error.message.startsWith(
                "Invalid option for question"
            )
        ) {
            return res.status(400).json({
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


/**
 * Get Assessment Analytics
 */
const getAssessmentAnalytics = async (
    req,
    res
) => {

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


        if (
            error.message ===
            "Assessment not found"
        ) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }


        if (
            error.message.includes(
                "must be a positive integer"
            )
        ) {
            return res.status(400).json({
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

/**
 * Get Assessment Submission Result
 */
const getAssessmentSubmissionResult = async (
    req,
    res
) => {

    try {

        const result =
            await service.getAssessmentSubmissionResult(
                req.params.submissionId
            );

        return res.status(200).json({
            success: true,
            data: result
        });

    } catch (error) {

        console.error(
            "Get assessment submission result error:",
            error
        );

        if (
            error.message.includes(
                "must be a positive integer"
            )
        ) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        if (
            error.message ===
            "Assessment submission not found"
        ) {
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

module.exports = {

    createAssessment,

    getAssessmentById,

    submitAssessment,

    getAssessmentAnalytics,
    getAssessmentSubmissionResult
};