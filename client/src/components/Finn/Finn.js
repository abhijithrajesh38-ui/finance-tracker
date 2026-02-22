import { useState } from 'react';
import './Finn.css';
import { MdEco, MdPerson } from 'react-icons/md';

function Finn({ userId }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const suggestions = [
    "Where am I overspending?",
    "Pull up my spending summary",
    "Budget check"
  ];

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
    handleSend(suggestion);
  };

  const handleSend = async (text = inputValue) => {
    if (!text.trim()) return;

    // Add user message
    const userMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await fetch('http://localhost:5000/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, question: text })
      });

      const data = await response.json();

      const aiResponse = response.ok
        ? (data.answer || 'No answer returned.')
        : (data.message || data.detail || 'AI request failed.');

      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error connecting to AI service.' }]);
      console.error(error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="finn-page">
      <div className="finn-header">
        <div className="finn-logo">
          <div className="finn-icon-box">
            <MdEco />
          </div>
          <div className="finn-title">
            <span className="finn-name">Finn</span>
            <span className="finn-subtitle">AI ASSISTANT</span>
          </div>
        </div>
      </div>

      <div className="finn-chat-container">
        {messages.length === 0 ? (
          <div className="finn-welcome">
            <h2>What can I help with?</h2>
          </div>
        ) : (
          <div className="finn-messages">
            {messages.map((message, index) => (
              <div key={index} className={`finn-message ${message.role}`}>
                <div className="message-avatar">
                  {message.role === 'assistant' ? <MdEco /> : <MdPerson />}
                </div>
                <div className="message-content">
                  <div className="message-text">{message.content}</div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="finn-message assistant">
                <div className="message-avatar"><MdEco /></div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="finn-input-container">
        {messages.length === 0 && (
          <div className="finn-suggestions">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                className="suggestion-chip"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
        
        <div className="finn-input-wrapper">
          <input
            type="text"
            className="finn-input"
            placeholder="Tell me what you want to know..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button className="finn-send-btn" onClick={() => handleSend()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Finn;
