import React, { useRef } from 'react';

const ARViewer = ({ onHotspotSelect }) => {
  const modelRef = useRef(null);

  const handleHotspotClick = (partName, promptTrigger, target, orbit) => {
    if (modelRef.current) {
      modelRef.current.cameraTarget = target;
      modelRef.current.cameraOrbit = orbit;
    }
    if (onHotspotSelect) {
      onHotspotSelect(partName, promptTrigger);
    }
  };

  return (
    <div className="ar-card">
      <div className="ar-header">
        <div className="ar-header-top">
          <div>
            <h2>Laboratorium Fisika Turbin Angin</h2>
            <p className="ar-badge-focus">🎯 Model 3D Interaktif (AR Ready)</p>
          </div>
        </div>
      </div>
      
      <div className="ar-guide-box">
        💡 <strong>Tips Eksplorasi 3D & WebAR:</strong> Klik titik-titik Hotspot pada model turbin angin di bawah untuk membedah anatomi mesinnya, atau tekan ikon AR di pojok layar model untuk mendirikan kincir angin ini tepat di atas meja Anda!
      </div>
      
      <div className="ar-model-container">
        {/* Menggunakan model turbin lokal, jika tidak ada bisa pakai fallback */}
        <model-viewer
          ref={modelRef}
          src="/turbin.glb"
          alt="Model 3D Turbin Angin Energi Terbarukan"
          ar
          ar-modes="webxr scene-viewer quick-look"
          camera-controls
          auto-rotate
          autoplay
          shadow-intensity="1"
          style={{ 
            width: "100%", 
            height: "580px", 
            minHeight: "65vh", 
            backgroundColor: "#0f172a", 
            borderRadius: "0 0 16px 16px", 
            position: "relative", 
            overflow: "hidden" 
          }}
        >
          {/* Hotspot 1: Rotor */}
          <button 
            slot="hotspot-rotor" 
            data-position="0m 2.4m 0.4m" 
            data-normal="0m 0m 1m" 
            className="hotspot-btn"
            onClick={() => handleHotspotClick(
              'Rotor (Baling-baling)', 
              'Siswa baru saja mengklik bagian ROTOR (Baling-baling) turbin angin di layar AR. Jelaskan konsep aerodinamika dan rumus energi kinetik angin E_k = 0.5 * m * v^2 yang memutar baling-baling ini secara singkat, terstruktur, dan mudah dipahami!',
              '0m 2.4m 0m',
              '20deg 75deg 3m'
            )}
          >
            <div className="hotspot-label">Rotor</div>
          </button>

          {/* Hotspot 2: Generator */}
          <button 
            slot="hotspot-generator" 
            data-position="0m 2.4m -0.3m" 
            data-normal="0m 1m 0m" 
            className="hotspot-btn"
            onClick={() => handleHotspotClick(
              'Generator (Nacelle)', 
              'Siswa baru saja mengklik bagian GENERATOR (Nacelle) turbin angin di layar AR. Jelaskan tentang induksi elektromagnetik hukum Faraday yang terjadi di dalam generator ini untuk mengubah energi mekanik menjadi listrik murni. Jelaskan secara singkat dan menarik!',
              '0m 2.4m 0m',
              '-150deg 60deg 2.5m'
            )}
          >
            <div className="hotspot-label">Generator</div>
          </button>

          {/* Hotspot 3: Tower */}
          <button 
            slot="hotspot-tower" 
            data-position="0m 1.2m 0m" 
            data-normal="1m 0m 0m" 
            className="hotspot-btn"
            onClick={() => handleHotspotClick(
              'Menara Penopang', 
              'Siswa baru saja mengklik bagian MENARA PENOPANG turbin angin di layar AR. Jelaskan secara singkat mengapa menara turbin angin dibangun sangat tinggi menggunakan prinsip mekanika fluida udara (profil kecepatan angin terhadap ketinggian).',
              '0m 1.2m 0m',
              '45deg 85deg 4m'
            )}
          >
            <div className="hotspot-label">Menara</div>
          </button>

          <button slot="ar-button" className="ar-button" style={{
            backgroundColor: '#10b981', color: 'white', borderRadius: '9999px', border: 'none', position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', padding: '12px 24px', fontWeight: '600', cursor: 'pointer'
          }}>
            🌐 Lihat di Ruanganmu (WebAR)
          </button>
        </model-viewer>
      </div>
    </div>
  );
};

export default ARViewer;
