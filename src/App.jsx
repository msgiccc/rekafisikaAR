import React, { useState } from 'react';
import './App.css';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ARViewer from './components/ARViewer';
import AITutor from './components/AITutor';
import Footer from './components/Footer';
import { generateARChallenge, tanyaAITutor } from './services/aiService';

function App() {
  const [aiTriggerMessage, setAiTriggerMessage] = useState('');
  const [arCameraTarget, setArCameraTarget] = useState('');
  const [aiHudContent, setAiHudContent] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);

  // New Physics Controller State
  const [windSpeed, setWindSpeed] = useState(10);
  
  // New X-Ray State
  const [xRayMode, setXRayMode] = useState(false);

  // New Gamification State
  const [gamificationActive, setGamificationActive] = useState(false);
  const [currentMission, setCurrentMission] = useState(null);
  const [score, setScore] = useState(0);
  const [missionFeedback, setMissionFeedback] = useState(null); // 'correct' | 'wrong' | null

  // Function to start gamification
  const startGamification = async () => {
    setGamificationActive(true);
    setScore(0);
    setMissionFeedback(null);
    setAiHudContent("🎮 Menyiapkan Misi AI...");
    setIsAiThinking(true);
    const mission = await generateARChallenge();
    setCurrentMission(mission);
    setAiHudContent(mission.question);
    setIsAiThinking(false);
  };

  const handleARClick = async (keyword, rawKeyword) => {
    if (gamificationActive && currentMission) {
      // Gamification Mode
      if (rawKeyword === currentMission.answerKey) {
        setMissionFeedback('correct');
        setScore(prev => prev + 100);
        setAiHudContent("🎉 TEPAT! +100 Poin. Memuat misi berikutnya...");
        setIsAiThinking(true);
        setTimeout(async () => {
          const nextMission = await generateARChallenge();
          setCurrentMission(nextMission);
          setAiHudContent(nextMission.question);
          setIsAiThinking(false);
          setMissionFeedback(null);
        }, 2000);
      } else {
        setMissionFeedback('wrong');
        setAiHudContent(`❌ Belum tepat! Fokus: ${currentMission.question}`);
        setTimeout(() => setMissionFeedback(null), 1500);
      }
    } else {
      // Normal Mode
      setAiTriggerMessage(`Jelaskan tentang ${keyword} pada turbin angin secara singkat.`);
    }
  };

  const handleAIKeyword = (keyword) => {
    setArCameraTarget(keyword);
  };

  // Toggle X-Ray and trigger AI explanation automatically
  const toggleXRay = async () => {
    const nextMode = !xRayMode;
    setXRayMode(nextMode);
    if (nextMode && !gamificationActive) {
      setAiHudContent("Mengaktifkan Sensor Internal X-Ray...");
      setIsAiThinking(true);
      const res = await tanyaAITutor("Jelaskan induksi hukum faraday pada generator bagian dalam turbin.");
      setAiHudContent(res.text.split(/(?<=[.!?])\s+/).slice(0,3).join(' '));
      setIsAiThinking(false);
    }
  };

  return (
    <div className="app-container">
      <Navbar />
      <Hero />
      <main className="container main-content">
        <ARViewer 
          cameraTarget={arCameraTarget} 
          onHotspotClick={handleARClick} 
          aiHudContent={aiHudContent}
          isAiThinking={isAiThinking}
          // Physics
          windSpeed={windSpeed}
          setWindSpeed={setWindSpeed}
          // X-Ray
          xRayMode={xRayMode}
          toggleXRay={toggleXRay}
          // Gamification
          gamificationActive={gamificationActive}
          startGamification={startGamification}
          score={score}
          missionFeedback={missionFeedback}
        />
        <AITutor 
          triggerMessage={aiTriggerMessage} 
          onKeywordMatch={handleAIKeyword} 
          setAiHudContent={setAiHudContent}
          setIsAiThinking={setIsAiThinking}
        />
      </main>
      <Footer />
    </div>
  );
}

export default App;
