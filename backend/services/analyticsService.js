const repository =
    require("../repositories/analyticsRepository");


/*
 * Get enrollment trends
 */
const getEnrollmentTrends = async () => {

    const trends =
        await repository.getEnrollmentTrends();

    return trends;
};


/*
 * Get course completion rates
 */
const getCourseCompletionRates = async () => {

    const completionRates =
        await repository.getCourseCompletionRates();

    return completionRates;
};


module.exports = {

    getEnrollmentTrends,

    getCourseCompletionRates
};