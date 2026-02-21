import mongoose from 'mongoose';

const budgetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: true
  },
  limit: {
    type: Number,
    required: true,
    min: 0
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  alertAt: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 80
  },
  spent: {
    type: Number,
    default: 0
  },
  alertSent: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

export default mongoose.model('Budget', budgetSchema);
