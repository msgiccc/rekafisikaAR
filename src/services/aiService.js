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

// Layanan Text-to-Speech Native Browser
export function speakText(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  
  const cleanText = text.replace(/\*/g, '').replace(/_/g, '').replace(/#/g, '');
  const utterance = new SpeechSynthesisUtterance(cleanText);
  
  // ==========================================
  // PENGATURAN SUARA AI (BISA ANDA UBAH DI SINI)
  // ==========================================
  utterance.lang = 'id-ID'; 
  utterance.rate = 1.0;  // Kecepatan membaca (0.5 lambat, 1.0 normal, 1.5 cepat)
  utterance.pitch = 1.1; // Nada suara (0.1 suara berat/laki-laki, 1.0 normal, 2.0 suara kecil/kartun)

  // Mencoba memilih jenis suara (Voice) yang berbeda jika tersedia di perangkat
  const voices = window.speechSynthesis.getVoices();
  const idVoices = voices.filter(v => v.lang.includes('id'));
  
  if (idVoices.length > 0) {
    // Menggunakan suara default Indonesia
    utterance.voice = idVoices[0];
    
    // Jika perangkat Anda memiliki lebih dari 1 jenis suara bahasa Indonesia
    // (misalnya ada varian Pria dan Wanita), Anda bisa mengubah angka indeksnya:
    // utterance.voice = idVoices[1]; // Hapus tanda komentar (//) di depan jika ingin tes suara ke-2
  }
  
  window.speechSynthesis.speak(utterance);
}
