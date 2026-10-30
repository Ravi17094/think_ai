const request = require('supertest');
const express = require('express');
const paymentRouter = require('../routes/paymentRoutes');

const app = express();
app.use(express.json());
app.use('/api/payments', paymentRouter);

jest.mock('@prisma/client', () => {
    const mPrismaClient = {
        transaction: {
            create: jest.fn().mockResolvedValue({ id: 'pi_mocked_id' }),
        },
    };
    return { PrismaClient: jest.fn(() => mPrismaClient) };
});

describe('=== Pod B Payments & OAuth2 Validation Suite ===', () => {
    it('✓ Should reject request missing required body values', async () => {
        const res = await request(app)
            .post('/api/payments/create-intent')
            .send({ gateway: 'stripe', amount: -20 });
        expect(res.statusCode).toBe(400);
    });

    it('✓ Should pass validation and template checks when correct values are sent', async () => {
        const res = await request(app)
            .post('/api/payments/create-intent')
            .send({ 
                gateway: 'stripe', 
                amount: 1000, 
                currency: 'usd', 
                email: 'test@thinkz.ai', 
                phone: '1234567890',
                templateType: 'certificate'
            });
        expect(res.statusCode).toBe(201);
        expect(res.body.templateRendered).toBe('certificate');
    });

    it('✓ Should successfully handle valid Google OAuth2 authorization requests', async () => {
        const res = await request(app)
            .post('/api/payments/auth/google')
            .send({ token: 'mock_google_user_token' });
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });
});