import express from 'express';
import { createTransaction, getTransactions, getCategories, deleteTransaction } from '../controllers/transactionController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All transaction routes require authentication
router.post('/', authenticate, createTransaction);
router.get('/', authenticate, getTransactions);
router.get('/categories', authenticate, getCategories);
router.delete('/:id', authenticate, deleteTransaction);

export default router;
