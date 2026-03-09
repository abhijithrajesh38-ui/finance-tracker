import { useState, useEffect } from 'react';
import './Report.css';
import { MdDescription, MdDownload, MdPictureAsPdf } from 'react-icons/md';
import { api } from '../../utils/api';

function Report({ userId }) {
  const [transactions, setTransactions] = useState([]);
  const [bills, setBills] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (userId) {
      fetchTransactions();
      fetchBills();
    }
  }, [userId, selectedMonth, selectedYear]);

  const fetchTransactions = async () => {
    try {
      const response = await api.getTransactions(userId);
      const data = await response.json();
      setTransactions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    }
  };

  const fetchBills = async () => {
    try {
      const response = await api.getBills(userId);
      const data = await response.json();
      setBills(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching bills:', error);
      setBills([]);
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

  // Filter unpaid bills for selected month
  const unpaidBills = bills.filter(bill => {
    if (bill.isPaid) return false;
    const dueDate = new Date(bill.dueDate);
    return dueDate.getMonth() + 1 === selectedMonth && dueDate.getFullYear() === selectedYear;
  });

  const totalUnpaidAmount = unpaidBills.reduce((sum, bill) => sum + bill.amount, 0);

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];

  const categoryColors = ['#ff6b6b', '#4dabf7', '#ffa94d', '#51cf66'];

  // Calculate max amount for scaling
  const maxAmount = Math.max(totalIncome, totalExpenses, 1);

  // Export to CSV
  const exportToCSV = () => {
    const monthName = months[selectedMonth - 1];
    const csvData = [
      ['Financial Report', `${monthName} ${selectedYear}`],
      [],
      ['Summary'],
      ['Total Income', `₹${totalIncome.toLocaleString()}`],
      ['Total Expenses', `₹${totalExpenses.toLocaleString()}`],
      ['Net Savings', `₹${netSavings.toLocaleString()}`],
      ['Savings Rate', `${savingsRate}%`],
      [],
      ['Transactions'],
      ['Date', 'Description', 'Category', 'Type', 'Amount', 'Payment Method'],
      ...filteredTransactions.map(t => [
        new Date(t.date).toLocaleDateString(),
        t.description,
        t.category,
        t.type,
        `₹${t.amount.toLocaleString()}`,
        t.paymentMethod || 'Cash'
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `financial-report-${monthName}-${selectedYear}.csv`;
    link.click();
  };

  // Export to PDF (simple text-based PDF)
  const exportToPDF = () => {
    const monthName = months[selectedMonth - 1];
    
    // Create a printable HTML content
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Financial Report - ${monthName} ${selectedYear}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          h1 { color: #1a1a1a; border-bottom: 2px solid #1a1a1a; padding-bottom: 10px; }
          h2 { color: #333; margin-top: 30px; margin-bottom: 15px; }
          .summary { margin: 30px 0; }
          .summary-item { display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #e0e0e0; }
          .summary-item strong { color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #1a1a1a; color: white; padding: 12px; text-align: left; }
          td { padding: 10px; border-bottom: 1px solid #e0e0e0; }
          .income { color: #16A34A; }
          .expense { color: #DC2626; }
          .unpaid { color: #ff6b6b; }
          .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; }
          .bills-summary { background: #fafafa; padding: 15px; border-radius: 8px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <h1>Financial Report - ${monthName} ${selectedYear}</h1>
        
        <div class="summary">
          <h2>Summary</h2>
          <div class="summary-item">
            <span>Total Income:</span>
            <strong class="income">₹${totalIncome.toLocaleString()}</strong>
          </div>
          <div class="summary-item">
            <span>Total Expenses:</span>
            <strong class="expense">₹${totalExpenses.toLocaleString()}</strong>
          </div>
          <div class="summary-item">
            <span>Net Savings:</span>
            <strong>₹${netSavings.toLocaleString()}</strong>
          </div>
          <div class="summary-item">
            <span>Savings Rate:</span>
            <strong>${savingsRate}%</strong>
          </div>
        </div>

        ${unpaidBills.length > 0 ? `
        <div class="bills-summary">
          <h2>Unpaid Bills (${unpaidBills.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Bill Name</th>
                <th>Due Date</th>
                <th>Amount</th>
                <th>Recurring</th>
              </tr>
            </thead>
            <tbody>
              ${unpaidBills.map(bill => `
                <tr>
                  <td>${bill.name}</td>
                  <td>${new Date(bill.dueDate).toLocaleDateString()}</td>
                  <td class="unpaid">₹${bill.amount.toLocaleString()}</td>
                  <td>${bill.recurring ? bill.frequency : 'No'}</td>
                </tr>
              `).join('')}
              <tr style="font-weight: bold; background: #f5f5f5;">
                <td colspan="2">Total Unpaid</td>
                <td class="unpaid">₹${totalUnpaidAmount.toLocaleString()}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
        ` : ''}

        <h2>Transactions (${filteredTransactions.length})</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Payment</th>
            </tr>
          </thead>
          <tbody>
            ${filteredTransactions.map(t => `
              <tr>
                <td>${new Date(t.date).toLocaleDateString()}</td>
                <td>${t.description}</td>
                <td>${t.category}</td>
                <td>${t.type}</td>
                <td class="${t.type}">${t.type === 'income' ? '+' : '-'}₹${t.amount.toLocaleString()}</td>
                <td>${t.paymentMethod || 'Cash'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
        </div>
      </body>
      </html>
    `;

    // Open print dialog
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="report-page">
      <header className="report-header">
        <div>
          <div className="date-label">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}</div>
          <h1>Report</h1>
        </div>
        <div className="export-buttons">
          <button className="export-btn csv-btn" onClick={exportToCSV}>
            <MdDownload /> Export CSV
          </button>
          <button className="export-btn pdf-btn" onClick={exportToPDF}>
            <MdPictureAsPdf /> Export PDF
          </button>
        </div>
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
            <span className="legend-dot amount-legend"></span> Amount (₹)
          </div>
          <div className="line-chart">
            <div className="bar-chart-report">
              <div className="bar-group-report">
                <div className="single-bar-container">
                  <div 
                    className="bar-report-single income-bar" 
                    style={{ height: `${(totalIncome / maxAmount) * 300}px` }}
                    title={`Income: ₹${totalIncome.toLocaleString()}`}
                  >
                    <div className="bar-tooltip">₹{totalIncome.toLocaleString()}</div>
                  </div>
                </div>
                <div className="bar-label-report">Income</div>
              </div>
              <div className="bar-group-report">
                <div className="single-bar-container">
                  <div 
                    className="bar-report-single expense-bar" 
                    style={{ height: `${(totalExpenses / maxAmount) * 300}px` }}
                    title={`Expenses: ₹${totalExpenses.toLocaleString()}`}
                  >
                    <div className="bar-tooltip">₹{totalExpenses.toLocaleString()}</div>
                  </div>
                </div>
                <div className="bar-label-report">Expenses</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {unpaidBills.length > 0 && (
        <div className="unpaid-bills-section">
          <div className="section-header-report">
            <h2>Unpaid Bills</h2>
            <span className="bills-count">{unpaidBills.length} bill{unpaidBills.length !== 1 ? 's' : ''} • ₹{totalUnpaidAmount.toLocaleString()}</span>
          </div>
          <div className="bills-grid-report">
            {unpaidBills.map(bill => (
              <div key={bill._id} className="bill-card-report">
                <div className="bill-header-report">
                  <h3>{bill.name}</h3>
                  <span className="bill-amount-report">₹{bill.amount.toLocaleString()}</span>
                </div>
                <div className="bill-details-report">
                  <span className="bill-due-date">Due: {new Date(bill.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  {bill.recurring && <span className="recurring-badge-report">{bill.frequency}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Report;
