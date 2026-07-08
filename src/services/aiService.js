import React from 'react';

// Initialize Groq Key
const apiKey = import.meta.env.VITE_GROQ_API_KEY;

const systemPrompt = `Kamu adalah AI Voice Assistant pintar (RekaFisika AI).
Tugasmu adalah menjawab pertanyaan pengguna secara langsung, cerdas, dan natural layaknya JARVIS, yang berfokus pada fisika turbin angin energi terbarukan.
ATURAN WAJIB:
- Jawablah secara SINGKAT (maksimal 2 kalimat) agar sangat nyaman didengar lewat Text-to-Speech.
- Jawab persis apa yang ditanyakan pengguna. JANGAN berikan penjelasan umum jika tidak diminta.
- Jika pengguna menanyakan spesifik tentang "Rotor", "Generator", atau "Menara", sebutkan kata tersebut dalam jawabanmu.`;

export async function tanyaAITutorVoice(userPrompt) {
  let responseText = "";
  
  if (apiKey && navigator.onLine) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
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
      responseText = "Maaf, gagal terhubung ke satelit Groq AI. Silakan periksa koneksi internet atau kunci API Anda.";
    }
  }

  if (!responseText) {
    responseText = "Sistem offline atau Kunci API Groq belum diatur dengan benar.";
  }

  // Pendeteksi Komponen Mesin HANYA DARI PERTANYAAN USER (agar pertanyaan umum tidak tiba-tiba melompat)
  const userText = userPrompt.toLowerCase();
  let targetPart = null;
  
  if (userText.includes('rotor') || userText.includes('baling')) {
    targetPart = 'rotor';
  } else if (userText.includes('generator') || userText.includes('faraday') || userText.includes('nacelle')) {
    targetPart = 'generator';
  } else if (userText.includes('menara') || userText.includes('tower')) {
    targetPart = 'tower';
  }

  return { text: responseText, targetPart };
}



// Utility: Pembersih Markdown (Mengubah **teks** menjadi <strong> HTML React bergaya hologram)
export function formatMarkdownToReact(text) {
  if (!text) return null;
  const paragraphs = text.split('\n').filter(p => p.trim() !== '');
  return paragraphs.map((paragraph, i) => {
    // Split berdasarkan **
    const parts = paragraph.split(/\*\*(.*?)\*\*/g);
    return React.createElement(
      'p',
      { key: i, style: { marginBottom: '0.75rem', lineHeight: '1.5' } },
      parts.map((part, index) => {
        if (index % 2 !== 0) {
          // Render teks tebal dengan warna Sci-Fi cyan
          return React.createElement(
            'strong',
            { key: index, style: { color: '#38bdf8', fontWeight: '700', textShadow: '0 0 8px rgba(56, 189, 248, 0.6)' } },
            part
          );
        }
        // Hapus sisa bintang tunggal (*) jika masih bocor
        const cleanPart = part.replace(/\*/g, '');
        return React.createElement('span', { key: index }, cleanPart);
      })
    );
  });
}

// Audio instance global agar bisa dihentikan saat dipanggil berulang
let currentAudio = null;

// Layanan Text-to-Speech (ElevenLabs Premium + Native Browser Fallback)
export async function speakText(text) {
  // 1. Hentikan suara yang sedang berjalan (ElevenLabs)
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  
  // 2. Hentikan suara bawaan (Browser TTS)
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  
  const cleanText = text.replace(/\*/g, '').replace(/_/g, '').replace(/#/g, '');
  const elApiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;

  // 3. Coba menggunakan ElevenLabs (Suara Manusia Ultra-Realistis)
  if (elApiKey && navigator.onLine) {
    try {
      // Menggunakan Adam (Suara Pria) dengan model Multilingual v2 yang mendukung bahasa Indonesia
      const voiceId = 'pNInz6obpgDQGcFmaJcg'; 
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?optimize_streaming_latency=1`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': elApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        currentAudio = new Audio(audioUrl);
        await currentAudio.play();
        return; // Berhasil! Jangan jalankan suara lokal bawaan HP
      } else {
        console.warn("ElevenLabs Kuota Habis atau Error. Beralih ke mesin suara lokal HP...");
      }
    } catch (error) {
      console.error("ElevenLabs Gagal terhubung:", error);
    }
  }

  // 4. STRATEGI CADANGAN (FALLBACK): Gunakan suara lokal (Browser TTS) jika ElevenLabs gagal/habis kuota
  if (window.speechSynthesis) {
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'id-ID'; 
    utterance.rate = 1.0; 
    utterance.pitch = 1.1; 

    const voices = window.speechSynthesis.getVoices();
    const idVoices = voices.filter(v => v.lang.includes('id'));
    
    if (idVoices.length > 0) {
      utterance.voice = idVoices[0];
    }
    
    window.speechSynthesis.speak(utterance);
  }
}
