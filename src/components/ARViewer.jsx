import React, { useRef, useState } from 'react';
import { tanyaAITutorVoice, formatMarkdownToReact, speakText } from '../services/aiService';

const ARViewer = () => {
  const modelRef = useRef(null);

  // Default Koordinat Hotspots
  const [hotspotPositions, setHotspotPositions] = useState({
    rotor: { pos: "0m 2.4m 0.4m", norm: "0m 0m 1m" },
    generator: { pos: "0m 2.4m -0.3m", norm: "0m 1m 0m" },
    tower: { pos: "0m 1.2m 0m", norm: "1m 0m 0m" }
  });

  // Popups State (True In-AR World-Space Holograms)
  const [popups, setPopups] = useState({
    rotor: { isOpen: false, text: '', formula: 'E_k = ½ m v²', title: 'Rotor' },
    generator: { isOpen: false, text: '', formula: 'Ɛ = -N (dΦ / dt)', title: 'Generator' },
    tower: { isOpen: false, text: '', formula: 'v(h) = v_ref * (h / h_ref)^α', title: 'Menara' }
  });

  // UI States
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const defaultOrbit = "0deg 75deg 3.5m";
  const defaultTarget = "0m 1.5m 0m";

  // Coordinates data for Camera Zoom
  const cameraData = {
    rotor: { target: '0m 2.4m 0m', orbit: '20deg 75deg 2.5m' },
    generator: { target: '0m 2.4m 0m', orbit: '-150deg 60deg 2.5m' },
    tower: { target: '0m 1.2m 0m', orbit: '45deg 85deg 3.5m' }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const resetView = () => {
    setPopups({
      rotor: { ...popups.rotor, isOpen: false },
      generator: { ...popups.generator, isOpen: false },
      tower: { ...popups.tower, isOpen: false }
    });
    if (modelRef.current) {
      modelRef.current.cameraTarget = defaultTarget;
      modelRef.current.cameraOrbit = defaultOrbit;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  };

  const activatePart = (partName, aiText) => {
    const cam = cameraData[partName];
    if (modelRef.current && cam) {
      modelRef.current.cameraTarget = cam.target;
      modelRef.current.cameraOrbit = cam.orbit;
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

  const handleManualHotspotClick = async (partName, triggerText) => {
    resetView();
    setVoiceStatus(`AI memindai ${partName}...`);
    activatePart(partName, "⚡ Mengambil data fisika dari satelit AI...");

    try {
      const response = await tanyaAITutorVoice(triggerText);
      activatePart(partName, response.text);
      speakText(response.text);
      setVoiceStatus('');
    } catch (error) {
      activatePart(partName, "Koneksi ke AI terputus. Silakan coba lagi.");
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
      setVoiceStatus('🎙️ Mendengarkan suara Anda...');
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
          setPopups(prev => ({
            ...prev,
            tower: { ...prev.tower, isOpen: true, text: response.text }
          }));
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

  // Solusi Hotspot Meleset: Live Instant-Jump Calibration
  const handleModelClick = (e) => {
    if (!isCalibrating || !modelRef.current) return;
    const viewer = modelRef.current;
    const rect = viewer.getBoundingClientRect();
    const hit = viewer.positionAndNormalFromPoint(e.clientX - rect.left, e.clientY - rect.top);
    
    if (hit) {
      const posStr = `${hit.position.x.toFixed(3)}m ${hit.position.y.toFixed(3)}m ${hit.position.z.toFixed(3)}m`;
      const normStr = `${hit.normal.x.toFixed(3)}m ${hit.normal.y.toFixed(3)}m ${hit.normal.z.toFixed(3)}m`;
      
      // Instant Jump logic: langsung geser titik Rotor ke posisi klik!
      setHotspotPositions(prev => ({
        ...prev,
        rotor: { pos: posStr, norm: normStr } // Menggeser hotspot Rotor sebagai contoh utama kalibrasi
      }));
      
      // Auto-Clipboard Copy
      navigator.clipboard.writeText(`data-position="${posStr}" data-normal="${normStr}"`);
      showToast("✅ Koordinat 100% pas berhasil disalin ke Clipboard! (Titik Rotor digeser sementara)");
    }
  };

  // Fungsi utilitas untuk menghitung posisi World-Space Pop-up agar melayang di samping Hotspot
  // Kita meniru logika posisi dengan menambah sedikit sumbu X dan Y dari koordinat hotspot
  const getOffsetPosition = (posStr, offsetX, offsetY, offsetZ) => {
    if (!posStr) return "0m 0m 0m";
    const parts = posStr.replace(/m/g, '').split(' ').map(parseFloat);
    if (parts.length === 3) {
      return `${(parts[0] + offsetX).toFixed(3)}m ${(parts[1] + offsetY).toFixed(3)}m ${(parts[2] + offsetZ).toFixed(3)}m`;
    }
    return posStr;
  };

  return (
    <div className="ar-fullscreen-container">
      {/* 1. Header (TIDAK MASUK KAMERA AR, hanya di mode web) */}
      <div className="ar-overlay-header">
        <h1 className="ar-title">RekaFisika AR <span>WebXR Edition</span></h1>
        <button 
          className={`btn-calibration ${isCalibrating ? 'active' : ''}`}
          onClick={() => setIsCalibrating(!isCalibrating)}
        >
          {isCalibrating ? '🛑 Tutup Kalibrasi' : '🛠️ Mode Kalibrasi Posisi'}
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
        style={{ width: "100%", height: "85vh", minHeight: "550px", backgroundColor: "#090d16", borderRadius: "20px", position: "relative", overflow: "hidden" }}
      >
        {/* SELURUH ELEMEN INTERAKTIF WAJIB MENJADI CHILD <model-viewer> (WebXR DOM Overlay) */}

        {/* --- ROTOR --- */}
        <button 
          slot="hotspot-rotor" data-position={hotspotPositions.rotor.pos} data-normal={hotspotPositions.rotor.norm} 
          className="hotspot-scifi"
          onClick={() => handleManualHotspotClick('rotor', 'Jelaskan tentang aerodinamika baling-baling dan gaya angkat turbin ini.')}
        >
          <div className="hotspot-ring"></div>
          <div className="hotspot-dot"></div>
        </button>

        {/* True World-Space Hologram Popup (Rotor) - Melayang 0.8m di sebelah kanan rotor */}
        {popups.rotor.isOpen && (
          <div 
            slot="hotspot-popup-rotor" 
            data-position={getOffsetPosition(hotspotPositions.rotor.pos, 0.8, 0.2, 0)} 
            data-normal={hotspotPositions.rotor.norm} 
            className="in-ar-hologram-card"
          >
            <div className="ws-card-header">
              <h3>⚡ {popups.rotor.title}</h3>
              <button onClick={(e) => { e.stopPropagation(); resetView(); }}>✕</button>
            </div>
            <div className="ws-card-body">{formatMarkdownToReact(popups.rotor.text)}</div>
            <div className="ws-card-formula">{popups.rotor.formula}</div>
          </div>
        )}

        {/* --- GENERATOR --- */}
        <button 
          slot="hotspot-generator" data-position={hotspotPositions.generator.pos} data-normal={hotspotPositions.generator.norm} 
          className="hotspot-scifi"
          onClick={() => handleManualHotspotClick('generator', 'Jelaskan induksi elektromagnetik hukum Faraday di dalam generator ini.')}
        >
          <div className="hotspot-ring"></div>
          <div className="hotspot-dot"></div>
        </button>

        {popups.generator.isOpen && (
          <div 
            slot="hotspot-popup-generator" 
            data-position={getOffsetPosition(hotspotPositions.generator.pos, -0.8, 0.3, 0)} 
            data-normal={hotspotPositions.generator.norm} 
            className="in-ar-hologram-card"
          >
            <div className="ws-card-header">
              <h3>⚡ {popups.generator.title}</h3>
              <button onClick={(e) => { e.stopPropagation(); resetView(); }}>✕</button>
            </div>
            <div className="ws-card-body">{formatMarkdownToReact(popups.generator.text)}</div>
            <div className="ws-card-formula">{popups.generator.formula}</div>
          </div>
        )}

        {/* --- TOWER --- */}
        <button 
          slot="hotspot-tower" data-position={hotspotPositions.tower.pos} data-normal={hotspotPositions.tower.norm} 
          className="hotspot-scifi"
          onClick={() => handleManualHotspotClick('tower', 'Jelaskan alasan mengapa menara harus tinggi dengan profil kecepatan angin fluida.')}
        >
          <div className="hotspot-ring"></div>
          <div className="hotspot-dot"></div>
        </button>

        {popups.tower.isOpen && (
          <div 
            slot="hotspot-popup-tower" 
            data-position={getOffsetPosition(hotspotPositions.tower.pos, 1.0, 0.2, 0)} 
            data-normal={hotspotPositions.tower.norm} 
            className="in-ar-hologram-card"
          >
            <div className="ws-card-header">
              <h3>⚡ {popups.tower.title}</h3>
              <button onClick={(e) => { e.stopPropagation(); resetView(); }}>✕</button>
            </div>
            <div className="ws-card-body">{formatMarkdownToReact(popups.tower.text)}</div>
            <div className="ws-card-formula">{popups.tower.formula}</div>
          </div>
        )}

        {/* --- VOICE AI CO-PILOT HUD (DOM OVERLAY) --- */}
        <div className="voice-hud-container" slot="interaction-prompt">
          <button 
            className={`voice-hud-btn ${isListening ? 'listening' : ''}`}
            onClick={(e) => { e.stopPropagation(); startListening(); }}
            title="🎙️ RekaFisika Voice Co-Pilot"
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
