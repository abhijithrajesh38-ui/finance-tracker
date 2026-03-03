import Goal from '../models/Goal.js';
import Transaction from '../models/Transaction.js';

// Allocate yearly savings to goals (prioritize closest target dates first)
export const allocateSavings = async (req, res) => {
  try {
    const { userId } = req.query;
    
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
    
    console.log('Allocation Debug:', {
      totalIncome,
      totalExpenses,
      yearlySavings
    });
    
    if (yearlySavings <= 0) {
      // Reset all non-achieved goals to 0 if no savings
      const allGoals = await Goal.find({ userId });
      for (const goal of allGoals) {
        if (!goal.achieved) {
          goal.currentAmount = 0;
          goal.status = 'active';
          await goal.save();
        }
      }
      return res.json({ message: 'No savings to allocate', yearlySavings: 0 });
    }
    
    // Get ONLY non-achieved goals sorted by target date (CLOSEST date first = ascending order)
    const allGoals = await Goal.find({ userId, achieved: { $ne: true } }).sort({ targetDate: 1 });
    
    console.log('Goals before allocation (active only):', allGoals.map(g => ({
      name: g.name,
      achieved: g.achieved,
      currentAmount: g.currentAmount,
      targetAmount: g.targetAmount
    })));
    
    // Reset all active goals before reallocation
    for (const goal of allGoals) {
      goal.currentAmount = 0;
      goal.status = 'active';
    }
    
    let remainingSavings = yearlySavings;
    
    console.log('Starting allocation with savings:', remainingSavings);
    
    // Allocate savings to goals (fill each goal COMPLETELY before moving to next)
    // Priority: Closest target date first
    for (const goal of allGoals) {
      let updateData = {};
      
      if (remainingSavings <= 0) {
        // No more savings, set to 0
        console.log(`No savings left for goal: ${goal.name}, setting to 0`);
        updateData = { currentAmount: 0, status: 'active' };
      } else {
        const needed = goal.targetAmount;
        
        if (remainingSavings >= needed) {
          // We have enough to complete this goal
          updateData = { currentAmount: goal.targetAmount, status: 'completed' };
          remainingSavings -= needed;
          console.log(`Completed goal: ${goal.name}, allocated: ${needed}, remaining: ${remainingSavings}`);
        } else {
          // Partial allocation - add what we have left
          updateData = { currentAmount: remainingSavings, status: 'active' };
          console.log(`Partial allocation for goal: ${goal.name}, allocated: ${remainingSavings}`);
          remainingSavings = 0;
        }
      }
      
      // Use findByIdAndUpdate to ensure the update is saved
      const updatedGoal = await Goal.findByIdAndUpdate(
        goal._id,
        updateData,
        { new: true }
      );
      
      console.log(`Updated goal ${goal.name} in DB:`, {
        currentAmount: updatedGoal.currentAmount,
        status: updatedGoal.status,
        achieved: updatedGoal.achieved
      });
    }
    
    console.log('Goals after allocation:', allGoals.map(g => ({
      name: g.name,
      achieved: g.achieved,
      currentAmount: g.currentAmount,
      status: g.status
    })));
    
    res.json({ 
      message: 'Savings allocated successfully',
      yearlySavings,
      allocated: yearlySavings - remainingSavings,
      remaining: remainingSavings
    });
  } catch (error) {
    console.error('Error allocating savings:', error);
    res.status(500).json({ message: 'Error allocating savings', error: error.message });
  }
};

// Get all goals for a user
export const getGoals = async (req, res) => {
  try {
    const { userId } = req.query;
    const goals = await Goal.find({ userId }).sort({ createdAt: -1 });
    res.json(goals);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching goals', error: error.message });
  }
};

// Create a new goal
export const createGoal = async (req, res) => {
  try {
    console.log('Creating goal with data:', req.body);
    
    // Check for duplicate goal name for this user (case-insensitive)
    const existingGoal = await Goal.findOne({
      userId: req.body.userId,
      name: { $regex: new RegExp(`^${req.body.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });
    
    if (existingGoal) {
      return res.status(400).json({ 
        message: `A goal named "${req.body.name}" already exists. Please use a different name.` 
      });
    }
    
    const goal = new Goal(req.body);
    await goal.save();
    console.log('Goal created successfully:', goal);
    res.status(201).json(goal);
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(400).json({ message: 'Error creating goal', error: error.message });
  }
};

// Update a goal
export const updateGoal = async (req, res) => {
  try {
    const { id } = req.params;
    
    // If name is being changed, check for duplicates (case-insensitive)
    if (req.body.name) {
      const existingGoal = await Goal.findOne({
        userId: req.body.userId,
        name: { $regex: new RegExp(`^${req.body.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        _id: { $ne: id } // Exclude current goal
      });
      
      if (existingGoal) {
        return res.status(400).json({ 
          message: `A goal named "${req.body.name}" already exists. Please use a different name.` 
        });
      }
    }
    
    // Don't allow updating currentAmount or status manually (except when marking as achieved)
    const { currentAmount, status, ...updateData } = req.body;
    
    // Allow achieved field to be updated
    if (req.body.achieved !== undefined) {
      updateData.achieved = req.body.achieved;
    }
    
    // If marking as achieved, also update status and currentAmount
    if (req.body.achieved === true) {
      updateData.status = 'completed';
      updateData.currentAmount = req.body.targetAmount;
    }
    
    const goal = await Goal.findByIdAndUpdate(id, updateData, { new: true });
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }
    res.json(goal);
  } catch (error) {
    res.status(400).json({ message: 'Error updating goal', error: error.message });
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
    res.status(500).json({ message: 'Error deleting goal', error: error.message });
  }
};
