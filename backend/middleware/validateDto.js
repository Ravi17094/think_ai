const { z } = require('zod');

// 1. Login verification format
const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email structure provided."),
    password: z.string().min(6, "Password must be at least 6 characters long.")
  })
});

// 2. Live Session Lifecycle validation structure
const liveSessionSchema = z.object({
  body: z.object({
    title: z.string().min(3, "Title must be at least 3 characters long."),
    startTime: z.string().datetime("Invalid start time ISO date format specified."),
    description: z.string().optional()
  })
});

// Central execution middleware engine
const validateDto = (schema) => (req, res, next) => {
  try {
    schema.parse({ body: req.body });
    next();
  } catch (error) {
    return res.status(400).json({ 
      error: "Input Validation Hardening Blocked Request", 
      details: error.errors.map(err => err.message) 
    });
  }
};

module.exports = { validateDto, loginSchema, liveSessionSchema };