import { useState, useEffect } from 'react';
import './Compare.css';
import { 
  MdTrendingUp, MdTrendingDown, MdAccountBalance, MdSavings,
  MdRestaurant, MdDirectionsCar, MdShoppingBag, MdDescription,
  MdLocalHospital, MdTv, MdCreditCard
} from 'react-icons/md';
import { api } from '../../utils/api';

function Compare({ userId }) {
  const [transactions, setTransactions] = useState([]);
  const [month1, setMonth1] = useState(new Date().getMonth());
  const [year1, setYear1] = useState(new Date().getFullYear());
  const [month2, setMonth2] = useState(new Date().getMonth() - 1 < 0 ? 11 : new Date().getMonth() - 1);
  const [year2, setYear2] = useState(new Date().getMonth() - 1 < 0 ? new Date().getFullYear() - 1 : new Date().getFullYear());

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    if (userId) {
      fetchTransactions();
    }
  }, [userId]);

  const fetchTransactions = async () => {
    try {
      const response = await api.getTransactions();
      const data = await response.json();
      setTransactions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    }
  };

  const getMonthData = (month, year) => {
    const monthTransactions = transactions.filter(t => {
      const date = new Date(t.date);
      return date.getMonth() === month && date.getFullYear() === year;
    });

    const income = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const savings = income - expenses;

    // Category breakdown
    const categoryData = {};
    monthTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        if (!categoryData[t.category]) {
          categoryData[t.category] = 0;
        }
        categoryData[t.category] += t.amount;
      });

    const categories = Object.entries(categoryData)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    return { income, expenses, savings, categories, transactionCount: monthTransactions.length };
  };

  const data1 = getMonthData(month1, year1);
  const data2 = getMonthData(month2, year2);

  const getIcon = (category) => {
    const icons = {
      'Food': <MdRestaurant />,
      'Transport': <MdDirectionsCar />,
      'Shopping': <MdShoppingBag />,
      'Bills': <MdDescription />,
      'Health': <MdLocalHospital />,
      'Entertainment': <MdTv />
    };
    return icons[category] || <MdCreditCard />;
  };

  const calculateChange = (val1, val2) => {
    if (val2 === 0) return val1 > 0 ? 100 : 0;
    return ((val1 - val2) / val2 * 100).toFixed(1);
  };

  return (
    <div className="compare-container">
      <div className="compare-header">
        <h1>Compare Months</h1>
        <p className="compare-subtitle">Compare financial data between two months</p>
      </div>

      <div className="month-selectors">
        <div className="selector-group">
          <label>First Month</label>
          <div className="selector-row">
            <select value={month1} onChange={(e) => setMonth1(Number(e.target.value))}>
              {months.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
            <select value={year1} onChange={(e) => setYear1(Number(e.target.value))}>
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="vs-divider">VS</div>

        <div className="selector-group">
          <label>Second Month</label>
          <div className="selector-row">
            <select value={month2} onChange={(e) => setMonth2(Number(e.target.value))}>
              {months.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
            <select value={year2} onChange={(e) => setYear2(Number(e.target.value))}>
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="comparison-grid">
        <div className="comparison-column">
          <div className="column-header">{months[month1]} {year1}</div>
          
          <div className="compare-card income">
            <div className="card-icon"><MdTrendingUp /></div>
            <div className="card-label">Total Income</div>
            <div className="card-value">₹{data1.income.toLocaleString()}</div>
          </div>

          <div className="compare-card expense">
            <div className="card-icon"><MdTrendingDown /></div>
            <div className="card-label">Total Expenses</div>
            <div className="card-value">₹{data1.expenses.toLocaleString()}</div>
          </div>

          <div className="compare-card savings">
            <div className="card-icon"><MdSavings /></div>
            <div className="card-label">Net Savings</div>
            <div className="card-value">₹{data1.savings.toLocaleString()}</div>
          </div>

          <div className="compare-card balance">
            <div className="card-icon"><MdAccountBalance /></div>
            <div className="card-label">Transactions</div>
            <div className="card-value">{data1.transactionCount}</div>
          </div>

          <div className="category-breakdown">
            <h3>Top Categories</h3>
            {data1.categories.length === 0 ? (
              <div className="no-data">No expenses this month</div>
            ) : (
              data1.categories.slice(0, 5).map((cat, i) => (
                <div key={i} className="category-item">
                  <div className="category-info">
                    <span className="category-icon">{getIcon(cat.name)}</span>
                    <span className="category-name">{cat.name}</span>
                  </div>
                  <span className="category-amount">₹{cat.amount.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="comparison-column">
          <div className="column-header">{months[month2]} {year2}</div>
          
          <div className="compare-card income">
            <div className="card-icon"><MdTrendingUp /></div>
            <div className="card-label">Total Income</div>
            <div className="card-value">₹{data2.income.toLocaleString()}</div>
          </div>

          <div className="compare-card expense">
            <div className="card-icon"><MdTrendingDown /></div>
            <div className="card-label">Total Expenses</div>
            <div className="card-value">₹{data2.expenses.toLocaleString()}</div>
          </div>

          <div className="compare-card savings">
            <div className="card-icon"><MdSavings /></div>
            <div className="card-label">Net Savings</div>
            <div className="card-value">₹{data2.savings.toLocaleString()}</div>
          </div>

          <div className="compare-card balance">
            <div className="card-icon"><MdAccountBalance /></div>
            <div className="card-label">Transactions</div>
            <div className="card-value">{data2.transactionCount}</div>
          </div>

          <div className="category-breakdown">
            <h3>Top Categories</h3>
            {data2.categories.length === 0 ? (
              <div className="no-data">No expenses this month</div>
            ) : (
              data2.categories.slice(0, 5).map((cat, i) => (
                <div key={i} className="category-item">
                  <div className="category-info">
                    <span className="category-icon">{getIcon(cat.name)}</span>
                    <span className="category-name">{cat.name}</span>
                  </div>
                  <span className="category-amount">₹{cat.amount.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="comparison-summary">
        <h2>Comparison Difference</h2>
        <div className="summary-grid">
          <div className="change-indicator">
            <div className="change-label">Income Change</div>
            <div className={`change-value ${
              data1.income > data2.income ? 'positive' : 
              data1.income < data2.income ? 'negative' : 
              'neutral'
            }`}>
              {data1.income > data2.income ? '+' : data1.income < data2.income ? '-' : ''}{Math.abs(calculateChange(data1.income, data2.income))}%
            </div>
          </div>

          <div className="change-indicator">
            <div className="change-label">Expense Change</div>
            <div className={`change-value ${
              data1.expenses < data2.expenses ? 'positive' : 
              data1.expenses > data2.expenses ? 'negative' : 
              'neutral'
            }`}>
              {data1.expenses > data2.expenses ? '+' : data1.expenses < data2.expenses ? '-' : ''}{Math.abs(calculateChange(data1.expenses, data2.expenses))}%
            </div>
          </div>

          <div className="change-indicator">
            <div className="change-label">Savings Change</div>
            <div className={`change-value ${
              data1.savings > data2.savings ? 'positive' : 
              data1.savings < data2.savings ? 'negative' : 
              'neutral'
            }`}>
              {data1.savings > data2.savings ? '+' : data1.savings < data2.savings ? '-' : ''}{Math.abs(calculateChange(data1.savings, data2.savings))}%
            </div>
          </div>

          <div className="change-indicator">
            <div className="change-label">Transaction Change</div>
            <div className={`change-value ${
              data1.transactionCount > data2.transactionCount ? 'positive' : 
              data1.transactionCount < data2.transactionCount ? 'negative' : 
              'neutral'
            }`}>
              {data1.transactionCount > data2.transactionCount ? '+' : data1.transactionCount < data2.transactionCount ? '-' : ''}{Math.abs(calculateChange(data1.transactionCount, data2.transactionCount))}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Compare;
