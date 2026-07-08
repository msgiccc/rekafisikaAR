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

const systemPrompt = `Kamu adalah AI Voice Assistant pintar (RekaFisika AI).
Tugasmu adalah menjawab pertanyaan pengguna secara langsung, cerdas, dan natural layaknya JARVIS, yang berfokus pada fisika turbin angin energi terbarukan.
ATURAN WAJIB:
- Jawablah secara SINGKAT (maksimal 2 kalimat) agar sangat nyaman didengar lewat Text-to-Speech.
- Jawab persis apa yang ditanyakan pengguna. JANGAN berikan penjelasan umum jika tidak diminta.
- Jika pengguna menanyakan spesifik tentang "Rotor", "Generator", atau "Menara", sebutkan kata tersebut dalam jawabanmu.`;

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
      console.error("Gemini API gagal:", error);
      responseText = "Maaf, kunci API Gemini Anda bermasalah atau tidak valid. Sistem gagal memproses pertanyaan Anda.";
    }
  }

  if (!responseText) {
    responseText = "Sistem offline atau AI belum diinisialisasi dengan benar. Mohon periksa koneksi internet Anda.";
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

// Layanan Text-to-Speech Native Browser (Mengucapkan respon AI)
export function speakText(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  
  // Bersihkan Markdown sebelum dibaca
  const cleanText = text.replace(/\*/g, '').replace(/_/g, '').replace(/#/g, '');
  
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'id-ID'; // Bahasa Indonesia
  utterance.rate = 1.0;
  utterance.pitch = 1.1; // Nada suara futuristik
  
  window.speechSynthesis.speak(utterance);
}
