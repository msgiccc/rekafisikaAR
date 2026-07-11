import React from 'react';

const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;

// Process physical motion data into Period and Frequency
function analyzeMotionData(history) {
  if (!history || history.length < 10) return null;
  
  // Find zero crossings of X relative to average X to count cycles
  const avgX = history.reduce((sum, pt) => sum + pt.x, 0) / history.length;
  let crossings = [];
  
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1].x - avgX;
    const curr = history[i].x - avgX;
    // Check if sign changed
    if (prev * curr < 0) {
      crossings.push(history[i].t);
    }
  }

  // A full period T is the time between 3 crossings (e.g. going left, right, left)
  // or simply 2 * time between consecutive crossings
  if (crossings.length >= 2) {
    const timeDiffs = [];
    for (let i = 1; i < crossings.length; i++) {
      timeDiffs.push(crossings[i] - crossings[i - 1]);
    }
    const avgHalfPeriodMs = timeDiffs.reduce((sum, d) => sum + d, 0) / timeDiffs.length;
    const periodS = (avgHalfPeriodMs * 2) / 1000;
    const frequencyHz = 1 / periodS;
    
    return {
      period: periodS,
      frequency: frequencyHz
    };
  }
  
  return null;
}

export async function tanyaAITutorVoice(userPrompt, motionHistory) {
  let responseText = "";
  const stats = analyzeMotionData(motionHistory);
  
  let systemPrompt = `Kamu adalah Asisten Laboratorium Fisika Digital (RekaFisika LabVision).
Tugasmu adalah menganalisis data gerak osilasi yang ditangkap oleh kamera tracker dan menjawab pertanyaan pengguna.
ATURAN WAJIB:
- Jawablah secara SINGKAT (maksimal 2 kalimat padat) agar nyaman dibacakan mesin AI Voice.
- JANGAN berikan markdown bintang atau format tebal.`;

  if (stats) {
    systemPrompt += `\nDATA SAAT INI: Periode (T) = ${stats.period.toFixed(2)} sekon, Frekuensi (f) = ${stats.frequency.toFixed(2)} Hz. Jika relevan dengan pertanyaan, sebutkan nilai ini dalam analisismu.`;
  } else {
    systemPrompt += `\nDATA SAAT INI: Belum ada data gerak osilasi yang cukup (Objek belum diayunkan cukup lama).`;
  }

  if (groqApiKey && navigator.onLine) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqApiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.choices && data.choices[0].message) {
        responseText = data.choices[0].message.content;
      } else if (response.status === 429) {
        responseText = "Maaf, batas penggunaan Groq AI telah tercapai. Silakan coba lagi beberapa saat.";
      } else {
        throw new Error(data.error?.message || data.message || "Unknown API Error");
      }
    } catch (error) {
      console.error("Groq API gagal:", error);
      responseText = "Maaf, gagal terhubung ke satelit Groq AI. Silakan periksa koneksi internet.";
    }
  } else {
    responseText = "Sistem offline atau Kunci API Groq belum diatur dengan benar.";
  }

  return { text: responseText, stats };
}

let currentAudio = null;

// Pure Typecast.ai TTS Integration (No Native Fallback as requested)
export async function speakText(text) {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  
  const cleanText = text.replace(/\*/g, '').replace(/_/g, '').replace(/#/g, '');
  const tcApiKey = import.meta.env.VITE_TYPECAST_API_KEY;

  if (tcApiKey && navigator.onLine) {
    try {
      const voiceId = 'tc_69f2e455ea79fd197aa0476f'; 
      
      const response = await fetch('https://api.typecast.ai/v1/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': tcApiKey
        },
        body: JSON.stringify({
          text: cleanText,
          voice_id: voiceId,
          model: 'ssfm-v30'
        })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        currentAudio = new Audio(audioUrl);
        await currentAudio.play();
      } else {
        console.error("Typecast Error/Quota Exceeded.");
      }
    } catch (error) {
      console.error("Typecast Gagal terhubung:", error);
    }
  }
}
