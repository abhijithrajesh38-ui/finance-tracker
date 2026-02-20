import React, { useState } from 'react';
import './Dashboard.css';
import Transactions from '../Transactions/Transactions';
import Budget from '../Budget/Budget';

function Dashboard({ user }) {
  const [currentPage, setCurrentPage] = useState('dashboard');

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
          <Transactions />
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
            <div className="stat-value">₹1,45,800</div>
            <div className="stat-change positive">+6.4% from last month</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⬇️</div>
            <div className="stat-label">Total Income</div>
            <div className="stat-value">₹85,000</div>
            <div className="stat-change positive">+8.2% since Jan</div>
          </div>
          <div className="stat-card beige">
            <div className="stat-icon">⬆️</div>
            <div className="stat-label">Total Expenses</div>
            <div className="stat-value">₹85,000</div>
            <div className="stat-change negative">-5.1% decreased</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🐷</div>
            <div className="stat-label">Net Savings</div>
            <div className="stat-value">₹45,800</div>
            <div className="stat-change positive">+18.6% efficiency</div>
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
                  <div className="bar-group">
                    <div className="bar income" style={{height: '120px'}}></div>
                    <div className="bar expense" style={{height: '80px'}}></div>
                    <div className="bar-label">WEEK 1</div>
                  </div>
                  <div className="bar-group">
                    <div className="bar income" style={{height: '180px'}}></div>
                    <div className="bar expense" style={{height: '140px'}}></div>
                    <div className="bar-label">WEEK 2</div>
                  </div>
                  <div className="bar-group">
                    <div className="bar income" style={{height: '140px'}}></div>
                    <div className="bar expense" style={{height: '100px'}}></div>
                    <div className="bar-label">WEEK 3</div>
                  </div>
                  <div className="bar-group">
                    <div className="bar income" style={{height: '200px'}}></div>
                    <div className="bar expense" style={{height: '160px'}}></div>
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
              <a href="#" className="view-all">VIEW ALL</a>
            </div>
            <div className="transaction-list">
              <div className="transaction-item">
                <div className="transaction-icon">📺</div>
                <div className="transaction-details">
                  <div className="transaction-name">Netflix</div>
                  <div className="transaction-category">Entertainment</div>
                </div>
                <div className="transaction-date">Feb 12, 2026</div>
                <div className="transaction-amount negative">-₹15.9</div>
              </div>
              <div className="transaction-item">
                <div className="transaction-icon">💰</div>
                <div className="transaction-details">
                  <div className="transaction-name">Salary</div>
                  <div className="transaction-category">Income</div>
                </div>
                <div className="transaction-date">Feb 12, 2026</div>
                <div className="transaction-amount positive">+₹24,000</div>
              </div>
              <div className="transaction-item">
                <div className="transaction-icon">📺</div>
                <div className="transaction-details">
                  <div className="transaction-name">Netflix</div>
                  <div className="transaction-category">Entertainment</div>
                </div>
                <div className="transaction-date">Feb 12, 2026</div>
                <div className="transaction-amount negative">-₹15.9</div>
              </div>
              <div className="transaction-item">
                <div className="transaction-icon">📺</div>
                <div className="transaction-details">
                  <div className="transaction-name">Netflix</div>
                  <div className="transaction-category">Entertainment</div>
                </div>
                <div className="transaction-date">Feb 12, 2026</div>
                <div className="transaction-amount negative">-₹15.9</div>
              </div>
              <div className="transaction-item">
                <div className="transaction-icon">💰</div>
                <div className="transaction-details">
                  <div className="transaction-name">Salary</div>
                  <div className="transaction-category">Income</div>
                </div>
                <div className="transaction-date">Feb 12, 2026</div>
                <div className="transaction-amount positive">+₹24,000</div>
              </div>
              <div className="transaction-item">
                <div className="transaction-icon">📺</div>
                <div className="transaction-details">
                  <div className="transaction-name">Netflix</div>
                  <div className="transaction-category">Entertainment</div>
                </div>
                <div className="transaction-date">Feb 12, 2026</div>
                <div className="transaction-amount negative">-₹15.9</div>
              </div>
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
