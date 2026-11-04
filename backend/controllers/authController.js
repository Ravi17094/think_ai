const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

// Item 3: User Registration
exports.register = async (req, res) => {
    try {
        const { email, password, name } = req.body;

        // Basic validation
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required." });
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(400).json({ error: "User already exists with this email." });
        }

        // Hash the password before saving to the database
        const hashedPassword = await bcrypt.hash(password, 10);

        // Save user to the database
        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name: name || null // Optional field
            }
        });

        // Omit password hash from response
        const { password: _, ...userWithoutPassword } = newUser;

        return res.status(201).json({
            message: "User registered successfully!",
            user: userWithoutPassword
        });

    } catch (error) {
        console.error("Registration error:", error);
        return res.status(500).json({ error: "Internal server error occurred." });
    }
};

// Item 4: User Login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required." });
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return res.status(401).json({ error: "Invalid credentials." });
        }

        // Check if the provided password matches the hashed password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid credentials." });
        }

        const { password: _, ...userWithoutPassword } = user;
        const secret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;

        if (!secret) {
            console.error("Login error: JWT secret is not configured.");
            return res.status(503).json({ error: "Authentication is not configured." });
        }

        // The mobile LMS authenticates subsequent requests with this token.
        // Keep the identity claim numeric because the LMS authorization middleware
        // verifies it against the User table.
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            secret,
            { expiresIn: "7d" }
        );

        return res.status(200).json({
            success: true,
            message: "Login successful!",
            user: userWithoutPassword,
            token
        });

    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ error: "Internal server error occurred." });
    }
};

// Returns the authenticated identity attached by requireRole.  Keeping this
// controller explicit prevents Express from receiving an undefined handler
// when `/api/auth/me` is registered.
exports.getCurrentUser = (req, res) => {
    return res.status(200).json({
        success: true,
        user: req.user
    });
};

// Export both controllers so they can be hooked up in your routes folder
