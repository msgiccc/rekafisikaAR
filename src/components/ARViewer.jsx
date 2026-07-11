import React, { useRef, useState, useEffect, useCallback } from 'react';
import { tanyaAITutorVoice, speakText } from '../services/aiService';

const ARViewer = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const lowResCanvasRef = useRef(null);
  const requestRef = useRef();
  
  const [isRecording, setIsRecording] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  
  // Motion history state Ref for performance (avoiding re-renders)
  const motionHistoryRef = useRef([]);

  // Setup Camera Feed
  useEffect(() => {
    async function setupCamera() {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        } catch (err) {
          console.error("Camera access denied:", err);
        }
      }
    }
    setupCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // Tracking Engine (requestAnimationFrame loop)
  const trackFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const lowResCanvas = lowResCanvasRef.current;

    if (video && video.readyState === video.HAVE_ENOUGH_DATA && canvas && lowResCanvas) {
      // Set canvas sizes to match video
      if (canvas.width !== video.clientWidth) {
        canvas.width = video.clientWidth;
        canvas.height = video.clientHeight;
      }
      
      const width = video.clientWidth;
      const height = video.clientHeight;
      
      const ctx = canvas.getContext('2d');
      const lowCtx = lowResCanvas.getContext('2d', { willReadFrequently: true });
      
      // Clear main canvas overlay
      ctx.clearRect(0, 0, width, height);

      // Low-res processing for performance
      const lowW = 320;
      const lowH = 240;
      lowResCanvas.width = lowW;
      lowResCanvas.height = lowH;
      lowCtx.drawImage(video, 0, 0, lowW, lowH);
      
      const frameData = lowCtx.getImageData(0, 0, lowW, lowH);
      const data = frameData.data;
      
      let sumX = 0;
      let sumY = 0;
      let count = 0;

      // Scan pixels for Neon Green (e.g. Tennis Ball)
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Simple heuristic for bright green: G is dominant
        if (g > 150 && r < g * 0.6 && b < g * 0.6) {
          const pixelIndex = i / 4;
          const x = pixelIndex % lowW;
          const y = Math.floor(pixelIndex / lowW);
          sumX += x;
          sumY += y;
          count++;
        }
      }

      const now = performance.now();
      
      if (count > 20) { // Threshold to prevent noise
        // Map back to full-res coordinates
        const centerX = (sumX / count) * (width / lowW);
        const centerY = (sumY / count) * (height / lowH);
        
        motionHistoryRef.current.push({ t: now, x: centerX, y: centerY });
        
        // Keep last 60 frames (approx 2 seconds at 30fps)
        if (motionHistoryRef.current.length > 60) {
          motionHistoryRef.current.shift();
        }
      }

      // Physics Vector Generator rendering
      const history = motionHistoryRef.current;
      if (history.length > 1) {
        // Draw Dot Trail (Cyan)
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)'; // Cyan
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.moveTo(history[0].x, history[0].y);
        for (let i = 1; i < history.length; i++) {
          ctx.lineTo(history[i].x, history[i].y);
        }
        ctx.stroke();
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#38bdf8';
        ctx.stroke(); // Double stroke for glow
        ctx.shadowBlur = 0; // Reset shadow

        // Render current point (Center)
        const currentPt = history[history.length - 1];
        
        // Draw Target Marker
        ctx.beginPath();
        ctx.arc(currentPt.x, currentPt.y, 10, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Calculate Average Position (Equilibrium center approximation)
        const avgX = history.reduce((sum, pt) => sum + pt.x, 0) / history.length;
        const avgY = history.reduce((sum, pt) => sum + pt.y, 0) / history.length;

        // Draw Restoring Force Vector (Red) pointing to equilibrium
        const Fx = avgX - currentPt.x;
        const Fy = avgY - currentPt.y;
        drawArrow(ctx, currentPt.x, currentPt.y, currentPt.x + Fx * 0.5, currentPt.y + Fy * 0.5, '#ef4444');

        // Calculate Velocity Vector (Green) using last 5 frames
        if (history.length > 5) {
          const pastPt = history[history.length - 5];
          const dt = (currentPt.t - pastPt.t) / 1000; // in seconds
          if (dt > 0) {
            const vx = (currentPt.x - pastPt.x) / dt;
            const vy = (currentPt.y - pastPt.y) / dt;
            // Scale down velocity for display purposes
            const scale = 0.1;
            drawArrow(ctx, currentPt.x, currentPt.y, currentPt.x + vx * scale, currentPt.y + vy * scale, '#10b981');
          }
        }
      }
    }
    
    requestRef.current = requestAnimationFrame(trackFrame);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(trackFrame);
    return () => cancelAnimationFrame(requestRef.current);
  }, [trackFrame]);

  // Helper to draw vector arrows
  const drawArrow = (ctx, fromX, fromY, toX, toY, color) => {
    const headlen = 10; 
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);
    
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;
    ctx.stroke();
    ctx.shadowBlur = 0;
  };

  // Web Speech API Integration
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser Anda tidak mendukung Speech Recognition (Gunakan Chrome).");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = async (event) => {
      setIsRecording(false);
      const transcript = event.results[0][0].transcript;
      console.log("User Audio:", transcript);

      // Send to AI Service with motion data
      const historyCopy = [...motionHistoryRef.current];
      const result = await tanyaAITutorVoice(transcript, historyCopy);
      
      setAiResponse(result);
      speakText(result.text);
    };

    recognition.onerror = (event) => {
      console.error("Speech Recognition Error:", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  return (
    <div className="app-container-fullscreen">
      <video ref={videoRef} className="cv-video-feed" playsInline muted autoPlay />
      <canvas ref={canvasRef} className="cv-canvas-overlay" />
      <canvas ref={lowResCanvasRef} className="cv-offscreen-canvas" />

      <div className="ui-layer">
        <div className="lab-header">
          <h1>RekaFisika LabVision</h1>
          <p>Real-Time AR Physics Tracker</p>
        </div>

        {/* AI Pop-Up Result */}
        {aiResponse && (
          <div className="hologram-popup">
            <div className="hologram-header">
              <div className="hologram-title">
                <span>🤖</span> Analisis AI
              </div>
              <button className="close-btn" onClick={() => setAiResponse(null)}>×</button>
            </div>
            
            {aiResponse.stats && (
              <div className="hologram-stats">
                <div className="stat-box">
                  <div className="stat-value">{aiResponse.stats.period.toFixed(2)}s</div>
                  <div className="stat-label">Periode (T)</div>
                </div>
                <div className="stat-box">
                  <div className="stat-value">{aiResponse.stats.frequency.toFixed(2)}Hz</div>
                  <div className="stat-label">Frekuensi (f)</div>
                </div>
              </div>
            )}
            
            <div className="hologram-body">
              {aiResponse.text}
            </div>
          </div>
        )}

        <div className="ai-voice-btn-container">
          <button 
            className={`ai-voice-btn ${isRecording ? 'recording' : ''}`}
            onClick={startListening}
            disabled={isRecording}
          >
            <span>{isRecording ? '🔴 Merekam Suara...' : '🎙️ Minta Analisis AI'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ARViewer;
