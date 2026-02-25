import { useState, useEffect } from 'react';
import './Dashboard.css';
import Sidebar from '../Sidebar/Sidebar';
import Transactions from '../Transactions/Transactions';
import Budget from '../Budget/Budget';
import Finn from '../Finn/Finn';
import Report from '../Report/Report';
import Compare from '../Compare/Compare';
import Bills from '../Bills/Bills';
import Goals from '../Goals/Goals';
import { 
  MdAccountBalance, MdTrendingDown, MdTrendingUp, MdSavings,
  MdNotifications, MdPerson, MdWarning, MdArrowDownward, MdArrowUpward
} from 'react-icons/md';

function Dashboard({ user, onLogout }) {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [chartFilter, setChartFilter] = useState('Month');
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [budgetAlerts, setBudgetAlerts] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [budgets, setBudgets] = useState([]);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [upcomingBills, setUpcomingBills] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  console.log('Dashboard user object:', user);

  // Refresh data when returning to dashboard
  useEffect(() => {
    if (user && user.id && currentPage === 'dashboard') {
      fetchUpcomingBills();
      fetchBudgetAlerts();
    }
  }, [currentPage, user]);

  useEffect(() => {
    if (user && user.id) {
      fetchTransactions();
      fetchBudgetAlerts();
      fetchBudgets();
      fetchAiInsights();
      fetchUpcomingBills();
    }
  }, [user]);

  const fetchAiInsights = async () => {
    try {
      setAiLoading(true);
      const response = await fetch(`http://localhost:5000/api/ai/insights?userId=${user.id}`);
      const data = await response.json();
      setAiInsights(Array.isArray(data.insights) ? data.insights : []);
    } catch (error) {
      console.error('Error fetching AI insights:', error);
      setAiInsights([]);
    } finally {
      setAiLoading(false);
    }
  };

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
      
      // Check if alerts have changed
      const alertsKey = `last_seen_alerts_${user.id}`;
      const lastSeenStr = localStorage.getItem(alertsKey);
      const lastSeen = lastSeenStr ? JSON.parse(lastSeenStr) : [];
      
      setBudgetAlerts(data);
      
      // Calculate new alerts (not in last seen)
      // Use budgetId to track individual budgets, not just category/month/year
      const newAlerts = data.filter(alert => 
        !lastSeen.some(seen => seen.budgetId === alert.budgetId)
      );
      
      // Get current bills to calculate total
      const billsKey = `last_seen_bills_${user.id}`;
      const lastSeenBillsStr = localStorage.getItem(billsKey);
      const lastSeenBills = lastSeenBillsStr ? JSON.parse(lastSeenBillsStr) : [];
      
      const newBills = upcomingBills.filter(bill => 
        !lastSeenBills.some(seen => seen._id === bill._id)
      );
      
      // Update unread count
      updateUnreadCount(newAlerts.length, newBills.length);
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

  const fetchUpcomingBills = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/bills/upcoming?userId=${user.id}`);
      const data = await response.json();
      console.log('Upcoming bills:', data);
      
      // Check if bills have changed
      const billsKey = `last_seen_bills_${user.id}`;
      const lastSeenStr = localStorage.getItem(billsKey);
      const lastSeen = lastSeenStr ? JSON.parse(lastSeenStr) : [];
      
      setUpcomingBills(data);
      
      // Calculate new bills (not in last seen)
      const newBills = data.filter(bill => 
        !lastSeen.some(seen => seen._id === bill._id)
      );
      
      // Get current alerts to calculate total
      const alertsKey = `last_seen_alerts_${user.id}`;
      const lastSeenAlertsStr = localStorage.getItem(alertsKey);
      const lastSeenAlerts = lastSeenAlertsStr ? JSON.parse(lastSeenAlertsStr) : [];
      
      const newAlerts = budgetAlerts.filter(alert => 
        !lastSeenAlerts.some(seen => seen.budgetId === alert.budgetId)
      );
      
      // Update unread count
      updateUnreadCount(newAlerts.length, newBills.length);
    } catch (error) {
      console.error('Error fetching upcoming bills:', error);
    }
  };

  const updateUnreadCount = (alertsOrCount, billsOrCount) => {
    const alertCount = typeof alertsOrCount === 'number' ? alertsOrCount : 
                       (Array.isArray(alertsOrCount) ? alertsOrCount.length : 0);
    const billCount = typeof billsOrCount === 'number' ? billsOrCount : 
                      (Array.isArray(billsOrCount) ? billsOrCount.length : 0);
    
    const total = alertCount + billCount;
    setUnreadCount(total);
    setHasUnreadNotifications(total > 0);
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

  // Calculate totals for current period
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalBalance = totalIncome - totalExpenses;
  const netSavings = totalIncome - totalExpenses;

  // Calculate last period's totals for comparison based on current filter
  const getLastPeriodData = () => {
    const now = new Date();
    let lastPeriodTransactions = [];
    
    if (chartFilter === 'Week') {
      // Compare with last week
      const currentDay = now.getDay();
      const lastWeekStart = new Date(now);
      lastWeekStart.setDate(now.getDate() - currentDay - 7);
      lastWeekStart.setHours(0, 0, 0, 0);
      
      const lastWeekEnd = new Date(lastWeekStart);
      lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
      lastWeekEnd.setHours(23, 59, 59, 999);
      
      lastPeriodTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= lastWeekStart && tDate <= lastWeekEnd;
      });
    } else if (chartFilter === 'Month') {
      // Compare with last month
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      
      lastPeriodTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= lastMonth && tDate <= lastMonthEnd;
      });
    } else if (chartFilter === 'Year') {
      // Compare with last year
      const lastYear = now.getFullYear() - 1;
      
      lastPeriodTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getFullYear() === lastYear;
      });
    }
    
    const lastPeriodIncome = lastPeriodTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const lastPeriodExpenses = lastPeriodTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const lastPeriodBalance = lastPeriodIncome - lastPeriodExpenses;
    const lastPeriodSavings = lastPeriodIncome - lastPeriodExpenses;
    
    return { lastPeriodIncome, lastPeriodExpenses, lastPeriodBalance, lastPeriodSavings };
  };

  const { lastPeriodIncome, lastPeriodExpenses, lastPeriodBalance, lastPeriodSavings } = getLastPeriodData();

  // Calculate percentage changes
  const calculateChange = (current, previous) => {
    // If no previous data exists, show 0%
    if (previous === 0 && current === 0) return 0;
    if (previous === 0) return 0; // Show 0% when no previous data to compare
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const balanceChange = calculateChange(totalBalance, lastPeriodBalance);
  const incomeChange = calculateChange(totalIncome, lastPeriodIncome);
  const expensesChange = calculateChange(totalExpenses, lastPeriodExpenses);
  const savingsChange = calculateChange(netSavings, lastPeriodSavings);

  // Get period label for stat cards
  const getPeriodLabel = () => {
    if (chartFilter === 'Week') return 'from last week';
    if (chartFilter === 'Month') return 'from last month';
    if (chartFilter === 'Year') return 'from last year';
    return 'from last month';
  };

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
    // Mark all current notifications as seen when opened
    if (!showNotifications && (budgetAlerts.length > 0 || upcomingBills.length > 0)) {
      // Save current alerts and bills as "seen"
      const alertsKey = `last_seen_alerts_${user.id}`;
      const billsKey = `last_seen_bills_${user.id}`;
      localStorage.setItem(alertsKey, JSON.stringify(budgetAlerts));
      localStorage.setItem(billsKey, JSON.stringify(upcomingBills));
      
      // Reset unread count
      setUnreadCount(0);
      setHasUnreadNotifications(false);
    }
  };

  const getIcon = (type) => {
    if (type === 'income') {
      return <MdArrowDownward />;
    } else {
      return <MdArrowUpward />;
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return 'Good morning';
    } else if (hour < 18) {
      return 'Good afternoon';
    } else {
      return 'Good evening';
    }
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

  if (currentPage === 'report') {
    return (
      <div className="dashboard">
        <Sidebar currentPage="report" onNavigate={setCurrentPage} />
        <main className="main-content" style={{ padding: 0 }}>
          <Report userId={user.id} />
        </main>
      </div>
    );
  }

  if (currentPage === 'compare') {
    return (
      <div className="dashboard">
        <Sidebar currentPage="compare" onNavigate={setCurrentPage} />
        <main className="main-content" style={{ padding: 0 }}>
          <Compare userId={user.id} />
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

  if (currentPage === 'bills') {
    return (
      <div className="dashboard">
        <Sidebar currentPage="bills" onNavigate={setCurrentPage} />
        <main className="main-content" style={{ padding: 0 }}>
          <Bills userId={user.id} />
        </main>
      </div>
    );
  }

  if (currentPage === 'goals') {
    return (
      <div className="dashboard">
        <Sidebar currentPage="goals" onNavigate={setCurrentPage} />
        <main className="main-content" style={{ padding: 0 }}>
          <Goals userId={user.id} />
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Sidebar currentPage="dashboard" onNavigate={setCurrentPage} />

      <main className="main-content">
        <header className="top-bar">
          <div>
            <div className="date">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}</div>
            <h1>{getGreeting()}, <span className="username">{user.fullName}</span></h1>
          </div>
          <div className="header-actions">
            <div className="notification-container">
              <button className="icon-btn" onClick={handleNotificationClick}>
                <MdNotifications />
                {hasUnreadNotifications && unreadCount > 0 && (
                  <span className="notification-badge">{unreadCount}</span>
                )}
              </button>
              {showNotifications && (
                <div className="notification-dropdown">
                  {upcomingBills.length > 0 && (
                    <>
                      <div className="notification-header">Upcoming Bills</div>
                      {upcomingBills
                        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                        .map((bill, index) => {
                        const daysUntil = Math.ceil((new Date(bill.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
                        return (
                          <div key={`bill-${index}`} className="notification-item">
                            <div className="notification-title"><MdWarning /> {bill.name}</div>
                            <div className="notification-text">
                              Amount: ₹{bill.amount.toLocaleString()} - Due in {daysUntil} {daysUntil === 1 ? 'day' : 'days'}
                            </div>
                            <div className="notification-date">
                              {new Date(bill.dueDate).toLocaleDateString()}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                  
                  {budgetAlerts.length > 0 && (
                    <>
                      <div className="notification-header">Budget Alerts</div>
                      {budgetAlerts.map((alert, index) => (
                        <div key={`budget-${index}`} className="notification-item">
                          <div className="notification-title"><MdWarning /> {alert.category}</div>
                          <div className="notification-text">
                            You've spent ₹{alert.spent.toLocaleString()} ({alert.percentage}%) of your ₹{alert.limit.toLocaleString()} budget
                          </div>
                          <div className="notification-date">
                            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][alert.month - 1]} {alert.year}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  
                  {budgetAlerts.length === 0 && upcomingBills.length === 0 && (
                    <div className="notification-empty">No notifications</div>
                  )}
                </div>
              )}
            </div>
            <div className="account-menu-container">
              <button className="icon-btn" onClick={() => setShowAccountMenu(!showAccountMenu)}><MdPerson /></button>
              {showAccountMenu && (
                <div className="account-dropdown">
                  <div className="account-info">
                    <div className="account-name">{user.fullName}</div>
                    <div className="account-email">{user.email}</div>
                  </div>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item" onClick={onLogout}>
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="stats-grid">
          <div className="stat-card dark">
            <div className="stat-icon"><MdAccountBalance /></div>
            <div className="stat-content">
              <div className="stat-label">TOTAL BALANCE</div>
              <div className="stat-value">₹{totalBalance.toLocaleString()}</div>
              {lastPeriodBalance !== 0 && (
                <div className={`stat-change ${balanceChange >= 0 ? 'positive' : 'negative'}`}>
                  {balanceChange >= 0 ? '+' : ''}{balanceChange}% {getPeriodLabel()}
                </div>
              )}
            </div>
          </div>
          <div className="stat-card light">
            <div className="stat-icon"><MdTrendingDown /></div>
            <div className="stat-content">
              <div className="stat-label">TOTAL INCOME</div>
              <div className="stat-value">₹{totalIncome.toLocaleString()}</div>
              {lastPeriodIncome !== 0 && (
                <div className={`stat-change ${incomeChange >= 0 ? 'positive' : 'negative'}`}>
                  {incomeChange >= 0 ? '+' : ''}{incomeChange}% {getPeriodLabel()}
                </div>
              )}
            </div>
          </div>
          <div className="stat-card light">
            <div className="stat-icon"><MdTrendingUp /></div>
            <div className="stat-content">
              <div className="stat-label">TOTAL EXPENSES</div>
              <div className="stat-value">₹{totalExpenses.toLocaleString()}</div>
              {lastPeriodExpenses !== 0 && (
                <div className={`stat-change ${expensesChange <= 0 ? 'positive' : 'negative'}`}>
                  {expensesChange >= 0 ? '+' : ''}{expensesChange}% {getPeriodLabel()}
                </div>
              )}
            </div>
          </div>
          <div className="stat-card light">
            <div className="stat-icon"><MdSavings /></div>
            <div className="stat-content">
              <div className="stat-label">NET SAVINGS</div>
              <div className="stat-value">₹{netSavings.toLocaleString()}</div>
              {(lastPeriodIncome !== 0 || lastPeriodExpenses !== 0) && (
                <div className={`stat-change ${savingsChange >= 0 ? 'positive' : 'negative'}`}>
                  {savingsChange >= 0 ? '+' : ''}{savingsChange}% {getPeriodLabel()}
                </div>
              )}
            </div>
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
                        <div 
                          className="bar income" 
                          style={{height: `${(data.income / maxAmount) * 350}px`}}
                          title={`Income: ₹${data.income.toLocaleString()}`}
                        >
                          <div className="bar-tooltip">₹{data.income.toLocaleString()}</div>
                        </div>
                        <div 
                          className="bar expense" 
                          style={{height: `${(data.expense / maxAmount) * 350}px`}}
                          title={`Expenses: ₹${data.expense.toLocaleString()}`}
                        >
                          <div className="bar-tooltip">₹{data.expense.toLocaleString()}</div>
                        </div>
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
              {aiLoading ? (
                <div className="insight-item">
                  <div className="insight-text">Loading insights...</div>
                </div>
              ) : aiInsights.length === 0 ? (
                <div className="insight-item">
                  <div className="insight-text">No AI insights yet. Add more transactions and budgets to see analysis.</div>
                </div>
              ) : (
                aiInsights
                  .slice(0, 5)
                  .sort((a, b) => {
                    if (a.type === 'monthly_summary') return -1;
                    if (b.type === 'monthly_summary') return 1;
                    return 0;
                  })
                  .map((item, index) => (
                    <div key={index} className="insight-item">
                      <div className="insight-content">
                        <div className="insight-title">{item.title || 'AI Insight'}</div>
                        <div className="insight-description">{item.text}</div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        <div className="bottom-grid">
          <div className="budget-savings-row">
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
                <a href="#" onClick={(e) => { e.preventDefault(); setCurrentPage('goals'); }} className="view-all">VIEW ALL</a>
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
                    <div className={`transaction-icon ${transaction.type === 'income' ? 'icon-income' : 'icon-expense'}`}>
                      {getIcon(transaction.type)}
                    </div>
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
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
