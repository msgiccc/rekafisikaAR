import { GoogleGenAI } from '@google/genai';

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
Gunakan bahasa Indonesia yang santai, edukatif, dan mudah dipahami. Jelaskan konsep rumit seperti aerodinamika atau induksi magnetik secara sederhana.
Jika pengguna menanyakan komponen spesifik (seperti baling-baling, generator, menara), pastikan kamu menyebutkan nama komponen tersebut agar sistem AR dapat mengarahkan kamera 3D ke komponen tersebut secara otomatis.
Batasi jawaban maksimal 2-3 paragraf singkat.`;

/**
 * Tanya AI Tutor Hybrid Function
 * @param {string} userPrompt - Pertanyaan dari pengguna
 * @param {object} contextData - Data konteks tambahan (misal komponen AR yang sedang dilihat)
 * @returns {Promise<{text: string, source: string}>}
 */
export async function tanyaAITutor(userPrompt, contextData = {}) {
  // Coba mode Online dengan Gemini API terlebih dahulu
  if (ai && navigator.onLine) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [{ text: systemPrompt + "\\n\\nPertanyaan Pengguna: " + userPrompt }] }
        ],
        config: {
          temperature: 0.7,
        }
      });
      
      if (response.text) {
        return {
          text: response.text,
          source: 'GEMINI_FREE_API'
        };
      }
    } catch (error) {
      console.warn("Gemini API gagal atau timeout, beralih ke Offline Smart Engine...", error);
      // Jatuh ke fallback jika error
    }
  }

  // Mode Offline / Fallback (Offline Smart NLP Engine)
  return {
    text: getOfflineResponse(userPrompt.toLowerCase(), contextData),
    source: 'OFFLINE_SMART_ENGINE'
  };
}

/**
 * Offline Smart NLP Engine untuk Fallback 100% Bebas Crash
 */
function getOfflineResponse(text, contextData) {
  if (text.includes('angin') || text.includes('turbin')) {
    return "Turbin angin bekerja berdasarkan prinsip konversi energi. Angin yang bergerak memutar baling-baling (rotor). Energi kinetik ini kemudian diteruskan ke generator di dalam nacelle untuk diubah menjadi energi listrik.";
  }
  
  if (text.includes('baling') || text.includes('rotor')) {
    return "Baling-baling (rotor) pada turbin angin dirancang menggunakan prinsip aerodinamika seperti sayap pesawat. Gaya angkat (lift) dari angin memutar baling-baling ini, mengubah energi angin menjadi energi kinetik mekanik.";
  }
  
  if (text.includes('generator') || text.includes('listrik')) {
    return "Generator adalah jantung dari konversi energi. Di dalamnya, kumparan kawat berputar di antara magnet (induksi elektromagnetik hukum Faraday). Putaran mekanik dari baling-baling inilah yang menghasilkan arus listrik.";
  }
  
  if (text.includes('menara') || text.includes('tower')) {
    return "Menara (tower) turbin angin dibangun sangat tinggi. Mengapa? Karena menurut prinsip mekanika fluida udara, semakin tinggi posisi, semakin cepat dan stabil aliran anginnya, sehingga efisiensi turbin meningkat tajam.";
  }
  
  if (text.includes('rumus') || text.includes('energi')) {
    return "Rumus dasar energi kinetik angin adalah E = ½ m v². Ini berarti jika kecepatan angin (v) berlipat ganda, energi yang dihasilkan bukan 2 kalinya, melainkan bisa mencapai 8 kalinya karena faktor pangkat tiga dalam daya angin (P = ½ ρ A v³)!";
  }
  
  if (text.includes('efisiensi')) {
    return "Efisiensi turbin angin dibatasi oleh Batas Betz (Betz Limit) dalam fisika. Secara teoritis, sebuah turbin angin maksimal hanya bisa mengekstrak 59.3% energi kinetik dari angin. Jika 100% diekstrak, angin akan berhenti mengalir melewati baling-baling.";
  }

  return "Pertanyaan yang bagus! Konsep ini sangat erat dengan fisika energi berkelanjutan. Silakan klik komponen pada model 3D (seperti baling-baling, menara, atau generator) untuk mengeksplorasi cara kerjanya lebih dalam.";
}
