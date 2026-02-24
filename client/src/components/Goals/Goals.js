import './Goals.css';

function Goals({ userId }) {
  return (
    <div className="goals-page">
      <header className="page-header">
        <div>
          <div className="date">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}</div>
          <h1>Saving Goals</h1>
        </div>
      </header>

      <div className="coming-soon-container">
        <div className="coming-soon-content">
          <div className="coming-soon-icon">
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
              <circle cx="60" cy="60" r="60" fill="#f5f5f5"/>
              <path d="M60 30V60L75 75" stroke="#1a1a1a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2>Coming Soon</h2>
          <p>We're working hard to bring you an amazing savings goals feature. Stay tuned!</p>
        </div>
      </div>
    </div>
  );
}

export default Goals;
