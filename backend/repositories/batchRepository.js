const prisma = require("../config/database");

const getAllBatches = async () => {
    return await prisma.batch.findMany({
        include: {
            course: true,
            enrollments: true
        },
        orderBy: {
            id: "desc"
        }
    });
};

const getBatchById = async (id) => {
    return await prisma.batch.findUnique({
        where: { id },
        include: {
            course: true,
            enrollments: true
        }
    });
};

const createBatch = async (data) => {
    return await prisma.batch.create({
        data
    });
};

const updateBatch = async (id, data) => {
    return await prisma.batch.update({
        where: { id },
        data
    });
};

const deleteBatch = async (id) => {
    return await prisma.batch.delete({
        where: { id }
    });
};

const getBatchEnrollments = async (batchId) => {
    return await prisma.enrollment.findMany({
        where: {
            batchId
        }
    });
};

module.exports = {
    getAllBatches,
    getBatchById,
    createBatch,
    updateBatch,
    deleteBatch,
    getBatchEnrollments
};