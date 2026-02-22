import React, { useState, useEffect } from 'react';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './components/Dashboard/Dashboard';

function App() {
  const [showLogin, setShowLogin] = useState(true);
  const [user, setUser] = useState(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('user');
      }
    }
  }, []);

  // Save user to localStorage when it changes
  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  // Handle logout
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  if (user) {
    return <Dashboard user={user} onLogout={handleLogout} />;
  }

  return showLogin ? 
    <Login onSwitchToRegister={() => setShowLogin(false)} onLoginSuccess={handleLoginSuccess} /> : 
    <Register onSwitchToLogin={() => setShowLogin(true)} />;
}

export default App;
