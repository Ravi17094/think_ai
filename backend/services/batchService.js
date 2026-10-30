const repository = require("../repositories/batchRepository");

const getAllBatches = async () => {
    return await repository.getAllBatches();
};

const getBatchById = async (id) => {
    return await repository.getBatchById(Number(id));
};

const createBatch = async (data) => {
    return await repository.createBatch(data);
};

const updateBatch = async (id, data) => {
    return await repository.updateBatch(Number(id), data);
};

const deleteBatch = async (id) => {
    return await repository.deleteBatch(Number(id));
};

const getBatchEnrollments = async (batchId) => {
    return repository.getBatchEnrollments(Number(batchId));
};

module.exports = {
    getAllBatches,
    getBatchById,
    createBatch,
    updateBatch,
    deleteBatch,
    getBatchEnrollments
};