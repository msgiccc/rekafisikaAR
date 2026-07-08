import React, { useRef, useState } from 'react';
import { tanyaAITutor, formatMarkdownToReact } from '../services/aiService';

const ARViewer = () => {
  const modelRef = useRef(null);

  // States
  const [activePopup, setActivePopup] = useState({
    isOpen: false,
    partName: '',
    aiText: '',
    formula: '',
    loading: false
  });
  const [isCalibrating, setIsCalibrating] = useState(false);

  // Default camera
  const defaultOrbit = "0deg 75deg 3m";
  const defaultTarget = "0m 1.5m 0m";

  // Hotspot Click Handler
  const handleHotspotClick = async (partName, promptTrigger, target, orbit, formula) => {
    if (modelRef.current) {
      modelRef.current.cameraTarget = target;
      modelRef.current.cameraOrbit = orbit;
    }
    
    setActivePopup({
      isOpen: true,
      partName,
      aiText: '',
      formula,
      loading: true
    });

    try {
      const response = await tanyaAITutor(promptTrigger);
      setActivePopup(prev => ({ ...prev, aiText: response.text, loading: false }));
    } catch (error) {
      setActivePopup(prev => ({ ...prev, aiText: 'Gagal menghubungi server AI.', loading: false }));
    }
  };

  const closeHUD = () => {
    setActivePopup({ isOpen: false, partName: '', aiText: '', formula: '', loading: false });
    if (modelRef.current) {
      modelRef.current.cameraTarget = defaultTarget;
      modelRef.current.cameraOrbit = defaultOrbit;
    }
  };

  // Live Calibration Tool
  const handleModelClick = (e) => {
    if (!isCalibrating || !modelRef.current) return;
    const viewer = modelRef.current;
    const rect = viewer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // API WebXR model-viewer
    const hit = viewer.positionAndNormalFromPoint(x, y);

    if (hit) {
      const posX = hit.position.x.toFixed(3);
      const posY = hit.position.y.toFixed(3);
      const posZ = hit.position.z.toFixed(3);
      const normX = hit.normal.x.toFixed(3);
      const normY = hit.normal.y.toFixed(3);
      const normZ = hit.normal.z.toFixed(3);
      
      const positionStr = `${posX}m ${posY}m ${posZ}m`;
      const normalStr = `${normX}m ${normY}m ${normZ}m`;
      
      alert(`🎯 Koordinat Hotspot Ditemukan!\n\nPosisi:\ndata-position="${positionStr}"\n\nNormal:\ndata-normal="${normalStr}"\n\nSilakan salin koordinat ini ke kode Anda.`);
    }
  };

  return (
    <div className="ar-card">
      <div className="ar-header">
        <div className="ar-header-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Laboratorium Fisika 3D</h2>
            <p className="ar-badge-focus">🎯 Ultra-Realistic Render</p>
          </div>
          <button 
            className={`btn-calibration ${isCalibrating ? 'active' : ''}`}
            onClick={() => setIsCalibrating(!isCalibrating)}
          >
            {isCalibrating ? '🛑 Tutup Kalibrasi' : '🛠️ Mode Kalibrasi Posisi'}
          </button>
        </div>
      </div>
      
      <div className="ar-model-container">
        {/* Banner Kalibrasi */}
        {isCalibrating && (
          <div className="calibration-banner">
            👇 Klik langsung tepat di atas permukaan komponen model 3D untuk mendapatkan koordinat posisi yang 100% pas!
          </div>
        )}

        {/* 1. Ultra-Realistic 3D Setup */}
        <model-viewer
          ref={modelRef}
          src="/turbin.glb"
          alt="Model 3D Turbin Angin Energi Terbarukan"
          ar
          ar-modes="webxr scene-viewer quick-look"
          camera-controls
          auto-rotate
          rotation-per-second="15deg"
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
            border: "1px solid rgba(255,255,255,0.15)", 
            boxShadow: "0 20px 50px rgba(0,0,0,0.5)" 
          }}
        >
          {/* Fallback Astronaut jika file turbin.glb belum ada: src="https://modelviewer.dev/shared-assets/models/Astronaut.glb" */}
          
          {/* 2. In-AR Holographic AI Pop-Up Card */}
          {activePopup.isOpen && (
            <div className="ar-ai-popup">
              <div className="popup-header">
                <h3>🔍 AI Scanner: {activePopup.partName}</h3>
                <button className="popup-close-btn" onClick={closeHUD}>✕ Tutup HUD</button>
              </div>
              
              <div className="popup-body">
                {activePopup.loading ? (
                  <div className="popup-loading">
                    <div className="spinner-ring"></div>
                    <p>⚡ RekaFisika AI sedang memindai fisika pada {activePopup.partName}...</p>
                  </div>
                ) : (
                  <div className="popup-content">
                    <div className="popup-text">
                      {formatMarkdownToReact(activePopup.aiText)}
                    </div>
                    {activePopup.formula && (
                      <div className="popup-formula">
                        <span className="formula-label">Rumus Matematis Terkait:</span>
                        <code>{activePopup.formula}</code>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sci-Fi Hotspot 1: Rotor */}
          <button 
            slot="hotspot-rotor" 
            data-position="0m 2.4m 0.4m" 
            data-normal="0m 0m 1m" 
            className="hotspot-scifi"
            onClick={() => handleHotspotClick(
              'Rotor (Baling-baling)', 
              'Jelaskan konsep aerodinamika (gaya angkat) dan rumus energi kinetik angin E_k = 0.5 * m * v^2 yang memutar baling-baling turbin angin.',
              '0m 2.4m 0m',
              '20deg 75deg 3m',
              'E_k = ½ m v²'
            )}
          >
            <div className="hotspot-ring"></div>
            <div className="hotspot-dot"></div>
            <div className="hotspot-tag">Rotor <span>[Klik]</span></div>
          </button>

          {/* Sci-Fi Hotspot 2: Generator */}
          <button 
            slot="hotspot-generator" 
            data-position="0m 2.4m -0.3m" 
            data-normal="0m 1m 0m" 
            className="hotspot-scifi"
            onClick={() => handleHotspotClick(
              'Generator (Nacelle)', 
              'Jelaskan tentang induksi elektromagnetik hukum Faraday di dalam generator turbin angin untuk mengubah putaran mekanik menjadi listrik murni.',
              '0m 2.4m 0m',
              '-150deg 60deg 2.5m',
              'Ɛ = -N (dΦ / dt)'
            )}
          >
            <div className="hotspot-ring"></div>
            <div className="hotspot-dot"></div>
            <div className="hotspot-tag">Generator <span>[Klik]</span></div>
          </button>

          {/* Sci-Fi Hotspot 3: Tower */}
          <button 
            slot="hotspot-tower" 
            data-position="0m 1.2m 0m" 
            data-normal="1m 0m 0m" 
            className="hotspot-scifi"
            onClick={() => handleHotspotClick(
              'Menara Penopang', 
              'Jelaskan mengapa desain menara turbin angin harus sangat tinggi menggunakan prinsip mekanika fluida udara (profil kecepatan angin terhadap ketinggian).',
              '0m 1.2m 0m',
              '45deg 85deg 4m',
              'v(h) = v_ref * (h / h_ref)^α'
            )}
          >
            <div className="hotspot-ring"></div>
            <div className="hotspot-dot"></div>
            <div className="hotspot-tag">Menara <span>[Klik]</span></div>
          </button>

          {/* Tombol WebAR Asli Google */}
          <button slot="ar-button" className="ar-button" style={{
            backgroundColor: '#10b981', color: '#fff', borderRadius: '9999px', border: 'none', position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', padding: '12px 24px', fontWeight: 'bold', cursor: 'pointer', zIndex: 10, boxShadow: '0 4px 15px rgba(16,185,129,0.4)'
          }}>
            🌐 Lihat di Ruanganmu (WebAR)
          </button>
        </model-viewer>
      </div>
    </div>
  );
};

export default ARViewer;
