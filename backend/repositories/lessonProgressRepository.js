const prisma = require("../config/database");


/*
 * Get all lesson progress for an enrollment
 */
const getProgressByEnrollment = async (enrollmentId) => {

    return await prisma.lessonProgress.findMany({

        where: {
            enrollmentId
        },

        select: {
            id: true,
            enrollmentId: true,
            lessonId: true,
            completed: true,
            completedAt: true,

            lesson: {
                select: {
                    id: true,
                    title: true,
                    description: true,
                    duration: true,
                    order: true,
                    moduleId: true,

                    module: {
                        select: {
                            id: true,
                            title: true
                        }
                    }
                }
            }
        },

        orderBy: [
            {
                lesson: {
                    moduleId: "asc"
                }
            },
            {
                lesson: {
                    order: "asc"
                }
            },
            {
                lessonId: "asc"
            }
        ]
    });
};


/*
 * Get progress for a specific lesson
 */
const getLessonProgress = async (
    enrollmentId,
    lessonId
) => {

    return await prisma.lessonProgress.findUnique({

        where: {
            enrollmentId_lessonId: {
                enrollmentId,
                lessonId
            }
        },

        select: {
            id: true,
            enrollmentId: true,
            lessonId: true,
            completed: true,
            completedAt: true,

            lesson: {
                select: {
                    id: true,
                    title: true,
                    description: true,
                    duration: true,
                    order: true,
                    moduleId: true
                }
            }
        }
    });
};


/*
 * Complete a lesson
 *
 * Validates:
 * - Enrollment exists
 * - Enrollment is active
 * - Course access is unlocked
 * - Batch is active
 * - Course is active
 * - Lesson belongs to enrolled course
 *
 * Then creates/updates lesson progress.
 */
const completeLesson = async (
    enrollmentId,
    lessonId
) => {

    /*
     * Fetch enrollment and lesson
     * independently so only required
     * fields are retrieved.
     */
    const enrollment =
        await prisma.enrollment.findUnique({

            where: {
                id: enrollmentId
            },

            select: {
                id: true,
                enrollmentStatus: true,
                courseAccess: true,

                batch: {
                    select: {
                        courseId: true,
                        status: true,

                        course: {
                            select: {
                                status: true
                            }
                        }
                    }
                }
            }
        });


    if (!enrollment) {
        throw new Error(
            "Enrollment not found"
        );
    }


    /*
     * Enrollment status check
     */
    if (
        !["ACTIVE", "ENROLLED"].includes(
            enrollment.enrollmentStatus
        )
    ) {
        throw new Error(
            "Enrollment is not active"
        );
    }


    /*
     * Course access check
     */
    if (!enrollment.courseAccess) {
        throw new Error(
            "Course access is not unlocked"
        );
    }


    /*
     * Batch status check
     */
    if (
        enrollment.batch?.status !==
        "ACTIVE"
    ) {
        throw new Error(
            "Batch is not active"
        );
    }


    /*
     * Course status check
     */
    if (
        enrollment.batch?.course?.status !==
        "ACTIVE"
    ) {
        throw new Error(
            "Course is not active"
        );
    }


    const lesson =
        await prisma.lesson.findUnique({

            where: {
                id: lessonId
            },

            select: {
                id: true,

                module: {
                    select: {
                        courseId: true
                    }
                }
            }
        });


    if (!lesson) {
        throw new Error(
            "Lesson not found"
        );
    }


    /*
     * Prevent students from completing
     * lessons belonging to another course.
     */
    if (
        lesson.module?.courseId !==
        enrollment.batch.courseId
    ) {
        throw new Error(
            "This lesson does not belong to the enrolled course"
        );
    }


    const completedAt =
        new Date();


    /*
     * Upsert prevents duplicate progress
     * records because of the composite
     * enrollmentId + lessonId key.
     */
    return await prisma.lessonProgress.upsert({

        where: {
            enrollmentId_lessonId: {
                enrollmentId,
                lessonId
            }
        },

        update: {
            completed: true,
            completedAt
        },

        create: {
            enrollmentId,
            lessonId,
            completed: true,
            completedAt
        }
    });
};


/*
 * Get progress summary
 */
const getProgressSummary = async (
    enrollmentId
) => {

    const enrollment =
        await prisma.enrollment.findUnique({

            where: {
                id: enrollmentId
            },

            select: {
                id: true,

                batch: {
                    select: {
                        courseId: true
                    }
                }
            }
        });


    if (!enrollment) {
        throw new Error(
            "Enrollment not found"
        );
    }


    const courseId =
        enrollment.batch?.courseId;


    if (!courseId) {
        throw new Error(
            "Course not found for enrollment"
        );
    }


    /*
     * Run independent count queries
     * together for better response time.
     */
    const [
        totalLessons,
        completedLessons
    ] = await prisma.$transaction([

        prisma.lesson.count({

            where: {
                module: {
                    courseId
                }
            }
        }),


        prisma.lessonProgress.count({

            where: {
                enrollmentId,
                completed: true,

                lesson: {
                    module: {
                        courseId
                    }
                }
            }
        })

    ]);


    const completionPercentage =
        totalLessons === 0
            ? 0
            : Number(
                (
                    (completedLessons /
                        totalLessons) *
                    100
                ).toFixed(2)
            );


    return {

        totalLessons,

        completedLessons,

        completionPercentage
    };
};


module.exports = {

    getProgressByEnrollment,

    getLessonProgress,

    completeLesson,

    getProgressSummary
};