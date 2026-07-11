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
  
  const [isRecording, setIsRecording] = useState(false);
  const aiResponseRef = useRef(null);
  
  // Store smoothed Z-Depth Scale
  const scaleRef = useRef(1.0);
  
  // Array of { t, x, y } capped at 150 frames for graph
  const motionHistoryRef = useRef([]);

  useEffect(() => {
    async function getCameras() {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
        
        setDevices(videoDevices);
        
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

  const wrapText = (ctx, text, x, y, maxWidth, lineHeight) => {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
    return currentY + lineHeight;
  };

  const trackFrame = useCallback(() => {
    if (appState !== 'tracking') return;
    
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

      // Scan for Neon Green
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
        
        // Z-Depth Estimation based on Pixel Count (Area to Radius ratio)
        const radius = Math.sqrt(count);
        let targetScale = radius / 10;
        targetScale = Math.min(Math.max(targetScale, 0.4), 2.0); // Clamp to prevent explosion
        
        // Lerp Smoothing to prevent Z-jittering
        scaleRef.current = scaleRef.current + (targetScale - scaleRef.current) * 0.1;

        motionHistoryRef.current.push({ t: now, x: centerX, y: centerY });
        // Retain 150 frames max
        if (motionHistoryRef.current.length > 150) {
          motionHistoryRef.current.shift();
        }
      }

      const history = motionHistoryRef.current;
      let currentPt = null;
      let currentScale = scaleRef.current;

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

        currentPt = history[history.length - 1];
        
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

        // Velocity Vector (Green) with Depth-Corrected Normalization
        if (history.length > 5) {
          const pastPt = history[history.length - 5];
          const dt = (currentPt.t - pastPt.t) / 1000;
          if (dt > 0) {
            // Normalize velocity by dividing physical screen pixels by current Z-depth scale
            const vx = ((currentPt.x - pastPt.x) / dt) / currentScale;
            const vy = ((currentPt.y - pastPt.y) / dt) / currentScale;
            const scaleVel = 0.08;
            drawArrow(ctx, currentPt.x, currentPt.y, currentPt.x + vx * scaleVel, currentPt.y + vy * scaleVel, '#10b981');
          }
        }
      }

      // -------------------------------------------------------------
      // TRUE AR IN-CANVAS HUD (Pseudo-3D Isometric & Auto-Scaling)
      // -------------------------------------------------------------
      if (currentPt) {
        ctx.save();
        
        // 1. Move Canvas Origin precisely to the ball's center
        ctx.translate(currentPt.x, currentPt.y);
        
        // 2. Apply Z-Depth Estimation Scale
        ctx.scale(currentScale, currentScale);
        
        // Now HUD coordinates are relative to the ball (0,0) inside the scaled space
        const localHudX = 80;
        const localHudY = -150;
        
        // Draw Visual Anchor (Tether Line) from Ball (0,0) to HUD base
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(localHudX, localHudY + 220); // Connects to bottom-left of HUD
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2 / currentScale; // Keep line visually sharp despite scaling
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#38bdf8';
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 3. Translate to the HUD's anchor point
        ctx.translate(localHudX, localHudY);
        
        // 4. Apply Pseudo-3D Skew Transform (-15 degrees horizontal skew)
        const skewAmount = -0.26; 
        ctx.transform(1, 0, skewAmount, 1, 0, 0);

        // Draw HUD Panel Background
        const hudW = 320;
        const hudH = 220; 
        
        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)'; 
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.beginPath();
        ctx.roundRect(0, 0, hudW, hudH, 12);
        ctx.fill();
        
        ctx.shadowBlur = 0; 
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)'; 
        ctx.stroke();

        // Draw Header
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.fillText("✨ Analisis AR Tracker", 20, 30);
        
        // Draw Separator Line
        ctx.beginPath();
        ctx.moveTo(20, 42);
        ctx.lineTo(hudW - 20, 42);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.stroke();

        // Draw Stats
        const aiResponse = aiResponseRef.current;
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 24px Inter, sans-serif';
        if (aiResponse && aiResponse.stats) {
          ctx.fillText(`${aiResponse.stats.period.toFixed(2)}s`, 20, 75);
          ctx.fillText(`${aiResponse.stats.frequency.toFixed(2)}Hz`, 150, 75);
        } else {
          ctx.fillText(`-- s`, 20, 75);
          ctx.fillText(`-- Hz`, 150, 75);
        }
        
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText("PERIODE (T)", 20, 95);
        ctx.fillText("FREKUENSI (f)", 150, 95);

        // Draw Sine Wave Graph Base Container
        const graphX = 20;
        const graphY = 110;
        const graphW = hudW - 40;
        const graphH = 50;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.fillRect(graphX, graphY, graphW, graphH);
        
        // Center Line (Equilibrium)
        ctx.beginPath();
        ctx.moveTo(graphX, graphY + graphH / 2);
        ctx.lineTo(graphX + graphW, graphY + graphH / 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Live Sine Graph Plotting
        if (history.length > 1) {
          const minHistoryX = Math.min(...history.map(h => h.x));
          const maxHistoryX = Math.max(...history.map(h => h.x));
          const historyRange = (maxHistoryX - minHistoryX) || 1; 

          const newestTime = history[history.length - 1].t;
          const timeWindow = 5000; 

          ctx.beginPath();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#38bdf8';

          let firstPoint = true;
          for (let i = 0; i < history.length; i++) {
            const h = history[i];
            
            const timeDiff = newestTime - h.t;
            const px = graphX + graphW - (timeDiff / timeWindow) * graphW;
            
            if (px >= graphX) {
              const normalizedVal = (h.x - minHistoryX) / historyRange;
              const py = graphY + graphH - (normalizedVal * graphH);

              if (firstPoint) {
                ctx.moveTo(px, py);
                firstPoint = false;
              } else {
                ctx.lineTo(px, py);
              }
            }
          }
          ctx.stroke();
          ctx.shadowBlur = 0; 
        }

        // Draw Text Box
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '12px Inter, sans-serif';
        const textToDraw = aiResponse ? aiResponse.text : "⚡ Menganalisis lintasan spasial... Tekan mikrofon untuk kesimpulan AI";
        wrapText(ctx, textToDraw, 20, 185, hudW - 40, 16);

        ctx.restore(); // Restore from 3D Matrix & Scale Transform
      }
    }
    
    if (appState === 'tracking') {
      requestRef.current = requestAnimationFrame(trackFrame);
    }
  }, [appState]);

  useEffect(() => {
    if (appState === 'tracking') {
      motionHistoryRef.current = [];
      aiResponseRef.current = null;
      scaleRef.current = 1.0;
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
      
      aiResponseRef.current = result;
      speakText(result.text);
      
      setTimeout(() => {
        aiResponseRef.current = null;
      }, 15000);
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
