import Budget from '../models/Budget.js';
import Transaction from '../models/Transaction.js';

// Create budget
export const createBudget = async (req, res) => {
  try {
    const { userId, category, limit, month, year, alertAt } = req.body;

    console.log('Received budget creation request:', req.body);

    // Validate required fields
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    if (!category) {
      return res.status(400).json({ message: 'Category is required' });
    }
    if (!limit || limit <= 0) {
      return res.status(400).json({ message: 'Valid limit is required' });
    }
    if (!month || month < 1 || month > 12) {
      return res.status(400).json({ message: 'Valid month (1-12) is required' });
    }
    if (!year) {
      return res.status(400).json({ message: 'Year is required' });
    }

    // Check if budget already exists for this category/month/year
    const existingBudget = await Budget.findOne({ userId, category, month, year });
    if (existingBudget) {
      return res.status(400).json({ message: 'Budget already exists for this category and period' });
    }

    const budget = new Budget({
      userId,
      category,
      limit,
      month,
      year,
      alertAt: alertAt || 80
    });

    await budget.save();
    console.log('Budget created successfully:', budget);
    res.status(201).json({ message: 'Budget created successfully', budget });
  } catch (error) {
    console.error('Error creating budget:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all budgets for a user
export const getBudgets = async (req, res) => {
  try {
    const userId = req.query.userId;
    const budgets = await Budget.find({ userId }).sort({ createdAt: -1 });
    
    // Calculate spent amount for each budget
    for (let budget of budgets) {
      const transactions = await Transaction.find({
        userId,
        category: budget.category,
        type: 'expense',
        date: {
          $gte: new Date(budget.year, budget.month - 1, 1),
          $lt: new Date(budget.year, budget.month, 1)
        }
      });
      
      budget.spent = transactions.reduce((sum, t) => sum + t.amount, 0);
      await budget.save();
    }
    
    res.json(budgets);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get budget alerts
export const getBudgetAlerts = async (req, res) => {
  try {
    const userId = req.query.userId;
    const budgets = await Budget.find({ userId });
    
    const alerts = [];
    
    for (let budget of budgets) {
      const transactions = await Transaction.find({
        userId,
        category: budget.category,
        type: 'expense',
        date: {
          $gte: new Date(budget.year, budget.month - 1, 1),
          $lt: new Date(budget.year, budget.month, 1)
        }
      });
      
      const spent = transactions.reduce((sum, t) => sum + t.amount, 0);
      const percentage = (spent / budget.limit) * 100;
      
      if (percentage >= budget.alertAt) {
        alerts.push({
          budgetId: budget._id,
          category: budget.category,
          spent,
          limit: budget.limit,
          percentage: percentage.toFixed(1),
          month: budget.month,
          year: budget.year
        });
      }
    }
    
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update budget
export const updateBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, limit, month, year, alertAt } = req.body;

    const budget = await Budget.findByIdAndUpdate(
      id,
      { category, limit, month, year, alertAt },
      { new: true }
    );
    
    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }
    
    res.json({ message: 'Budget updated successfully', budget });
  } catch (error) {
    console.error('Error updating budget:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete budget
export const deleteBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const budget = await Budget.findByIdAndDelete(id);
    
    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }
    
    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
