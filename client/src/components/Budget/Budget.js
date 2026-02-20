import React from 'react';
import './Budget.css';

function Budget() {
  const budgets = [
    { id: 1, name: 'Food & Dining', icon: '🍔', spent: 450, total: 600, color: '#1a1a1a', percentage: 75 },
    { id: 2, name: 'Entertainment', icon: '📺', spent: 320, total: 250, color: '#f44336', percentage: 128 },
    { id: 3, name: 'Shopping', icon: '🛍️', spent: 340, total: 500, color: '#1a1a1a', percentage: 68 },
    { id: 4, name: 'Health & Fitness', icon: '🏋️', spent: 185, total: 200, color: '#ffd700', percentage: 93 },
  ];

  const totalBudget = 3450;
  const totalSpent = 2830;
  const remaining = 620;
  const overallPercentage = Math.round((totalSpent / totalBudget) * 100);

  return (
    <div className="budget-page">
      <header className="page-header">
        <div>
          <div className="date">FEBRUARY 2026</div>
          <h1>Budget</h1>
        </div>
        <button className="add-btn">+ Add Budget</button>
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

        {budgets.map(budget => (
          <div key={budget.id} className="budget-item-large">
            <div className="budget-header">
              <div className="budget-info">
                <span className="budget-icon-large">{budget.icon}</span>
                <span className="budget-name">{budget.name}</span>
              </div>
              <div className="budget-amounts">
                <span className="amount-spent">₹{budget.spent}</span>
                <span className="amount-total">/₹{budget.total}</span>
              </div>
              <div className="budget-actions">
                <button className="action-btn edit">✏️</button>
                <button className="action-btn delete">🗑️</button>
              </div>
            </div>
            <div className="budget-progress-bar">
              <div 
                className="budget-progress-fill" 
                style={{ 
                  width: `${Math.min(budget.percentage, 100)}%`,
                  background: budget.color 
                }}
              ></div>
            </div>
            <div className="budget-percentage-label">{budget.percentage}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Budget;
