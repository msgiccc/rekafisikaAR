import React, { useState } from 'react';
import './App.css';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ARViewer from './components/ARViewer';
import AITutor from './components/AITutor';
import Footer from './components/Footer';
import { tanyaAITutor } from './services/aiService';

function App() {
  const [aiResponse, setAiResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activePart, setActivePart] = useState('');

  const handleHotspotTrigger = async (partName, promptText) => {
    setActivePart(partName);
    setLoading(true);
    try {
      const response = await tanyaAITutor(promptText);
      setAiResponse({ source: response.source, text: response.text });
    } catch (error) {
      console.error(error);
      setAiResponse({ source: 'error', text: 'Maaf, terjadi kesalahan pada sistem AI saat menganalisis ' + partName });
    } finally {
      setLoading(false);
      // Optional: Clear active part after a while or keep it active until next click
      setTimeout(() => setActivePart(''), 5000);
    }
  };

  const handleSendMessage = async (text) => {
    setLoading(true);
    try {
      const response = await tanyaAITutor(text);
      setAiResponse({ source: response.source, text: response.text });
    } catch (error) {
      console.error(error);
      setAiResponse({ source: 'error', text: 'Maaf, terjadi kesalahan pada sistem AI.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <Navbar />
      <Hero />
      <main className="container main-content">
        <div className="layout-col-left">
          <ARViewer onHotspotSelect={handleHotspotTrigger} />
        </div>
        <div className="layout-col-right">
          <AITutor 
            selectedPart={activePart} 
            aiResponse={aiResponse} 
            loading={loading} 
            onSendMessage={handleSendMessage} 
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default App;
