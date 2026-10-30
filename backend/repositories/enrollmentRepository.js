const prisma = require("../config/database");

const getAllEnrollments = async () => {
    return await prisma.enrollment.findMany({
        include: {
            batch: {
                include: {
                    course: true
                }
            }
        },
        orderBy: {
            id: "desc"
        }
    });
};

const getEnrollmentById = async (id) => {
    return await prisma.enrollment.findUnique({
        where: { id },
        include: {
            batch: {
                include: {
                    course: true
                }
            }
        }
    });
};

const createEnrollment = async (data) => {
    return await prisma.enrollment.create({
        data
    });
};

const updateEnrollment = async (id, data) => {
    return await prisma.enrollment.update({
        where: { id },
        data
    });
};

const deleteEnrollment = async (id) => {
    return await prisma.enrollment.delete({
        where: { id }
    });
};

module.exports = {
    getAllEnrollments,
    getEnrollmentById,
    createEnrollment,
    updateEnrollment,
    deleteEnrollment
};