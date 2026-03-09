import express from 'express';
import rateLimit from 'express-rate-limit';
import { register, login } from '../controllers/authController.js';

const router = express.Router();

// Rate limiter for auth endpoints - 20 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  message: 'Too many authentication attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// Register route with rate limiting
router.post('/register', authLimiter, register);

// Login route with rate limiting
router.post('/login', authLimiter, login);

export default router;
