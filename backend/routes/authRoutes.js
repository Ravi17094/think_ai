const express = require('express');
const router = express.Router();
const { register, login, getCurrentUser } = require('../controllers/authController');
const requireRole = require('../middleware/requireRole');


/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Abc@12345
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Bad request or user already exists
 */
router.post('/register', register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate user & issue JWT token
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Abc@12345
 *     responses:
 *       200:
 *         description: Authentication successful, returns JWT token
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get currently authenticated user profile
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns current user profile
 *       401:
 *         description: Unauthorized / Invalid token
 */
router.get('/me', requireRole(['Admin', 'Instructor', 'TA', 'Learner']), getCurrentUser);

module.exports = router;
