import { useState, useEffect } from 'react';
import './Transactions.css';
import AddTransactionModal from './AddTransactionModal';
import { MdDelete, MdCalendarToday, MdArrowDownward, MdArrowUpward } from 'react-icons/md';

function Transactions({ userId, onTransactionChange }) {
  const [filter, setFilter] = useState('Month');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [successTitle, setSuccessTitle] = useState('Transaction Created');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
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

  const handleTransactionSuccess = (transactionData) => {
    fetchTransactions();
    setSuccessTitle('Transaction Created');
    setSuccessMessage(`Transaction "${transactionData.description}" has been added successfully.`);
    setShowSuccessModal(true);
  };

  const handleDeleteTransaction = async (id) => {
    setTransactionToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/transactions/${transactionToDelete}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setShowDeleteModal(false);
        setTransactionToDelete(null);
        fetchTransactions();
        setSuccessTitle('Transaction Deleted');
        setSuccessMessage('Transaction has been deleted successfully.');
        setShowSuccessModal(true);
      } else {
        alert('Failed to delete transaction');
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Error deleting transaction');
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setTransactionToDelete(null);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setCurrentPage(0);
  };

  const handlePeriodFilterChange = (period) => {
    setFilter(period);
    // Clear date filter when selecting Week/Month/Year
    setStartDate('');
    setEndDate('');
    setTempStartDate('');
    setTempEndDate('');
  };

  const handleApplyDateFilter = () => {
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    setShowDatePicker(false);
    // Clear period filter when applying date filter
    setFilter('');
  };

  const handleClearDateFilter = () => {
    setTempStartDate('');
    setTempEndDate('');
    setStartDate('');
    setEndDate('');
    // Reset to Month filter
    setFilter('Month');
  };

  const handleDateIconClick = () => {
    if (startDate || endDate) {
      // If date filter is active, clear it
      handleClearDateFilter();
    } else {
      // Otherwise, toggle the date picker
      setShowDatePicker(!showDatePicker);
    }
  };

  // Get the period label for the Total Count card
  const getPeriodLabel = () => {
    if (startDate || endDate) {
      if (startDate && endDate) {
        return 'in date range';
      } else if (startDate) {
        return 'on selected date';
      } else {
        return 'on selected date';
      }
    }
    
    if (filter === 'Week') {
      return 'this week';
    } else if (filter === 'Month') {
      return 'this month';
    } else if (filter === 'Year') {
      return 'this year';
    }
    
    return 'this month';
  };

  // Top filters (Week/Month/Year + Date Range) - affects summary cards AND table
  const topFilteredTransactions = transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    transactionDate.setHours(0, 0, 0, 0); // Normalize to start of day
    
    // If date filter is active, use it and ignore period filter
    if (startDate || endDate) {
      if (startDate && !endDate) {
        // Only start date selected - show only that exact date
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const startEnd = new Date(startDate);
        startEnd.setHours(23, 59, 59, 999);
        return transactionDate >= start && transactionDate <= startEnd;
      } else if (!startDate && endDate) {
        // Only end date selected - show only that exact date
        const end = new Date(endDate);
        end.setHours(0, 0, 0, 0);
        const endEnd = new Date(endDate);
        endEnd.setHours(23, 59, 59, 999);
        return transactionDate >= end && transactionDate <= endEnd;
      } else if (startDate && endDate) {
        // Both dates selected - show range
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return transactionDate >= start && transactionDate <= end;
      }
    }
    
    // Otherwise use period filter (Week/Month/Year)
    const now = new Date();
    
    if (filter === 'Week') {
      const currentDay = now.getDay();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - currentDay);
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      return transactionDate >= weekStart && transactionDate <= weekEnd;
    } else if (filter === 'Month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return transactionDate >= monthStart && 
             transactionDate.getMonth() === now.getMonth() &&
             transactionDate.getFullYear() === now.getFullYear();
    } else if (filter === 'Year') {
      return transactionDate.getFullYear() === now.getFullYear();
    }
    
    return true;
  });

  // Bottom filters (Search + Type) - only affects table display
  const filteredTransactions = topFilteredTransactions.filter(transaction => {
    // Search filter
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Type filter
    const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  // Calculate totals from top-filtered transactions (for summary cards)
  const totalIn = topFilteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalOut = topFilteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const netSavings = totalIn - totalOut;
  const totalCount = topFilteredTransactions.length;
  const inCount = topFilteredTransactions.filter(t => t.type === 'income').length;
  const outCount = topFilteredTransactions.filter(t => t.type === 'expense').length;

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

  const getIcon = (type) => {
    if (type === 'income') {
      return <MdArrowDownward />;
    } else {
      return <MdArrowUpward />;
    }
  };

  if (loading) {
    return <div className="transactions-page">Loading...</div>;
  }

  return (
    <div className="transactions-page">
      <header className="page-header">
        <div>
          <div className="date">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}</div>
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
        <button className={filter === 'Week' && !startDate && !endDate && !showDatePicker ? 'tab active' : 'tab'} onClick={() => handlePeriodFilterChange('Week')}>Week</button>
        <button className={filter === 'Month' && !startDate && !endDate && !showDatePicker ? 'tab active' : 'tab'} onClick={() => handlePeriodFilterChange('Month')}>Month</button>
        <button className={filter === 'Year' && !startDate && !endDate && !showDatePicker ? 'tab active' : 'tab'} onClick={() => handlePeriodFilterChange('Year')}>Year</button>
        <div className="calendar-picker-wrapper">
          <button 
            className={`tab calendar-icon ${(startDate || endDate || showDatePicker) ? 'active' : ''}`} 
            onClick={handleDateIconClick}
          >
            <MdCalendarToday />
          </button>
          {showDatePicker && (
            <div className="date-picker-dropdown">
              <div className="date-picker-inputs">
                <div className="date-input-group">
                  <label>From</label>
                  <input 
                    type="date" 
                    className="date-input"
                    value={tempStartDate}
                    onChange={(e) => setTempStartDate(e.target.value)}
                  />
                </div>
                <div className="date-input-group">
                  <label>To</label>
                  <input 
                    type="date" 
                    className="date-input"
                    value={tempEndDate}
                    onChange={(e) => setTempEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="date-picker-actions">
                <button className="date-clear-btn" onClick={handleClearDateFilter}>Clear</button>
                <button className="date-apply-btn" onClick={handleApplyDateFilter}>Apply</button>
              </div>
            </div>
          )}
        </div>
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
          <div className="summary-count">transactions {getPeriodLabel()}</div>
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
        <button className="clear-filters-btn" onClick={handleClearFilters}>
          ✕ Clear
        </button>
      </div>

      <div className="transactions-table">
        <div className="table-header">
          <div className="col-merchant">MERCHANT</div>
          <div className="col-type">IN/OUT</div>
          <div className="col-date">DATE</div>
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
                <div className={`merchant-icon ${transaction.type === 'income' ? 'icon-income' : 'icon-expense'}`}>
                  {getIcon(transaction.type)}
                </div>
                <div className="merchant-details">
                  <span className="merchant-name">{transaction.description}</span>
                  <span className="merchant-category">{transaction.category}</span>
                </div>
              </div>
              <div className={`col-type ${transaction.type === 'income' ? 'type-in' : 'type-out'}`}>
                {transaction.type === 'income' ? 'In' : 'Out'}
              </div>
              <div className="col-date">{new Date(transaction.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
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

      {showSuccessModal && (
        <div className="modal-overlay" onClick={() => setShowSuccessModal(false)}>
          <div className="success-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{successTitle}</h2>
            <div className="success-icon">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="40" r="40" fill="#e8e8e8"/>
                <path d="M25 40L35 50L55 30" stroke="#1a1a1a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="success-message">{successMessage}</p>
            <button className="done-btn" onClick={() => setShowSuccessModal(false)}>Done</button>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Delete Transaction</h2>
            <div className="delete-icon">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="40" r="40" fill="#ffe8e8"/>
                <path d="M30 30L50 50M50 30L30 50" stroke="#ff4444" strokeWidth="4" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="delete-message">Are you sure you want to delete this transaction? This action cannot be undone.</p>
            <div className="delete-modal-actions">
              <button className="cancel-btn" onClick={cancelDelete}>Cancel</button>
              <button className="confirm-delete-btn" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Transactions;
