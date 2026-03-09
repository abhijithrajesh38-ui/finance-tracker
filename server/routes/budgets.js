import express from 'express';
import { createBudget, getBudgets, getBudgetAlerts, updateBudget, deleteBudget } from '../controllers/budgetController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All budget routes require authentication
router.post('/', authenticate, createBudget);
router.get('/', authenticate, getBudgets);
router.get('/alerts', authenticate, getBudgetAlerts);
router.put('/:id', authenticate, updateBudget);
router.delete('/:id', authenticate, deleteBudget);

export default router;
