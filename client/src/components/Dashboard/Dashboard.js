import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import Transactions from '../Transactions/Transactions';
import Budget from '../Budget/Budget';

function Dashboard({ user }) {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.id) {
      fetchTransactions();
    }
  }, [user]);

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/transactions?userId=${user.id}`);
      const data = await response.json();
      setTransactions(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setLoading(false);
    }
  };

  // Calculate totals
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalBalance = totalIncome - totalExpenses;
  const netSavings = totalIncome - totalExpenses;

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

  if (currentPage === 'transactions') {
    return (
      <div className="dashboard">
        <aside className="sidebar">
          <div className="logo">fb</div>
          <nav>
            <div className="nav-item" onClick={() => setCurrentPage('dashboard')}>
              <span>📊</span> Dashboard
            </div>
            <div className="nav-item active">
              <span>💸</span> Transactions
            </div>
            <div className="nav-item" onClick={() => setCurrentPage('budget')}>
              <span>📈</span> Plan
            </div>
          </nav>
        </aside>
        <main className="main-content">
          <Transactions userId={user.id} />
        </main>
      </div>
    );
  }

  if (currentPage === 'budget') {
    return (
      <div className="dashboard">
        <aside className="sidebar">
          <div className="logo">fb</div>
          <nav>
            <div className="nav-item" onClick={() => setCurrentPage('dashboard')}>
              <span>📊</span> Dashboard
            </div>
            <div className="nav-item" onClick={() => setCurrentPage('transactions')}>
              <span>💸</span> Transactions
            </div>
            <div className="nav-item active">
              <span>📈</span> Plan
            </div>
          </nav>
        </aside>
        <main className="main-content">
          <Budget />
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="logo">fb</div>
        <nav>
          <div className="nav-item active">
            <span>📊</span> Dashboard
          </div>
          <div className="nav-item" onClick={() => setCurrentPage('transactions')}>
            <span>💸</span> Transactions
          </div>
          <div className="nav-item" onClick={() => setCurrentPage('budget')}>
            <span>💼</span> Budget
          </div>
          <div className="nav-separator"></div>
          <div className="nav-item">
            <span>📈</span> Plan
          </div>
        </nav>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <div>
            <div className="date">FEBRUARY 2026</div>
            <h1>Good morning, <span className="username">{user.fullName}</span></h1>
          </div>
          <div className="header-actions">
            <input type="text" placeholder="Search Insights..." className="search-box" />
            <button className="icon-btn">🔔</button>
            <button className="icon-btn">👤</button>
          </div>
        </header>

        <div className="stats-grid">
          <div className="stat-card dark">
            <div className="stat-icon">💰</div>
            <div className="stat-label">Total Balance</div>
            <div className="stat-value">₹{totalBalance.toLocaleString()}</div>
            <div className="stat-change positive">Current balance</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⬇️</div>
            <div className="stat-label">Total Income</div>
            <div className="stat-value">₹{totalIncome.toLocaleString()}</div>
            <div className="stat-change positive">{transactions.filter(t => t.type === 'income').length} transactions</div>
          </div>
          <div className="stat-card beige">
            <div className="stat-icon">⬆️</div>
            <div className="stat-label">Total Expenses</div>
            <div className="stat-value">₹{totalExpenses.toLocaleString()}</div>
            <div className="stat-change negative">{transactions.filter(t => t.type === 'expense').length} transactions</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🐷</div>
            <div className="stat-label">Net Savings</div>
            <div className="stat-value">₹{netSavings.toLocaleString()}</div>
            <div className="stat-change positive">{totalIncome > 0 ? `${((netSavings/totalIncome)*100).toFixed(1)}%` : '0%'} savings rate</div>
          </div>
        </div>

        <div className="content-grid">
          <div className="chart-section">
            <div className="chart-card">
              <div className="section-header">
                <div>
                  <h2>Cash Flow Analysis</h2>
                  <p className="section-subtitle">Monthly Income vs. Expenses comparison</p>
                </div>
                <div className="chart-filters">
                  <button className="filter-btn">Week</button>
                  <button className="filter-btn active">Month</button>
                  <button className="filter-btn">Year</button>
                </div>
              </div>
              <div className="chart-legend">
                <span className="legend-item"><span className="legend-dot income"></span> INCOME</span>
                <span className="legend-item"><span className="legend-dot expense"></span> EXPENSES</span>
              </div>
              <div className="chart-placeholder">
                <div className="bar-chart">
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <div className="bar-group">
                      <div className="bar income" style={{height: '280px'}}></div>
                      <div className="bar expense" style={{height: '180px'}}></div>
                    </div>
                    <div className="bar-label">WEEK 1</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <div className="bar-group">
                      <div className="bar income" style={{height: '380px'}}></div>
                      <div className="bar expense" style={{height: '280px'}}></div>
                    </div>
                    <div className="bar-label">WEEK 2</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <div className="bar-group">
                      <div className="bar income" style={{height: '240px'}}></div>
                      <div className="bar expense" style={{height: '320px'}}></div>
                    </div>
                    <div className="bar-label">WEEK 3</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <div className="bar-group">
                      <div className="bar income" style={{height: '340px'}}></div>
                      <div className="bar expense" style={{height: '260px'}}></div>
                    </div>
                    <div className="bar-label">WEEK 4</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="right-sidebar">
            <div className="insights-section">
              <div className="section-header">
                <h2>AI Insights</h2>
              </div>
              <div className="insight-item">
                <div className="insight-header">
                  <span className="insight-date">OPTIMIZED</span>
                  <span className="insight-icon">🔗</span>
                </div>
                <div className="insight-text">Subscription optimization: Cancel unused 'Adobe Creative' to save $52/mo.</div>
              </div>
              <div className="insight-item">
                <div className="insight-header">
                  <span className="insight-date">ALERT</span>
                  <span className="insight-icon">⚠️</span>
                </div>
                <div className="insight-text">Tax deadline approaching in 14 days. Prepare your W2 forms.</div>
              </div>
              <div className="insight-item">
                <div className="insight-header">
                  <span className="insight-date">MARKET</span>
                  <span className="insight-icon">📈</span>
                </div>
                <div className="insight-text">New ETF opportunity matches your risk profile. 6.2% expected yield.</div>
              </div>
              <div className="insight-item">
                <div className="insight-header">
                  <span className="insight-date">UTILITY</span>
                  <span className="insight-icon">💡</span>
                </div>
                <div className="insight-text">Energy bill is 19% higher than local average. Review peak usage.</div>
              </div>
              <div className="insight-item">
                <div className="insight-header">
                  <span className="insight-date">SAVINGS</span>
                  <span className="insight-icon">🎯</span>
                </div>
                <div className="insight-text">You reached your milestone for 'Vacation Fund'. Book now for best rates.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bottom-grid">
          <div className="transactions-section">
            <div className="section-header">
              <div>
                <h2>Recent Transactions</h2>
                <p className="section-subtitle">Last 6 transactions</p>
              </div>
              <a href="#" onClick={(e) => { e.preventDefault(); setCurrentPage('transactions'); }} className="view-all">VIEW ALL</a>
            </div>
            <div className="transaction-list">
              {loading ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Loading...</div>
              ) : transactions.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  No transactions yet. Go to Transactions page to add some.
                </div>
              ) : (
                transactions.slice(0, 6).map(transaction => (
                  <div key={transaction._id} className="transaction-item">
                    <div className="transaction-icon">{getIcon(transaction.category)}</div>
                    <div className="transaction-details">
                      <div className="transaction-name">{transaction.description}</div>
                      <div className="transaction-category">{transaction.category}</div>
                    </div>
                    <div className="transaction-date">
                      {new Date(transaction.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className={`transaction-amount ${transaction.type === 'income' ? 'positive' : 'negative'}`}>
                      {transaction.type === 'income' ? '+' : '-'}₹{Math.abs(transaction.amount).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="right-sidebar-bottom">
            <div className="budgeting-section">
              <div className="section-header">
                <h2>Budgeting</h2>
                <a href="#" className="view-all">VIEW ALL</a>
              </div>
              <div className="budget-item">
                <div className="budget-label">Groceries</div>
                <div className="budget-bar">
                  <div className="budget-progress" style={{width: '80%'}}></div>
                </div>
                <div className="budget-amount">$500 / $1,000</div>
              </div>
              <div className="budget-item">
                <div className="budget-label">Leisure & Travel</div>
                <div className="budget-bar">
                  <div className="budget-progress" style={{width: '60%'}}></div>
                </div>
                <div className="budget-amount">$400 / $1,000</div>
              </div>
            </div>

            <div className="savings-section">
              <div className="section-header">
                <h2>Saving Goals</h2>
                <a href="#" className="view-all">VIEW ALL</a>
              </div>
              <div className="savings-goals">
                <div className="goal-circle">
                  <div className="circle-progress">100%</div>
                  <div className="goal-label">NEW CAR</div>
                </div>
                <div className="goal-circle">
                  <div className="circle-progress">75%</div>
                  <div className="goal-label">NEW CAR</div>
                </div>
                <div className="goal-circle">
                  <div className="circle-progress">70%</div>
                  <div className="goal-label">NEW CAR</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
