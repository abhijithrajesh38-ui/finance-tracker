import { useState, useEffect } from 'react';
import './Bills.css';
import { MdAdd, MdDelete, MdCheckCircle, MdAlarm, MdEdit } from 'react-icons/md';

function Bills({ userId }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [billToDelete, setBillToDelete] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [successTitle, setSuccessTitle] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: 'Bills',
    dueDate: '',
    recurring: false,
    frequency: 'monthly'
  });

  useEffect(() => {
    if (userId) {
      fetchBills();
    }
  }, [userId]);

  const fetchBills = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/bills?userId=${userId}`);
      const data = await response.json();
      setBills(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching bills:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Submitting bill:', formData);
    
    try {
      const response = await fetch('http://localhost:5000/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, userId })
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const text = await response.text();
        console.error('Error response:', text);
        alert('Error adding bill. Please make sure the server is running.');
        return;
      }

      const data = await response.json();
      console.log('Response data:', data);

      setShowModal(false);
      setFormData({
        name: '',
        amount: '',
        category: 'Bills',
        dueDate: '',
        recurring: false,
        frequency: 'monthly'
      });
      fetchBills();
      
      setSuccessTitle('Bill Added');
      setSuccessMessage(`Bill "${formData.name}" has been added successfully.`);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error creating bill:', error);
      alert('Error: Cannot connect to server. Please make sure the server is running on port 5000.');
    }
  };

  const markAsPaid = async (id) => {
    try {
      const response = await fetch(`http://localhost:5000/api/bills/${id}/pay`, {
        method: 'PUT'
      });

      if (response.ok) {
        fetchBills();
      }
    } catch (error) {
      console.error('Error marking bill as paid:', error);
    }
  };

  const deleteBill = async (bill) => {
    setBillToDelete(bill);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/bills/${billToDelete._id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setShowDeleteModal(false);
        setBillToDelete(null);
        fetchBills();
        setSuccessTitle('Bill Deleted');
        setSuccessMessage(`Bill "${billToDelete.name}" has been deleted successfully.`);
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error deleting bill:', error);
      alert('Error deleting bill');
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setBillToDelete(null);
  };

  const getDaysUntilDue = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const upcomingBills = bills.filter(b => !b.isPaid && getDaysUntilDue(b.dueDate) >= 0 && getDaysUntilDue(b.dueDate) <= 7);
  const unpaidBills = bills.filter(b => !b.isPaid);
  const paidBills = bills.filter(b => b.isPaid);

  if (loading) {
    return <div className="bills-page">Loading...</div>;
  }

  return (
    <div className="bills-page">
      <header className="bills-header">
        <div>
          <div className="date">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}</div>
          <h1>Bill Reminders</h1>
        </div>
        <button className="add-bill-btn" onClick={() => setShowModal(true)}>
          <MdAdd /> Add Bill
        </button>
      </header>

      {upcomingBills.length > 0 && (
        <div className="upcoming-section">
          <h2><MdAlarm /> Upcoming Bills (Next 7 Days)</h2>
          <div className="bills-grid">
            {upcomingBills.map(bill => {
              const daysUntil = getDaysUntilDue(bill.dueDate);
              return (
                <div key={bill._id} className="bill-card upcoming">
                  <div className="bill-header">
                    <h3>{bill.name}</h3>
                    <span className="bill-amount">₹{bill.amount.toLocaleString()}</span>
                  </div>
                  <div className="bill-details">
                    <div className={`bill-due ${daysUntil <= 2 ? 'urgent' : ''}`}>
                      Due in {daysUntil} {daysUntil === 1 ? 'day' : 'days'}
                    </div>
                  </div>
                  <div className="bill-actions">
                    <button className="pay-btn" onClick={() => markAsPaid(bill._id)}>
                      <MdCheckCircle /> Mark as Paid
                    </button>
                    <button className="delete-btn-icon" onClick={() => deleteBill(bill)}>
                      <MdDelete />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bills-sections">
        <div className="bills-section">
          <h2>Unpaid Bills ({unpaidBills.length})</h2>
          {unpaidBills.length === 0 ? (
            <p className="empty-message">No unpaid bills</p>
          ) : (
            <div className="bills-list">
              {unpaidBills.map(bill => (
                <div key={bill._id} className="bill-item">
                  <div className="bill-info">
                    <h3>{bill.name}</h3>
                    <div className="bill-meta">
                      <span className="bill-date">Due: {new Date(bill.dueDate).toLocaleDateString()}</span>
                      {bill.recurring && <span className="recurring-badge">{bill.frequency}</span>}
                    </div>
                  </div>
                  <div className="bill-right">
                    <span className="bill-amount">₹{bill.amount.toLocaleString()}</span>
                    <div className="bill-actions">
                      <button className="pay-btn-small" onClick={() => markAsPaid(bill._id)}>
                        <MdCheckCircle /> Paid
                      </button>
                      <button className="delete-btn-icon" onClick={() => deleteBill(bill)}>
                        <MdDelete />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bills-section">
          <h2>Paid Bills ({paidBills.length})</h2>
          {paidBills.length === 0 ? (
            <p className="empty-message">No paid bills</p>
          ) : (
            <div className="bills-list">
              {paidBills.map(bill => (
                <div key={bill._id} className="bill-item paid">
                  <div className="bill-info">
                    <h3>{bill.name}</h3>
                    <div className="bill-meta">
                      <span className="bill-date">Paid: {new Date(bill.paidDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="bill-right">
                    <span className="bill-amount">₹{bill.amount.toLocaleString()}</span>
                    <button className="delete-btn-icon" onClick={() => deleteBill(bill)}>
                      <MdDelete />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Bill</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Bill Name</label>
                <input
                  type="text"
                  placeholder="e.g., Electricity Bill, Netflix"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Amount</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.recurring}
                    onChange={(e) => setFormData({ ...formData, recurring: e.target.checked })}
                  />
                  Recurring Bill
                </label>
              </div>

              {formData.recurring && (
                <div className="form-group">
                  <label>Frequency</label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Add Bill
                </button>
              </div>
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

      {showDeleteModal && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Delete Bill</h2>
            <div className="delete-icon">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="40" r="40" fill="#ffe8e8"/>
                <path d="M30 30L50 50M50 30L30 50" stroke="#ff4444" strokeWidth="4" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="delete-message">
              Are you sure you want to delete the bill "{billToDelete?.name}"? This action cannot be undone.
            </p>
            <div className="delete-modal-actions">
              <button className="cancel-btn-delete" onClick={cancelDelete}>Cancel</button>
              <button className="confirm-delete-btn" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Bills;
