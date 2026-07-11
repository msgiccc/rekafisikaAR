import React, { useRef, useState, useEffect, useCallback } from 'react';
import { tanyaAITutorVoice, speakText } from '../services/aiService';

const ARViewer = () => {
  const [appState, setAppState] = useState('setup'); // 'setup' | 'tracking'
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [isCameraReady, setIsCameraReady] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const lowResCanvasRef = useRef(null);
  const requestRef = useRef();
  const popupRef = useRef(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  
  const motionHistoryRef = useRef([]);

  // Fetch Available Cameras
  useEffect(() => {
    async function getCameras() {
      try {
        // Request initial permission to enumerate properly
        await navigator.mediaDevices.getUserMedia({ video: true });
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
        
        setDevices(videoDevices);
        
        // Find environment camera as default if available
        const backCamera = videoDevices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
        if (backCamera) {
          setSelectedDeviceId(backCamera.deviceId);
        } else if (videoDevices.length > 0) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      } catch (err) {
        console.error("Failed to enumerate devices:", err);
      }
    }
    getCameras();
  }, []);

  // Setup Video Stream whenever selectedDeviceId changes
  useEffect(() => {
    let stream = null;
    
    async function startStream() {
      if (!selectedDeviceId) return;
      
      setIsCameraReady(false);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
            width: { ideal: 1280 }, 
            height: { ideal: 720 } 
          }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setIsCameraReady(true);
        }
      } catch (err) {
        console.error("Camera stream error:", err);
      }
    }
    
    startStream();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      cancelAnimationFrame(requestRef.current);
    };
  }, [selectedDeviceId]);

  // Tracking Engine
  const trackFrame = useCallback(() => {
    if (appState !== 'tracking') return; // Do not track in setup mode
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const lowResCanvas = lowResCanvasRef.current;

    if (video && video.readyState === video.HAVE_ENOUGH_DATA && canvas && lowResCanvas) {
      if (canvas.width !== video.clientWidth) {
        canvas.width = video.clientWidth;
        canvas.height = video.clientHeight;
      }
      
      const width = video.clientWidth;
      const height = video.clientHeight;
      
      const ctx = canvas.getContext('2d');
      const lowCtx = lowResCanvas.getContext('2d', { willReadFrequently: true });
      
      ctx.clearRect(0, 0, width, height);

      const lowW = 320;
      const lowH = 240;
      lowResCanvas.width = lowW;
      lowResCanvas.height = lowH;
      lowCtx.drawImage(video, 0, 0, lowW, lowH);
      
      const frameData = lowCtx.getImageData(0, 0, lowW, lowH);
      const data = frameData.data;
      
      let sumX = 0, sumY = 0, count = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        if (g > 150 && r < g * 0.6 && b < g * 0.6) {
          const pixelIndex = i / 4;
          sumX += pixelIndex % lowW;
          sumY += Math.floor(pixelIndex / lowW);
          count++;
        }
      }

      const now = performance.now();
      
      if (count > 20) {
        const centerX = (sumX / count) * (width / lowW);
        const centerY = (sumY / count) * (height / lowH);
        
        motionHistoryRef.current.push({ t: now, x: centerX, y: centerY });
        if (motionHistoryRef.current.length > 60) {
          motionHistoryRef.current.shift();
        }
      }

      const history = motionHistoryRef.current;
      if (history.length > 1) {
        // Draw Cyan Trail
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)'; 
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.moveTo(history[0].x, history[0].y);
        for (let i = 1; i < history.length; i++) {
          ctx.lineTo(history[i].x, history[i].y);
        }
        ctx.stroke();
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#38bdf8';
        ctx.stroke(); 
        ctx.shadowBlur = 0; 

        const currentPt = history[history.length - 1];

        // Update popup position dynamically if it exists
        if (popupRef.current) {
          // Clamp position so it doesn't go offscreen
          const popX = Math.min(Math.max(currentPt.x, 20), width - 340);
          const popY = Math.min(Math.max(currentPt.y, 100), height - 100);
          popupRef.current.style.left = `${popX}px`;
          popupRef.current.style.top = `${popY}px`;
          popupRef.current.style.transform = `translate(40px, -50%)`;
        }
        
        ctx.beginPath();
        ctx.arc(currentPt.x, currentPt.y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.stroke();

        const avgX = history.reduce((sum, pt) => sum + pt.x, 0) / history.length;
        const avgY = history.reduce((sum, pt) => sum + pt.y, 0) / history.length;

        // Force Vector (Red)
        const Fx = avgX - currentPt.x;
        const Fy = avgY - currentPt.y;
        drawArrow(ctx, currentPt.x, currentPt.y, currentPt.x + Fx * 0.4, currentPt.y + Fy * 0.4, '#ef4444');

        // Velocity Vector (Green)
        if (history.length > 5) {
          const pastPt = history[history.length - 5];
          const dt = (currentPt.t - pastPt.t) / 1000;
          if (dt > 0) {
            const vx = (currentPt.x - pastPt.x) / dt;
            const vy = (currentPt.y - pastPt.y) / dt;
            const scale = 0.08;
            drawArrow(ctx, currentPt.x, currentPt.y, currentPt.x + vx * scale, currentPt.y + vy * scale, '#10b981');
          }
        }
      }
    }
    
    if (appState === 'tracking') {
      requestRef.current = requestAnimationFrame(trackFrame);
    }
  }, [appState]);

  // Restart tracking loop when state changes to 'tracking'
  useEffect(() => {
    if (appState === 'tracking') {
      motionHistoryRef.current = []; // Reset history on start
      requestRef.current = requestAnimationFrame(trackFrame);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [appState, trackFrame]);

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

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = (e) => { console.error(e); setIsRecording(false); };

    recognition.onresult = async (event) => {
      setIsRecording(false);
      const transcript = event.results[0][0].transcript;
      const historyCopy = [...motionHistoryRef.current];
      const result = await tanyaAITutorVoice(transcript, historyCopy);
      
      setAiResponse(result);
      speakText(result.text);
    };

    recognition.start();
  };

  return (
    <div className="app-container-fullscreen">
      <video 
        ref={videoRef} 
        className={`cv-video-feed ${appState === 'setup' ? 'setup-mode' : ''}`} 
        playsInline 
        muted 
        autoPlay 
      />
      
      {appState === 'setup' && (
        <div className="setup-overlay fade-in">
          <div className="setup-card">
            <h1>Setup Kamera</h1>
            <p>Pilih lensa kamera terbaik Anda. Pastikan kamera belakang (environment) digunakan untuk pelacakan optimal.</p>
            
            <select 
              className="camera-select" 
              value={selectedDeviceId} 
              onChange={(e) => setSelectedDeviceId(e.target.value)}
            >
              {devices.length === 0 && <option>Mencari kamera...</option>}
              {devices.map((device, idx) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>

            <button 
              className="btn-primary" 
              onClick={() => setAppState('tracking')}
              disabled={!isCameraReady || devices.length === 0}
            >
              Mulai AR LabVision
            </button>
          </div>
        </div>
      )}

      {appState === 'tracking' && (
        <>
          <canvas ref={canvasRef} className="cv-canvas-overlay" />
          <canvas ref={lowResCanvasRef} className="cv-offscreen-canvas" />

          <div className="ui-layer fade-in">
            <div className="lab-header">
              <h1>RekaFisika LabVision</h1>
              <p>Real-Time Tracking Active</p>
            </div>

            {aiResponse && (
              <div ref={popupRef} className="hologram-popup fade-in" style={ { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' } }>
                <div className="hologram-header">
                  <div className="hologram-title">
                    <span>✨</span> Analisis AI
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
                <span>{isRecording ? 'Mendengarkan...' : '🎙️ Minta Analisis AI'}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ARViewer;
