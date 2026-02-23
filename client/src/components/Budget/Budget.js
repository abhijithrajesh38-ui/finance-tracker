import { useState, useEffect } from 'react';
import './Budget.css';
import { MdShoppingCart, MdRestaurant, MdTv, MdShoppingBag, MdLocalHospital, MdDirectionsCar, MdDescription, MdSchool, MdCreditCard, MdDelete, MdEdit } from 'react-icons/md';

function Budget({ userId }) {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [successTitle, setSuccessTitle] = useState('');
  const [editingBudget, setEditingBudget] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 4;
  const [formData, setFormData] = useState({
    category: '',
    limit: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    alertAt: 80
  });

  console.log('Budget component userId:', userId);

  useEffect(() => {
    if (userId) {
      fetchBudgets();
    }
  }, [userId]);

  const fetchBudgets = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/budgets?userId=${userId}`);
      const data = await response.json();
      setBudgets(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!userId) {
      alert('User ID is missing. Please log in again.');
      return;
    }
    
    try {
      const budgetData = {
        userId,
        category: formData.category,
        limit: parseFloat(formData.limit),
        month: parseInt(formData.month),
        year: parseInt(formData.year),
        alertAt: parseInt(formData.alertAt)
      };
      
      console.log('Sending budget data:', budgetData);
      
      const url = editingBudget 
        ? `http://localhost:5000/api/budgets/${editingBudget._id}`
        : 'http://localhost:5000/api/budgets';
      
      const method = editingBudget ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(budgetData)
      });
      
      const data = await response.json();
      console.log('Server response:', data);
      
      if (response.ok) {
        setShowModal(false);
        
        // Show success modal for both create and edit
        const categoryName = formData.category;
        if (editingBudget) {
          setSuccessTitle('Budget Updated');
          setSuccessMessage(`Your changes to "${categoryName}" have been saved successfully.`);
        } else {
          setSuccessTitle('Budget Created');
          setSuccessMessage(`Budget for "${categoryName}" has been created successfully.`);
        }
        setShowSuccessModal(true);
        
        setEditingBudget(null);
        setHasChanges(false);
        setFormData({
          category: '',
          limit: '',
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          alertAt: 80
        });
        fetchBudgets();
      } else {
        alert(data.message || 'Failed to save budget');
      }
    } catch (error) {
      console.error('Error saving budget:', error);
      alert('Failed to save budget: ' + error.message);
    }
  };

  const handleEdit = (budget) => {
    setEditingBudget(budget);
    setFormData({
      category: budget.category,
      limit: budget.limit,
      month: budget.month,
      year: budget.year,
      alertAt: budget.alertAt
    });
    setHasChanges(false);
    setShowModal(true);
  };

  const handleFormChange = (field, value) => {
    setFormData({...formData, [field]: value});
    setHasChanges(true);
  };

  const handleCloseModal = () => {
    if (editingBudget && hasChanges) {
      setShowDiscardModal(true);
    } else {
      setShowModal(false);
      setEditingBudget(null);
      setHasChanges(false);
    }
  };

  const handleDiscard = () => {
    setShowDiscardModal(false);
    setShowModal(false);
    setEditingBudget(null);
    setHasChanges(false);
    setFormData({
      category: '',
      limit: '',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      alertAt: 80
    });
  };

  const handleContinueEditing = () => {
    setShowDiscardModal(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this budget?')) {
      try {
        await fetch(`http://localhost:5000/api/budgets/${id}`, { method: 'DELETE' });
        fetchBudgets();
      } catch (error) {
        console.error('Error deleting budget:', error);
      }
    }
  };

  const totalBudget = budgets.reduce((sum, b) => sum + b.limit, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const remaining = totalBudget - totalSpent;
  const overallPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  // Filter budgets by search term
  const filteredBudgets = budgets.filter(budget =>
    budget.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredBudgets.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBudgets = filteredBudgets.slice(startIndex, endIndex);

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
      'Groceries': <MdShoppingCart />,
      'Food': <MdRestaurant />,
      'Entertainment': <MdTv />,
      'Shopping': <MdShoppingBag />,
      'Health': <MdLocalHospital />,
      'Transport': <MdDirectionsCar />,
      'Bills': <MdDescription />,
      'Education': <MdSchool />
    };
    return icons[category] || <MdCreditCard />;
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 100) return '#f44336';
    if (percentage >= 80) return '#ffd700';
    return '#1a1a1a';
  };

  return (
    <div className="budget-page">
      <header className="page-header">
        <div>
          <div className="date">FEBRUARY 2026</div>
          <h1>Budget</h1>
        </div>
        <button className="add-btn" onClick={() => setShowModal(true)}>+ Set Budget</button>
      </header>

      <div className="overall-progress">
        <div className="progress-header">
          <h2>Overall Budget Progress</h2>
          <span className="progress-percentage">{overallPercentage}% Used</span>
        </div>
        <div className="progress-bar-large">
          <div className="progress-fill-large" style={{ width: `${overallPercentage}%` }}></div>
        </div>
        <div className="progress-footer">
          <span>₹{totalSpent.toLocaleString()} spent</span>
          <span>₹{totalBudget.toLocaleString()} total</span>
        </div>
      </div>

      <div className="budget-summary">
        <div className="summary-card-budget">
          <div className="summary-label">Total Budget</div>
          <div className="summary-value">₹{totalBudget.toLocaleString()}</div>
          <div className="summary-count">across {budgets.length} categories</div>
        </div>
        <div className="summary-card-budget">
          <div className="summary-label">Total Spent</div>
          <div className="summary-value">₹{totalSpent.toLocaleString()}</div>
          <div className="summary-count">{overallPercentage}% of budget</div>
        </div>
        <div className="summary-card-budget">
          <div className="summary-label">Remaining</div>
          <div className="summary-value">₹{remaining}</div>
          <div className="summary-count">{100 - overallPercentage}% left</div>
        </div>
      </div>

      <div className="search-bar-budget">
        <input
          type="text"
          placeholder="Search budgets by category..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(0);
          }}
          className="search-input-budget"
        />
      </div>

      <div className="category-breakdown">
        <h2>Category Breakdown</h2>

        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Loading...</div>
        ) : filteredBudgets.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            {searchTerm ? 'No budgets found matching your search.' : 'No budgets set yet. Click "Set Budget" to create one.'}
          </div>
        ) : (
          <>
            {paginatedBudgets.map(budget => {
              const percentage = budget.limit > 0 ? Math.round((budget.spent / budget.limit) * 100) : 0;
              return (
                <div key={budget._id} className="budget-item-large">
                  <div className="budget-header">
                    <div className="budget-info">
                      <span className="budget-icon-large">{getIcon(budget.category)}</span>
                      <span className="budget-name">{budget.category}</span>
                    </div>
                    <div className="budget-amounts">
                      <span className="amount-spent">₹{budget.spent.toLocaleString()}</span>
                      <span className="amount-total">/₹{budget.limit.toLocaleString()}</span>
                    </div>
                    <div className="budget-actions">
                      <button className="action-btn edit" onClick={() => handleEdit(budget)}><MdEdit /></button>
                      <button className="action-btn delete" onClick={() => handleDelete(budget._id)}><MdDelete /></button>
                    </div>
                  </div>
                  <div className="budget-progress-bar">
                    <div 
                      className="budget-progress-fill" 
                      style={{ 
                        width: `${Math.min(percentage, 100)}%`,
                        background: getProgressColor(percentage)
                      }}
                    ></div>
                  </div>
                  <div className="budget-percentage-label">{percentage}%</div>
                </div>
              );
            })}
            
            {filteredBudgets.length > itemsPerPage && (
              <div className="pagination">
                <span>
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredBudgets.length)} of {filteredBudgets.length} budgets
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
            )}
          </>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingBudget ? 'Edit Budget' : 'Set Budget'}</h2>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => handleFormChange('category', e.target.value)}
                  placeholder="e.g., Groceries"
                  required
                />
              </div>
              <div className="form-group">
                <label>Limit (₹)</label>
                <input
                  type="number"
                  value={formData.limit}
                  onChange={(e) => handleFormChange('limit', e.target.value)}
                  placeholder="500"
                  min="0"
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Month</label>
                  <select
                    value={formData.month}
                    onChange={(e) => handleFormChange('month', parseInt(e.target.value))}
                  >
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                      <option key={i} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Year</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => handleFormChange('year', parseInt(e.target.value))}
                    min="2020"
                    max="2030"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Alert at (%)</label>
                <input
                  type="number"
                  value={formData.alertAt}
                  onChange={(e) => handleFormChange('alertAt', parseInt(e.target.value))}
                  min="0"
                  max="100"
                />
              </div>
              <button type="submit" className="submit-btn">Save</button>
            </form>
          </div>
        </div>
      )}

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

      {showDiscardModal && (
        <div className="modal-overlay" onClick={() => setShowDiscardModal(false)}>
          <div className="success-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Discard Changes?</h2>
            <div className="warning-icon">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="40" r="40" fill="#e8e8e8"/>
                <text x="40" y="55" fontSize="48" fontWeight="bold" textAnchor="middle" fill="#1a1a1a">!</text>
              </svg>
            </div>
            <p className="success-message">You have unsaved changes to this category. If you leave now, your updates will be lost.</p>
            <div className="discard-buttons">
              <button className="discard-btn" onClick={handleDiscard}>Discard</button>
              <button className="continue-btn" onClick={handleContinueEditing}>Continue editing</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Budget;
