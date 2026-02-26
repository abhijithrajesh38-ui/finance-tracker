import express from 'express';
import { 
  getGoals, 
  createGoal, 
  updateGoal, 
  deleteGoal,
  allocateSavings
} from '../controllers/goalController.js';

const router = express.Router();

router.get('/', getGoals);
router.post('/', createGoal);
router.put('/:id', updateGoal);
router.delete('/:id', deleteGoal);
router.post('/allocate', allocateSavings);

export default router;
