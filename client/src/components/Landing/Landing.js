import { useNavigate } from 'react-router-dom';
import './Landing.css';
import logo from '../../assets/images/Vector.svg';
import dashboardPreview from '../../assets/images/Finance Dashboard v1.jpg';
import finnAIPreview from '../../assets/images/Finn AI 2 Budget v1.jpg';
import { MdDashboard, MdSwapHoriz, MdReceipt, MdSavings, MdBarChart, MdChat } from 'react-icons/md';

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <div className="logo">
          <img src={logo} alt="Logo" className="logo-img-landing" />
        </div>
        <div className="header-buttons">
          <button className="login-link" onClick={() => navigate('/login')}>
            Login
          </button>
          <button className="get-started-header-btn" onClick={() => navigate('/register')}>
            Get started →
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-badge">✨ NEW WITH FINN AI — YOUR MONEY CO-PILOT</div>
        <h1 className="hero-title">
          Your finances,<br />
          <span className="italic">finally clear.</span>
        </h1>
        <p className="hero-subtitle">
          Track expenses, set budgets, and get AI-powered insights.<br />
          Take control of your financial future today.
        </p>
        <div className="hero-buttons">
          <button className="create-account-btn" onClick={() => navigate('/register')}>
            Create free account →
          </button>
          <button className="login-btn-hero" onClick={() => navigate('/login')}>Login</button>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="preview-section">
        <div className="dashboard-preview">
          <img src={dashboardPreview} alt="Dashboard Preview" className="preview-image" />
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="features-header">
          <span className="features-label">What's inside</span>
          <h2 className="features-title">
            Everything you need,<br />
            <span className="italic">nothing you don't.</span>
          </h2>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <MdDashboard />
            </div>
            <h3>Live Dashboard</h3>
            <p>Real-time overview of your balance, income, expenses and net savings — all visible the moment you log in.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <MdSwapHoriz />
            </div>
            <h3>Transactions</h3>
            <p>Filter, search and categorize every rupee. Understand exactly where your money is going with clean, sortable views.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <MdReceipt />
            </div>
            <h3>Budgeting</h3>
            <p>Set monthly budgets per category and watch your progress in real time. Get alerted before you overspend.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <MdSavings />
            </div>
            <h3>Savings Goals</h3>
            <p>Create goals for anything — emergency fund, new car, vacation — and track your progress with visual rings.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <MdBarChart />
            </div>
            <h3>Reports</h3>
            <p>Monthly and yearly breakdowns with category-level analysis. See trends and patterns across your financial history.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <MdChat />
            </div>
            <h3>Finn AI</h3>
            <p>Your intelligent money co-pilot. Finn surfaces insights, flags waste, spots opportunities, and answers your financial questions.</p>
          </div>
        </div>
      </section>

      {/* Co-pilot Section */}
      <section className="copilot-section">
        <div className="copilot-content">
          <span className="copilot-label">Finn AI</span>
          <h2 className="copilot-title">
            Your money<br />
            <span className="italic">co-pilot.</span>
          </h2>
          <p className="copilot-description">
            Finn doesn't just show you numbers — it reads between the lines. From catching a wasted subscription to spotting the perfect investment opportunity, Finn works quietly in the background so you don't have to.
          </p>
          <div className="copilot-tags">
            <span className="tag">SPOT SPENDING LEAKS</span>
            <span className="tag">UTILITY ANALYSIS</span>
            <span className="tag">GOAL COACHING</span>
            <span className="tag">MARKET ALERTS</span>
          </div>
        </div>
        <div className="copilot-preview">
          <img src={finnAIPreview} alt="Finn AI Preview" className="copilot-image" />
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <h2 className="cta-title">
          Take control of<br />
          <span className="italic">your money today.</span>
        </h2>
        <button className="cta-btn" onClick={() => navigate('/register')}>
          Get started for free →
        </button>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-links">
          <a href="#privacy">Privacy</a>
          <a href="#terms">Terms</a>
          <a href="#support">Support</a>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
