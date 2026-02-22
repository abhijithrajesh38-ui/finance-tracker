import { useState, useEffect } from 'react';
import './Transactions.css';
import AddTransactionModal from './AddTransactionModal';
import { MdTv, MdRestaurant, MdDirectionsCar, MdShoppingBag, MdDescription, MdLocalHospital, MdCreditCard, MdAccountBalance, MdDelete } from 'react-icons/md';

function Transactions({ userId, onTransactionChange }) {
  const [filter, setFilter] = useState('Month');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 5;

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
      // Notify parent component
      if (onTransactionChange) {
        onTransactionChange();
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setLoading(false);
    }
  };

  const handleTransactionSuccess = () => {
    fetchTransactions();
    alert('Transaction added successfully!');
  };

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/transactions/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('Transaction deleted successfully!');
        fetchTransactions();
      } else {
        alert('Failed to delete transaction');
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Error deleting transaction');
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setStartDate('');
    setEndDate('');
    setCurrentPage(0);
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(transaction => {
    // Search filter
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Type filter
    const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
    
    // Date filter
    const transactionDate = new Date(transaction.date);
    const matchesStartDate = !startDate || transactionDate >= new Date(startDate);
    const matchesEndDate = !endDate || transactionDate <= new Date(endDate);
    
    // Time period filter (Week/Month/Year)
    const now = new Date();
    let matchesPeriod = true;
    
    if (filter === 'Week') {
      // Current week (Sunday to Saturday)
      const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - currentDay);
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      matchesPeriod = transactionDate >= weekStart && transactionDate <= weekEnd;
    } else if (filter === 'Month') {
      // Current month (1st to last day of month)
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      matchesPeriod = transactionDate >= monthStart && 
                     transactionDate.getMonth() === now.getMonth() &&
                     transactionDate.getFullYear() === now.getFullYear();
    } else if (filter === 'Year') {
      // Current year (Jan 1 to Dec 31)
      matchesPeriod = transactionDate.getFullYear() === now.getFullYear();
    }
    
    return matchesSearch && matchesType && matchesStartDate && matchesEndDate && matchesPeriod;
  });

  // Calculate totals
  const totalIn = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalOut = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const netSavings = totalIn - totalOut;
  const totalCount = filteredTransactions.length;
  const inCount = filteredTransactions.filter(t => t.type === 'income').length;
  const outCount = filteredTransactions.filter(t => t.type === 'expense').length;

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const getIcon = (category) => {
    const icons = {
      'Entertainment': <MdTv />,
      'Income': <MdAccountBalance />,
      'Salary': <MdAccountBalance />,
      'Food': <MdRestaurant />,
      'Transport': <MdDirectionsCar />,
      'Shopping': <MdShoppingBag />,
      'Bills': <MdDescription />,
      'Health': <MdLocalHospital />
    };
    return icons[category] || <MdCreditCard />;
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
          <input 
            type="text" 
            placeholder="Search" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="filter-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <input 
          type="date" 
          className="filter-select"
          placeholder="Start Date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <input 
          type="date" 
          className="filter-select"
          placeholder="End Date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
        <button className="clear-filters-btn" onClick={handleClearFilters}>
          ✕ Clear
        </button>
      </div>

      <div className="transactions-table">
        <div className="table-header">
          <div className="col-merchant">MERCHANT</div>
          <div className="col-type">IN/OUT</div>
          <div className="col-date">DATE</div>
          <div className="col-category">CATEGORY</div>
          <div className="col-payment">PAYMENT</div>
          <div className="col-amount">AMOUNT</div>
          <div className="col-actions">ACTIONS</div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            No transactions found matching your filters.
          </div>
        ) : (
          paginatedTransactions.map(transaction => (
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
              <div className="col-payment">
                <span className="payment-badge">
                  {transaction.paymentMethod ? transaction.paymentMethod.charAt(0).toUpperCase() + transaction.paymentMethod.slice(1) : 'Cash'}
                </span>
              </div>
              <div className={`col-amount ${transaction.type === 'income' ? 'amount-positive' : 'amount-negative'}`}>
                {transaction.type === 'income' ? '+' : '-'}₹{Math.abs(transaction.amount).toLocaleString()}
              </div>
              <div className="col-actions">
                <button 
                  className="delete-btn"
                  onClick={() => handleDeleteTransaction(transaction._id)}
                  title="Delete transaction"
                >
                  <MdDelete />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pagination">
        <span>
          Showing {startIndex + 1}-{Math.min(endIndex, filteredTransactions.length)} of {filteredTransactions.length} transactions
        </span>
        <div className="pagination-controls">
          <button 
            className="page-btn" 
            onClick={handlePreviousPage}
            disabled={currentPage === 0}
          >
            ◀
          </button>
          <span className="page-info">Page {currentPage + 1} of {totalPages || 1}</span>
          <button 
            className="page-btn" 
            onClick={handleNextPage}
            disabled={currentPage >= totalPages - 1}
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
}

export default Transactions;
