import express from 'express';
import * as billController from '../controllers/billController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All bill routes require authentication
router.get('/', authenticate, billController.getBills);
router.get('/upcoming', authenticate, billController.getUpcomingBills);
router.post('/', authenticate, billController.createBill);
router.put('/:id', authenticate, billController.updateBill);
router.put('/:id/pay', authenticate, billController.markAsPaid);
router.delete('/:id', authenticate, billController.deleteBill);

export default router;

