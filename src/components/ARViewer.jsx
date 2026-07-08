import React, { useRef, useState, useEffect } from 'react';
import { tanyaAITutor } from '../services/aiService';

const ARViewer = () => {
  const modelRef = useRef(null);

  // States
  const [activePopup, setActivePopup] = useState({
    isOpen: false,
    title: '',
    partName: '',
    aiText: '',
    formula: '',
    loading: false
  });
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibratedHotspot, setCalibratedHotspot] = useState({
    position: '0m 2.4m 0.4m',
    normal: '0m 0m 1m'
  });

  // Default camera setting
  const defaultOrbit = "0deg 75deg 4m";
  const defaultTarget = "0m 1.5m 0m";

  // Formatter Markdown
  const formatAIResponse = (text) => {
    if (!text) return null;
    const paragraphs = text.split('\n').filter(p => p.trim() !== '');
    return paragraphs.map((paragraph, i) => {
      const parts = paragraph.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i} style={{ marginBottom: '0.5rem' }}>
          {parts.map((part, index) => {
            if (index % 2 !== 0) {
              return <strong key={index} style={{ color: '#34d399', fontWeight: '700' }}>{part}</strong>;
            }
            const cleanPart = part.replace(/\*/g, '');
            return <span key={index}>{cleanPart}</span>;
          })}
        </p>
      );
    });
  };

  // Interaction Logic
  const handleHotspotClick = async (partName, promptTrigger, target, orbit, formula) => {
    if (modelRef.current) {
      modelRef.current.cameraTarget = target;
      modelRef.current.cameraOrbit = orbit;
    }
    
    setActivePopup({
      isOpen: true,
      title: 'AI Scanner',
      partName,
      aiText: '',
      formula,
      loading: true
    });

    try {
      const response = await tanyaAITutor(promptTrigger);
      setActivePopup(prev => ({ ...prev, aiText: response.text, loading: false }));
    } catch (error) {
      setActivePopup(prev => ({ ...prev, aiText: 'Gagal menghubungi sistem AI.', loading: false }));
    }
  };

  const closeHUD = () => {
    setActivePopup({ isOpen: false, title: '', partName: '', aiText: '', formula: '', loading: false });
    if (modelRef.current) {
      modelRef.current.cameraTarget = defaultTarget;
      modelRef.current.cameraOrbit = defaultOrbit;
    }
  };

  // Calibration Tool
  const handleModelClick = (e) => {
    if (!isCalibrating || !modelRef.current) return;
    const viewer = modelRef.current;
    
    // Model-viewer provides positionAndNormalFromPoint
    // We pass the screen coordinates directly
    const rect = viewer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hit = viewer.positionAndNormalFromPoint(x, y);

    if (hit) {
      setCalibratedHotspot({
        position: `${hit.position.x.toFixed(3)}m ${hit.position.y.toFixed(3)}m ${hit.position.z.toFixed(3)}m`,
        normal: `${hit.normal.x.toFixed(3)}m ${hit.normal.y.toFixed(3)}m ${hit.normal.z.toFixed(3)}m`
      });
    }
  };

  return (
    <div className="ar-card">
      <div className="ar-header">
        <div className="ar-header-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Laboratorium Fisika Turbin Angin</h2>
            <p className="ar-badge-focus">🎯 Ultra-Realistic 3D & AI HUD</p>
          </div>
          <button 
            className={`btn-calibration ${isCalibrating ? 'active' : ''}`}
            onClick={() => setIsCalibrating(!isCalibrating)}
          >
            {isCalibrating ? '🛑 Tutup Kalibrasi' : '🛠️ Mode Kalibrasi'}
          </button>
        </div>
      </div>
      
      <div className="ar-model-container">
        <model-viewer
          ref={modelRef}
          src="/turbin.glb"
          alt="Model 3D Turbin Angin Energi Terbarukan"
          ar
          ar-modes="webxr scene-viewer quick-look"
          camera-controls
          auto-rotate
          autoplay
          shadow-intensity="2"
          shadow-softness="0.8"
          exposure="1.15"
          environment-image="neutral"
          tone-mapping="neutral"
          camera-orbit={defaultOrbit}
          camera-target={defaultTarget}
          onClick={handleModelClick}
          style={{ 
            width: "100%", 
            height: "600px", 
            minHeight: "70vh", 
            backgroundColor: "#0b0f19", 
            borderRadius: "0 0 20px 20px", 
            position: "relative", 
            overflow: "hidden",
            boxShadow: "inset 0 20px 50px rgba(0,0,0,0.5)"
          }}
        >
          {/* Fallback Astronaut if turbin is missing */}
          
          {/* Holographic AI HUD Popup (Inside AR Canvas) */}
          {activePopup.isOpen && (
            <div className="ar-ai-popup">
              <div className="hud-popup-header">
                <h3>{activePopup.title}: {activePopup.partName}</h3>
                <button className="hud-close-btn" onClick={closeHUD}>❌</button>
              </div>
              <div className="hud-popup-body">
                {activePopup.loading ? (
                  <div className="hud-loading-state">
                    <div className="radar-spinner"></div>
                    <p>🧠 Gemini AI sedang memindai fisika pada {activePopup.partName}...</p>
                  </div>
                ) : (
                  <div className="hud-content">
                    <div className="ai-text-box">
                      {formatAIResponse(activePopup.aiText)}
                    </div>
                    {activePopup.formula && (
                      <div className="formula-box">
                        <span className="formula-label">Rumus Matematis:</span>
                        <code className="formula-code">{activePopup.formula}</code>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Calibration Overlay Tracker */}
          {isCalibrating && (
            <div className="calibration-tracker">
              <p className="pulse-text">Klik di sembarang permukaan model 3D untuk memindahkan posisi Hotspot 1 (Kalibrasi) secara tepat!</p>
              <div className="coord-box">
                <strong>Position:</strong> {calibratedHotspot.position} <br/>
                <strong>Normal:</strong> {calibratedHotspot.normal}
              </div>
            </div>
          )}

          {/* Sci-Fi Hotspot 1: Rotor */}
          <button 
            slot="hotspot-rotor" 
            data-position={isCalibrating ? calibratedHotspot.position : "0m 2.4m 0.4m"} 
            data-normal={isCalibrating ? calibratedHotspot.normal : "0m 0m 1m"} 
            className="hotspot-btn"
            onClick={() => handleHotspotClick(
              'Rotor (Baling-baling)', 
              'Siswa baru saja mengklik bagian ROTOR (Baling-baling) turbin angin di layar AR. Jelaskan konsep aerodinamika dan rumus energi kinetik angin E_k = 0.5 * m * v^2 yang memutar baling-baling ini secara singkat, terstruktur, dan mudah dipahami!',
              '0m 2.4m 0m',
              '20deg 75deg 3m',
              'E_k = ½ m v²'
            )}
          >
            <div className="hotspot-core"></div>
            <div className="hotspot-leader-line">
              <div className="hotspot-label">Rotor <span>[Kalibrasi]</span></div>
            </div>
          </button>

          {/* Sci-Fi Hotspot 2: Generator */}
          <button 
            slot="hotspot-generator" 
            data-position="0m 2.4m -0.3m" 
            data-normal="0m 1m 0m" 
            className="hotspot-btn"
            onClick={() => handleHotspotClick(
              'Generator (Nacelle)', 
              'Siswa baru saja mengklik bagian GENERATOR (Nacelle) turbin angin di layar AR. Jelaskan tentang induksi elektromagnetik hukum Faraday yang terjadi di dalam generator ini untuk mengubah energi mekanik menjadi listrik murni. Jelaskan secara singkat dan menarik!',
              '0m 2.4m 0m',
              '-150deg 60deg 2.5m',
              'Ɛ = -N (dΦ / dt)'
            )}
          >
            <div className="hotspot-core"></div>
            <div className="hotspot-leader-line">
              <div className="hotspot-label">Generator</div>
            </div>
          </button>

          {/* Sci-Fi Hotspot 3: Tower */}
          <button 
            slot="hotspot-tower" 
            data-position="0m 1.2m 0m" 
            data-normal="1m 0m 0m" 
            className="hotspot-btn"
            onClick={() => handleHotspotClick(
              'Menara Penopang', 
              'Siswa baru saja mengklik bagian MENARA PENOPANG turbin angin di layar AR. Jelaskan secara singkat mengapa menara turbin angin dibangun sangat tinggi menggunakan prinsip mekanika fluida udara (profil kecepatan angin terhadap ketinggian).',
              '0m 1.2m 0m',
              '45deg 85deg 4m',
              'v(h) = v_ref * (h / h_ref)^α'
            )}
          >
            <div className="hotspot-core"></div>
            <div className="hotspot-leader-line">
              <div className="hotspot-label">Menara</div>
            </div>
          </button>

          <button slot="ar-button" className="ar-button" style={{
            backgroundColor: '#10b981', color: 'white', borderRadius: '9999px', border: 'none', position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', padding: '12px 24px', fontWeight: '600', cursor: 'pointer', zIndex: 100, boxShadow: '0 4px 15px rgba(16,185,129,0.4)'
          }}>
            🌐 Lihat di Ruanganmu (WebAR)
          </button>
        </model-viewer>
      </div>
    </div>
  );
};

export default ARViewer;
