import express from 'express';
import * as billController from '../controllers/billController.js';

const router = express.Router();

router.get('/', billController.getBills);
router.get('/upcoming', billController.getUpcomingBills);
router.post('/', billController.createBill);
router.put('/:id', billController.updateBill);
router.put('/:id/pay', billController.markAsPaid);
router.delete('/:id', billController.deleteBill);

export default router;

