import express from 'express';
import { createTransaction, getTransactions, getCategories, deleteTransaction } from '../controllers/transactionController.js';

const router = express.Router();

router.post('/', createTransaction);
router.get('/', getTransactions);
router.get('/categories', getCategories);
router.delete('/:id', deleteTransaction);

export default router;
