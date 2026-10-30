const prisma = require("../config/database");


const getCertificateByEnrollment = async (enrollmentId) => {

    return prisma.certificate.findUnique({
        where: {
            enrollmentId: Number(enrollmentId)
        }
    });
};


const getCertificateByNumber = async (certificateNo) => {

    return prisma.certificate.findUnique({
        where: {
            certificateNo
        }
    });
};


const createCertificate = async (data) => {

    return prisma.certificate.create({
        data
    });
};


/*
 * Get the currently active certificate template.
 */
const getActiveCertificateTemplate = async () => {

    return prisma.certificateTemplate.findFirst({
        where: {
            isActive: true
        },
        orderBy: {
            id: "desc"
        }
    });
};


/*
 * Get certificate template by ID.
 */
const getCertificateTemplateById = async (id) => {

    return prisma.certificateTemplate.findUnique({
        where: {
            id: Number(id)
        }
    });
};


/*
 * Create certificate template.
 */
const createCertificateTemplate = async (data) => {

    return prisma.certificateTemplate.create({
        data
    });
};


/*
 * Update certificate template.
 */
const updateCertificateTemplate = async (id, data) => {

    return prisma.certificateTemplate.update({
        where: {
            id: Number(id)
        },
        data
    });
};


module.exports = {

    getCertificateByEnrollment,
    getCertificateByNumber,
    createCertificate,

    getActiveCertificateTemplate,
    getCertificateTemplateById,
    createCertificateTemplate,
    updateCertificateTemplate
};