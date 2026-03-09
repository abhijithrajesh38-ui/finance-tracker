import { useState, useEffect } from 'react';
import './Goals.css';
import { MdEdit, MdDelete } from 'react-icons/md';

function Goals({ userId }) {
  const [goals, setGoals] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    targetDate: ''
  });

  useEffect(() => {
    if (userId) {
      fetchGoals();
    }
  }, [userId]);

  const fetchGoals = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/goals`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch goals');
      }
      
      const data = await response.json();
      setGoals(Array.isArray(data) ? data : []);
      
      // Allocate savings after fetching goals
      await allocateSavings();
    } catch (error) {
      console.error('Error fetching goals:', error);
      setGoals([]);
    }
  };

  const allocateSavings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/goals/allocate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Savings allocated:', data);
        // Fetch goals again to get updated amounts
        const goalsResponse = await fetch(`http://localhost:5000/api/goals`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (goalsResponse.ok) {
          const updatedGoals = await goalsResponse.json();
          setGoals(Array.isArray(updatedGoals) ? updatedGoals : []);
        }
      }
    } catch (error) {
      console.error('Error allocating savings:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const goalData = {
        ...formData,
        userId,
        targetAmount: parseFloat(formData.targetAmount)
      };
      
      const url = editingGoal 
        ? `http://localhost:5000/api/goals/${editingGoal._id}`
        : 'http://localhost:5000/api/goals';
      
      const method = editingGoal ? 'PUT' : 'POST';
      const token = localStorage.getItem('token');
      
      const response = await fetch(url, {
        method: method,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(goalData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setShowModal(false);
        setEditingGoal(null);
        setFormData({
          name: '',
          targetAmount: '',
          targetDate: ''
        });
        await fetchGoals();
      } else {
        alert(`Failed to save goal: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving goal:', error);
      alert(`Error saving goal: ${error.message}`);
    }
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      targetAmount: goal.targetAmount,
      targetDate: new Date(goal.targetDate).toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5000/api/goals/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          await fetchGoals();
        } else {
          throw new Error('Failed to delete goal');
        }
      } catch (error) {
        console.error('Error deleting goal:', error);
        alert('Failed to delete goal');
      }
    }
  };

  const totalGoals = goals.length;
  const activeGoals = goals.filter(g => g.status === 'active');
  const totalSaved = goals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);

  const getPercentage = (current, target) => {
    return target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 100) return '#4caf50';
    if (percentage >= 75) return '#8bc34a';
    if (percentage >= 50) return '#ffc107';
    return '#1a1a1a';
  };

  return (
    <div className="goals-page">
      <header className="page-header">
        <div>
          <div className="date">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}</div>
          <h1>Saving Goals</h1>
        </div>
        <button className="add-btn" onClick={() => setShowModal(true)}>+ Add Goal</button>
      </header>

      <div className="goals-summary">
        <div className="summary-card-goal">
          <div className="summary-label">Total Goals</div>
          <div className="summary-value">{totalGoals}</div>
          <div className="summary-count">{activeGoals.length} active goals</div>
        </div>
        <div className="summary-card-goal">
          <div className="summary-label">Total Saved</div>
          <div className="summary-value">₹{totalSaved.toLocaleString()}</div>
          <div className="summary-count">{totalTarget > 0 ? Math.round((totalSaved/totalTarget)*100) : 0}% of target</div>
        </div>
        <div className="summary-card-goal">
          <div className="summary-label">Target Amount</div>
          <div className="summary-value">₹{totalTarget.toLocaleString()}</div>
          <div className="summary-count">across all goals</div>
        </div>
      </div>

      <div className="goals-section">
        <h2>Goals</h2>
        {goals.length === 0 ? (
          <div className="no-goals">No goals yet. Click "+ Add Goal" to create one.</div>
        ) : (
          <div className="goals-grid">
            {goals.map(goal => {
              const currentAmount = goal.currentAmount || 0;
              const percentage = getPercentage(currentAmount, goal.targetAmount);
              const remaining = Math.max(0, goal.targetAmount - currentAmount);
              const daysLeft = Math.ceil((new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24));
              const isCompleted = goal.status === 'completed';
              
              return (
                <div key={goal._id} className={`goal-card ${isCompleted ? 'completed' : ''}`}>
                  <div className="goal-header">
                    <h3>{goal.name}</h3>
                    <div className="goal-actions">
                      {!isCompleted && <button className="icon-btn" onClick={() => handleEdit(goal)}><MdEdit /></button>}
                      <button className="icon-btn" onClick={() => handleDelete(goal._id)}><MdDelete /></button>
                    </div>
                  </div>
                  
                  <div className="goal-progress-circle">
                    <svg width="120" height="120">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="#e0e0e0" strokeWidth="10"/>
                      <circle 
                        cx="60" 
                        cy="60" 
                        r="50" 
                        fill="none" 
                        stroke={getProgressColor(percentage)}
                        strokeWidth="10"
                        strokeDasharray={`${percentage * 3.14} 314`}
                        strokeLinecap="round"
                        transform="rotate(-90 60 60)"
                      />
                      <text x="60" y="65" textAnchor="middle" fontSize="24" fontWeight="bold" fill={isCompleted ? '#4caf50' : '#1a1a1a'}>
                        {percentage}%
                      </text>
                    </svg>
                  </div>
                  
                  <div className="goal-details">
                    {isCompleted ? (
                      <>
                        <div className="goal-amount">
                          <span className="current">₹{goal.targetAmount.toLocaleString()}</span>
                        </div>
                        <div className="goal-completed-badge">✓ Completed</div>
                        <div className="goal-date">Achieved: {new Date(goal.updatedAt).toLocaleDateString()}</div>
                      </>
                    ) : (
                      <>
                        <div className="goal-amount">
                          <span className="current">₹{currentAmount.toLocaleString()}</span>
                          <span className="separator">/</span>
                          <span className="target">₹{goal.targetAmount.toLocaleString()}</span>
                        </div>
                        <div className="goal-remaining">₹{remaining.toLocaleString()} to go</div>
                        <div className="goal-date">Target: {new Date(goal.targetDate).toLocaleDateString()}</div>
                        {daysLeft > 0 && <div className="goal-days">{daysLeft} days left</div>}
                        {daysLeft < 0 && <div className="goal-days overdue">{Math.abs(daysLeft)} days overdue</div>}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingGoal ? 'Edit Goal' : 'Add Goal'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Goal Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Emergency Fund"
                  required
                />
              </div>
              <div className="form-group">
                <label>Target Amount (₹)</label>
                <input
                  type="number"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData({...formData, targetAmount: e.target.value})}
                  placeholder="10000"
                  min="1"
                  required
                />
              </div>
              <div className="form-group">
                <label>Target Date</label>
                <input
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) => setFormData({...formData, targetDate: e.target.value})}
                  required
                />
              </div>
              <button type="submit" className="submit-btn">Save Goal</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Goals;
