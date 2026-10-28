const User = require('../User'); // Adjust path if User.js is in models folder (e.g., '../models/User')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Item 3: User Registration
exports.register = async (req, res) => {
    try {
        const { email, password, name } = req.body;

        // Basic validation
        if (!email || !password) {
            return res.status(400).json({ success: false, error: "Email and password are required." });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({ success: false, error: "User already exists with this email." });
        }

        // Hash the password before saving to the database
        const hashedPassword = await bcrypt.hash(password, 10);

        // Public registration must never trust a role sent by the browser.
        // Privileged roles are assigned later through an administrator-only flow.
        const newUser = new User({
            email,
            password: hashedPassword,
            name: name || null,
            role: 'Learner'
        });

        await newUser.save();

        // Omit password hash from response object
        const userWithoutPassword = {
            id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            createdAt: newUser.createdAt
        };

        // Generate a JWT token upon successful registration
        const token = jwt.sign(
            {
                id: newUser._id.toString(),
                email: newUser.email,
                role: newUser.role
            },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.status(201).json({
            success: true,
            message: "User registered successfully!",
            token,
            user: userWithoutPassword
        });

    } catch (error) {
        console.error("Registration error:", error);
        return res.status(500).json({ success: false, error: "Internal server error occurred." });
    }
};

// Item 4: User Login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ success: false, error: "Email and password are required." });
        }

        // Find user by email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ success: false, error: "Invalid credentials." });
        }

        // Check if the provided password matches the hashed password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ success: false, error: "Invalid credentials." });
        }

        // Generate real JWT token containing user details and role
        const token = jwt.sign(
            {
                id: user._id.toString(), 
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        const userWithoutPassword = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt
        };

        return res.status(200).json({
            success: true,
            message: "Login successful!",
            token,
            user: userWithoutPassword
        });

    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ success: false, error: "Internal server error occurred." });
    }
};

exports.getCurrentUser = async (req, res) => {
    try {
        // req.user is populated by your requireRole / auth middleware from the decoded JWT token
        const userId = req.user.id;

        const user = await User.findById(userId).select("-password");

        if (!user) {
            return res.status(404).json({ success: false, error: "User not found." });
        }

        return res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error("Get current user error:", error);
        return res.status(500).json({ success: false, error: "Internal server error occurred." });
    }
};
