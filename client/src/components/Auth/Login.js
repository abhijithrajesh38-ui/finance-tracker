import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Auth.css';
import logo from '../../assets/images/Vector.svg';
import { MdEmail, MdLock, MdVisibility, MdVisibilityOff } from 'react-icons/md';

function Login({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Store token and user data
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLoginSuccess(data.user);
        navigate('/dashboard');
      } else {
        alert(data.message || 'Login failed');
      }
    } catch (error) {
      alert('Error connecting to server');
      console.error(error);
    }
  };

  return (
    <div className="login-container">
      <div className="bg-circle circle-1"></div>
      <div className="bg-circle circle-2"></div>
      <div className="login-box">
        <img src={logo} alt="Logo" className="logo-img" />
        <h1>Hello Again!</h1>
        <p className="subtitle">Welcome Back</p>
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <span className="input-icon"><MdEmail /></span>
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <span className="input-icon"><MdLock /></span>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
            </button>
          </div>

          <a href="#" className="forgot-password">Forgot Password?</a>

          <button type="submit" className="login-btn">Login</button>
        </form>

        <p className="register-link">
          Don't Have An Account? <a href="#" onClick={(e) => { e.preventDefault(); navigate('/register'); }}>Register here</a>
        </p>
      </div>
    </div>
  );
}

export default Login;
