import React, { useEffect, useRef, useState } from 'react';

const ARViewer = ({ 
  cameraTarget, 
  onHotspotClick, 
  aiHudContent, 
  isAiThinking,
  windSpeed,
  setWindSpeed,
  xRayMode,
  toggleXRay,
  gamificationActive,
  startGamification,
  score,
  missionFeedback
}) => {
  const modelRef = useRef(null);
  const [showHud, setShowHud] = useState(true);
  const [activeComponent, setActiveComponent] = useState('Semua');

  // Kalkulasi Daya Listrik Real-Time (kW)
  // Rumus: P = 0.5 * rho * A * v^3
  const powerOutput = (0.5 * 1.225 * 50 * Math.pow(windSpeed, 3) / 1000).toFixed(2);

  // Pengaturan Kecepatan Animasi Model 3D
  const timeScale = windSpeed / 10;

  // AR to AI: Effect saat prop cameraTarget berubah
  useEffect(() => {
    if (modelRef.current && cameraTarget) {
      let targetPos = "0m 1.5m 0m";
      let orbit = "0deg 75deg 4m (default)";
      
      const targetLower = cameraTarget.toLowerCase();
      if (targetLower.includes('baling') || targetLower.includes('rotor')) {
        targetPos = "0m 2.5m 0m";
        orbit = "20deg 75deg 3m";
        setActiveComponent('Rotor');
      } else if (targetLower.includes('generator') || targetLower.includes('nacelle')) {
        targetPos = "0m 2.5m 0m";
        orbit = "-150deg 60deg 2.5m";
        setActiveComponent('Generator');
      } else if (targetLower.includes('menara') || targetLower.includes('tower')) {
        targetPos = "0m 1m 0m";
        orbit = "45deg 85deg 4m";
        setActiveComponent('Menara');
      } else if (targetLower.includes('gearbox')) {
        targetPos = "0m 2.5m 0m";
        orbit = "90deg 75deg 2m";
        setActiveComponent('Gearbox (Internal)');
      } else if (targetLower.includes('poros')) {
        targetPos = "0m 2.5m 0m";
        orbit = "45deg 75deg 2m";
        setActiveComponent('Poros (Internal)');
      } else {
        setActiveComponent('Semua');
      }

      modelRef.current.cameraTarget = targetPos;
      modelRef.current.cameraOrbit = orbit;
    }
  }, [cameraTarget]);

  return (
    <div className="ar-card">
      <div className="ar-https-banner">
        💡 Info Demo HP: Agar fitur kamera WebAR aktif, pastikan link dibuka via HTTPS (Vercel/Netlify).
      </div>
      <div className="ar-header">
        <div className="ar-header-top">
          <div>
            <h2>Laboratorium Fisika Turbin Angin</h2>
            <p className="ar-badge-focus">🎯 Fokus Kamera: {activeComponent}</p>
          </div>
          <div className="ar-header-actions">
            {!gamificationActive && (
              <button className="btn-gamify" onClick={startGamification}>
                🎮 Mulai Misi AI
              </button>
            )}
            <button className="btn-xray" onClick={toggleXRay}>
              {xRayMode ? '🔬 Matikan X-Ray' : '🔬 Mode X-Ray'}
            </button>
            <button className="btn-toggle-hud" onClick={() => setShowHud(!showHud)}>
              {showHud ? '👁️' : '👁️'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="ar-model-container">
        {/* Model Utama */}
        <model-viewer
          ref={modelRef}
          src="/turbin.glb"
          alt="Model 3D Turbin Angin Energi Terbarukan"
          scale="1 1 1"
          bounds="tight"
          auto-rotate
          camera-controls
          ar
          ar-modes="webxr scene-viewer quick-look"
          shadow-intensity="1"
          interaction-prompt="auto"
          time-scale={timeScale}
          style={{ 
            width: "100%", 
            minHeight: "500px", 
            height: "65vh", 
            backgroundColor: "#0f172a", 
            borderRadius: "0 0 16px 16px", 
            position: "relative", 
            overflow: "hidden" 
          }}
        >
          {/* AI Hologram HUD */}
          {showHud && (isAiThinking || aiHudContent) && (
            <div 
              slot="hotspot-ai-hud" 
              data-position="1.2 2.0 0" 
              data-normal="0 1 0" 
              className={`ar-hologram-hud ${missionFeedback === 'correct' ? 'glow-correct' : missionFeedback === 'wrong' ? 'shake-wrong' : ''}`}
            >
              <div className="hud-header">
                🤖 {gamificationActive ? 'Misi AI' : 'AI HUD Analysis'}
                {gamificationActive && <span className="score-badge">⭐ {score}</span>}
              </div>
              <div className="hud-body">
                {isAiThinking ? (
                  <span className="hud-thinking">🤖 Memproses...</span>
                ) : (
                  <p>{aiHudContent}</p>
                )}
                {!gamificationActive && (
                  <div className="hud-power-output">
                    ⚡ Output Live: <strong>{powerOutput} kW</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Hotspot Standar */}
          <button slot="hotspot-rotor" data-position="0 2.5 0.5" data-normal="0 0 1" className="Hotspot" onClick={() => onHotspotClick('baling-baling (rotor)', 'rotor')}>
            <div className="HotspotAnnotation">Rotor / Baling-baling</div>
          </button>
          <button slot="hotspot-tower" data-position="0 1.0 0" data-normal="1 0 0" className="Hotspot" onClick={() => onHotspotClick('menara (tower)', 'tower')}>
            <div className="HotspotAnnotation">Menara (Tower)</div>
          </button>

          {/* Hotspot Generator (Bisa diklik luar/dalam) */}
          <button slot="hotspot-generator" data-position="0 2.5 -0.3" data-normal="0 1 0" className="Hotspot" onClick={() => onHotspotClick('generator', 'generator')}>
            <div className="HotspotAnnotation">Generator Utama</div>
          </button>

          {/* Hotspot X-Ray (Muncul saat mode X-Ray aktif) */}
          {xRayMode && (
            <>
              <button slot="hotspot-gearbox" data-position="0 2.5 -0.1" data-normal="1 0 0" className="Hotspot xray-hotspot" onClick={() => onHotspotClick('gearbox', 'gearbox')}>
                <div className="HotspotAnnotation">Gearbox (Internal)</div>
              </button>
              <button slot="hotspot-poros" data-position="0 2.5 0.2" data-normal="1 0 0" className="Hotspot xray-hotspot" onClick={() => onHotspotClick('poros utama', 'poros')}>
                <div className="HotspotAnnotation">Poros Utama (Internal)</div>
              </button>
            </>
          )}

          <button slot="ar-button" className="ar-button">
            🌐 Lihat di Ruanganmu (WebAR)
          </button>
        </model-viewer>

        {/* Overlay Physics Controller */}
        <div className="physics-controller-overlay">
          <div className="slider-container">
            <label>Kecepatan Angin (v): {windSpeed} m/s</label>
            <input 
              type="range" 
              min="0" max="25" 
              value={windSpeed} 
              onChange={(e) => setWindSpeed(Number(e.target.value))}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ARViewer;
