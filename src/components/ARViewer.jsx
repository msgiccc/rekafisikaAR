import React, { useRef, useState } from 'react';
import { tanyaAITutorVoice, formatMarkdownToReact, speakText } from '../services/aiService';

const ARViewer = () => {
  const modelRef = useRef(null);

  // Default Koordinat Hotspots
  const [hotspotPositions, setHotspotPositions] = useState({
    rotor: { pos: "0m 5.5m 0.5m", norm: "0m 0m 1m" },
    generator: { pos: "0m 5.5m -0.3m", norm: "0m 1m 0m" },
    tower: { pos: "0m 5.2m 0m", norm: "1m 0m 0m" }
  });

  // True World-Space Holographic Pop-Up State (Single Dynamic Slot)
  const [activePopup, setActivePopup] = useState({
    isOpen: false,
    title: '',
    text: '',
    formula: '',
    position: '0m 0m 0m',
    normal: '0m 1m 0m'
  });

  // UI States
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const defaultOrbit = "0deg 75deg 3.5m";
  const defaultTarget = "0m 1.5m 0m";

  const partDetails = {
    rotor: { title: 'Rotor', formula: 'E_k = ½ m v²', camTarget: '0m 2.5m 0m', camOrbit: '20deg 75deg 2.5m' },
    generator: { title: 'Generator', formula: 'Ɛ = -N (dΦ / dt)', camTarget: '0m 2.5m 0m', camOrbit: '-150deg 60deg 2.5m' },
    tower: { title: 'Menara', formula: 'v(h) = v_ref * (h / h_ref)^α', camTarget: '0m 1.2m 0m', camOrbit: '45deg 85deg 3.5m' }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const resetView = () => {
    setActivePopup(prev => ({ ...prev, isOpen: false }));
    if (modelRef.current) {
      modelRef.current.cameraTarget = defaultTarget;
      modelRef.current.cameraOrbit = defaultOrbit;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  };

  const activatePart = (partKey, aiText) => {
    const details = partDetails[partKey];
    if (modelRef.current && details) {
      modelRef.current.cameraTarget = details.camTarget;
      modelRef.current.cameraOrbit = details.camOrbit;
    }

    if (details) {
      // Calculate dynamic position (shift X by 0.7m so it doesn't block the model)
      const basePos = hotspotPositions[partKey].pos;
      const parts = basePos.replace(/m/g, '').split(' ').map(parseFloat);
      let shiftedPos = basePos;
      
      if (parts.length === 3) {
        // Shift X depending on component to look best
        const shiftX = partKey === 'generator' ? -0.8 : 0.8;
        shiftedPos = `${(parts[0] + shiftX).toFixed(3)}m ${(parts[1] + 0.2).toFixed(3)}m ${(parts[2]).toFixed(3)}m`;
      }

      setActivePopup({
        isOpen: true,
        title: details.title,
        text: aiText,
        formula: details.formula,
        position: shiftedPos,
        normal: hotspotPositions[partKey].norm
      });
    }
  };

  const handleManualHotspotClick = async (partKey, triggerText) => {
    resetView();
    setVoiceStatus(`AI memindai ${partDetails[partKey].title}...`);
    activatePart(partKey, "⚡ Mengambil data fisika dari satelit AI...");

    try {
      const response = await tanyaAITutorVoice(triggerText);
      activatePart(partKey, response.text);
      speakText(response.text);
      setVoiceStatus('');
    } catch (error) {
      activatePart(partKey, "Koneksi ke AI terputus. Silakan coba lagi.");
      setVoiceStatus('');
    }
  };

  // Voice AI Co-Pilot Logic
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser Anda tidak mendukung Voice API. Silakan gunakan tombol klik.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    
    recognition.onstart = () => {
      resetView();
      setIsListening(true);
      setVoiceStatus('🎙️ Mendengarkan...');
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      setVoiceStatus('🧠 Memproses gelombang suara...');
      
      try {
        const response = await tanyaAITutorVoice(transcript);
        speakText(response.text);
        
        if (response.targetPart) {
          activatePart(response.targetPart, response.text);
        } else {
          // Default to tower if no specific part detected
          activatePart('tower', response.text);
        }
        setVoiceStatus('');
      } catch (error) {
        setVoiceStatus('Gagal terhubung ke AI.');
        setTimeout(() => setVoiceStatus(''), 3000);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setVoiceStatus('Suara tidak terdengar. Coba lagi.');
      setTimeout(() => setVoiceStatus(''), 3000);
    };

    recognition.onend = () => {
      if (isListening) setIsListening(false);
    };

    recognition.start();
  };

  // Live Instant-Jump Calibration
  const handleModelClick = (e) => {
    if (!isCalibrating || !modelRef.current) return;
    const viewer = modelRef.current;
    const rect = viewer.getBoundingClientRect();
    const hit = viewer.positionAndNormalFromPoint(e.clientX - rect.left, e.clientY - rect.top);
    
    if (hit) {
      const posStr = `${hit.position.x.toFixed(3)}m ${hit.position.y.toFixed(3)}m ${hit.position.z.toFixed(3)}m`;
      const normStr = `${hit.normal.x.toFixed(3)}m ${hit.normal.y.toFixed(3)}m ${hit.normal.z.toFixed(3)}m`;
      
      // Auto Jump! (Updating Rotor as primary test)
      setHotspotPositions(prev => ({
        ...prev,
        rotor: { pos: posStr, norm: normStr } 
      }));
      
      // Auto Copy
      navigator.clipboard.writeText(`data-position="${posStr}" data-normal="${normStr}"`);
      showToast("✅ Koordinat 100% pas disalin ke Clipboard! (Titik Rotor digeser sementara)");
    }
  };

  return (
    <div className="ar-fullscreen-container">
      {/* 1. Header Web Overlay */}
      <div className="ar-overlay-header">
        <h1 className="ar-title">RekaFisika AR <span>Mobile WebXR Edition</span></h1>
        <button 
          className={`btn-calibration ${isCalibrating ? 'active' : ''}`}
          onClick={() => setIsCalibrating(!isCalibrating)}
        >
          {isCalibrating ? '🛑 Tutup Kalibrasi' : '🛠️ Kalibrasi Posisi'}
        </button>
      </div>

      {isCalibrating && (
        <div className="calibration-banner">
          👇 Klik di sembarang permukaan model 3D. Hotspot Rotor akan LANGSUNG MELOMPAT ke titik tersebut & koordinat otomatis tersalin!
        </div>
      )}

      {toastMsg && (
        <div className="toast-notification">
          {toastMsg}
        </div>
      )}

      {voiceStatus && (
        <div className="voice-status-bar">
          {voiceStatus}
        </div>
      )}

      {/* 2. Full-Screen WebXR DOM Overlay */}
      <model-viewer
        ref={modelRef}
        src="/turbin.glb"
        alt="Model 3D Turbin Angin"
        ar ar-modes="webxr scene-viewer quick-look" ar-scale="auto"
        camera-controls auto-rotate autoplay
        shadow-intensity="2" shadow-softness="0.8" exposure="1.15" environment-image="neutral"
        camera-orbit={defaultOrbit} camera-target={defaultTarget}
        onClick={handleModelClick}
        style={{ width: "100%", height: "100dvh", backgroundColor: "#090d16", position: "relative", outline: "none" }}
      >
        {/* SEMUA ELEMEN INI SEKARANG BERADA DI DALAM KAMERA AR HP! */}

        {/* --- ROTOR --- */}
        <button 
          slot="hotspot-rotor" data-position={hotspotPositions.rotor.pos} data-normal={hotspotPositions.rotor.norm} 
          className="hotspot-scifi"
          onClick={() => handleManualHotspotClick('rotor', 'Jelaskan tentang aerodinamika baling-baling dan gaya angkat turbin ini.')}
        >
          <div className="hotspot-ring"></div>
          <div className="hotspot-dot"></div>
        </button>

        {/* --- GENERATOR --- */}
        <button 
          slot="hotspot-generator" data-position={hotspotPositions.generator.pos} data-normal={hotspotPositions.generator.norm} 
          className="hotspot-scifi"
          onClick={() => handleManualHotspotClick('generator', 'Jelaskan induksi elektromagnetik hukum Faraday di dalam generator ini.')}
        >
          <div className="hotspot-ring"></div>
          <div className="hotspot-dot"></div>
        </button>

        {/* --- TOWER --- */}
        <button 
          slot="hotspot-tower" data-position={hotspotPositions.tower.pos} data-normal={hotspotPositions.tower.norm} 
          className="hotspot-scifi"
          onClick={() => handleManualHotspotClick('tower', 'Jelaskan alasan mengapa menara harus tinggi dengan profil kecepatan angin fluida.')}
        >
          <div className="hotspot-ring"></div>
          <div className="hotspot-dot"></div>
        </button>

        {/* --- TRUE WORLD-SPACE HOLOGRAPHIC POPUP (SINGLE DYNAMIC SLOT) --- */}
        {activePopup.isOpen && (
          <div 
            slot="hotspot-popup-ai" 
            data-position={activePopup.position} 
            data-normal={activePopup.normal} 
            className="in-ar-hologram-card"
          >
            <div className="ws-card-header">
              <h3>⚡ {activePopup.title}</h3>
              <button onClick={(e) => { e.stopPropagation(); resetView(); }}>✕</button>
            </div>
            <div className="ws-card-body">{formatMarkdownToReact(activePopup.text)}</div>
            <div className="ws-card-formula">{activePopup.formula}</div>
          </div>
        )}

        {/* --- VOICE AI CO-PILOT HUD --- */}
        <div className="voice-hud-container">
          <button 
            className={`voice-hud-btn ${isListening ? 'listening' : ''}`}
            onClick={(e) => { e.stopPropagation(); startListening(); }}
            title="🎙️ Tanya AI (Voice)"
          >
            <div className="mic-icon">🎙️</div>
            {isListening && <div className="audio-wave-rings"></div>}
          </button>
        </div>
      </model-viewer>
    </div>
  );
};

export default ARViewer;
