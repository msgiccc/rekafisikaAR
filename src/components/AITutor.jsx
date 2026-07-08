import React, { useState, useRef, useEffect } from 'react';
import { tanyaAITutor } from '../services/aiService';

const AITutor = ({ triggerMessage, onKeywordMatch }) => {
  const [history, setHistory] = useState([
    { sender: 'ai', text: 'Halo! Saya RekaFisika AI. Ada yang ingin kamu tanyakan tentang konsep energi terbarukan hari ini?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState('offline'); // 'online' atau 'offline'
  const chatEndRef = useRef(null);

  const quickChips = [
    "Bagaimana prinsip aerodinamika pada baling-baling turbin?",
    "Jelaskan konversi energi mekanik ke listrik di generator!",
    "Apa yang mempengaruhi efisiensi daya turbin angin?"
  ];

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history, loading]);

  // Efek ketika menerima trigger dari komponen AR (klik hotspot)
  useEffect(() => {
    if (triggerMessage) {
      handleSend(triggerMessage);
    }
  }, [triggerMessage]);

  const handleSend = async (text) => {
    if (!text.trim()) return;
    
    // Add user message
    setHistory(prev => [...prev, { sender: 'user', text }]);
    setInput('');
    setLoading(true);
    
    try {
      const response = await tanyaAITutor(text);
      
      // Update status badge based on source
      setAiStatus(response.source === 'GEMINI_FREE_API' ? 'online' : 'offline');

      const aiResponseText = response.text;
      setHistory(prev => [...prev, { sender: 'ai', text: aiResponseText }]);

      // Trigger AR Camera based on AI keywords
      const lowerResp = aiResponseText.toLowerCase();
      if (lowerResp.includes('baling-baling') || lowerResp.includes('rotor')) {
        onKeywordMatch('baling-baling');
      } else if (lowerResp.includes('generator') || lowerResp.includes('elektromagnetik')) {
        onKeywordMatch('generator');
      } else if (lowerResp.includes('menara') || lowerResp.includes('tower')) {
        onKeywordMatch('menara');
      }

    } catch (error) {
      console.error(error);
      setHistory(prev => [...prev, { sender: 'ai', text: "Maaf, terjadi kesalahan pada sistem AI." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tutor-card">
      <div className="tutor-header">
        <h2>🤖 RekaFisika AI - Asisten Fisika Real-Time</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {aiStatus === 'online' ? (
            <span className="ai-status-badge online">⚡ Powered by Gemini AI (Free Tier)</span>
          ) : (
            <span className="ai-status-badge offline">🛡️ Offline Smart Engine Active</span>
          )}
        </div>
      </div>
      
      <div className="tutor-chat-area">
        <div className="ar-connection-indicator">
          <span>🔗</span> Terhubung langsung dengan AR Engine
        </div>

        {history.map((msg, index) => (
          <div key={index} className={`chat-bubble ${msg.sender}`}>
            {msg.text.split('\n\n').map((paragraph, i) => (
              <p key={i} style={{ marginBottom: i < msg.text.split('\n\n').length - 1 ? '0.5rem' : '0' }}>
                {paragraph}
              </p>
            ))}
          </div>
        ))}
        {loading && (
          <div className="chat-loading">
            <div className="dot-flashing"></div>
            <span>AI sedang menganalisis fisika...</span>
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
