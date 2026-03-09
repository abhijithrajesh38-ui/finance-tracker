import express from 'express';
import { getInsights, postQuery, getFinancialHealth } from '../controllers/aiController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All AI routes require authentication
router.get('/insights', authenticate, getInsights);
router.get('/financial-health', authenticate, getFinancialHealth);
router.post('/query', authenticate, postQuery);

export default router;
