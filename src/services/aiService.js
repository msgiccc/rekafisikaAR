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
    }
  }

  // Mode Offline / Fallback
  return {
    text: getOfflineResponse(userPrompt.toLowerCase(), contextData),
    source: 'OFFLINE_SMART_ENGINE'
  };
}

function getOfflineResponse(text, contextData) {
  if (text.includes('faraday') || text.includes('x-ray')) {
    return "Menurut Hukum Faraday, perubahan fluks magnetik pada kumparan kawat di stator oleh magnet rotor yang berputar akan menghasilkan gaya gerak listrik (GGL) induksi. Inilah rahasia generator turbin angin mengubah gerak menjadi listrik murni!";
  }
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
  if (text.includes('gearbox')) {
    return "Gearbox berfungsi sebagai pengganda putaran. Putaran lambat dari rotor (sekitar 15-20 rpm) dipercepat ratusan kali lipat agar sesuai dengan kebutuhan generator untuk menghasilkan listrik pada frekuensi standar grid.";
  }
  if (text.includes('poros')) {
    return "Poros Utama (Main Shaft) bertugas mentransfer momen gaya (torsi) sangat besar dari baling-baling menuju gearbox atau langsung ke generator. Komponen ini dirancang sangat kuat untuk menahan beban mekanik yang fluktuatif.";
  }
  if (text.includes('rumus') || text.includes('energi')) {
    return "Rumus dasar daya angin adalah P = ½ ρ A v³. Ini berarti jika kecepatan angin (v) berlipat ganda, daya yang dihasilkan bisa mencapai 8 kalinya karena faktor pangkat tiga!";
  }
  return "Pertanyaan yang bagus! Konsep ini sangat erat dengan fisika energi berkelanjutan. Silakan klik komponen pada model 3D untuk mengeksplorasi cara kerjanya lebih dalam.";
}

// Koleksi kuis offline fallback
const offlineChallenges = [
  { question: "Misi AI: Sentuh komponen yang berfungsi memutar energi mekanik menggunakan prinsip aerodinamika (gaya angkat/lift)!", answerKey: "rotor" },
  { question: "Misi AI: Sentuh komponen tempat terjadinya induksi elektromagnetik hukum Faraday untuk menghasilkan listrik!", answerKey: "generator" },
  { question: "Misi AI: Sentuh struktur penyangga utama yang didesain tinggi agar menangkap aliran fluida (angin) yang lebih cepat dan stabil!", answerKey: "tower" },
  { question: "Misi AI: Sentuh komponen yang berfungsi mentransfer torsi mekanik utama dari baling-baling!", answerKey: "poros" },
  { question: "Misi AI: Sentuh alat pengganda putaran dari putaran lambat menjadi putaran tinggi!", answerKey: "gearbox" }
];

export async function generateARChallenge() {
  // Mode Online Gemini API
  if (ai && navigator.onLine) {
    try {
      const challengePrompt = `Buat 1 pertanyaan kuis interaktif tentang komponen turbin angin (jawabannya harus salah satu dari: 'rotor', 'generator', 'tower', 'poros', atau 'gearbox'). 
Format jawaban kamu WAJIB berupa JSON:
{
  "question": "Misi AI: [pertanyaan singkat untuk meminta pengguna menyentuh komponen tersebut]",
  "answerKey": "[kunci jawaban (hanya salah satu dari 5 kata di atas)]"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: challengePrompt }] }],
        config: { temperature: 0.9 }
      });

      if (response.text) {
        // Ekstrak JSON dari teks balasan (antisipasi format markdown)
        const jsonMatch = response.text.match(/\\{[\\s\\S]*?\\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            ...parsed,
            source: 'GEMINI_FREE_API'
          };
        }
      }
    } catch (error) {
      console.warn("Gagal generate tantangan API, fallback ke offline kuis...", error);
    }
  }

  // Fallback Offline
  const randomChallenge = offlineChallenges[Math.floor(Math.random() * offlineChallenges.length)];
  return {
    ...randomChallenge,
    source: 'OFFLINE_SMART_ENGINE'
  };
}

