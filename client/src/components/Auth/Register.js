import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Auth.css';
import logo from '../../assets/images/Vector.svg';
import { MdEmail, MdLock, MdVisibility, MdVisibilityOff, MdPerson } from 'react-icons/md';

function Register() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('Registration successful! Please login.');
        navigate('/login');
      } else {
        alert(data.message || 'Registration failed');
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
        <h1>Hello!</h1>
        <p className="subtitle">Sign Up to Get Started</p>
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <span className="input-icon"><MdPerson /></span>
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

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

          <button type="submit" className="login-btn">Register</button>
        </form>

        <p className="register-link">
          Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Log in</a>
        </p>
      </div>
    </div>
  );
}

export default Register;
