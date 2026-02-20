import React, { useState } from 'react';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './components/Dashboard/Dashboard';

function App() {
  const [showLogin, setShowLogin] = useState(true);
  const [user, setUser] = useState(null);

  if (user) {
    return <Dashboard user={user} />;
  }

  return showLogin ? 
    <Login onSwitchToRegister={() => setShowLogin(false)} onLoginSuccess={setUser} /> : 
    <Register onSwitchToLogin={() => setShowLogin(true)} />;
}

export default App;
