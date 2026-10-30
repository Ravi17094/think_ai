require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');

const roleRoutes = require("./routes/roleRoutes");
const sessionRoutes = require("./routes/sessionRoutes");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.set('socketio', io);

io.on('connection', (socket) => {
    socket.on('join-session', (sessionId) => {
        socket.join(sessionId);
    });
});
app.use(express.json()); // Allows server to parse incoming JSON payloads

// Mock In-Memory Database Architecture
const usersDB = [];

// JWT Authorization Signature Key
const JWT_SECRET = process.env.JWT_SECRET;

// -------------------------------------------------------------
// 🛠️ TASK 1: CORS Policy Configuration
// Allows cross-origin requests from Karthik's frontend dashboard
// -------------------------------------------------------------
app.use(cors({
    origin: "*", // Open to all origins for development integration testing
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// -------------------------------------------------------------
// 🛠️ TASK 2: Response Normalization Layer Middleware
// Guarantees all responses match an identical structural template
// -------------------------------------------------------------
app.use((req, res, next) => {
    res.normalizeResponse = (statusCode, successFlag, statusMessage, explicitData = null) => {
        return res.status(statusCode).json({
            success: successFlag,
            message: statusMessage,
            data: explicitData
        });
    };
    next();
});

// -------------------------------------------------------------
// 🛠️ TASK 3: API Validation Middleware Layers (Using Joi)
// Intercepts and reviews inputs before processing database requests
// -------------------------------------------------------------
const validateRegisterInput = (req, res, next) => {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        username: Joi.string().min(3).optional()
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.normalizeResponse(400, false, `Validation Error: ${error.details[0].message}`);
    }
    next();
};

const validateLoginInput = (req, res, next) => {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required()
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.normalizeResponse(400, false, `Validation Error: ${error.details[0].message}`);
    }
    next();
};

// -------------------------------------------------------------
// 🛠️ TASK 4: Swagger Documentation Specifications Setup
// Generates the JSON layout requirements schema details
// -------------------------------------------------------------
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Janadeep Authentication API Management Hub',
            version: '1.0.0',
            description: 'Standardized Authentication module specifications with validation and normalization loops.',
        },
        servers: [{ url: 'http://localhost:5000/api' }],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                }
            }
        }
    },
    apis: ['./server.js'], // Instructs compiler to parse code block tags inside this file
};
// -------------------------------------------------------------
// 🛣️ INTEGRATED ENDPOINTS PATHWAY MAPPINGS (Prefix: /api)
// -------------------------------------------------------------

/**
 * @openapi
 * /api/register:
 *   post:
 *     summary: Register User Profile
 *     description: Creates a new user with encrypted password hashing.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: user@test.com }
 *               password: { type: string, example: pass1234 }
 *               username: { type: string, example: JanadeepDev }
 *     responses:
 *       201: { description: Successfully created }
 *       400: { description: Validation fail or duplication error }
 */
app.post('/api/register', validateRegisterInput, async (req, res) => {
    try {
        const { email, password, username } = req.body;

        const userExists = usersDB.find(u => u.email === email);
        if (userExists) {
            return res.normalizeResponse(400, false, "Email profile is already registered.");
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = { id: Date.now(), email, password: hashedPassword, username: username || "User" };
        usersDB.push(newUser);

        return res.normalizeResponse(201, true, "Registration successfully processed!", { userId: newUser.id });
    } catch (err) {
        return res.normalizeResponse(500, false, "Server crash error encountered during generation.");
    }
});

/**
 * @openapi
 * /api/login:
 *   post:
 *     summary: User Login Verification
 *     description: Authenticates profile parameters and returns a signed bearer JWT access token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: user@test.com }
 *               password: { type: string, example: pass1234 }
 *     responses:
 *       200: { description: Logged in successfully }
 *       401: { description: Invalid credentials }
 */
app.post('/api/login', validateLoginInput, async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = usersDB.find(u => u.email === email);
        if (!user) {
            return res.normalizeResponse(401, false, "Invalid email address or passcode sequence.");
        }

        const passesMatch = await bcrypt.compare(password, user.password);
        if (!passesMatch) {
            return res.normalizeResponse(401, false, "Invalid email address or passcode sequence.");
        }

        // Generate Secure JSON Web Token Session Key
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '2h' });

        return res.normalizeResponse(200, true, "Authentication verification passed successfully.", {
            profile: { id: user.id, email: user.email, username: user.username },
            accessToken: token
        });
    } catch (err) {
        return res.normalizeResponse(500, false, "Internal gateway verification failure.");
    }
});

/**
 * @openapi
 * /api/me:
 *   get:
 *     summary: Verify User Session
 *     description: Decodes Bearer token from header metadata to authorize current session state.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200: { description: Session authenticated }
 *       401: { description: Missing or broken auth header parameters }
 */
app.get('/api/me', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.normalizeResponse(401, false, "Access Denied: Missing authentication token header.");
    }

    const token = authHeader.split(' ')[1];
    try {
        const verifiedData = jwt.verify(token, JWT_SECRET);
        const userProfile = usersDB.find(u => u.id === verifiedData.id);

        if (!userProfile) {
            return res.normalizeResponse(404, false, "User matching token parameters was not discovered.");
        }

        return res.normalizeResponse(200, true, "Active tracking validation payload extracted.", {
            user: { id: userProfile.id, email: userProfile.email, username: userProfile.username }
        });
    } catch (err) {
        return res.normalizeResponse(401, false, "Authorization session expired or modified corrupt token.");
    }
});
//Admin routes
app.use('/api/admin', roleRoutes);

// ENGINE BOOT STRAP PROCESS
const PORT = 5000;

server.listen(PORT, () => {
    console.log("==============================================");
    console.log(`Authentication Backend active at http://localhost:${PORT}`);
    console.log(`Interactive Swagger Docs page: http://localhost:${PORT}/api-docs`);
    console.log("==============================================");
});
