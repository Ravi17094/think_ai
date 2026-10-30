const service =
    require("../services/analyticsService");


/*
 * Get enrollment trends
 */
const getEnrollmentTrends = async (
    req,
    res
) => {

    try {

        const trends =
            await service.getEnrollmentTrends();

        return res.status(200).json({
            success: true,
            data: trends
        });

    } catch (error) {

        console.error(
            "Get enrollment trends error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to get enrollment trends"
        });
    }
};


/*
 * Get course completion rates
 */
const getCourseCompletionRates = async (
    req,
    res
) => {

    try {

        const completionRates =
            await service.getCourseCompletionRates();

        return res.status(200).json({
            success: true,
            data: completionRates
        });

    } catch (error) {

        console.error(
            "Get course completion rates error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to get course completion rates"
        });
    }
};


module.exports = {

    getEnrollmentTrends,

    getCourseCompletionRates
};