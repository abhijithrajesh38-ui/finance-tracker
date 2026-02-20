import React, { useState, useEffect } from 'react';
import './Transactions.css';
import AddTransactionModal from './AddTransactionModal';

function Transactions({ userId }) {
  const [filter, setFilter] = useState('Month');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchTransactions();
    }
  }, [userId]);

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/transactions?userId=${userId}`);
      const data = await response.json();
      setTransactions(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setLoading(false);
    }
  };

  const handleTransactionSuccess = () => {
    fetchTransactions();
    alert('Transaction added successfully!');
  };

  // Calculate totals
  const totalIn = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalOut = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const netSavings = totalIn - totalOut;
  const totalCount = transactions.length;
  const inCount = transactions.filter(t => t.type === 'income').length;
  const outCount = transactions.filter(t => t.type === 'expense').length;

  const getIcon = (category) => {
    const icons = {
      'Entertainment': '📺',
      'Income': '💰',
      'Salary': '💰',
      'Food': '🍔',
      'Transport': '🚗',
      'Shopping': '🛍️',
      'Bills': '📄',
      'Health': '🏥'
    };
    return icons[category] || '💳';
  };

  if (loading) {
    return <div className="transactions-page">Loading...</div>;
  }

  return (
    <div className="transactions-page">
      <header className="page-header">
        <div>
          <div className="date">FEBRUARY 2026</div>
          <h1>Transactions</h1>
        </div>
        <button className="add-btn" onClick={() => setIsModalOpen(true)}>+ Add Transactions</button>
      </header>

      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={userId}
        onSuccess={handleTransactionSuccess}
      />

      <div className="filter-tabs">
        <button className={filter === 'Week' ? 'tab active' : 'tab'} onClick={() => setFilter('Week')}>Week</button>
        <button className={filter === 'Month' ? 'tab active' : 'tab'} onClick={() => setFilter('Month')}>Month</button>
        <button className={filter === 'Year' ? 'tab active' : 'tab'} onClick={() => setFilter('Year')}>Year</button>
      </div>

      <div className="summary-cards">
        <div className="summary-card green">
          <div className="summary-label">Total In</div>
          <div className="summary-value">₹{totalIn.toLocaleString()}</div>
          <div className="summary-count">{inCount} transactions</div>
        </div>
        <div className="summary-card red">
          <div className="summary-label">Total Out</div>
          <div className="summary-value">₹{totalOut.toLocaleString()}</div>
          <div className="summary-count">{outCount} transactions</div>
        </div>
        <div className="summary-card white">
          <div className="summary-label">Net Savings</div>
          <div className="summary-value">₹{netSavings.toLocaleString()}</div>
          <div className="summary-count">{totalIn > 0 ? `${((netSavings/totalIn)*100).toFixed(1)}%` : '0%'} savings rate</div>
        </div>
        <div className="summary-card white">
          <div className="summary-label">Total Count</div>
          <div className="summary-value">{totalCount}</div>
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

        {transactions.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            No transactions yet. Click "Add Transactions" to get started.
          </div>
        ) : (
          transactions.map(transaction => (
            <div key={transaction._id} className="table-row">
              <div className="col-merchant">
                <div className="merchant-icon">{getIcon(transaction.category)}</div>
                <span>{transaction.description}</span>
              </div>
              <div className={`col-type ${transaction.type === 'income' ? 'type-in' : 'type-out'}`}>
                {transaction.type === 'income' ? 'In' : 'Out'}
              </div>
              <div className="col-date">{new Date(transaction.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              <div className="col-category">
                <span className={`category-badge ${transaction.type === 'income' ? 'badge-green' : 'badge-red'}`}>
                  {transaction.category}
                </span>
              </div>
              <div className={`col-amount ${transaction.type === 'income' ? 'amount-positive' : 'amount-negative'}`}>
                {transaction.type === 'income' ? '+' : '-'}₹{Math.abs(transaction.amount).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pagination">
        <span>Showing {transactions.length} of {transactions.length} transactions</span>
        <button className="page-btn">◀</button>
      </div>
    </div>
  );
}

export default Transactions;
