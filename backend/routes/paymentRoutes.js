const express = require('express');
const { createPaymentIntent, handleWebhook, handleGoogleLogin } = require('../controllers/paymentController');
const router = express.Router();

router.post('/create-intent', createPaymentIntent);
router.post('/webhook/:gateway', handleWebhook);

// Added Google OAuth2 Endpoint
router.post('/auth/google', handleGoogleLogin);

module.exports = router;