const prisma = require("../config/database");


/*
 * Get enrollment trends
 *
 * Returns the number of enrollments
 * grouped by enrollment date.
 */
const getEnrollmentTrends = async () => {

    const enrollments =
        await prisma.enrollment.findMany({

            select: {
                enrolledAt: true
            },

            orderBy: {
                enrolledAt: "asc"
            }
        });


    const trends = {};


    for (const enrollment of enrollments) {

        const date =
            enrollment.enrolledAt
                .toISOString()
                .slice(0, 10);


        trends[date] =
            (trends[date] || 0) + 1;
    }


    return Object.entries(trends).map(
        ([date, count]) => ({
            date,
            enrollments: count
        })
    );
};


/*
 * Get course completion rates
 *
 * A course is considered completed when
 * an enrollment completes at least 80%
 * of the lessons belonging to that course.
 */
const getCourseCompletionRates = async () => {

    const courses =
        await prisma.course.findMany({

            select: {

                id: true,

                title: true,

                modules: {
                    select: {
                        lessons: {
                            select: {
                                id: true
                            }
                        }
                    }
                },

                batches: {
                    select: {
                        enrollments: {
                            select: {

                                id: true,

                                lessonProgress: {
                                    where: {
                                        completed: true
                                    },

                                    select: {
                                        lessonId: true
                                    }
                                }
                            }
                        }
                    }
                }
            },

            orderBy: {
                id: "asc"
            }
        });


    const result = [];


    for (const course of courses) {

        /*
         * Get all lesson IDs belonging
         * to this course.
         */
        const courseLessonIds =
            course.modules.flatMap(
                (module) =>
                    module.lessons.map(
                        (lesson) =>
                            lesson.id
                    )
            );


        const totalLessons =
            courseLessonIds.length;


        /*
         * Create a Set so lesson lookup
         * is fast.
         */
        const courseLessonIdSet =
            new Set(courseLessonIds);


        /*
         * Get all enrollments belonging
         * to this course.
         */
        const enrollments =
            course.batches.flatMap(
                (batch) =>
                    batch.enrollments
            );


        const totalEnrollments =
            enrollments.length;


        let completedEnrollments = 0;


        /*
         * Calculate completion for
         * every enrollment.
         */
        for (const enrollment of enrollments) {

            /*
             * Only count completed lessons
             * that actually belong to this course.
             */
            const completedLessonIds =
                new Set(
                    enrollment.lessonProgress
                        .map(
                            (progress) =>
                                progress.lessonId
                        )
                        .filter(
                            (lessonId) =>
                                courseLessonIdSet.has(
                                    lessonId
                                )
                        )
                );


            const completedLessons =
                completedLessonIds.size;


            /*
             * Calculate completion percentage.
             */
            const completionPercentage =
                totalLessons === 0
                    ? 0
                    : (
                        completedLessons /
                        totalLessons
                    ) * 100;


            /*
             * 80% or more means
             * course completed.
             */
            if (
                completionPercentage >= 80
            ) {
                completedEnrollments++;
            }
        }


        /*
         * Calculate final course
         * completion rate.
         */
        const completionRate =
            totalEnrollments === 0
                ? 0
                : Number(
                    (
                        (
                            completedEnrollments /
                            totalEnrollments
                        ) * 100
                    ).toFixed(2)
                );


        result.push({

            courseId:
                course.id,

            courseName:
                course.title,

            totalLessons,

            totalEnrollments,

            completedEnrollments,

            completionRate
        });
    }


    return result;
};


module.exports = {

    getEnrollmentTrends,

    getCourseCompletionRates
};