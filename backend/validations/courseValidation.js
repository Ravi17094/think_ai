const VALID_STATUSES = new Set([
    "ACTIVE",
    "INACTIVE"
]);


/*
 * ----------------------------------------------------
 * Common validation helpers
 * ----------------------------------------------------
 */

const isValidPositiveInteger = (value) => {
const {
  validateCourseId,
  validateCourseCreate,
  validateCourseUpdate
} = require("../validations/courseValidation");
    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return false;
    }

    const number = Number(value);

    return (
        Number.isInteger(number) &&
        number > 0
    );
};


const isValidNonNegativeNumber = (value) => {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return false;
    }

    const number = Number(value);

    return (
        Number.isFinite(number) &&
        number >= 0
    );
};


const isValidNonEmptyString = (value) => {

    return (
        typeof value === "string" &&
        value.trim().length > 0
    );
};


const isValidOptionalString = (value) => {

    return (
        value === undefined ||
        value === null ||
        typeof value === "string"
    );
};


const isValidOptionalUrl = (value) => {

    /*
     * Optional field
     */
    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return true;
    }


    if (typeof value !== "string") {
        return false;
    }


    try {

        const url = new URL(value);

        return (
            url.protocol === "http:" ||
            url.protocol === "https:"
        );

    } catch {

        return false;
    }
};


/*
 * ----------------------------------------------------
 * Validate Course Create
 * ----------------------------------------------------
 */
const validateCourseCreate = (
    req,
    res,
    next
) => {

    if (
        !req.body ||
        typeof req.body !== "object" ||
        Array.isArray(req.body)
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Request body must be a valid object"
        });
    }


    const {
        title,
        description,
        category,
        price,
        duration,
        thumbnail,
        videoUrl,
        instructorName,
        instructorDetails,
        status
    } = req.body;


    const errors = [];


    /*
     * Required fields
     */

    if (!isValidNonEmptyString(title)) {

        errors.push(
            "title is required"
        );
    }


    if (!isValidNonEmptyString(description)) {

        errors.push(
            "description is required"
        );
    }


    if (!isValidNonEmptyString(category)) {

        errors.push(
            "category is required"
        );
    }


    if (!isValidNonNegativeNumber(price)) {

        errors.push(
            "price must be a valid non-negative number"
        );
    }


    if (!isValidNonEmptyString(duration)) {

        errors.push(
            "duration is required"
        );
    }


    /*
     * Status
     */

    if (
        status !== undefined &&
        !VALID_STATUSES.has(status)
    ) {

        errors.push(
            "status must be either ACTIVE or INACTIVE"
        );
    }


    /*
     * URLs
     */

    if (!isValidOptionalUrl(thumbnail)) {

        errors.push(
            "thumbnail must be a valid HTTP or HTTPS URL"
        );
    }


    if (!isValidOptionalUrl(videoUrl)) {

        errors.push(
            "videoUrl must be a valid HTTP or HTTPS URL"
        );
    }


    /*
     * Optional instructor fields
     */

    if (
        instructorName !== undefined &&
        instructorName !== null &&
        !isValidNonEmptyString(instructorName)
    ) {

        errors.push(
            "instructorName must be a non-empty string"
        );
    }


    if (
        instructorDetails !== undefined &&
        instructorDetails !== null &&
        !isValidNonEmptyString(instructorDetails)
    ) {

        errors.push(
            "instructorDetails must be a non-empty string"
        );
    }


    /*
     * Return validation errors
     */

    if (errors.length > 0) {

        return res.status(400).json({

            success: false,

            message:
                "Course validation failed",

            errors
        });
    }


    next();
};


/*
 * ----------------------------------------------------
 * Validate Course Update
 *
 * All fields are optional.
 * At least one field must be supplied.
 * ----------------------------------------------------
 */
const validateCourseUpdate = (
    req,
    res,
    next
) => {

    if (
        !req.body ||
        typeof req.body !== "object" ||
        Array.isArray(req.body)
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Request body must be a valid object"
        });
    }


    if (
        Object.keys(req.body).length === 0
    ) {

        return res.status(400).json({

            success: false,

            message:
                "At least one field is required for update"
        });
    }


    const {
        title,
        description,
        category,
        price,
        duration,
        thumbnail,
        videoUrl,
        instructorName,
        instructorDetails,
        status
    } = req.body;


    const errors = [];


    /*
     * String fields
     */

    const stringFields = {
        title,
        description,
        category,
        duration
    };


    Object.entries(stringFields).forEach(
        ([field, value]) => {

            if (
                value !== undefined &&
                !isValidNonEmptyString(value)
            ) {

                errors.push(
                    `${field} must be a non-empty string`
                );
            }
        }
    );


    /*
     * Instructor fields
     *
     * null is allowed so an admin can
     * clear these fields.
     */

    if (
        instructorName !== undefined &&
        instructorName !== null &&
        !isValidNonEmptyString(instructorName)
    ) {

        errors.push(
            "instructorName must be a non-empty string"
        );
    }


    if (
        instructorDetails !== undefined &&
        instructorDetails !== null &&
        !isValidNonEmptyString(instructorDetails)
    ) {

        errors.push(
            "instructorDetails must be a non-empty string"
        );
    }


    /*
     * Price
     */

    if (
        price !== undefined &&
        !isValidNonNegativeNumber(price)
    ) {

        errors.push(
            "price must be a valid non-negative number"
        );
    }


    /*
     * Status
     */

    if (
        status !== undefined &&
        !VALID_STATUSES.has(status)
    ) {

        errors.push(
            "status must be either ACTIVE or INACTIVE"
        );
    }


    /*
     * URLs
     */

    if (!isValidOptionalUrl(thumbnail)) {

        errors.push(
            "thumbnail must be a valid HTTP or HTTPS URL"
        );
    }


    if (!isValidOptionalUrl(videoUrl)) {

        errors.push(
            "videoUrl must be a valid HTTP or HTTPS URL"
        );
    }


    /*
     * Return validation errors
     */

    if (errors.length > 0) {

        return res.status(400).json({

            success: false,

            message:
                "Course validation failed",

            errors
        });
    }


    next();
};


/*
 * ----------------------------------------------------
 * Validate /courses/:id
 * ----------------------------------------------------
 */
const validateCourseId = (
    req,
    res,
    next
) => {

    if (
        !isValidPositiveInteger(
            req.params.id
        )
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Course ID must be a positive integer"
        });
    }


    next();
};


/*
 * ----------------------------------------------------
 * Validate /courses/:courseId/*
 * ----------------------------------------------------
 */
const validateCourseParamId = (
    req,
    res,
    next
) => {

    if (
        !isValidPositiveInteger(
            req.params.courseId
        )
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Course ID must be a positive integer"
        });
    }


    next();
};


module.exports = {

    validateCourseCreate,

    validateCourseUpdate,

    validateCourseId,

    validateCourseParamId
};