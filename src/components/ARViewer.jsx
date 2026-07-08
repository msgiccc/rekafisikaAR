import React, { useEffect, useRef } from 'react';

const ARViewer = ({ cameraTarget, onHotspotClick }) => {
  const modelRef = useRef(null);

  // AR to AI: Effect saat prop cameraTarget berubah dari AI
  useEffect(() => {
    if (modelRef.current && cameraTarget) {
      let targetPos = "0m 1.5m 0m";
      let orbit = "0deg 75deg 105% (default)";
      
      const targetLower = cameraTarget.toLowerCase();
      if (targetLower.includes('baling') || targetLower.includes('rotor')) {
        targetPos = "0m 2m 0.5m"; // Asumsi posisi baling-baling
        orbit = "0deg 90deg 2m";
      } else if (targetLower.includes('generator') || targetLower.includes('nacelle')) {
        targetPos = "0m 1.8m 0m"; // Asumsi posisi generator
        orbit = "90deg 75deg 1.5m";
      } else if (targetLower.includes('menara') || targetLower.includes('tower')) {
        targetPos = "0m 0.5m 0m"; // Asumsi posisi menara bawah
        orbit = "0deg 75deg 2m";
      }

      modelRef.current.cameraTarget = targetPos;
      modelRef.current.cameraOrbit = orbit;
    }
  }, [cameraTarget]);

  return (
    <div className="ar-card">
      <div className="ar-header">
        <h2>Mekanika Fisika Turbin Angin & Konversi Energi</h2>
        <p>
          Turbin angin mengubah energi kinetik angin menjadi listrik.
          Rumus dasar: <strong>E<sub>k</sub> = ½ m v²</strong>
        </p>
      </div>
      
      <div className="ar-model-container">
        {/* Catatan: Astronaut.glb digunakan sebagai fallback model demo. 
            Silakan ganti dengan "kincir.glb" pada folder public/ saat siap! */}
        <model-viewer
          ref={modelRef}
          src="https://modelviewer.dev/shared-assets/models/Astronaut.glb"
          auto-rotate
          camera-controls
          ar
          ar-modes="webxr scene-viewer quick-look"
          shadow-intensity="1"
          interaction-prompt="auto"
        >
          {/* Hotspot 1: Rotor / Baling-baling */}
          <button 
            slot="hotspot-rotor" 
            data-position="0 1.9 0.5" 
            data-normal="0 0 1" 
            className="Hotspot"
            onClick={() => onHotspotClick('baling-baling (rotor)')}
          >
            <div className="HotspotAnnotation">Rotor / Baling-baling</div>
          </button>

          {/* Hotspot 2: Generator / Nacelle */}
          <button 
            slot="hotspot-generator" 
            data-position="0 1.8 -0.2" 
            data-normal="0 1 0" 
            className="Hotspot"
            onClick={() => onHotspotClick('generator')}
          >
            <div className="HotspotAnnotation">Generator Elektromagnetik</div>
          </button>

          {/* Hotspot 3: Menara / Tower */}
          <button 
            slot="hotspot-tower" 
            data-position="0 0.5 0" 
            data-normal="1 0 0" 
            className="Hotspot"
            onClick={() => onHotspotClick('menara (tower)')}
          >
            <div className="HotspotAnnotation">Menara Baja (Tower)</div>
          </button>

          <button slot="ar-button" className="ar-button">
            🌐 Lihat di Ruanganmu (WebAR)
          </button>
        </model-viewer>
      </div>
    </div>
  );
};

export default ARViewer;
