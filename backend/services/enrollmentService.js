const prisma = require("../config/database");

const repository =
    require("../repositories/enrollmentRepository");

const {
    enqueue
} = require("./notificationQueueService");

const {
    enrollmentConfirmationEmail
} = require("./notificationService");


/*
 * ----------------------------------------------------
 * Constants
 * ----------------------------------------------------
 */

const ACTIVE_ENROLLMENT_STATUSES = new Set([
    "ACTIVE",
    "ENROLLED"
]);

const DEFAULT_ENROLLMENT_STATUS =
    "ENROLLED";


/*
 * ----------------------------------------------------
 * Validation helpers
 * ----------------------------------------------------
 */

const validateId = (
    value,
    fieldName
) => {

    const id = Number(value);

    if (
        !Number.isInteger(id) ||
        id <= 0
    ) {
        throw new Error(
            `${fieldName} must be a positive integer`
        );
    }

    return id;
};


const validateStudentName = (value) => {

    if (
        typeof value !== "string" ||
        !value.trim()
    ) {
        throw new Error(
            "Student name is required"
        );
    }

    return value.trim();
};


const validateStudentEmail = (value) => {

    if (
        typeof value !== "string" ||
        !value.trim()
    ) {
        throw new Error(
            "Student email is required"
        );
    }

    return value.trim();
};


const validateEnrollmentStatus = (
    status
) => {

    if (
        status === undefined ||
        status === null
    ) {
        return DEFAULT_ENROLLMENT_STATUS;
    }

    if (
        typeof status !== "string" ||
        !status.trim()
    ) {
        throw new Error(
            "Enrollment status is invalid"
        );
    }

    return status.trim();
};


/*
 * ----------------------------------------------------
 * Get all enrollments
 * ----------------------------------------------------
 */

const getAllEnrollments = async () => {

    return repository.getAllEnrollments();
};


/*
 * ----------------------------------------------------
 * Get enrollment by ID
 * ----------------------------------------------------
 */

const getEnrollmentById = async (
    id
) => {

    const enrollmentId =
        validateId(
            id,
            "Enrollment ID"
        );

    return repository.getEnrollmentById(
        enrollmentId
    );
};


/*
 * ----------------------------------------------------
 * Create enrollment
 * ----------------------------------------------------
 */

const createEnrollment = async (
    data
) => {

    if (
        !data ||
        typeof data !== "object" ||
        Array.isArray(data)
    ) {
        throw new Error(
            "Enrollment data is required"
        );
    }


    /*
     * Validate student information
     */

    const studentName =
        validateStudentName(
            data.studentName
        );

    const studentEmail =
        validateStudentEmail(
            data.studentEmail
        );


    /*
     * Validate batch
     */

    const batchId =
        validateId(
            data.batchId,
            "Batch ID"
        );


    /*
     * Validate enrollment status
     */

    const enrollmentStatus =
        validateEnrollmentStatus(
            data.enrollmentStatus
        );


    /*
     * Prevent duplicate enrollment
     */

    const existingEnrollment =
        await prisma.enrollment.findFirst({

            where: {

                studentEmail,

                batchId,

                enrollmentStatus: {
                    in: [
                        ...ACTIVE_ENROLLMENT_STATUSES
                    ]
                }
            },

            select: {
                id: true
            }
        });


    if (existingEnrollment) {

        throw new Error(
            "Student is already enrolled in this batch"
        );
    }


    /*
     * Get selected batch.
     *
     * Only retrieve fields required
     * for validation.
     */

    const selectedBatch =
        await prisma.batch.findUnique({

            where: {
                id: batchId
            },

            select: {

                id: true,

                courseId: true,

                capacity: true,

                status: true,

                course: {
                    select: {
                        id: true,
                        status: true
                    }
                },

                _count: {
                    select: {
                        enrollments: true
                    }
                }
            }
        });


    if (!selectedBatch) {

        throw new Error(
            "Selected batch not found"
        );
    }


    /*
     * Course must be active
     */

    if (
        selectedBatch.course?.status !==
        "ACTIVE"
    ) {

        throw new Error(
            "Cannot enroll into an inactive course"
        );
    }


    /*
     * Batch must be active
     */

    if (
        selectedBatch.status !==
        "ACTIVE"
    ) {

        throw new Error(
            "Cannot enroll into an inactive batch"
        );
    }


    /*
     * Check capacity
     */

    const enrollmentCount =
        selectedBatch._count?.enrollments ?? 0;


    if (
        enrollmentCount <
        selectedBatch.capacity
    ) {

        return repository.createEnrollment({

            studentName,

            studentEmail,

            batchId,

            enrollmentStatus
        });
    }


    /*
     * Selected batch is full.
     *
     * Find another available batch
     * for the same course.
     */

    const alternativeBatch =
        await repository.findAvailableBatch(
            selectedBatch.courseId
        );


    if (!alternativeBatch) {

        throw new Error(
            "Selected batch is full and no other available batch exists"
        );
    }


    /*
     * Safety check
     */

    if (
        alternativeBatch.id ===
        selectedBatch.id
    ) {

        throw new Error(
            "No alternative batch available"
        );
    }


    /*
     * Create enrollment in
     * alternative batch.
     */

    return repository.createEnrollment({

        studentName,

        studentEmail,

        batchId:
            alternativeBatch.id,

        enrollmentStatus
    });
};


/*
 * ----------------------------------------------------
 * Update enrollment
 * ----------------------------------------------------
 */

const updateEnrollment = async (
    id,
    data
) => {

    const enrollmentId =
        validateId(
            id,
            "Enrollment ID"
        );


    if (
        !data ||
        typeof data !== "object" ||
        Array.isArray(data)
    ) {
        throw new Error(
            "Enrollment update data is required"
        );
    }


    /*
     * Get existing enrollment
     */

    const existingEnrollment =
        await repository.getEnrollmentById(
            enrollmentId
        );


    if (!existingEnrollment) {

        throw new Error(
            "Enrollment not found"
        );
    }


    const updateData = {};


    /*
     * Student name
     */

    if (
        data.studentName !== undefined
    ) {

        updateData.studentName =
            validateStudentName(
                data.studentName
            );
    }


    /*
     * Student email
     */

    if (
        data.studentEmail !== undefined
    ) {

        updateData.studentEmail =
            validateStudentEmail(
                data.studentEmail
            );
    }


    /*
     * Enrollment status
     */

    if (
        data.enrollmentStatus !== undefined
    ) {

        updateData.enrollmentStatus =
            validateEnrollmentStatus(
                data.enrollmentStatus
            );
    }


    /*
     * Batch change
     */

    if (
        data.batchId !== undefined
    ) {

        const newBatchId =
            validateId(
                data.batchId,
                "Batch ID"
            );


        /*
         * If same batch was supplied,
         * no need to perform capacity
         * validation.
         */

        if (
            newBatchId !==
            existingEnrollment.batchId
        ) {

            const newBatch =
                await prisma.batch.findUnique({

                    where: {
                        id: newBatchId
                    },

                    select: {

                        id: true,

                        courseId: true,

                        capacity: true,

                        status: true,

                        course: {
                            select: {
                                id: true,
                                status: true
                            }
                        },

                        _count: {
                            select: {
                                enrollments: true
                            }
                        }
                    }
                });


            if (!newBatch) {

                throw new Error(
                    "Selected batch not found"
                );
            }


            /*
             * Batch must be active
             */

            if (
                newBatch.status !==
                "ACTIVE"
            ) {

                throw new Error(
                    "Cannot move enrollment to an inactive batch"
                );
            }


            /*
             * Course must be active
             */

            if (
                newBatch.course?.status !==
                "ACTIVE"
            ) {

                throw new Error(
                    "Cannot move enrollment to an inactive course"
                );
            }


            /*
             * Check capacity
             */

            const enrollmentCount =
                newBatch._count?.enrollments ?? 0;


            if (
                enrollmentCount >=
                newBatch.capacity
            ) {

                throw new Error(
                    "Selected batch is full"
                );
            }
        }


        updateData.batchId =
            newBatchId;
    }


    /*
     * Prevent empty update
     */

    if (
        Object.keys(updateData).length === 0
    ) {

        throw new Error(
            "At least one field is required for update"
        );
    }


    /*
     * Prevent changing the ID.
     *
     * Only whitelisted fields are passed
     * to the repository, so `id` cannot
     * accidentally reach Prisma.
     */

    return repository.updateEnrollment(
        enrollmentId,
        updateData
    );
};


/*
 * ----------------------------------------------------
 * Unlock course access
 * ----------------------------------------------------
 *
 * This should be called only after
 * successful payment verification.
 *
 * Requires:
 *
 * courseAccess Boolean @default(false)
 *
 * in the Enrollment Prisma model.
 */

const unlockCourseAccess = async (
    id
) => {

    const enrollmentId =
        validateId(
            id,
            "Enrollment ID"
        );


    const enrollment =
        await repository.getEnrollmentById(
            enrollmentId
        );


    if (!enrollment) {

        throw new Error(
            "Enrollment not found"
        );
    }


    /*
     * This property will only be available
     * after courseAccess is added to Prisma.
     */

    if (enrollment.courseAccess) {
        return enrollment;
    }


    const unlockedEnrollment =
        await repository.unlockCourseAccess(
            enrollmentId
        );

    const courseName =
        unlockedEnrollment.batch?.course?.title ||
        "your course";

    const email = enrollmentConfirmationEmail({
        name: unlockedEnrollment.studentName,
        courseName
    });

    enqueue({
        type: "enrollment-confirmation",
        to: unlockedEnrollment.studentEmail,
        recipientName: unlockedEnrollment.studentName,
        subject: email.subject,
        text: email.text,
        html: email.html
    });

    return unlockedEnrollment;
};


/*
 * ----------------------------------------------------
 * Delete enrollment
 * ----------------------------------------------------
 */

const deleteEnrollment = async (
    id
) => {

    const enrollmentId =
        validateId(
            id,
            "Enrollment ID"
        );


    const enrollment =
        await repository.getEnrollmentById(
            enrollmentId
        );


    if (!enrollment) {

        throw new Error(
            "Enrollment not found"
        );
    }


    return repository.deleteEnrollment(
        enrollmentId
    );
};


/*
 * ----------------------------------------------------
 * Exports
 * ----------------------------------------------------
 */

module.exports = {

    getAllEnrollments,

    getEnrollmentById,

    createEnrollment,

    updateEnrollment,

    unlockCourseAccess,

    deleteEnrollment
};
