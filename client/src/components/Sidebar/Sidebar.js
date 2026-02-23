import './Sidebar.css';
import logo from '../../assets/images/Vector.svg';
import whitefin from '../../assets/images/whitefin.svg';
import { MdDashboard, MdAttachMoney, MdAccountBalanceWallet, MdEco, MdDescription, MdCompareArrows, MdAlarm } from 'react-icons/md';

function Sidebar({ currentPage, onNavigate }) {
  return (
    <aside className="sidebar">
      <img src={logo} alt="Logo" className="logo-img" />
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
        <div 
          className={`nav-item ${currentPage === 'compare' ? 'active' : ''}`}
          onClick={() => onNavigate('compare')}
        >
          <span><MdCompareArrows /></span> Compare
        </div>
        <div 
          className={`nav-item ${currentPage === 'bills' ? 'active' : ''}`}
          onClick={() => onNavigate('bills')}
        >
          <span><MdAlarm /></span> Bills
        </div>
        <div className="nav-separator"></div>
        <div 
          className={`nav-item ${currentPage === 'finn' ? 'active' : ''}`}
          onClick={() => onNavigate('finn')}
        >
          <span><img src={whitefin} alt="Finn" className="finn-nav-icon" /></span> Finn
        </div>
      </nav>
    </aside>
  );
}

export default Sidebar;
