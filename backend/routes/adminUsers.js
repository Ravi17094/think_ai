const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const Joi = require("joi");

const prisma = require("../config/database");
const requireRole = require("../middleware/requireRole");
const { successResponse, errorResponse } = require("../utils/response");
const { sendEmail } = require("../services/notificationService");

// ============================================================
// Joi Validation Schemas
// ============================================================

const createUserSchema = Joi.object({
  name: Joi.string().required().messages({
    "string.empty": "Name is required.",
    "any.required": "Name is required.",
  }),

  email: Joi.string().email().required().messages({
    "string.email": "Please enter a valid email address.",
    "string.empty": "Email is required.",
    "any.required": "Email is required.",
  }),

  password: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters.",
    "string.empty": "Password is required.",
    "any.required": "Password is required.",
  }),

  role: Joi.string()
    .valid("Learner", "Instructor", "TA", "Admin")
    .default("Learner"),
});

const updateUserSchema = Joi.object({
  name: Joi.string().optional(),

  email: Joi.string().email().optional(),

  role: Joi.string()
    .valid("Learner", "Instructor", "TA", "Admin")
    .optional(),

  status: Joi.string()
    .valid("active", "inactive")
    .optional(),
});


// ============================================================
// SWAGGER - GET ALL USERS
// ============================================================

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve all users with their current role.
 *     tags:
 *       - Admin Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Users retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AdminUser'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */

// ============================================================
// GET ALL USERS
// GET /api/admin/users
// ============================================================

router.get("/users", requireRole(["Admin"]), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },

      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return successResponse(
      res,
      200,
      "Users retrieved successfully",
      users
    );

  } catch (error) {
    console.error("Fetch Users Error:", error);

    return errorResponse(
      res,
      500,
      "Internal server error"
    );
  }
});


// ============================================================
// SWAGGER - CREATE USER
// ============================================================

/**
 * @swagger
 * /api/admin/users:
 *   post:
 *     summary: Create a new user
 *     description: Admin creates a new user with a specific role.
 *     tags:
 *       - Admin Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: Password123
 *               role:
 *                 type: string
 *                 enum:
 *                   - Learner
 *                   - Instructor
 *                   - TA
 *                   - Admin
 *                 default: Learner
 *                 example: Learner
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error or email already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */

// ============================================================
// CREATE USER
// POST /api/admin/users
// ============================================================

router.post("/users", requireRole(["Admin"]), async (req, res) => {
  try {
    const { error, value } = createUserSchema.validate(req.body);

    if (error) {
      return errorResponse(
        res,
        400,
        error.details[0].message
      );
    }

    const {
      name,
      email,
      password,
      role,
    } = value;

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return errorResponse(
        res,
        400,
        "User with this email already exists."
      );
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || "Learner",
      },

      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return successResponse(
      res,
      201,
      "User created successfully",
      newUser
    );

  } catch (error) {
    console.error("Create User Error:", error);

    return errorResponse(
      res,
      500,
      error.message || "Failed to create user"
    );
  }
});


// ============================================================
// SWAGGER - UPDATE USER
// ============================================================

/**
 * @swagger
 * /api/admin/users/{id}:
 *   patch:
 *     summary: Update a user
 *     description: Update a user's name, email, or role.
 *     tags:
 *       - Admin Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: User ID
 *         schema:
 *           type: integer
 *         example: 5
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               role:
 *                 type: string
 *                 enum:
 *                   - Learner
 *                   - Instructor
 *                   - TA
 *                   - Admin
 *                 example: Instructor
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Invalid data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */

// ============================================================
// UPDATE USER
// PATCH /api/admin/users/:id
// ============================================================

router.patch(
  "/users/:id",
  requireRole(["Admin"]),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id)) {
        return errorResponse(
          res,
          400,
          "Invalid user ID."
        );
      }

      const { error, value } =
        updateUserSchema.validate(req.body);

      if (error) {
        return errorResponse(
          res,
          400,
          error.details[0].message
        );
      }

      const existingUser =
        await prisma.user.findUnique({
          where: {
            id,
          },
        });

      if (!existingUser) {
        return errorResponse(
          res,
          404,
          "User not found."
        );
      }

      const updateFields = {};

      if (value.name !== undefined) {
        updateFields.name = value.name;
      }

      if (value.email !== undefined) {
        const existingEmail =
          await prisma.user.findFirst({
            where: {
              email: value.email,
              NOT: {
                id,
              },
            },
          });

        if (existingEmail) {
          return errorResponse(
            res,
            400,
            "This email is already in use by another account."
          );
        }

        updateFields.email = value.email;
      }

      if (value.role !== undefined) {
        // Prevent Admin from demoting themselves
        if (
          Number(req.user.id) === id &&
          value.role !== "Admin"
        ) {
          return errorResponse(
            res,
            400,
            "You cannot demote yourself from the Admin role."
          );
        }

        updateFields.role = value.role;
      }

      // Current Prisma User model doesn't have status
      if (value.status !== undefined) {
        return errorResponse(
          res,
          400,
          "User status is not available in the current Prisma User model."
        );
      }

      if (Object.keys(updateFields).length === 0) {
        return errorResponse(
          res,
          400,
          "No valid fields provided for update."
        );
      }

      const updatedUser =
        await prisma.user.update({
          where: {
            id,
          },

          data: updateFields,

          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        });

      return successResponse(
        res,
        200,
        "User updated successfully",
        updatedUser
      );

    } catch (error) {
      console.error("Update User Error:", error);

      return errorResponse(
        res,
        500,
        error.message || "Internal server error"
      );
    }
  }
);


// ============================================================
// SWAGGER - DELETE USER
// ============================================================

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Delete a user
 *     description: Delete a user account. An admin cannot delete their own account.
 *     tags:
 *       - Admin Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: User ID
 *         schema:
 *           type: integer
 *         example: 5
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       400:
 *         description: Invalid ID or attempting to delete own account
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */

// ============================================================
// DELETE USER
// DELETE /api/admin/users/:id
// ============================================================

router.delete(
  "/users/:id",
  requireRole(["Admin"]),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id)) {
        return errorResponse(
          res,
          400,
          "Invalid user ID."
        );
      }

      // Prevent admin deleting themselves
      if (Number(req.user.id) === id) {
        return errorResponse(
          res,
          400,
          "You cannot delete your own active admin account."
        );
      }

      const existingUser =
        await prisma.user.findUnique({
          where: {
            id,
          },
        });

      if (!existingUser) {
        return errorResponse(
          res,
          404,
          "User not found."
        );
      }

      await prisma.user.delete({
        where: {
          id,
        },
      });

      return successResponse(
        res,
        200,
        "User deleted successfully",
        {
          userId: id,
        }
      );

    } catch (error) {
      console.error("Delete User Error:", error);

      return errorResponse(
        res,
        500,
        "Internal server error"
      );
    }
  }
);


// ============================================================
// SWAGGER - RESET PASSWORD
// ============================================================

/**
 * @swagger
 * /api/admin/users/{id}/reset-password:
 *   post:
 *     summary: Reset user password
 *     description: Generate a temporary password, store its hashed value, and send the temporary password to the user's email through SendGrid.
 *     tags:
 *       - Admin Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: User ID
 *         schema:
 *           type: integer
 *         example: 5
 *     responses:
 *       200:
 *         description: Temporary password generated and sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Temporary password generated and sent successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: integer
 *                       example: 5
 *                     email:
 *                       type: string
 *                       example: user@example.com
 *       400:
 *         description: Invalid user ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: User not found
 *       500:
 *         description: Email or server error
 */

// ============================================================
// RESET PASSWORD
// POST /api/admin/users/:id/reset-password
// ============================================================

router.post(
  "/users/:id/reset-password",
  requireRole(["Admin"]),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id)) {
        return errorResponse(
          res,
          400,
          "Invalid user ID."
        );
      }

      // Find user
      const user =
        await prisma.user.findUnique({
          where: {
            id,
          },
        });

      if (!user) {
        return errorResponse(
          res,
          404,
          "User not found."
        );
      }

      // Generate temporary password
      const tempPassword = crypto
        .randomBytes(6)
        .toString("base64")
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(0, 10);

      // Hash temporary password
      const hashedPassword =
        await bcrypt.hash(
          tempPassword,
          10
        );

      // Update password in PostgreSQL
      await prisma.user.update({
        where: {
          id,
        },

        data: {
          password: hashedPassword,
        },
      });

      // Send temporary password through SendGrid
      await sendEmail({
        to: user.email,

        subject:
          "Thinkz AI LMS - Password Reset",

        text: `Hello ${user.name || "User"},

Your Thinkz AI LMS password has been reset by an administrator.

Your temporary password is:

${tempPassword}

Please log in using this temporary password and change your password after signing in.

Regards,
Thinkz AI LMS`,
      });

      return successResponse(
        res,
        200,
        "Temporary password generated and sent successfully",
        {
          userId: id,
          email: user.email,
        }
      );

    } catch (error) {
      console.error(
        "Reset Password Error:",
        error
      );

      return errorResponse(
        res,
        500,
        error.message ||
          "Failed to reset password"
      );
    }
  }
);


// ============================================================
// EXPORT
// ============================================================

module.exports = router;