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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const validatePassword = (pass) => {
    if (pass.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(pass)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(pass)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(pass)) {
      return 'Password must contain at least one number';
    }
    if (!/[!@#$%^&*]/.test(pass)) {
      return 'Password must contain at least one special character (!@#$%^&*)';
    }
    return '';
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    const error = validatePassword(newPassword);
    setPasswordError(error);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate password
    const error = validatePassword(password);
    if (error) {
      setPasswordError(error);
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('Register: Response data:', data);
        console.log('Register: Token received:', data.token ? 'YES' : 'NO');
        
        if (data.token) {
          // Store token and user data, then go to dashboard
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          console.log('Register: Token stored, redirecting to dashboard');
          alert('Registration successful!');
          navigate('/dashboard');
        } else {
          // No token, go to login
          alert('Registration successful! Please login.');
          navigate('/login');
        }
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
              onChange={handlePasswordChange}
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

          <div className="input-group">
            <span className="input-icon"><MdLock /></span>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <MdVisibilityOff /> : <MdVisibility />}
            </button>
          </div>

          {passwordError && (
            <div style={{ color: '#ff4444', fontSize: '13px', marginBottom: '15px', textAlign: 'left' }}>
              {passwordError}
            </div>
          )}

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
