import React from 'react';
import './Sidebar.css';

function Sidebar({ currentPage, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="logo">fb</div>
      <nav>
        <div 
          className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
          onClick={() => onNavigate('dashboard')}
        >
          <span>📊</span> Dashboard
        </div>
        <div 
          className={`nav-item ${currentPage === 'transactions' ? 'active' : ''}`}
          onClick={() => onNavigate('transactions')}
        >
          <span>💸</span> Transactions
        </div>
        <div 
          className={`nav-item ${currentPage === 'budget' ? 'active' : ''}`}
          onClick={() => onNavigate('budget')}
        >
          <span>💼</span> Budget
        </div>
        <div className="nav-separator"></div>
        <div className="nav-item">
          <span>🌱</span> Finn
        </div>
      </nav>
    </aside>
  );
}

export default Sidebar;
