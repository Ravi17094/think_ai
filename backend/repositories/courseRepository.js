const prisma = require("../config/database");

const getAllCourses = async (skip, take, search) => {
    return await prisma.course.findMany({
        where: {
            title: {
                contains: search,
                mode: "insensitive"
            }
        },
        skip,
        take,
        orderBy: {
            id: "desc"
        }
    });
};

const getCourseById = async (id) => {
    return await prisma.course.findUnique({
        where: { id }
    });
};

const createCourse = async (data) => {
    return await prisma.course.create({
        data
    });
};

const updateCourse = async (id, data) => {
    return await prisma.course.update({
        where: { id },
        data
    });
};

const deleteCourse = async (id) => {
    return await prisma.course.delete({
        where: { id }
    });
};

const getCourseBatches = async (courseId) => {
    return await prisma.batch.findMany({
        where: {
            courseId
        }
    });
};

module.exports = {
    getAllCourses,
    getCourseById,
    createCourse,
    updateCourse,
    deleteCourse,
    getCourseBatches
};