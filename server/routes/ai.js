import express from 'express';
import { getInsights, postQuery } from '../controllers/aiController.js';

const router = express.Router();

router.get('/insights', getInsights);
router.post('/query', postQuery);

export default router;
