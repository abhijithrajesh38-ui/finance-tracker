import express from 'express';
import { getInsights, postQuery, getFinancialHealth } from '../controllers/aiController.js';

const router = express.Router();

router.get('/insights', getInsights);
router.get('/financial-health', getFinancialHealth);
router.post('/query', postQuery);

export default router;
