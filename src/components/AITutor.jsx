import React, { useState, useRef, useEffect } from 'react';

const AITutor = ({ selectedPart, aiResponse, loading, onSendMessage }) => {
  const [history, setHistory] = useState([
    { sender: 'ai', text: 'Halo! Saya RekaFisika AI. Klik komponen pada model 3D di layar sebelah, atau ketik pertanyaanmu di bawah untuk mempelajari fisika energi terbarukan!' }
  ]);
  const [input, setInput] = useState('');
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

  // Effect to append new AI response from AR trigger or manual trigger
  useEffect(() => {
    if (aiResponse && aiResponse.text) {
      setHistory(prev => [...prev, { sender: 'ai', text: aiResponse.text }]);
    }
  }, [aiResponse]);

  const handleSend = () => {
    if (!input.trim()) return;
    setHistory(prev => [...prev, { sender: 'user', text: input }]);
    onSendMessage(input);
    setInput('');
  };

  // Utility to parse markdown bold and newlines safely without raw asterisks
  const formatAIResponse = (text) => {
    // Split by newlines first
    const paragraphs = text.split('\n').filter(p => p.trim() !== '');
    
    return paragraphs.map((paragraph, i) => {
      // Split by ** to find bold sections
      const parts = paragraph.split(/\*\*(.*?)\*\*/g);
      
      return (
        <p key={i} style={{ marginBottom: '0.75rem' }}>
          {parts.map((part, index) => {
            // Every odd index in the split result was wrapped in **
            if (index % 2 !== 0) {
              return <strong key={index} style={{ color: '#059669', fontWeight: '700' }}>{part}</strong>;
            }
            // Remove any stray single asterisks
            const cleanPart = part.replace(/\*/g, '');
            return <span key={index}>{cleanPart}</span>;
          })}
        </p>
      );
    });
  };

  return (
    <div className="tutor-card">
      <div className="tutor-header">
        <h2>🤖 RekaFisika AI Tutor</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', flexDirection: 'column' }}>
          <span className="ai-status-badge online">
            ⚡ Powered by Google Gemini AI (Free Tier)
          </span>
          {selectedPart && (
            <span className="ar-integration-badge">
              🎯 Mengintegrasikan AR: Sedang membahas {selectedPart}...
            </span>
          )}
        </div>
      </div>
      
      <div className="tutor-chat-area">
        {history.map((msg, index) => (
          <div key={index} className={`chat-bubble ${msg.sender}`}>
            {msg.sender === 'ai' ? formatAIResponse(msg.text) : msg.text}
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
              onClick={() => {
                setHistory(prev => [...prev, { sender: 'user', text: chip }]);
                onSendMessage(chip);
              }}
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
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            disabled={loading}
          />
          <button 
            onClick={handleSend}
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
