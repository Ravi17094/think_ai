const repository =
    require("../repositories/certificateRepository");

const progressRepository =
    require("../repositories/lessonProgressRepository");

const assessmentService =
    require("./assessmentService");

const prisma =
    require("../config/database");

const {
    generateCertificatePdf
} = require("../utils/certificatePdf");


const validateEnrollmentId = (value) => {

    const enrollmentId = Number(value);

    if (
        !Number.isInteger(enrollmentId) ||
        enrollmentId <= 0
    ) {
        throw new Error(
            "Enrollment ID must be a positive integer"
        );
    }

    return enrollmentId;
};


const generateCertificateNumber = () => {

    const timestamp = Date.now();

    const random = Math.floor(
        1000 + Math.random() * 9000
    );

    return `CERT-${new Date().getFullYear()}-${timestamp}-${random}`;
};


/*
 * Generate certificate automatically when:
 *
 * 1. Course completion >= 80%
 * 2. All required assessments are passed
 * 3. No certificate already exists
 */
const generateCertificate = async (enrollmentId) => {

    const id = validateEnrollmentId(enrollmentId);


    /*
     * 1. Prevent duplicate certificates
     */
    const existingCertificate =
        await repository.getCertificateByEnrollment(id);

    if (existingCertificate) {
        return existingCertificate;
    }


    /*
     * 2. Get course progress
     */
    const progress =
        await progressRepository.getProgressSummary(id);

    const {
        totalLessons,
        completedLessons,
        completionPercentage
    } = progress;


    /*
     * 3. Check course completion requirement
     */
    if (completionPercentage < 80) {

        throw new Error(
            `Certificate not available. Course completion is ${completionPercentage}%. Minimum required is 80%.`
        );
    }


    /*
     * 4. Check assessment requirements
     */
    const assessmentStatus =
        await assessmentService.getEnrollmentAssessmentStatus(
            id
        );

    if (!assessmentStatus.allPassed) {

        throw new Error(
            `Certificate not available. ${assessmentStatus.passedAssessments} of ${assessmentStatus.totalAssessments} required assessments have been passed.`
        );
    }


    /*
     * 5. Get enrollment and course information
     */
    const enrollment =
        await prisma.enrollment.findUnique({

            where: {
                id
            },

            select: {
                id: true,
                studentName: true,

                batch: {
                    select: {
                        course: {
                            select: {
                                id: true,
                                title: true,
                                instructorName: true
                            }
                        }
                    }
                }
            }
        });


    if (!enrollment) {
        throw new Error("Enrollment not found");
    }


    if (!enrollment.batch?.course) {
        throw new Error(
            "Course not found for enrollment"
        );
    }


    const course =
        enrollment.batch.course;


    /*
     * 6. Generate unique certificate number
     */
    const certificateNo =
        generateCertificateNumber();


    /*
     * 7. Generate verification URL
     */
    const baseUrl =
        process.env.APP_URL ||
        "http://localhost:3000";

    const verificationUrl =
        `${baseUrl}/verify/${certificateNo}`;


    /*
     * 8. Create certificate database record
     */
    let certificate;

    try {

        certificate =
            await repository.createCertificate({

                certificateNo,

                enrollmentId: id,

                studentName:
                    enrollment.studentName,

                courseName:
                    course.title,

                instructorName:
                    course.instructorName || null,

                completionPercentage,

                verificationUrl
            });

    } catch (error) {

        /*
         * Protect against concurrent certificate
         * generation requests.
         */
        const existing =
            await repository.getCertificateByEnrollment(id);

        if (existing) {
            return existing;
        }

        throw error;
    }


    /*
     * 9. Get active certificate template
     *
     * Admin controls the active template.
     */
    const template =
        await repository.getActiveCertificateTemplate();


    /*
     * 10. Generate certificate PDF
     */
    let pdfPath;

    try {

        pdfPath =
            await generateCertificatePdf(
                certificate,
                template
            );

    } catch (error) {

        console.error(
            "Certificate PDF generation failed:",
            error
        );

        /*
         * Certificate record exists, but PDF generation
         * failed. The certificate can be regenerated later.
         */
        throw new Error(
            "Certificate created but PDF generation failed"
        );
    }


    /*
     * 11. Save PDF path
     */
    const updatedCertificate =
        await prisma.certificate.update({

            where: {
                id: certificate.id
            },

            data: {
                pdfUrl: pdfPath
            }
        });


    return updatedCertificate;
};


/*
 * Get certificate by enrollment
 */
const getCertificateByEnrollment = async (
    enrollmentId
) => {

    const id =
        validateEnrollmentId(enrollmentId);

    return repository.getCertificateByEnrollment(id);
};


/*
 * Verify certificate
 */
const verifyCertificate = async (
    certificateNo
) => {

    if (
        !certificateNo ||
        typeof certificateNo !== "string" ||
        !certificateNo.trim()
    ) {

        return {
            valid: false,
            message: "Certificate number is required"
        };
    }


    const certificate =
        await repository.getCertificateByNumber(
            certificateNo.trim()
        );


    if (!certificate) {

        return {
            valid: false,
            message: "Certificate not found"
        };
    }


    return {
        valid: true,
        certificate
    };
};


/*
 * Get certificate by certificate number
 */
const getCertificateByNumber = async (
    certificateNo
) => {

    if (
        !certificateNo ||
        typeof certificateNo !== "string"
    ) {
        return null;
    }

    return repository.getCertificateByNumber(
        certificateNo.trim()
    );
};


module.exports = {

    generateCertificate,

    getCertificateByEnrollment,

    verifyCertificate,

    getCertificateByNumber
};