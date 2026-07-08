import React, { useRef, useState, useEffect } from 'react';
import { tanyaAITutorVoice, formatMarkdownToReact, speakText } from '../services/aiService';

const ARViewer = () => {
  const modelRef = useRef(null);

  // Popups State (World-Space Holograms)
  const [popups, setPopups] = useState({
    rotor: { isOpen: false, text: '', formula: 'E_k = ½ m v²', title: 'Rotor' },
    generator: { isOpen: false, text: '', formula: 'Ɛ = -N (dΦ / dt)', title: 'Generator' },
    tower: { isOpen: false, text: '', formula: 'v(h) = v_ref * (h / h_ref)^α', title: 'Menara' }
  });

  // UI States
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState(''); // e.g. "Mendengarkan...", "AI Berpikir..."

  const defaultOrbit = "0deg 75deg 3.5m";
  const defaultTarget = "0m 1.5m 0m";

  // Coordinates data
  const hotspotData = {
    rotor: { target: '0m 2.4m 0m', orbit: '20deg 75deg 2.5m' },
    generator: { target: '0m 2.4m 0m', orbit: '-150deg 60deg 2.5m' },
    tower: { target: '0m 1.2m 0m', orbit: '45deg 85deg 3.5m' }
  };

  // Tutup semua popup dan reset kamera
  const resetView = () => {
    setPopups(prev => ({
      rotor: { ...prev.rotor, isOpen: false },
      generator: { ...prev.generator, isOpen: false },
      tower: { ...prev.tower, isOpen: false }
    }));
    if (modelRef.current) {
      modelRef.current.cameraTarget = defaultTarget;
      modelRef.current.cameraOrbit = defaultOrbit;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  };

  // Aktivasi satu bagian mesin (Kamera pindah & Buka slot popup-nya)
  const activatePart = (partName, aiText) => {
    const data = hotspotData[partName];
    if (modelRef.current && data) {
      modelRef.current.cameraTarget = data.target;
      modelRef.current.cameraOrbit = data.orbit;
    }

    setPopups(prev => {
      const newPopups = {
        rotor: { ...prev.rotor, isOpen: false },
        generator: { ...prev.generator, isOpen: false },
        tower: { ...prev.tower, isOpen: false }
      };
      
      if (newPopups[partName]) {
        newPopups[partName].isOpen = true;
        newPopups[partName].text = aiText;
      }
      return newPopups;
    });
  };

  // Saat tombol Sci-Fi diklik manual di layar AR
  const handleManualHotspotClick = async (partName, triggerText) => {
    resetView();
    setVoiceStatus(`AI memindai ${partName}...`);
    
    // Tampilkan popup kosong terlebih dahulu (Loading state)
    activatePart(partName, "⚡ Mengambil data fisika...");

    try {
      const response = await tanyaAITutorVoice(triggerText);
      activatePart(partName, response.text);
      speakText(response.text);
      setVoiceStatus('');
    } catch (error) {
      activatePart(partName, "Gagal terhubung ke AI.");
      setVoiceStatus('');
    }
  };

  // Voice AI Co-Pilot Logic
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Maaf, browser Anda tidak mendukung Voice API. Silakan gunakan tombol hotspot manual.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    
    recognition.onstart = () => {
      resetView();
      setIsListening(true);
      setVoiceStatus('🎙️ Mendengarkan suara Anda...');
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      setVoiceStatus('🧠 AI Berpikir...');
      
      try {
        const response = await tanyaAITutorVoice(transcript);
        
        // Putar suara kembali
        speakText(response.text);
        
        // Pindahkan kamera ke komponen yang dibicarakan
        if (response.targetPart) {
          activatePart(response.targetPart, response.text);
        } else {
          // Jika tidak ada part yang spesifik, tampilkan di tengah
          setPopups(prev => ({
            ...prev,
            tower: { ...prev.tower, isOpen: true, text: response.text }
          }));
        }
        
        setVoiceStatus('');
      } catch (error) {
        console.error(error);
        setVoiceStatus('Gagal terhubung ke AI.');
        setTimeout(() => setVoiceStatus(''), 3000);
      }
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      setVoiceStatus('Gagal mendengarkan. Coba lagi.');
      setTimeout(() => setVoiceStatus(''), 3000);
    };

    recognition.onend = () => {
      if (isListening) setIsListening(false);
    };

    recognition.start();
  };

  // Live Calibration Tool
  const handleModelClick = (e) => {
    if (!isCalibrating || !modelRef.current) return;
    const viewer = modelRef.current;
    const rect = viewer.getBoundingClientRect();
    const hit = viewer.positionAndNormalFromPoint(e.clientX - rect.left, e.clientY - rect.top);
    if (hit) {
      const p = hit.position;
      const n = hit.normal;
      alert(`🎯 Koordinat Ditemukan!\nPosisi: data-position="${p.x.toFixed(3)}m ${p.y.toFixed(3)}m ${p.z.toFixed(3)}m"\nNormal: data-normal="${n.x.toFixed(3)}m ${n.y.toFixed(3)}m ${n.z.toFixed(3)}m"`);
    }
  };

  return (
    <div className="ar-fullscreen-container">
      {/* 1. Header & Calibration */}
      <div className="ar-overlay-header">
        <h1 className="ar-title">RekaFisika AR <span>World-Space OS</span></h1>
        <button 
          className={`btn-calibration ${isCalibrating ? 'active' : ''}`}
          onClick={() => setIsCalibrating(!isCalibrating)}
        >
          {isCalibrating ? '🛑 Tutup Kalibrasi' : '🛠️ Kalibrasi Posisi'}
        </button>
      </div>

      {isCalibrating && (
        <div className="calibration-banner">
          👇 Klik langsung pada model 3D untuk mendapatkan koordinat (X,Y,Z).
        </div>
      )}

      {/* Status Bar */}
      {voiceStatus && (
        <div className="voice-status-bar">
          {voiceStatus}
        </div>
      )}

      {/* 2. Full-Screen Model Viewer */}
      <model-viewer
        ref={modelRef}
        src="/turbin.glb"
        alt="Model 3D Turbin Angin"
        ar ar-modes="webxr scene-viewer quick-look"
        camera-controls auto-rotate autoplay
        shadow-intensity="2" shadow-softness="0.8" exposure="1.15" environment-image="neutral"
        camera-orbit={defaultOrbit} camera-target={defaultTarget}
        onClick={handleModelClick}
        style={{ width: "100%", height: "100%", backgroundColor: "#020617", outline: "none" }}
      >
        {/* ======== HOTSPOTS & WORLD-SPACE POPUPS ======== */}

        {/* --- ROTOR --- */}
        <button 
          slot="hotspot-rotor" data-position="0m 2.4m 0.4m" data-normal="0m 0m 1m" 
          className="hotspot-scifi"
          onClick={() => handleManualHotspotClick('rotor', 'Jelaskan tentang gaya aerodinamis dan energi kinetik pada baling-baling turbin ini.')}
        >
          <div className="hotspot-ring"></div>
          <div className="hotspot-dot"></div>
          <div className="hotspot-tag">Rotor</div>
        </button>

        {/* World-Space Popup for Rotor (Shifted slightly to the right) */}
        {popups.rotor.isOpen && (
          <div slot="hotspot-popup-rotor" data-position="0.8m 2.6m 0.4m" data-normal="0m 0m 1m" className="world-space-card">
            <div className="ws-card-header">
              <h3>⚡ {popups.rotor.title}</h3>
              <button onClick={resetView}>✕</button>
            </div>
            <div className="ws-card-body">{formatMarkdownToReact(popups.rotor.text)}</div>
            <div className="ws-card-formula">{popups.rotor.formula}</div>
          </div>
        )}

        {/* --- GENERATOR --- */}
        <button 
          slot="hotspot-generator" data-position="0m 2.4m -0.3m" data-normal="0m 1m 0m" 
          className="hotspot-scifi"
          onClick={() => handleManualHotspotClick('generator', 'Jelaskan hukum Faraday dan induksi elektromagnetik yang terjadi di dalam generator ini.')}
        >
          <div className="hotspot-ring"></div>
          <div className="hotspot-dot"></div>
          <div className="hotspot-tag">Generator</div>
        </button>

        {/* World-Space Popup for Generator */}
        {popups.generator.isOpen && (
          <div slot="hotspot-popup-generator" data-position="-0.7m 2.7m -0.3m" data-normal="0m 1m 0m" className="world-space-card">
            <div className="ws-card-header">
              <h3>⚡ {popups.generator.title}</h3>
              <button onClick={resetView}>✕</button>
            </div>
            <div className="ws-card-body">{formatMarkdownToReact(popups.generator.text)}</div>
            <div className="ws-card-formula">{popups.generator.formula}</div>
          </div>
        )}

        {/* --- TOWER --- */}
        <button 
          slot="hotspot-tower" data-position="0m 1.2m 0m" data-normal="1m 0m 0m" 
          className="hotspot-scifi"
          onClick={() => handleManualHotspotClick('tower', 'Jelaskan profil kecepatan angin logaritmik dan mengapa menara turbin harus tinggi.')}
        >
          <div className="hotspot-ring"></div>
          <div className="hotspot-dot"></div>
          <div className="hotspot-tag">Menara</div>
        </button>

        {/* World-Space Popup for Tower */}
        {popups.tower.isOpen && (
          <div slot="hotspot-popup-tower" data-position="1.0m 1.4m 0m" data-normal="1m 0m 0m" className="world-space-card">
            <div className="ws-card-header">
              <h3>⚡ {popups.tower.title}</h3>
              <button onClick={resetView}>✕</button>
            </div>
            <div className="ws-card-body">{formatMarkdownToReact(popups.tower.text)}</div>
            <div className="ws-card-formula">{popups.tower.formula}</div>
          </div>
        )}

        <button slot="ar-button" className="ar-button-native">
          🌐 Aktifkan AR (Kamera)
        </button>
      </model-viewer>

      {/* 3. Voice Assistant HUD Microphone */}
      <button 
        className={`voice-hud-btn ${isListening ? 'listening' : ''}`}
        onClick={startListening}
        title="Bicara dengan AI"
      >
        <div className="mic-icon">🎙️</div>
        {isListening && <div className="audio-wave-rings"></div>}
      </button>

    </div>
  );
};

export default ARViewer;
