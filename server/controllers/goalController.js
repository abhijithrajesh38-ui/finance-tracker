import Goal from '../models/Goal.js';
import Transaction from '../models/Transaction.js';

// Allocate yearly savings to goals (prioritize closest target dates first)
export const allocateSavings = async (req, res) => {
  try {
    const userId = req.userId; // From auth middleware
    
    // Get current year transactions
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);
    
    const transactions = await Transaction.find({
      userId,
      date: { $gte: startOfYear, $lte: endOfYear }
    });
    
    // Calculate yearly savings (income - expenses)
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const yearlySavings = totalIncome - totalExpenses;
    
    if (yearlySavings <= 0) {
      // Reset all goals to 0 if no savings
      await Goal.updateMany({ userId }, { currentAmount: 0, status: 'active' });
      return res.json({ message: 'No savings to allocate', yearlySavings: 0 });
    }
    
    // Get ALL goals sorted by target date (CLOSEST date first = ascending order)
    const allGoals = await Goal.find({ userId }).sort({ targetDate: 1 });
    
    // Reset all goals before reallocation
    for (const goal of allGoals) {
      goal.currentAmount = 0;
      goal.status = 'active';
    }
    
    let remainingSavings = yearlySavings;
    
    // Allocate savings to goals (fill each goal COMPLETELY before moving to next)
    // Priority: Closest target date first
    for (const goal of allGoals) {
      if (remainingSavings <= 0) {
        // No more savings, save with 0 amount
        await goal.save();
        continue;
      }
      
      const needed = goal.targetAmount;
      
      if (remainingSavings >= needed) {
        // We have enough to complete this goal
        goal.currentAmount = goal.targetAmount;
        goal.status = 'completed';
        remainingSavings -= needed;
      } else {
        // Partial allocation - add what we have left
        goal.currentAmount = remainingSavings;
        goal.status = 'active';
        remainingSavings = 0;
      }
      
      await goal.save();
    }
    
    res.json({ 
      message: 'Savings allocated successfully',
      yearlySavings,
      allocated: yearlySavings - remainingSavings,
      remaining: remainingSavings
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to allocate savings' });
  }
};

// Get all goals for a user
export const getGoals = async (req, res) => {
  try {
    const userId = req.userId; // From auth middleware
    const goals = await Goal.find({ userId }).sort({ createdAt: -1 });
    res.json(goals);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch goals' });
  }
};

// Create a new goal
export const createGoal = async (req, res) => {
  try {
    const goal = new Goal(req.body);
    await goal.save();
    res.status(201).json(goal);
  } catch (error) {
    res.status(400).json({ message: 'Failed to create goal' });
  }
};

// Update a goal
export const updateGoal = async (req, res) => {
  try {
    const { id } = req.params;
    // Don't allow updating currentAmount or status manually
    const { currentAmount, status, ...updateData } = req.body;
    const goal = await Goal.findByIdAndUpdate(id, updateData, { new: true });
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }
    res.json(goal);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update goal' });
  }
};

// Delete a goal
export const deleteGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const goal = await Goal.findByIdAndDelete(id);
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }
    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete goal' });
  }
};
