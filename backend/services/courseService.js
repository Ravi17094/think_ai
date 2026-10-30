const repository = require("../repositories/courseRepository");

const getAllCourses = async (page, limit, search) => {

    const skip = (page - 1) * limit;

    return await repository.getAllCourses(
        skip,
        Number(limit),
        search || ""
    );
};

const getCourseById = async (id) => {
    return await repository.getCourseById(Number(id));
};

const createCourse = async (data) => {
    return await repository.createCourse(data);
};

const updateCourse = async (id, data) => {
    return await repository.updateCourse(Number(id), data);
};

const deleteCourse = async (id) => {
    return await repository.deleteCourse(Number(id));
};

const getCourseBatches = async (courseId) => {
    return await repository.getCourseBatches(Number(courseId));
};

module.exports = {
    getAllCourses,
    getCourseById,
    createCourse,
    updateCourse,
    deleteCourse,
    getCourseBatches
};