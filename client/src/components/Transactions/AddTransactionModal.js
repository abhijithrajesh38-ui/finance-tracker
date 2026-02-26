import React, { useState, useEffect } from 'react';
import './AddTransactionModal.css';

function AddTransactionModal({ isOpen, onClose, userId, onSuccess, prefill, autoSubmit }) {
  const defaultFormData = {
    type: 'expense',
    category: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    recurring: false
  };
  const [formData, setFormData] = useState({
    ...defaultFormData
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && userId) {
      fetchCategories();
    }
  }, [isOpen, userId]);

  useEffect(() => {
    if (!isOpen) return;
    if (!prefill) return;

    setFormData(prev => ({
      ...prev,
      ...prefill,
      category: prefill.category || ''
    }));

    if (!prefill.category) {
      setError('Please choose a category to continue');
    } else {
      setError('');
    }
  }, [isOpen, prefill]);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/transactions/categories?userId=${userId}`);
      const data = await response.json();
      setCategories(data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!formData.type || !formData.category || !formData.amount || !formData.description || !formData.date) {
      setError('All required fields must be filled');
      setLoading(false);
      return;
    }

    if (parseFloat(formData.amount) <= 0) {
      setError('Amount must be greater than 0');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          userId,
          amount: parseFloat(formData.amount)
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Reset form
        setFormData({ ...defaultFormData });
        onSuccess(formData);
        onClose();
      } else {
        setError(data.message || 'Failed to create transaction');
      }
    } catch (err) {
      setError('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    if (!autoSubmit) return;
    if (loading) return;

    const canSubmit =
      formData.type &&
      formData.category &&
      formData.amount &&
      formData.description &&
      formData.date;

    if (canSubmit) {
      handleSubmit();
    }
  }, [isOpen, autoSubmit, formData, loading]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add transaction</h2>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          <div className="form-row">
            <div className="form-group">
              <label>Type</label>
              <select name="type" value={formData.type} onChange={handleChange} required>
                <option value="income">In</option>
                <option value="expense">Out</option>
              </select>
            </div>

            <div className="form-group">
              <label>Category</label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                placeholder="e.g. food and dining"
                list="categories"
                required
              />
              <datalist id="categories">
                {categories.map((cat, idx) => (
                  <option key={idx} value={cat} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Payment method</label>
              <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange}>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank">Bank Transfer</option>
                <option value="upi">UPI</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-group full-width">
            <label>Amount</label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              placeholder="0.00"
              step="0.01"
              min="0.01"
              required
            />
          </div>

          <div className="form-group full-width">
            <label>Note</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Add a note..."
              rows="4"
              required
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddTransactionModal;
