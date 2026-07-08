import React, { useState } from 'react';
import './App.css';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ARViewer from './components/ARViewer';
import AITutor from './components/AITutor';
import Footer from './components/Footer';

function App() {
  const [aiTriggerMessage, setAiTriggerMessage] = useState('');
  const [arCameraTarget, setArCameraTarget] = useState('');

  const handleARClick = (keyword) => {
    setAiTriggerMessage(`Jelaskan tentang ${keyword} pada turbin angin.`);
  };

  const handleAIKeyword = (keyword) => {
    setArCameraTarget(keyword);
  };

  return (
    <div className="app-container">
      <Navbar />
      <Hero />
      <main className="container main-content">
        <ARViewer 
          cameraTarget={arCameraTarget} 
          onHotspotClick={handleARClick} 
        />
        <AITutor 
          triggerMessage={aiTriggerMessage} 
          onKeywordMatch={handleAIKeyword} 
        />
      </main>
      <Footer />
    </div>
  );
}

export default App;
