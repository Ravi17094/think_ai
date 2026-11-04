const repository = require("../repositories/enrollmentRepository");

const getAllEnrollments = async () => {
    return await repository.getAllEnrollments();
};

const getEnrollmentById = async (id) => {
    return await repository.getEnrollmentById(Number(id));
};

const createEnrollment = async (data) => {
    return await repository.createEnrollment(data);
};

const updateEnrollment = async (id, data) => {
    return await repository.updateEnrollment(Number(id), data);
};

const deleteEnrollment = async (id) => {
    return await repository.deleteEnrollment(Number(id));
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

const unlockCourseAccess = async () => {
    throw new (require("../lms/errors").LmsError)(
        503, "PAYMENT_WEBHOOK_REQUIRED",
        "Course access requires the approved verified payment webhook, which is not integrated in this checkout."
    );
};


module.exports = {
    getAllEnrollments,
    getEnrollmentById,
    createEnrollment,
    updateEnrollment,
    deleteEnrollment
};
