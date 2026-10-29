const express = require("express");

const router = express.Router();
const { authenticateToken, authorizeRoles } = require("../middleware/lmsLegacyAccess");

const {
    getActiveCertificateTemplate,
    getAllCertificateTemplates,
    getCertificateTemplateById,
    createCertificateTemplate,
    updateCertificateTemplate,
    deleteCertificateTemplate
} = require("../controllers/certificateTemplateController");

const {
    validateCertificateTemplateCreate,
    validateCertificateTemplateUpdate,
    validateCertificateTemplateId
} = require("../validations/certificateTemplateValidation");


// ----------------------------------------------------
// Swagger
// ----------------------------------------------------

/**
 * @swagger
 * tags:
 *   name: Certificate Templates
 *   description: Admin Certificate Template Management APIs
 */


/**
 * @swagger
 * /api/certificate-templates/active:
 *   get:
 *     summary: Get active certificate template
 *     description: Returns the certificate template currently used for automatic certificate generation.
 *     tags: [Certificate Templates]
 *     responses:
 *       200:
 *         description: Active certificate template
 *       404:
 *         description: No active certificate template found
 *       500:
 *         description: Internal server error
 */
router.get(
    "/active",
    getActiveCertificateTemplate
);


/**
 * @swagger
 * /api/certificate-templates:
 *   get:
 *     summary: Get all certificate templates
 *     description: Admin endpoint to view all certificate templates.
 *     tags: [Certificate Templates]
 *     responses:
 *       200:
 *         description: Certificate templates retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get(
    "/",
    getAllCertificateTemplates
);


/**
 * @swagger
 * /api/certificate-templates/{id}:
 *   get:
 *     summary: Get certificate template by ID
 *     tags: [Certificate Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Certificate template found
 *       400:
 *         description: Invalid template ID
 *       404:
 *         description: Certificate template not found
 */
router.get(
    "/:id",
    validateCertificateTemplateId,
    getCertificateTemplateById
);


/**
 * @swagger
 * /api/certificate-templates:
 *   post:
 *     summary: Create certificate template
 *     description: Admin can create a customizable certificate design.
 *     tags: [Certificate Templates]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Default Blue Certificate
 *               title:
 *                 type: string
 *                 example: CERTIFICATE OF COMPLETION
 *               primaryColor:
 *                 type: string
 *                 example: "#1E3A8A"
 *               secondaryColor:
 *                 type: string
 *                 example: "#64748B"
 *               backgroundColor:
 *                 type: string
 *                 example: "#FFFFFF"
 *               borderColor:
 *                 type: string
 *                 example: "#1E3A8A"
 *               logoUrl:
 *                 type: string
 *                 example: https://example.com/logo.png
 *               signatureUrl:
 *                 type: string
 *                 example: https://example.com/signature.png
 *               organizationName:
 *                 type: string
 *                 example: Thinkz AI
 *               organizationDetails:
 *                 type: string
 *                 example: AI Learning Management Platform
 *               footerText:
 *                 type: string
 *                 example: This certificate can be verified online.
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Certificate template created successfully
 *       400:
 *         description: Certificate template validation failed
 *       500:
 *         description: Internal server error
 */
router.post(
    "/",
    authenticateToken,
    authorizeRoles('ADMIN'),
    validateCertificateTemplateCreate,
    createCertificateTemplate
);


/**
 * @swagger
 * /api/certificate-templates/{id}:
 *   put:
 *     summary: Update certificate template
 *     description: Admin can change certificate colors, title, logo, signature, organization details and footer.
 *     tags: [Certificate Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Updated Certificate Design
 *               title:
 *                 type: string
 *                 example: CERTIFICATE OF ACHIEVEMENT
 *               primaryColor:
 *                 type: string
 *                 example: "#2563EB"
 *               secondaryColor:
 *                 type: string
 *                 example: "#475569"
 *               backgroundColor:
 *                 type: string
 *                 example: "#FFFFFF"
 *               borderColor:
 *                 type: string
 *                 example: "#2563EB"
 *               logoUrl:
 *                 type: string
 *                 example: https://example.com/new-logo.png
 *               signatureUrl:
 *                 type: string
 *                 example: https://example.com/signature.png
 *               organizationName:
 *                 type: string
 *                 example: Thinkz AI
 *               organizationDetails:
 *                 type: string
 *                 example: Learning Management Platform
 *               footerText:
 *                 type: string
 *                 example: Verify this certificate online.
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Certificate template updated successfully
 *       400:
 *         description: Certificate template validation failed
 *       404:
 *         description: Certificate template not found
 *       500:
 *         description: Internal server error
 */
router.put(
    "/:id",
    authenticateToken,
    authorizeRoles('ADMIN'),
    validateCertificateTemplateId,
    validateCertificateTemplateUpdate,
    updateCertificateTemplate
);


/**
 * @swagger
 * /api/certificate-templates/{id}:
 *   delete:
 *     summary: Delete certificate template
 *     description: Admin can delete an unused certificate template.
 *     tags: [Certificate Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Certificate template deleted successfully
 *       400:
 *         description: Invalid template ID
 *       404:
 *         description: Certificate template not found
 *       500:
 *         description: Internal server error
 */
router.delete(
    "/:id",
    authenticateToken,
    authorizeRoles('ADMIN'),
    validateCertificateTemplateId,
    deleteCertificateTemplate
);


module.exports = router;