const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController'); // Note: Ensure your path is correct here

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags:
 *       - Authentication
 *     responses:
 *       201:
 *         description: User registered
 */
router.post('/register', register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate user
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: Authentication successful
 */
router.post('/login', login);

module.exports = router;