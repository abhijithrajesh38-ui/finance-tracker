import express from 'express';
import { createTransaction, getTransactions, getCategories } from '../controllers/transactionController.js';

const router = express.Router();

router.post('/', createTransaction);
router.get('/', getTransactions);
router.get('/categories', getCategories);

export default router;
