import { GoogleGenAI } from '@google/genai';
import React from 'react';

// Initialize Gemini SDK
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
let ai = null;

if (apiKey && apiKey.trim() !== '') {
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (err) {
    console.error("Gagal menginisialisasi Google GenAI:", err);
  }
}

const systemPrompt = `Kamu adalah AI Smart Tutor Fisika untuk aplikasi RekaFisika AR yang berbasis suara.
Tugasmu adalah menjelaskan konsep fisika terkait turbin angin.
BERIKAN JAWABAN SINGKAT, padat, dan jelas (maksimal 2 kalimat) agar nyaman diucapkan oleh asisten suara (Text-to-Speech).
Sertakan juga nama komponen utama yang relevan (seperti Rotor, Generator, atau Menara) di dalam penjelasanmu.`;

export async function tanyaAITutorVoice(userPrompt) {
  let responseText = "";
  
  if (ai && navigator.onLine) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: systemPrompt + "\n\nPertanyaan: " + userPrompt }] }],
        config: { temperature: 0.7 }
      });
      if (response.text) {
        responseText = response.text;
      }
    } catch (error) {
      console.warn("Gemini API gagal atau timeout, beralih ke Offline Smart Engine...", error);
    }
  }

  if (!responseText) {
    responseText = getOfflineResponse(userPrompt.toLowerCase());
  }

  // Detect component from response or prompt
  const combinedText = (userPrompt + " " + responseText).toLowerCase();
  let targetPart = null;
  if (combinedText.includes('rotor') || combinedText.includes('baling')) {
    targetPart = 'rotor';
  } else if (combinedText.includes('generator') || combinedText.includes('faraday') || combinedText.includes('nacelle') || combinedText.includes('elektromagnetik') || combinedText.includes('listrik')) {
    targetPart = 'generator';
  } else if (combinedText.includes('menara') || combinedText.includes('tower') || combinedText.includes('tinggi')) {
    targetPart = 'tower';
  }

  return { text: responseText, targetPart };
}

function getOfflineResponse(text) {
  if (text.includes('faraday') || text.includes('generator') || text.includes('listrik')) {
    return "Menurut Hukum Faraday, pergerakan magnet di dalam kumparan generator akan menghasilkan arus listrik induksi murni dari putaran mekanik.";
  }
  if (text.includes('baling') || text.includes('rotor') || text.includes('aerodinamika')) {
    return "Gaya angkat aerodinamis akan memutar rotor turbin, mengubah kecepatan dan tekanan aliran udara menjadi energi kinetik mekanik yang kuat.";
  }
  if (text.includes('menara') || text.includes('tower') || text.includes('tinggi')) {
    return "Menara penopang harus dibangun sangat tinggi karena kecepatan aliran udara bertambah kuat secara logaritmik semakin jauh dari gesekan permukaan tanah.";
  }
  return "Turbin angin bekerja secara elegan dengan menangkap energi kinetik dari udara yang bergerak, dan mengubahnya menjadi energi listrik ramah lingkungan.";
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

// Layanan Text-to-Speech Native Browser
export function speakText(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  
  // Bersihkan Markdown sebelum dibaca oleh AI Voice
  const cleanText = text.replace(/\*/g, '').replace(/_/g, '').replace(/#/g, '');
  
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'id-ID'; // Bahasa Indonesia
  utterance.rate = 1.0;     // Kecepatan normal
  utterance.pitch = 1.1;    // Sedikit melengking futuristik
  
  window.speechSynthesis.speak(utterance);
}
