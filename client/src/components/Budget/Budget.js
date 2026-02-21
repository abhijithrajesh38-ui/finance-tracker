import { useState, useEffect } from 'react';
import './Budget.css';

function Budget({ userId }) {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    limit: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    alertAt: 80
  });

  console.log('Budget component userId:', userId);

  useEffect(() => {
    if (userId) {
      fetchBudgets();
    }
  }, [userId]);

  const fetchBudgets = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/budgets?userId=${userId}`);
      const data = await response.json();
      setBudgets(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!userId) {
      alert('User ID is missing. Please log in again.');
      return;
    }
    
    try {
      const budgetData = {
        userId,
        category: formData.category,
        limit: parseFloat(formData.limit),
        month: parseInt(formData.month),
        year: parseInt(formData.year),
        alertAt: parseInt(formData.alertAt)
      };
      
      console.log('Sending budget data:', budgetData);
      
      const response = await fetch('http://localhost:5000/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(budgetData)
      });
      
      const data = await response.json();
      console.log('Server response:', data);
      
      if (response.ok) {
        setShowModal(false);
        setFormData({
          category: '',
          limit: '',
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          alertAt: 80
        });
        fetchBudgets();
      } else {
        alert(data.message || 'Failed to create budget');
      }
    } catch (error) {
      console.error('Error creating budget:', error);
      alert('Failed to create budget: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this budget?')) {
      try {
        await fetch(`http://localhost:5000/api/budgets/${id}`, { method: 'DELETE' });
        fetchBudgets();
      } catch (error) {
        console.error('Error deleting budget:', error);
      }
    }
  };

  const totalBudget = budgets.reduce((sum, b) => sum + b.limit, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const remaining = totalBudget - totalSpent;
  const overallPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const getIcon = (category) => {
    const icons = {
      'Groceries': '🛒',
      'Food': '🍔',
      'Entertainment': '📺',
      'Shopping': '🛍️',
      'Health': '🏥',
      'Transport': '🚗',
      'Bills': '📄',
      'Education': '📚'
    };
    return icons[category] || '💳';
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 100) return '#f44336';
    if (percentage >= 80) return '#ffd700';
    return '#1a1a1a';
  };

  return (
    <div className="budget-page">
      <header className="page-header">
        <div>
          <div className="date">FEBRUARY 2026</div>
          <h1>Budget</h1>
        </div>
        <button className="add-btn" onClick={() => setShowModal(true)}>+ Set Budget</button>
      </header>

      <div className="overall-progress">
        <div className="progress-header">
          <h2>Overall Budget Progress</h2>
          <span className="progress-percentage">{overallPercentage}% Used</span>
        </div>
        <div className="progress-bar-large">
          <div className="progress-fill-large" style={{ width: `${overallPercentage}%` }}></div>
        </div>
        <div className="progress-footer">
          <span>₹{totalSpent.toLocaleString()} spent</span>
          <span>₹{totalBudget.toLocaleString()} total</span>
        </div>
      </div>

      <div className="budget-summary">
        <div className="summary-card-budget">
          <div className="summary-label">Total Budget</div>
          <div className="summary-value">₹{totalBudget.toLocaleString()}</div>
          <div className="summary-count">across 8 categories</div>
        </div>
        <div className="summary-card-budget">
          <div className="summary-label">Total Spent</div>
          <div className="summary-value">₹{totalSpent.toLocaleString()}</div>
          <div className="summary-count">{overallPercentage}% of budget</div>
        </div>
        <div className="summary-card-budget">
          <div className="summary-label">Remaining</div>
          <div className="summary-value">₹{remaining}</div>
          <div className="summary-count">{100 - overallPercentage}% left</div>
        </div>
      </div>

      <div className="category-breakdown">
        <h2>Category Breakdown</h2>

        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Loading...</div>
        ) : budgets.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            No budgets set yet. Click "Set Budget" to create one.
          </div>
        ) : (
          budgets.map(budget => {
            const percentage = budget.limit > 0 ? Math.round((budget.spent / budget.limit) * 100) : 0;
            return (
              <div key={budget._id} className="budget-item-large">
                <div className="budget-header">
                  <div className="budget-info">
                    <span className="budget-icon-large">{getIcon(budget.category)}</span>
                    <span className="budget-name">{budget.category}</span>
                  </div>
                  <div className="budget-amounts">
                    <span className="amount-spent">₹{budget.spent.toLocaleString()}</span>
                    <span className="amount-total">/₹{budget.limit.toLocaleString()}</span>
                  </div>
                  <div className="budget-actions">
                    <button className="action-btn delete" onClick={() => handleDelete(budget._id)}>🗑️</button>
                  </div>
                </div>
                <div className="budget-progress-bar">
                  <div 
                    className="budget-progress-fill" 
                    style={{ 
                      width: `${Math.min(percentage, 100)}%`,
                      background: getProgressColor(percentage)
                    }}
                  ></div>
                </div>
                <div className="budget-percentage-label">{percentage}%</div>
              </div>
            );
          })
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Set Budget</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  placeholder="e.g., Groceries"
                  required
                />
              </div>
              <div className="form-group">
                <label>Limit (₹)</label>
                <input
                  type="number"
                  value={formData.limit}
                  onChange={(e) => setFormData({...formData, limit: e.target.value})}
                  placeholder="500"
                  min="0"
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Month</label>
                  <select
                    value={formData.month}
                    onChange={(e) => setFormData({...formData, month: parseInt(e.target.value)})}
                  >
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                      <option key={i} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Year</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})}
                    min="2020"
                    max="2030"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Alert at (%)</label>
                <input
                  type="number"
                  value={formData.alertAt}
                  onChange={(e) => setFormData({...formData, alertAt: parseInt(e.target.value)})}
                  min="0"
                  max="100"
                />
              </div>
              <button type="submit" className="submit-btn">Save</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Budget;
