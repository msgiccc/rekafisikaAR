import React, { useState, useRef, useEffect } from 'react';
import { tanyaAITutor, formatMarkdownToReact } from '../services/aiService';

const AITutor = () => {
  const [history, setHistory] = useState([
    { sender: 'ai', text: 'Halo! Saya RekaFisika AI. Ketik pertanyaanmu di bawah untuk mempelajari fisika energi terbarukan lebih dalam!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const quickChips = [
    "Bagaimana prinsip aerodinamika baling-baling?",
    "Jelaskan hukum Faraday di generator!",
    "Apa itu Batas Betz pada efisiensi turbin?"
  ];

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history, loading]);

  const handleSend = async (text) => {
    if (!text.trim()) return;
    
    setHistory(prev => [...prev, { sender: 'user', text }]);
    setInput('');
    setLoading(true);
    
    try {
      const response = await tanyaAITutor(text);
      setHistory(prev => [...prev, { sender: 'ai', text: response.text }]);
    } catch (error) {
      console.error(error);
      setHistory(prev => [...prev, { sender: 'ai', text: "Maaf, terjadi kesalahan saat menghubungi AI." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tutor-card">
      <div className="tutor-header">
        <h2>🤖 RekaFisika AI Chat</h2>
        <span className="ai-status-badge">
          ⚡ Powered by Google Gemini AI (Free Tier)
        </span>
      </div>
      
      <div className="tutor-chat-area">
        {history.map((msg, index) => (
          <div key={index} className={`chat-bubble ${msg.sender}`}>
            {msg.sender === 'ai' ? formatMarkdownToReact(msg.text) : msg.text}
          </div>
        ))}
        {loading && (
          <div className="chat-loading">
            <div className="dot-flashing"></div>
            <span>AI sedang merumuskan fisika...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="tutor-input-area">
        <div className="quick-chips">
          {quickChips.map((chip, index) => (
            <button 
              key={index} 
              className="chip"
              onClick={() => handleSend(chip)}
              disabled={loading}
            >
              {chip}
            </button>
          ))}
        </div>
        
        <div className="input-form">
          <input 
            type="text" 
            placeholder="Ketik pertanyaan fisikamu di sini..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend(input)}
            disabled={loading}
          />
          <button 
            onClick={() => handleSend(input)}
            disabled={loading}
          >
            Kirim
          </button>
        </div>
      </div>
    </div>
  );
};

export default AITutor;
