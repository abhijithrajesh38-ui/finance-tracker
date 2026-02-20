import React, { useState } from 'react';
import './Transactions.css';

function Transactions() {
  const [filter, setFilter] = useState('Month');

  const transactions = [
    { id: 1, name: 'Netflix', type: 'Out', date: 'Feb 12, 2026', category: 'Entertainment', amount: -15.9, icon: '📺' },
    { id: 2, name: 'Netflix', type: 'Out', date: 'Feb 12, 2026', category: 'Entertainment', amount: -15.9, icon: '📺' },
    { id: 3, name: 'Salary', type: 'In', date: 'Feb 13, 2026', category: 'Income', amount: 24000, icon: '💰' },
    { id: 4, name: 'Netflix', type: 'Out', date: 'Feb 12, 2026', category: 'Entertainment', amount: -15.9, icon: '📺' },
    { id: 5, name: 'Salary', type: 'In', date: 'Feb 13, 2026', category: 'Income', amount: 24000, icon: '💰' },
    { id: 6, name: 'Netflix', type: 'Out', date: 'Feb 12, 2026', category: 'Entertainment', amount: -15.9, icon: '📺' },
    { id: 7, name: 'Netflix', type: 'Out', date: 'Feb 12, 2026', category: 'Entertainment', amount: -15.9, icon: '📺' },
    { id: 8, name: 'Salary', type: 'In', date: 'Feb 12, 2026', category: 'Income', amount: 24000, icon: '💰' },
    { id: 9, name: 'Salary', type: 'In', date: 'Feb 12, 2026', category: 'Income', amount: 24000, icon: '💰' },
    { id: 10, name: 'Netflix', type: 'Out', date: 'Feb 13, 2026', category: 'Entertainment', amount: -15.9, icon: '📺' },
  ];

  return (
    <div className="transactions-page">
      <header className="page-header">
        <div>
          <div className="date">FEBRUARY 2026</div>
          <h1>Transactions</h1>
        </div>
        <button className="add-btn">+ Add Transactions</button>
      </header>

      <div className="filter-tabs">
        <button className={filter === 'Week' ? 'tab active' : 'tab'} onClick={() => setFilter('Week')}>Week</button>
        <button className={filter === 'Month' ? 'tab active' : 'tab'} onClick={() => setFilter('Month')}>Month</button>
        <button className={filter === 'Year' ? 'tab active' : 'tab'} onClick={() => setFilter('Year')}>Year</button>
      </div>

      <div className="summary-cards">
        <div className="summary-card green">
          <div className="summary-label">Total In</div>
          <div className="summary-value">₹1,45,800</div>
          <div className="summary-count">18 transactions</div>
        </div>
        <div className="summary-card red">
          <div className="summary-label">Total Out</div>
          <div className="summary-value">₹85,000</div>
          <div className="summary-count">30 transactions</div>
        </div>
        <div className="summary-card white">
          <div className="summary-label">Net Savings</div>
          <div className="summary-value">₹45,800</div>
          <div className="summary-count">+8.6% savings rate</div>
        </div>
        <div className="summary-card white">
          <div className="summary-label">Total Count</div>
          <div className="summary-value">45</div>
          <div className="summary-count">transactions this month</div>
        </div>
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <span>🔍</span>
          <input type="text" placeholder="Search" />
        </div>
        <select className="filter-select">
          <option>Type</option>
          <option>In</option>
          <option>Out</option>
        </select>
        <select className="filter-select">
          <option>Date</option>
        </select>
        <select className="filter-select">
          <option>Category</option>
        </select>
      </div>

      <div className="transactions-table">
        <div className="table-header">
          <div className="col-merchant">MERCHANT</div>
          <div className="col-type">IN/OUT</div>
          <div className="col-date">DATE</div>
          <div className="col-category">CATEGORY</div>
          <div className="col-amount">AMOUNT</div>
        </div>

        {transactions.map(transaction => (
          <div key={transaction.id} className="table-row">
            <div className="col-merchant">
              <div className="merchant-icon">{transaction.icon}</div>
              <span>{transaction.name}</span>
            </div>
            <div className={`col-type ${transaction.type === 'In' ? 'type-in' : 'type-out'}`}>
              {transaction.type}
            </div>
            <div className="col-date">{transaction.date}</div>
            <div className="col-category">
              <span className={`category-badge ${transaction.type === 'In' ? 'badge-green' : 'badge-red'}`}>
                {transaction.category}
              </span>
            </div>
            <div className={`col-amount ${transaction.amount > 0 ? 'amount-positive' : 'amount-negative'}`}>
              {transaction.amount > 0 ? '+' : ''}₹{Math.abs(transaction.amount).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div className="pagination">
        <span>Showing 10 of 45 transactions</span>
        <button className="page-btn">◀</button>
      </div>
    </div>
  );
}

export default Transactions;
