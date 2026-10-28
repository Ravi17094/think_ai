const bcrypt = require("bcryptjs");
const prisma = require("../config/database");

// ============================================================
// CREATE USER
// ============================================================
const createUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "User with this email already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                name: name || null,
                email,
                password: hashedPassword,
                role: role || "Learner"
            }
        });

        return res.status(201).json({
            success: true,
            message: "User created successfully",
            data: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        });

    } catch (error) {
        console.error("Create user error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create user"
        });
    }
};


// ============================================================
// GET ALL USERS
// ============================================================
const getUsers = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = "",
            role
        } = req.query;

        const pageNumber = Math.max(parseInt(page) || 1, 1);
        const limitNumber = Math.min(
            Math.max(parseInt(limit) || 20, 1),
            100
        );

        const skip = (pageNumber - 1) * limitNumber;

        // Build Prisma filter
        const where = {};

        if (search) {
            where.OR = [
                {
                    name: {
                        contains: search,
                        mode: "insensitive"
                    }
                },
                {
                    email: {
                        contains: search,
                        mode: "insensitive"
                    }
                }
            ];
        }

        if (role) {
            where.role = role;
        }

        // Get users + total count
        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limitNumber,
                orderBy: {
                    createdAt: "desc"
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    createdAt: true,
                    updatedAt: true
                }
            }),

            prisma.user.count({
                where
            })
        ]);

        return res.status(200).json({
            success: true,
            data: users,
            pagination: {
                page: pageNumber,
                limit: limitNumber,
                total,
                totalPages: Math.ceil(total / limitNumber)
            }
        });

    } catch (error) {
        console.error("Fetch Users Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch users"
        });
    }
};


// ============================================================
// EXPORTS
// ============================================================
module.exports = {
    createUser,
    getUsers
};