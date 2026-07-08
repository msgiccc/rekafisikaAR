import React, { useState, useRef, useEffect } from 'react';
import { tanyaAITutor } from '../services/aiService';

const AITutor = () => {
  const [history, setHistory] = useState([
    { sender: 'ai', text: 'Halo! Saya RekaFisika AI. Ada yang ingin kamu tanyakan tentang konsep energi terbarukan hari ini?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState('offline');
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
      setAiStatus(response.source === 'GEMINI_FREE_API' ? 'online' : 'offline');
      setHistory(prev => [...prev, { sender: 'ai', text: response.text }]);
    } catch (error) {
      console.error(error);
      setHistory(prev => [...prev, { sender: 'ai', text: "Maaf, terjadi kesalahan pada sistem AI." }]);
    } finally {
      setLoading(false);
    }
  };

  // Utility to parse markdown bold and newlines safely
  const renderFormattedAIResponse = (text) => {
    // Split by newlines first
    const paragraphs = text.split('\\n').filter(p => p.trim() !== '');
    
    return paragraphs.map((paragraph, i) => {
      // Split by ** to find bold sections
      const parts = paragraph.split(/\\*\\*(.*?)\\*\\*/g);
      
      return (
        <p key={i} style={{ marginBottom: '0.75rem' }}>
          {parts.map((part, index) => {
            // Every odd index in the split result was wrapped in **
            if (index % 2 !== 0) {
              return <strong key={index} style={{ color: '#059669', fontWeight: '700' }}>{part}</strong>;
            }
            // Further process single * for italic if needed, but the prompt just asked to remove * leakages.
            // Let's remove any stray single asterisks that might leak.
            const cleanPart = part.replace(/\\*/g, '');
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
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className={`ai-status-badge ${aiStatus}`}>
            {aiStatus === 'online' ? '⚡ Powered by Google Gemini AI (Free Tier)' : '🛡️ Offline Smart Engine'}
          </span>
        </div>
      </div>
      
      <div className="tutor-chat-area">
        {history.map((msg, index) => (
          <div key={index} className={`chat-bubble ${msg.sender}`}>
            {msg.sender === 'ai' ? renderFormattedAIResponse(msg.text) : msg.text}
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
