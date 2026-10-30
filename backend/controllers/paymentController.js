const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Google OAuth2 Flow Handler
const handleGoogleLogin = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ error: "Missing Google OAuth token" });
        }
        
        // Simulating Google credential verification exchange validation
        return res.status(200).json({
            success: true,
            message: "Google Authentication successful",
            user: { email: "user@thinkzai.com", name: "Google User" },
            token: "mock_jwt_session_token"
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const createPaymentIntent = async (req, res) => {
    try {
        const { gateway, amount, currency, email, phone, templateType } = req.body;

        if (!gateway || !amount || !currency || !email || !phone) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        if (amount <= 0) {
            return res.status(400).json({ error: "Amount must be positive" });
        }

        const mockId = `pi_${Math.random().toString(36).substring(2, 11)}`;

        // Verify and process requested template layouts
        let selectedTemplate = "welcome";
        if (templateType && ["enrollment", "certificate", "password_reset"].includes(templateType)) {
            selectedTemplate = templateType;
        }

        await prisma.transaction.create({
            data: { id: mockId, amount, currency, email, phone, status: 'pending', gateway }
        });

        // Simulating structural text rendering for requested template categories
        console.log(`[Email System] Rendered template variant: ${selectedTemplate} for ${email}`);

        return res.status(201).json({ 
            id: mockId, 
            clientSecret: 'secret_123', 
            gateway,
            templateRendered: selectedTemplate 
        });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
};

const handleWebhook = async (req, res) => {
    try {
        return res.status(200).json({ received: true });
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
};

module.exports = { createPaymentIntent, handleWebhook, handleGoogleLogin };