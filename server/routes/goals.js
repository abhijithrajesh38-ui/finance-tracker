import express from 'express';
import { 
  getGoals, 
  createGoal, 
  updateGoal, 
  deleteGoal,
  allocateSavings
} from '../controllers/goalController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All goal routes require authentication
router.get('/', authenticate, getGoals);
router.post('/', authenticate, createGoal);
router.put('/:id', authenticate, updateGoal);
router.delete('/:id', authenticate, deleteGoal);
router.post('/allocate', authenticate, allocateSavings);

export default router;
