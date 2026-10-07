import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { DEFAULTS, esc, clone, merge, app, db, configured, loadContent, loadPhoto } from "./data.js";
import { ADMIN_EMAIL } from "./firebase-config.js";

const $ = s => document.querySelector(s);
let saved = clone(DEFAULTS);    // isi terakhir yang tersimpan di Firestore
let D = clone(DEFAULTS);        // salinan yang sedang diedit
const photoData = {};           // id foto -> data URL (yang tersimpan + yang baru diunggah)
let newPhotos = new Set();      // id foto yang belum tersimpan
let dirty = false, saving = false;

function setStatus(t, cls = ""){ const s = $("#saveStatus"); s.textContent = t; s.className = "status " + cls; }
function showView(name){
  $("#loginView").hidden = name !== "login";
  $("#msgView").hidden = name !== "msg";
  $("#adminForm").hidden = name !== "form";
  $("#savebar").hidden = name !== "form";
  $("#logoutBtn").hidden = name !== "form";
}
function message(title, text){ $("#msgTitle").textContent = title; $("#msgText").textContent = text; showView("msg"); }

/* ---------- Login ---------- */
if (!configured) {
  message("Firebase belum diatur", "Isi dulu file firebase-config.js dengan konfigurasi proyek Firebase-mu, lalu deploy ulang.");
} else {
  const auth = getAuth(app);
  onAuthStateChanged(auth, async user => {
    if (!user) { showView("login"); return; }
    if (user.email !== ADMIN_EMAIL) { message("Akun ini bukan admin", "Kamu masuk sebagai " + user.email + ". Keluar lalu masuk dengan akun admin."); $("#logoutBtn").hidden = false; return; }
    message("Memuat isi…", "Sebentar, sedang mengambil isi halaman.");
    try {
      saved = merge(await loadContent());
      await Promise.all(saved.galeri.map(g => g.photo).filter(Boolean).map(id => loadPhoto(id).then(d => { if (d) photoData[id] = d; })));
    } catch (e) { console.warn(e); }
    D = clone(saved); renderAdmin(); showView("form");
    setStatus("Semua perubahan sudah tersimpan.");
  });
  $("#loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    $("#loginErr").textContent = ""; $("#loginBtn").disabled = true;
    try { await signInWithEmailAndPassword(auth, $("#email").value.trim(), $("#password").value); }
    catch (err) {
      const c = err?.code || "";
      $("#loginErr").textContent = c.includes("invalid-credential") || c.includes("wrong-password") || c.includes("user-not-found")
        ? "Email atau kata sandi salah."
        : c.includes("too-many-requests") ? "Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi."
        : c.includes("operation-not-allowed") ? "Login Email/Password belum diaktifkan di Firebase (Authentication → Sign-in method)."
        : c.includes("unauthorized-domain") ? "Domain ini belum diizinkan. Tambahkan di Authentication → Settings → Authorized domains."
        : c.includes("api-key") ? "Konfigurasi Firebase di firebase-config.js tidak cocok dengan proyekmu."
        : c.includes("network") ? "Tidak bisa terhubung ke Firebase. Periksa koneksimu."
        : "Gagal masuk.";
      $("#loginErr").textContent += c ? ` (kode: ${c})` : "";
      console.error("Login gagal:", err);
    } finally { $("#loginBtn").disabled = false; }
  });
  $("#logoutBtn").onclick = () => { if (dirty && !confirm("Ada perubahan yang belum disimpan. Tetap keluar?")) return; dirty = false; signOut(auth); };
}

/* ---------- Form ---------- */
const camSvg = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 6l1.5-2h5L16 6"/></svg>`;

const field = (label, attrs, val, opts = {}) => opts.area
  ? `<label class="field"><span>${label}</span><textarea ${attrs} rows="${opts.rows || 3}">${esc(val)}</textarea>${opts.hint ? `<em>${opts.hint}</em>` : ""}</label>`
  : `<label class="field"><span>${label}</span><input ${attrs} type="${opts.type || "text"}" value="${esc(val)}">${opts.hint ? `<em>${opts.hint}</em>` : ""}</label>`;

const rowTools = (key, i, n) => `<div class="row-tools">
  <button type="button" class="mini" data-act="up" data-key="${key}" data-i="${i}" ${i === 0 ? "disabled" : ""} aria-label="Naikkan">↑</button>
  <button type="button" class="mini" data-act="down" data-key="${key}" data-i="${i}" ${i === n-1 ? "disabled" : ""} aria-label="Turunkan">↓</button>
  <button type="button" class="mini danger" data-act="del" data-key="${key}" data-i="${i}">Hapus</button></div>`;

const LISTS = {
  kisah:   { title: "Kisah Kita", sub: "Timeline cerita kalian, dari atas ke bawah", label: "Momen", fields: [["tanggal","Tanggal"],["judul","Judul"],["cerita","Cerita",true]], blank: { tanggal: "", judul: "", cerita: "" } },
  doa:     { title: "Make a Wish", sub: "Doa yang muncul setelah lilin ditiup", label: "Doa", str: true, blank: "" },
  alasan:  { title: "Toples Alasan", sub: "Kenapa kamu sayang dia", label: "Alasan", str: true, blank: "" },
  bukaSaat:{ title: "Surat Buka Saat…", sub: "Label amplop dan isinya", label: "Amplop", fields: [["label","Buka saat kamu…"],["isi","Isi surat",true]], blank: { label: "", isi: "" } }
};

function listHTML(key){
  const L = LISTS[key], arr = D[key];
  const rows = arr.map((it, i) => `<div class="row"><div class="row-head"><b>${L.label} ${i+1}</b>${rowTools(key, i, arr.length)}</div>${
    L.str ? field("Isi", `id="f-${key}-${i}" data-list="${key}" data-i="${i}"`, it, { area: true, rows: 2 })
          : L.fields.map(([f, lab, area]) => field(lab, `id="f-${key}-${i}-${f}" data-list="${key}" data-i="${i}" data-f="${f}"`, it[f], { area, rows: 3 })).join("")
  }</div>`).join("");
  return `<div class="rows">${rows}</div><button type="button" class="mini add" data-act="add" data-key="${key}">+ Tambah ${L.label.toLowerCase()}</button>`;
}

function galleryHTML(){
  const rows = D.galeri.map((g, i) => `<div class="row"><div class="row-head"><b>Foto ${i+1}</b>${rowTools("galeri", i, D.galeri.length)}</div>
    <div class="photo-row">
      <div class="thumb">${photoData[g.photo] ? `<img src="${photoData[g.photo]}" alt="">` : camSvg}</div>
      <div style="display:flex;flex-direction:column;gap:10px;min-width:0">
        ${field("Keterangan", `id="f-galeri-${i}-caption" data-list="galeri" data-i="${i}" data-f="caption"`, g.caption)}
        <div class="center" style="justify-content:flex-start">
          <span class="mini file-btn">${g.photo ? "Ganti foto" : "Pilih foto"}<input type="file" accept="image/*" id="up-photo-${i}" data-photo="${i}"></span>
          ${g.photo ? `<button type="button" class="mini danger" data-act="clearphoto" data-i="${i}">Kosongkan foto</button>` : ""}
        </div>
      </div>
    </div></div>`).join("");
  return `<div class="rows">${rows}</div><button type="button" class="mini add" data-act="add" data-key="galeri">+ Tambah foto</button>`;
}

function renderAdmin(){
  $("#adminForm").innerHTML = `
  <section class="panel"><h2>Info dasar</h2>
    <div class="fgrid">
      ${field("Nama besar di halaman", `id="f-nama" data-k="nama"`, D.nama)}
      ${field("Panggilan sayang", `id="f-panggilan" data-k="panggilan"`, D.panggilan)}
      ${field("Namamu", `id="f-dari" data-k="dariSiapa"`, D.dariSiapa)}
      ${field("Tanggal ulang tahun", `id="f-lahir" data-k="tanggalLahir"`, D.tanggalLahir, { hint: "Ditulis bebas, misalnya 7 Oktober." })}
      ${field("Tanggal jadian", `id="f-jadian" data-k="tanggalJadian"`, D.tanggalJadian, { type: "date", hint: "Untuk penghitung waktu bersama." })}
    </div>
  </section>
  <section class="panel"><h2>Surat ucapan <small>Pisahkan paragraf dengan satu baris kosong</small></h2>
    ${field("Isi surat", `id="f-surat" data-k="surat"`, D.surat.join("\n\n"), { area: true, rows: 10 })}
  </section>
  <section class="panel" id="ed-galeri"><h2>Galeri Foto <small>Foto otomatis diperkecil sebelum disimpan</small></h2>${galleryHTML()}</section>
  <section class="panel"><h2>${LISTS.kisah.title} <small>${LISTS.kisah.sub}</small></h2>${listHTML("kisah")}</section>
  <section class="panel"><h2>${LISTS.doa.title} <small>${LISTS.doa.sub}</small></h2>
    ${field("Jumlah lilin", `id="f-lilin" data-k="jumlahLilin"`, D.jumlahLilin, { type: "number" })}${listHTML("doa")}</section>
  <section class="panel"><h2>Pengukur sayang <small>Muncul saat meteran tembus ∞</small></h2>
    ${field("Pesan penutup", `id="f-pesan" data-k="pesanSayang"`, D.pesanSayang, { area: true })}
  </section>
  <section class="panel"><h2>${LISTS.alasan.title} <small>${LISTS.alasan.sub}</small></h2>${listHTML("alasan")}</section>
  <section class="panel"><h2>${LISTS.bukaSaat.title} <small>${LISTS.bukaSaat.sub}</small></h2>${listHTML("bukaSaat")}</section>
  <section class="panel"><h2>Lagu <small>File MP3 ditaruh di folder proyek, bukan di Firebase</small></h2>
    <div class="fgrid">
      ${field("Judul lagu", `id="f-lagu-judul" data-k="lagu.judul"`, D.lagu.judul)}
      ${field("Penyanyi", `id="f-lagu-penyanyi" data-k="lagu.penyanyi"`, D.lagu.penyanyi)}
      ${field("Nama file MP3", `id="f-lagu-file" data-k="lagu.file"`, D.lagu.file, { hint: "Misalnya lagu.mp3. Kosongkan kalau belum ada file." })}
      ${field("Link cadangan", `id="f-lagu-link" data-k="lagu.link"`, D.lagu.link, { hint: "Dipakai kalau file lagu tidak ditemukan." })}
    </div>
  </section>`;
}

function rerender(key){
  if (key === "galeri") $("#ed-galeri").innerHTML = `<h2>Galeri Foto <small>Foto otomatis diperkecil sebelum disimpan</small></h2>${galleryHTML()}`;
  else renderAdmin();
}
function markDirty(){ dirty = true; setStatus("Ada perubahan yang belum disimpan.", "dirty"); }

$("#adminForm").addEventListener("input", e => {
  const t = e.target;
  if (t.dataset.k) {
    const k = t.dataset.k;
    if (k === "surat") D.surat = t.value.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
    else if (k === "jumlahLilin") D.jumlahLilin = Math.max(1, Math.min(12, parseInt(t.value) || 1));
    else if (k.startsWith("lagu.")) D.lagu[k.slice(5)] = t.value.trim();
    else D[k] = t.value;
    markDirty();
  } else if (t.dataset.list) {
    const arr = D[t.dataset.list], i = +t.dataset.i;
    if (t.dataset.f) arr[i][t.dataset.f] = t.value; else arr[i] = t.value;
    markDirty();
  }
});

$("#adminForm").addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const act = b.dataset.act, key = b.dataset.key, i = +b.dataset.i;
  if (act === "add") D[key].push(key === "galeri" ? { photo: "", caption: "" } : clone(LISTS[key].blank));
  else if (act === "del") D[key].splice(i, 1);
  else if (act === "up" && i > 0) [D[key][i-1], D[key][i]] = [D[key][i], D[key][i-1]];
  else if (act === "down" && i < D[key].length - 1) [D[key][i+1], D[key][i]] = [D[key][i], D[key][i+1]];
  else if (act === "clearphoto") { D.galeri[i].photo = ""; rerender("galeri"); markDirty(); return; }
  rerender(key); markDirty();
});

// Foto diperkecil jadi JPEG di bawah ~700 KB supaya muat di satu dokumen Firestore (batas 1 MiB).
async function compress(file){
  const bmp = await createImageBitmap(file);
  let max = 1400, q = 0.85, url = "";
  for (let n = 0; n < 8; n++) {
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    url = c.toDataURL("image/jpeg", q);
    if (url.length < 700_000) return url;
    if (q > 0.6) q -= 0.1; else max = Math.round(max * 0.8);
  }
  return url;
}

$("#adminForm").addEventListener("change", async e => {
  const t = e.target, file = t.files?.[0];
  if (!file || t.dataset.photo == null) return;
  const i = +t.dataset.photo;
  setStatus("Memproses foto…");
  try {
    const url = await compress(file);
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    photoData[id] = url; newPhotos.add(id);
    D.galeri[i].photo = id; rerender("galeri"); markDirty();
  } catch { setStatus("Foto ini tidak bisa dibaca. Coba pilih file JPG atau PNG lain.", "err"); }
});

$("#saveBtn").onclick = async () => {
  if (saving || !db) return;
  saving = true; $("#saveBtn").disabled = true;
  const now = new Set(D.galeri.map(g => g.photo).filter(Boolean));
  const old = new Set(saved.galeri.map(g => g.photo).filter(Boolean));
  try {
    const toUpload = [...now].filter(id => newPhotos.has(id));
    for (let n = 0; n < toUpload.length; n++) {
      setStatus(`Mengunggah foto ${n+1} dari ${toUpload.length}…`);
      await setDoc(doc(db, "photos", toUpload[n]), { data: photoData[toUpload[n]] });
      newPhotos.delete(toUpload[n]);
    }
    setStatus("Menyimpan isi…");
    await setDoc(doc(db, "site", "content"), clone(D));
    for (const id of old) if (!now.has(id)) await deleteDoc(doc(db, "photos", id)).catch(() => {});
    saved = clone(D); dirty = false;
    setStatus("Tersimpan. Dia akan melihat versi terbaru saat membuka halaman.");
  } catch (err) {
    const c = err?.code || "";
    setStatus(c.includes("permission-denied")
      ? "Ditolak Firestore. Pastikan rules sudah dipasang dan ADMIN_EMAIL sama persis dengan email login."
      : "Gagal menyimpan. Periksa koneksimu lalu coba lagi.", "err");
  } finally { saving = false; $("#saveBtn").disabled = false; }
};

addEventListener("beforeunload", e => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });
