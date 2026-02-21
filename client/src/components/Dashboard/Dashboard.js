import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import Sidebar from '../Sidebar/Sidebar';
import Transactions from '../Transactions/Transactions';
import Budget from '../Budget/Budget';
import Finn from '../Finn/Finn';

function Dashboard({ user }) {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartFilter, setChartFilter] = useState('Month');
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [budgetAlerts, setBudgetAlerts] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [budgets, setBudgets] = useState([]);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  console.log('Dashboard user object:', user);

  useEffect(() => {
    if (user && user.id) {
      fetchTransactions();
      fetchBudgetAlerts();
      fetchBudgets();
    }
  }, [user]);

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/transactions?userId=${user.id}`);
      const data = await response.json();
      setTransactions(data);
      setLoading(false);
      // Refresh alerts and budgets after fetching transactions
      fetchBudgetAlerts();
      fetchBudgets();
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setLoading(false);
    }
  };

  const fetchBudgetAlerts = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/budgets/alerts?userId=${user.id}`);
      const data = await response.json();
      console.log('Budget alerts:', data);
      setBudgetAlerts(data);
      // Check if there are new alerts
      if (data.length > 0) {
        setHasUnreadNotifications(true);
      }
    } catch (error) {
      console.error('Error fetching budget alerts:', error);
    }
  };

  const fetchBudgets = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/budgets?userId=${user.id}`);
      const data = await response.json();
      setBudgets(data);
    } catch (error) {
      console.error('Error fetching budgets:', error);
    }
  };

  // Filter transactions based on chart filter
  const getFilteredTransactions = () => {
    const now = new Date();
    
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      
      // Search filter
      const matchesSearch = !searchTerm || 
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Time period filter
      let matchesPeriod = true;
      
      if (chartFilter === 'Week') {
        const currentDay = now.getDay();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - currentDay);
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        matchesPeriod = transactionDate >= weekStart && transactionDate <= weekEnd;
      } else if (chartFilter === 'Month') {
        matchesPeriod = transactionDate.getMonth() === now.getMonth() &&
               transactionDate.getFullYear() === now.getFullYear();
      } else if (chartFilter === 'Year') {
        matchesPeriod = transactionDate.getFullYear() === now.getFullYear();
      }
      
      return matchesSearch && matchesPeriod;
    });
  };

  const filteredTransactions = getFilteredTransactions();

  // Calculate totals
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalBalance = totalIncome - totalExpenses;
  const netSavings = totalIncome - totalExpenses;

  // Calculate chart data based on filter
  const getChartData = () => {
    const now = new Date();
    
    if (chartFilter === 'Week') {
      // Group by days of current week
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const currentDay = now.getDay();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - currentDay);
      weekStart.setHours(0, 0, 0, 0);
      
      return days.map((day, index) => {
        const dayDate = new Date(weekStart);
        dayDate.setDate(weekStart.getDate() + index);
        dayDate.setHours(0, 0, 0, 0);
        
        const nextDay = new Date(dayDate);
        nextDay.setDate(dayDate.getDate() + 1);
        nextDay.setHours(0, 0, 0, 0);
        
        const dayTransactions = filteredTransactions.filter(t => {
          const tDate = new Date(t.date);
          return tDate >= dayDate && tDate < nextDay;
        });
        
        const income = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        
        return { label: day, income, expense };
      });
    } else if (chartFilter === 'Month') {
      // Group by weeks of current month
      const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      
      return weeks.map((week, index) => {
        const weekTransactions = filteredTransactions.filter(t => {
          const tDate = new Date(t.date);
          const dayOfMonth = tDate.getDate();
          return dayOfMonth >= (index * 7 + 1) && dayOfMonth <= ((index + 1) * 7);
        });
        
        const income = weekTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = weekTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        
        return { label: week, income, expense };
      });
    } else {
      // Group by months of current year
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      return months.map((month, index) => {
        const monthTransactions = filteredTransactions.filter(t => {
          const tDate = new Date(t.date);
          return tDate.getMonth() === index && tDate.getFullYear() === now.getFullYear();
        });
        
        const income = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        
        return { label: month, income, expense };
      });
    }
  };

  const chartData = getChartData();
  const maxAmount = Math.max(...chartData.map(d => Math.max(d.income, d.expense)), 1);

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    // Mark as read when opened
    if (!showNotifications) {
      setHasUnreadNotifications(false);
    }
  };

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
        <Sidebar currentPage="transactions" onNavigate={setCurrentPage} />
        <main className="main-content">
          <Transactions userId={user.id} onTransactionChange={fetchTransactions} />
        </main>
      </div>
    );
  }

  if (currentPage === 'budget') {
    return (
      <div className="dashboard">
        <Sidebar currentPage="budget" onNavigate={setCurrentPage} />
        <main className="main-content">
          <Budget userId={user.id} />
        </main>
      </div>
    );
  }

  if (currentPage === 'finn') {
    return (
      <div className="dashboard">
        <Sidebar currentPage="finn" onNavigate={setCurrentPage} />
        <Finn userId={user.id} />
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Sidebar currentPage="dashboard" onNavigate={setCurrentPage} />

      <main className="main-content">
        <header className="top-bar">
          <div>
            <div className="date">FEBRUARY 2026</div>
            <h1>Good morning, <span className="username">{user.fullName}</span></h1>
          </div>
          <div className="header-actions">
            <input 
              type="text" 
              placeholder="Search Insights..." 
              className="search-box"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="notification-container">
              <button className="icon-btn" onClick={handleNotificationClick}>
                🔔
                {hasUnreadNotifications && budgetAlerts.length > 0 && (
                  <span className="notification-badge">{budgetAlerts.length}</span>
                )}
              </button>
              {showNotifications && (
                <div className="notification-dropdown">
                  <div className="notification-header">Budget Alerts</div>
                  {budgetAlerts.length === 0 ? (
                    <div className="notification-empty">No alerts</div>
                  ) : (
                    budgetAlerts.map((alert, index) => (
                      <div key={index} className="notification-item">
                        <div className="notification-title">⚠️ {alert.category}</div>
                        <div className="notification-text">
                          You've spent ₹{alert.spent.toLocaleString()} ({alert.percentage}%) of your ₹{alert.limit.toLocaleString()} budget
                        </div>
                        <div className="notification-date">
                          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][alert.month - 1]} {alert.year}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="account-menu-container">
              <button className="icon-btn" onClick={() => setShowAccountMenu(!showAccountMenu)}>👤</button>
              {showAccountMenu && (
                <div className="account-dropdown">
                  <div className="account-info">
                    <div className="account-name">{user.fullName}</div>
                    <div className="account-email">{user.email}</div>
                  </div>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item" onClick={() => window.location.reload()}>
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
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
                  <button className={`filter-btn ${chartFilter === 'Week' ? 'active' : ''}`} onClick={() => setChartFilter('Week')}>Week</button>
                  <button className={`filter-btn ${chartFilter === 'Month' ? 'active' : ''}`} onClick={() => setChartFilter('Month')}>Month</button>
                  <button className={`filter-btn ${chartFilter === 'Year' ? 'active' : ''}`} onClick={() => setChartFilter('Year')}>Year</button>
                </div>
              </div>
              <div className="chart-legend">
                <span className="legend-item"><span className="legend-dot income"></span> INCOME</span>
                <span className="legend-item"><span className="legend-dot expense"></span> EXPENSES</span>
              </div>
              <div className="chart-placeholder">
                <div className="bar-chart">
                  {chartData.map((data, index) => (
                    <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <div className="bar-group">
                        <div className="bar income" style={{height: `${(data.income / maxAmount) * 350}px`}}></div>
                        <div className="bar expense" style={{height: `${(data.expense / maxAmount) * 350}px`}}></div>
                      </div>
                      <div className="bar-label">{data.label}</div>
                    </div>
                  ))}
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
                <a href="#" onClick={(e) => { e.preventDefault(); setCurrentPage('budget'); }} className="view-all">VIEW ALL</a>
              </div>
              {budgets.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '14px' }}>
                  No budgets set yet
                </div>
              ) : (
                budgets.slice(0, 2).map(budget => {
                  const percentage = budget.limit > 0 ? Math.round((budget.spent / budget.limit) * 100) : 0;
                  return (
                    <div key={budget._id} className="budget-item">
                      <div className="budget-label">
                        <span>{budget.category}</span>
                        <span>{percentage}%</span>
                      </div>
                      <div className="budget-bar">
                        <div 
                          className="budget-progress" 
                          style={{
                            width: `${Math.min(percentage, 100)}%`,
                            background: percentage >= 100 ? '#f44336' : percentage >= 80 ? '#ffd700' : '#1a1a1a'
                          }}
                        ></div>
                      </div>
                      <div className="budget-amount">₹{budget.spent.toLocaleString()} / ₹{budget.limit.toLocaleString()}</div>
                    </div>
                  );
                })
              )}
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
