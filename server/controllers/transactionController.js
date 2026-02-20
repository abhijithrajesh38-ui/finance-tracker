import Transaction from '../models/Transaction.js';

// Create transaction
export const createTransaction = async (req, res) => {
  try {
    const { type, category, amount, description, date, paymentMethod, recurring, userId } = req.body;

    console.log('Received transaction data:', req.body);

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
    console.log('Transaction saved successfully:', transaction);
    res.status(201).json({ message: 'Transaction created successfully', transaction });
  } catch (error) {
    console.error('Transaction creation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all transactions for a user
export const getTransactions = async (req, res) => {
  try {
    const userId = req.query.userId; // In production, get from auth token
    const transactions = await Transaction.find({ userId }).sort({ date: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get categories used by user
export const getCategories = async (req, res) => {
  try {
    const userId = req.query.userId;
    const categories = await Transaction.distinct('category', { userId });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
