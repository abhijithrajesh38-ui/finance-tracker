import { useState, useEffect } from 'react';
import './Report.css';
import { MdDescription } from 'react-icons/md';

function Report({ userId }) {
  const [transactions, setTransactions] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (userId) {
      fetchTransactions();
    }
  }, [userId, selectedMonth, selectedYear]);

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/transactions?userId=${userId}`);
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const date = new Date(t.date);
    return date.getMonth() + 1 === selectedMonth && date.getFullYear() === selectedYear;
  });

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : 0;

  // Category breakdown
  const categoryData = {};
  filteredTransactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      categoryData[t.category] = (categoryData[t.category] || 0) + t.amount;
    });

  const categories = Object.entries(categoryData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const highestCategory = categories[0] || ['N/A', 0];

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];

  const categoryColors = ['#ff6b6b', '#4dabf7', '#ffa94d', '#51cf66'];

  return (
    <div className="report-page">
      <header className="report-header">
        <div className="date-label">FEBRUARY 2026</div>
        <h1>Report</h1>
      </header>

      <div className="month-selector">
        <select 
          value={`${selectedMonth}-${selectedYear}`}
          onChange={(e) => {
            const [month, year] = e.target.value.split('-');
            setSelectedMonth(parseInt(month));
            setSelectedYear(parseInt(year));
          }}
        >
          {months.map((month, index) => (
            <option key={index} value={`${index + 1}-${selectedYear}`}>
              {month} {selectedYear}
            </option>
          ))}
        </select>
      </div>

      <div className="report-summary">
        <div className="summary-card income-card">
          <div className="card-label">Total Income</div>
          <div className="card-value">₹{totalIncome.toLocaleString()}</div>
          <div className="card-change">8.2% vs last month</div>
        </div>

        <div className="summary-card expense-card">
          <div className="card-label">Total Expenses</div>
          <div className="card-value">₹{totalExpenses.toLocaleString()}</div>
          <div className="card-change">6.1% vs last month</div>
        </div>

        <div className="summary-card savings-card">
          <div className="card-label">Net Savings</div>
          <div className="card-value">₹{netSavings.toLocaleString()}</div>
          <div className="card-change">Savings Rate {savingsRate}%</div>
        </div>

        <div className="summary-card category-card">
          <div className="card-label">Highest Category</div>
          <div className="card-value">{highestCategory[0]}</div>
          <div className="card-change">₹{highestCategory[1].toLocaleString()}</div>
        </div>
      </div>

      <div className="report-charts">
        <div className="chart-card category-breakdown">
          <h2>Category Breakdown</h2>
          <div className="donut-chart">
            <div className="donut-center">
              <div className="donut-value">₹{totalExpenses.toLocaleString()}</div>
              <div className="donut-label">Total</div>
            </div>
          </div>
          <div className="category-legend">
            {categories.map(([category, amount], index) => (
              <div key={category} className="legend-item">
                <span className="legend-color" style={{ background: categoryColors[index] }}></span>
                <span className="legend-name">{category}</span>
                <span className="legend-amount">₹{amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card income-expense-chart">
          <h2>Income vs Expense</h2>
          <div className="chart-legend-top">
            <span className="legend-dot income-dot"></span> INCOME
            <span className="legend-dot expense-dot"></span> EXPENSES
          </div>
          <div className="line-chart-placeholder">
            <p>Chart visualization coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Report;
