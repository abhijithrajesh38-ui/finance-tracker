import Transaction from '../models/Transaction.js';

// Create transaction
export const createTransaction = async (req, res) => {
  try {
    const { type, category, amount, description, date, paymentMethod, recurring, userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const transaction = new Transaction({
      userId,
      type,
      category,
      amount,
      description,
      date: date || new Date(),
      paymentMethod: paymentMethod || 'cash',
      recurring: recurring || false
    });

    await transaction.save();
    res.status(201).json({ message: 'Transaction created successfully', transaction });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create transaction' });
  }
};

// Get all transactions for a user
export const getTransactions = async (req, res) => {
  try {
    const userId = req.userId; // From auth middleware
    const transactions = await Transaction.find({ userId }).sort({ date: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
};

// Get categories used by user
export const getCategories = async (req, res) => {
  try {
    const userId = req.userId; // From auth middleware
    const categories = await Transaction.distinct('category', { userId });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
};

// Delete transaction
export const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await Transaction.findByIdAndDelete(id);
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
