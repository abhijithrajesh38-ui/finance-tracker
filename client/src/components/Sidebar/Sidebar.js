import { useState } from 'react';
import './Sidebar.css';
import { MdDashboard, MdAttachMoney, MdAccountBalanceWallet, MdEco, MdDescription } from 'react-icons/md';

function Sidebar({ currentPage, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="logo">fb</div>
      <nav>
        <div 
          className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
          onClick={() => onNavigate('dashboard')}
        >
          <span><MdDashboard /></span> Dashboard
        </div>
        <div 
          className={`nav-item ${currentPage === 'transactions' ? 'active' : ''}`}
          onClick={() => onNavigate('transactions')}
        >
          <span><MdAttachMoney /></span> Transactions
        </div>
        <div 
          className={`nav-item ${currentPage === 'budget' ? 'active' : ''}`}
          onClick={() => onNavigate('budget')}
        >
          <span><MdAccountBalanceWallet /></span> Budget
        </div>
        <div 
          className={`nav-item ${currentPage === 'report' ? 'active' : ''}`}
          onClick={() => onNavigate('report')}
        >
          <span><MdDescription /></span> Report
        </div>
        <div className="nav-separator"></div>
        <div 
          className={`nav-item ${currentPage === 'finn' ? 'active' : ''}`}
          onClick={() => onNavigate('finn')}
        >
          <span><MdEco /></span> Finn
        </div>
      </nav>
    </aside>
  );
}

export default Sidebar;
