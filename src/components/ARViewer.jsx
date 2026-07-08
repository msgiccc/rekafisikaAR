import React from 'react';

const ARViewer = () => {
  return (
    <div className="ar-card">
      <div className="ar-header">
        <div className="ar-header-top">
          <div>
            <h2>Laboratorium Fisika Turbin Angin</h2>
            <p className="ar-badge-focus">🎯 Vectary 3D Engine</p>
          </div>
        </div>
      </div>
      
      {/* Kartu Instruksi / Guide Box */}
      <div className="ar-guide-box">
        💡 <strong>Tips Eksplorasi 3D & WebAR:</strong> Klik titik-titik Hotspot pada model turbin angin di bawah untuk membedah anatomi mesinnya, atau tekan ikon AR di pojok layar model untuk mendirikan kincir angin ini tepat di atas meja Anda! Untuk tanya jawab rumus fisika lebih mendalam, gunakan fitur RekaFisika AI Tutor di panel sebelah.
      </div>
      
      <div className="ar-model-container">
        {/* Wadah Vectary Iframe */}
        <div className="vectary-container" style={{ 
          width: "100%", 
          height: "580px", 
          minHeight: "65vh", 
          borderRadius: "16px", 
          overflow: "hidden", 
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.15)", 
          backgroundColor: "#0f172a", 
          position: "relative", 
          border: "1px solid #334155" 
        }}>
          <iframe
            src="https://app.vectary.com/p/6BIqUCLwcLvFUJLCupsZnl"
            frameBorder="0"
            width="100%"
            height="100%"
            allow="xr-spatial-tracking; vr; ar; fullscreen; autoplay; camera; gyro; accelerometer"
            title="Model 3D Turbin Angin RekaFisika AR"
            style={{ border: 'none', width: '100%', height: '100%', display: 'block' }}
          ></iframe>
        </div>
      </div>
    </div>
  );
};

export default ARViewer;
