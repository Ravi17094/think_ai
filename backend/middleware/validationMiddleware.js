const { z } = require('zod');

// 1. Define your schemas inside the same file
const registerSchema = z.object({
  email: z.string().email({ message: "Invalid email format" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
});

// 2. Export a generic validator function or explicit middleware functions
const validateRegisterInput = (req, res, next) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.errors });
  }
  next();
};

module.exports = {
  validateRegisterInput,
  // ... keep your other existing DTO validation exports here
};