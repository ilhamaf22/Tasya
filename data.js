import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Isi cadangan, dipakai kalau Firebase belum diatur atau datanya belum disimpan.
export const DEFAULTS = {
  nama: "Nama Pacarmu",
  panggilan: "sayang",
  dariSiapa: "aku",
  tanggalLahir: "7 Oktober",
  tanggalJadian: "2024-02-14",
  lagu: { judul: "Shape of My Heart", penyanyi: "Backstreet Boys", file: "lagu.mp3", link: "https://www.youtube.com/results?search_query=shape+of+my+heart+backstreet+boys" },
  surat: [
    "[Paragraf pembuka ucapanmu di sini.]",
    "[Paragraf kedua: kenangan atau hal yang kamu syukuri dari dia.]",
    "[Paragraf penutup: harapan untuk tahun barunya dan untuk kalian berdua.]"
  ],
  kisah: [
    { tanggal: "Januari 2024", judul: "[Pertama kali ketemu]", cerita: "[Ceritakan momen ini di sini.]" },
    { tanggal: "Februari 2024", judul: "[Hari kita jadian]", cerita: "[Ceritakan momen ini di sini.]" },
    { tanggal: "Hari ini", judul: "Ulang tahunmu", cerita: "[Dan masih banyak bab yang mau aku tulis bareng kamu.]" }
  ],
  galeri: [
    { photo: "", caption: "kencan pertama" }, { photo: "", caption: "senyum favoritku" }, { photo: "", caption: "liburan kita" },
    { photo: "", caption: "foto random" }, { photo: "", caption: "pas kamu lucu" }, { photo: "", caption: "kita berdua" }
  ],
  jumlahLilin: 5,
  doa: ["[Doa/harapan pertama]", "[Doa/harapan kedua]", "[Doa/harapan ketiga]"],
  pesanSayang: "[Kalimat penutup di pengukur sayang.]",
  alasan: ["[Alasan pertama]", "[Alasan kedua]", "[Alasan ketiga]"],
  bukaSaat: [
    { label: "lagi sedih", isi: "[Pesan untuk dibaca saat dia sedih]" },
    { label: "kangen aku", isi: "[Pesan untuk dibaca saat dia kangen]" },
    { label: "susah tidur", isi: "[Pesan untuk dibaca saat dia susah tidur]" },
    { label: "butuh semangat", isi: "[Pesan untuk dibaca saat dia butuh semangat]" }
  ]
};

export const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
export const clone = o => JSON.parse(JSON.stringify(o));
export const merge = j => {
  const c = clone(DEFAULTS);
  if (j && typeof j === "object") { Object.assign(c, j); c.lagu = Object.assign(clone(DEFAULTS.lagu), j.lagu || {}); }
  return c;
};

export const configured = !String(firebaseConfig.apiKey || "").startsWith("ISI");
export const app = configured ? initializeApp(firebaseConfig) : null;
export const db = app ? getFirestore(app) : null;

// Dokumen site/content berisi semua teks. Foto disimpan terpisah di photos/{id}.
export async function loadContent(){
  if (!db) return null;
  const snap = await getDoc(doc(db, "site", "content"));
  return snap.exists() ? snap.data() : null;
}
export async function loadPhoto(id){
  if (!db || !id) return "";
  const snap = await getDoc(doc(db, "photos", id));
  return snap.exists() ? (snap.data().data || "") : "";
}
