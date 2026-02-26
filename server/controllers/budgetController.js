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
    const budgets = await Budget.find({ userId }).sort({ createdAt: -1 }).lean();
    
    // Get all transactions at once
    const transactions = await Transaction.find({
      userId,
      type: 'expense'
    }).lean();
    
    console.log('=== BUDGET DEBUG ===');
    console.log('User ID:', userId);
    console.log('Total budgets:', budgets.length);
    console.log('Total expense transactions:', transactions.length);
    
    // Calculate spent amount for each budget efficiently
    const budgetsWithSpent = budgets.map(budget => {
      console.log(`\nChecking budget: "${budget.category}" (Month: ${budget.month}, Year: ${budget.year})`);
      
      const budgetTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        // Case-insensitive and trimmed category comparison
        const transactionCategory = (t.category || '').trim().toLowerCase();
        const budgetCategory = (budget.category || '').trim().toLowerCase();
        
        const categoryMatch = transactionCategory === budgetCategory;
        const dateInRange = tDate >= new Date(budget.year, budget.month - 1, 1) &&
                           tDate < new Date(budget.year, budget.month, 1);
        
        if (categoryMatch) {
          console.log(`  Found matching category transaction: "${t.category}", Amount: ${t.amount}, Date: ${t.date}, In date range: ${dateInRange}`);
        }
        
        return categoryMatch && dateInRange;
      });
      
      const spent = budgetTransactions.reduce((sum, t) => sum + t.amount, 0);
      console.log(`  Total spent for "${budget.category}": ${spent}`);
      
      return {
        ...budget,
        spent
      };
    });
    
    console.log('=== END DEBUG ===\n');
    
    res.json(budgetsWithSpent);
  } catch (error) {
    console.error('Error in getBudgets:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get budget alerts
export const getBudgetAlerts = async (req, res) => {
  try {
    const userId = req.query.userId;
    const budgets = await Budget.find({ userId }).lean();
    
    // Get all expense transactions at once
    const transactions = await Transaction.find({
      userId,
      type: 'expense'
    }).lean();
    
    const alerts = [];
    
    for (let budget of budgets) {
      const budgetTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        // Case-insensitive and trimmed category comparison
        const transactionCategory = (t.category || '').trim().toLowerCase();
        const budgetCategory = (budget.category || '').trim().toLowerCase();
        
        return transactionCategory === budgetCategory &&
               tDate >= new Date(budget.year, budget.month - 1, 1) &&
               tDate < new Date(budget.year, budget.month, 1);
      });
      
      const spent = budgetTransactions.reduce((sum, t) => sum + t.amount, 0);
      const percentage = (spent / budget.limit) * 100;
      
      if (percentage >= budget.alertAt) {
        // Find the most recent transaction that contributed to this alert
        const sortedTransactions = budgetTransactions.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        const latestTransactionTime = sortedTransactions.length > 0 
          ? new Date(sortedTransactions[0].date).getTime()
          : Date.now();
        
        alerts.push({
          budgetId: budget._id,
          category: budget.category,
          spent,
          limit: budget.limit,
          percentage: percentage.toFixed(1),
          month: budget.month,
          year: budget.year,
          alertAt: budget.alertAt,
          triggeredAt: latestTransactionTime
        });
      }
    }
    
    // Sort alerts by most recently triggered (latest transaction) first
    alerts.sort((a, b) => b.triggeredAt - a.triggeredAt);
    
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update budget
export const updateBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, limit, month, year, alertAt, userId } = req.body;

    // Check if another budget exists with same category/month/year (excluding current budget)
    const existingBudget = await Budget.findOne({ 
      userId, 
      category, 
      month, 
      year,
      _id: { $ne: id }  // Exclude current budget from check
    });
    
    if (existingBudget) {
      return res.status(400).json({ message: 'Budget already exists for this category and period' });
    }

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
