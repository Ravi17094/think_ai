const fields = new Set([
    "name", "title", "primaryColor", "secondaryColor", "backgroundColor",
    "borderColor", "logoUrl", "signatureUrl", "organizationName",
    "organizationDetails", "footerText", "isActive"
]);
const colors = ["primaryColor", "secondaryColor", "backgroundColor", "borderColor"];
const optionalText = ["organizationName", "organizationDetails", "footerText"];
const nonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

function validateTemplate(create) {
    return (req, res, next) => {
        const data = req.body;
        if (!data || typeof data !== "object" || Array.isArray(data)) {
            return res.status(400).json({
                success: false,
                message: "Request body must be a valid object"
            });
        }
        const errors = [];
        if (!create && !Object.keys(data).some((key) => fields.has(key))) {
            errors.push("At least one certificate template field is required for update");
        }
        if ((create || data.name !== undefined) && !nonEmptyString(data.name)) {
            errors.push("name is required and must be a non-empty string");
        }
        if (data.title !== undefined && !nonEmptyString(data.title)) {
            errors.push("title must be a non-empty string");
        }
        for (const field of colors) {
            if (data[field] !== undefined &&
                (typeof data[field] !== "string" || !/^#(?:[a-f\d]{3}|[a-f\d]{6})$/i.test(data[field]))) {
                errors.push(`${field} must be a hex color`);
            }
        }
        for (const field of optionalText) {
            if (data[field] !== undefined && data[field] !== null && typeof data[field] !== "string") {
                errors.push(`${field} must be a string or null`);
            }
        }
        for (const field of ["logoUrl", "signatureUrl"]) {
            const value = data[field];
            if (value === undefined || value === null || value === "") continue;
            try {
                if (typeof value !== "string" || !["http:", "https:"].includes(new URL(value).protocol)) {
                    throw new Error("Invalid URL");
                }
            } catch {
                errors.push(`${field} must be a valid HTTP or HTTPS URL`);
            }
        }
        if (data.isActive !== undefined && typeof data.isActive !== "boolean") {
            errors.push("isActive must be a boolean");
        }
        if (errors.length) {
            return res.status(400).json({
                success: false,
                message: "Certificate template validation failed",
                errors
            });
        }
        next();
    };
}

function validateCertificateTemplateId(req, res, next) {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({
            success: false,
            message: "Certificate template ID must be a positive integer"
        });
    }
    next();
}

module.exports = {
    validateCertificateTemplateCreate: validateTemplate(true),
    validateCertificateTemplateUpdate: validateTemplate(false),
    validateCertificateTemplateId
};
