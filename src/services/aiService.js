import { GoogleGenAI } from '@google/genai';
import React from 'react';

// Initialize Gemini SDK only if API key is provided
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
let ai = null;

if (apiKey && apiKey.trim() !== '') {
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (err) {
    console.error("Gagal menginisialisasi Google GenAI:", err);
  }
}

const systemPrompt = `Kamu adalah AI Smart Tutor Fisika untuk aplikasi RekaFisika AR. 
Tugasmu adalah menjelaskan konsep fisika terkait energi terbarukan (turbin angin, panel surya, dll) kepada siswa.
Gunakan bahasa Indonesia yang edukatif, ilmiah namun mudah dipahami.
Batasi jawaban maksimal 2 paragraf singkat. Jangan menggunakan Markdown heading (#), cukup gunakan **teks tebal** untuk poin penting.`;

export async function tanyaAITutor(userPrompt, contextData = {}) {
  // Mode Online dengan Gemini API
  if (ai && navigator.onLine) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [{ text: systemPrompt + "\n\nPertanyaan: " + userPrompt }] }
        ],
        config: { temperature: 0.7 }
      });
      
      if (response.text) {
        return { text: response.text, source: 'GEMINI_FREE_API' };
      }
    } catch (error) {
      console.warn("Gemini API gagal atau timeout, beralih ke Offline Smart Engine...", error);
    }
  }

  // Mode Offline / Fallback Knowledge Base
  return {
    text: getOfflineResponse(userPrompt.toLowerCase(), contextData),
    source: 'OFFLINE_SMART_ENGINE'
  };
}

function getOfflineResponse(text, contextData) {
  if (text.includes('faraday') || text.includes('generator')) {
    return "Menurut **Hukum Faraday**, perubahan fluks magnetik pada kumparan kawat stator oleh putaran magnet rotor akan menghasilkan gaya gerak listrik (GGL) induksi. Inilah prinsip utama generator turbin angin mengubah putaran mekanik menjadi energi listrik murni.";
  }
  if (text.includes('baling') || text.includes('rotor')) {
    return "Baling-baling (rotor) turbin angin dirancang menggunakan prinsip **Aerodinamika**. Gaya angkat (lift) dari angin memutar baling-baling ini, mengubah energi angin menjadi **Energi Kinetik (E_k = 1/2 m v^2)**.";
  }
  if (text.includes('menara') || text.includes('tower')) {
    return "Menara turbin angin dibangun sangat tinggi berdasarkan profil kecepatan angin logaritmik. Semakin tinggi posisi dari permukaan tanah, semakin cepat dan stabil aliran fluida udara, sehingga **Efisiensi Daya Turbin** meningkat eksponensial.";
  }
  return "Konsep yang luar biasa! Fluida udara yang bergerak memiliki massa dan kecepatan, yang menghasilkan energi kinetik. Energi ini ditangkap oleh turbin untuk diubah menjadi listrik yang ramah lingkungan.";
}

// Utility: Pembersih Markdown (Mengubah **teks** menjadi <strong> HTML React)
export function formatMarkdownToReact(text) {
  if (!text) return null;
  const paragraphs = text.split('\n').filter(p => p.trim() !== '');
  return paragraphs.map((paragraph, i) => {
    // Split berdasarkan **
    const parts = paragraph.split(/\*\*(.*?)\*\*/g);
    return React.createElement(
      'p',
      { key: i, style: { marginBottom: '0.75rem', lineHeight: '1.6' } },
      parts.map((part, index) => {
        if (index % 2 !== 0) {
          // Bagian genap di dalam Regex Match adalah isi di dalam **
          return React.createElement(
            'strong',
            { key: index, style: { color: '#34d399', fontWeight: '700' } },
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
