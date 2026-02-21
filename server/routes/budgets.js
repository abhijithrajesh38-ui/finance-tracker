import express from 'express';
import { createBudget, getBudgets, getBudgetAlerts, updateBudget, deleteBudget } from '../controllers/budgetController.js';

const router = express.Router();

router.post('/', createBudget);
router.get('/', getBudgets);
router.get('/alerts', getBudgetAlerts);
router.put('/:id', updateBudget);
router.delete('/:id', deleteBudget);

export default router;
