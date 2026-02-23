import Bill from '../models/Bill.js';

// Get all bills for a user
export const getBills = async (req, res) => {
  try {
    const { userId } = req.query;
    const bills = await Bill.find({ userId }).sort({ dueDate: 1 });
    res.json(bills);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bills', error: error.message });
  }
};

// Create a new bill
export const createBill = async (req, res) => {
  try {
    const bill = new Bill(req.body);
    await bill.save();
    res.status(201).json(bill);
  } catch (error) {
    res.status(400).json({ message: 'Error creating bill', error: error.message });
  }
};

// Update a bill
export const updateBill = async (req, res) => {
  try {
    const { id } = req.params;
    const bill = await Bill.findByIdAndUpdate(id, req.body, { new: true });
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }
    res.json(bill);
  } catch (error) {
    res.status(400).json({ message: 'Error updating bill', error: error.message });
  }
};

// Mark bill as paid
export const markAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const bill = await Bill.findByIdAndUpdate(
      id,
      { isPaid: true, paidDate: new Date() },
      { new: true }
    );
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }
    res.json(bill);
  } catch (error) {
    res.status(400).json({ message: 'Error marking bill as paid', error: error.message });
  }
};

// Delete a bill
export const deleteBill = async (req, res) => {
  try {
    const { id } = req.params;
    const bill = await Bill.findByIdAndDelete(id);
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }
    res.json({ message: 'Bill deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting bill', error: error.message });
  }
};

// Get upcoming bills (due in next 7 days)
export const getUpcomingBills = async (req, res) => {
  try {
    const { userId } = req.query;
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const bills = await Bill.find({
      userId,
      isPaid: false,
      dueDate: { $gte: today, $lte: nextWeek }
    }).sort({ dueDate: 1 });
    
    res.json(bills);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching upcoming bills', error: error.message });
  }
};

