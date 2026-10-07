import { DEFAULTS, esc, clone, merge, loadContent, loadPhoto } from "./data.js";

const $ = s => document.querySelector(s);
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

let C = clone(DEFAULTS);
const photos = {};   // id foto -> data URL dari Firestore

const camSvg = `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 6l1.5-2h5L16 6"/></svg>`;
const phInner = g => photos[g.photo] ? `<img src="${photos[g.photo]}" alt="${esc(g.caption)}" loading="lazy">` : camSvg;
const song = $("#song"), player = $("#player");
let wished = false, ri = 0, gi = 0;

function renderGallery(){
  $("#gallery").innerHTML = C.galeri.map((g,i) =>
    `<button class="polaroid" data-i="${i}"><div class="ph">${phInner(g)}</div><div class="cap">${esc(g.caption)}</div></button>`).join("");
}

function render(){
  document.querySelectorAll("[data-fill]").forEach(el => {
    const k = el.dataset.fill;
    if (k === "tanggalJadian") {
      const d = new Date(C.tanggalJadian + "T00:00:00");
      el.textContent = isNaN(d) ? C.tanggalJadian : d.toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"});
    } else if (C[k] != null) el.textContent = C[k];
  });
  $("#letterBody").innerHTML = C.surat.map(p => `<p>${esc(p)}</p>`).join("");
  $("#timeline").innerHTML = C.kisah.map(k =>
    `<li><time>${esc(k.tanggal)}</time><h3>${esc(k.judul)}</h3><p>${esc(k.cerita)}</p></li>`).join("");
  renderGallery();

  wished = false;
  const candles = $("#candles"); candles.innerHTML = "";
  for (let i = 0; i < Math.max(1, Math.min(12, +C.jumlahLilin || 1)); i++) {
    const c = document.createElement("button"); c.className = "candle"; c.setAttribute("aria-label", "Tiup lilin " + (i+1));
    candles.appendChild(c);
  }
  $("#blowAll").hidden = false; $("#wishResult").hidden = true;

  ri = 0; showReason();
  $("#envelopes").innerHTML = C.bukaSaat.map((b,i) => `<button class="env" data-i="${i}"><span>…${esc(b.label)}</span></button>`).join("");

  $("#trackTitle").textContent = C.lagu.judul || "Lagu kita";
  $("#trackSub").textContent = C.lagu.penyanyi || "";
  if (C.lagu.file) song.src = C.lagu.file; else { song.removeAttribute("src"); songMissing(); }
  tick();
}

// Dialog
document.querySelectorAll("[data-open]").forEach(b => b.addEventListener("click", () => {
  const d = document.getElementById(b.dataset.open); d.showModal();
  if (d.id === "dlgGallery") showGrid();
}));
document.querySelectorAll("dialog").forEach(d => {
  d.querySelectorAll("[data-close]").forEach(x => x.addEventListener("click", () => d.close()));
  d.addEventListener("click", e => { if (e.target === d) d.close(); });
});

// Galeri
function showGrid(){ $("#gallery").hidden = false; $("#lightbox").hidden = true; }
function showPhoto(i){
  if (!C.galeri.length) return;
  gi = (i + C.galeri.length) % C.galeri.length; const g = C.galeri[gi];
  $("#lbPh").innerHTML = phInner(g); $("#lbCap").textContent = g.caption;
  $("#gallery").hidden = true; $("#lightbox").hidden = false;
}
$("#gallery").addEventListener("click", e => { const p = e.target.closest(".polaroid"); if (p) showPhoto(+p.dataset.i); });
$("#lbPrev").onclick = () => showPhoto(gi - 1);
$("#lbNext").onclick = () => showPhoto(gi + 1);
$("#lbBack").onclick = showGrid;

// Lilin
$("#candles").addEventListener("click", e => { const c = e.target.closest(".candle"); if (c) { c.classList.add("out"); checkCandles(); } });
$("#blowAll").onclick = () => { $("#candles").querySelectorAll(".candle").forEach((c,i) => setTimeout(() => { c.classList.add("out"); checkCandles(); }, i*120)); };
function checkCandles(){
  if (wished || $("#candles").querySelector(".candle:not(.out)")) return;
  wished = true;
  setTimeout(() => {
    $("#wishPrompt").textContent = "Keinginanmu sudah terkirim ke langit ✨";
    $("#blowAll").hidden = true;
    $("#wishList").innerHTML = C.doa.map((d,i) => `<li style="animation-delay:${i*.15}s"><b>${i+1}</b><span>${esc(d)}</span></li>`).join("");
    $("#wishResult").hidden = false;
    burst(innerWidth/2, innerHeight/2, 60);
  }, 500);
}

// Pengukur sayang
const heartBtn = $("#heartBtn"); let level = 0, holdT = null, maxed = false;
const labels = [[0,"Mulai dari sini…"],[20,"Segini? Masih kurang."],[40,"Lebih dari semua kopi yang kita minum"],[60,"Lebih dari jumlah chat kita"],[80,"Lebih dari bintang di langit"],[95,"Alatnya mulai panas…"],[100,"ERROR: melebihi batas ukur"]];
function setLevel(v){
  level = Math.min(v, 100);
  $("#meterFill").style.width = level + "%";
  let t = labels[0][1]; labels.forEach(([n,s]) => { if (level >= n) t = s; });
  $("#meterLabel").textContent = (level >= 100 ? "∞%" : Math.floor(level) + "%") + " · " + t;
  if (level >= 100 && !maxed){ maxed = true; stopHold(); $("#loveFinal").hidden = false; burst(innerWidth/2, innerHeight/2, 90); }
}
function startHold(e){ e.preventDefault(); if (maxed) return; heartBtn.classList.add("holding");
  holdT = setInterval(() => { setLevel(level + 0.9); if (Math.random() < .5) spawnHeart(innerWidth/2 + (Math.random()-.5)*200, innerHeight*.55); }, 30); }
function stopHold(){ heartBtn.classList.remove("holding"); clearInterval(holdT); }
heartBtn.addEventListener("pointerdown", startHold);
["pointerup","pointerleave","pointercancel"].forEach(ev => heartBtn.addEventListener(ev, stopHold));
heartBtn.addEventListener("keydown", e => { if ((e.key === " " || e.key === "Enter") && !maxed) { e.preventDefault(); setLevel(level + 6); } });
setLevel(0);

// Penghitung waktu bersama
function tick(){
  let s = Math.floor((Date.now() - new Date(C.tanggalJadian + "T00:00:00")) / 1000);
  if (!(s > 0)) s = 0;
  $("#cDays").textContent = Math.floor(s/86400).toLocaleString("id-ID");
  $("#cHours").textContent = Math.floor(s%86400/3600);
  $("#cMins").textContent = Math.floor(s%3600/60);
  $("#cSecs").textContent = s%60;
}
setInterval(tick, 1000);

// Alasan
function showReason(){
  const c = $("#reasonCard"); c.classList.remove("flip"); void c.offsetWidth; c.classList.add("flip");
  $("#reasonNum").textContent = "Alasan #" + (ri+1); $("#reasonText").textContent = C.alasan[ri] || "";
}
$("#reasonBtn").onclick = () => { if (!C.alasan.length) return; ri = (ri + 1) % C.alasan.length; showReason(); };

// Amplop
$("#envelopes").addEventListener("click", e => { const b = e.target.closest(".env"); if (!b) return; const n = C.bukaSaat[+b.dataset.i];
  $("#noteTitle").textContent = "Buka saat kamu " + n.label; $("#noteBody").textContent = n.isi; $("#dlgNote").showModal(); });

// Lagu
const playSvg = '<path d="M8 5v14l11-7z"/>', pauseSvg = '<path d="M7 5h4v14H7zM13 5h4v14h-4z"/>';
function setPlaying(on){ player.classList.toggle("playing", on); $("#playIco").innerHTML = on ? pauseSvg : playSvg;
  $("#playBtn").setAttribute("aria-label", on ? "Jeda lagu" : "Putar lagu"); }
function songMissing(){
  setPlaying(false);
  const L = C.lagu;
  $("#trackSub").innerHTML = `${esc(L.penyanyi)}${L.link ? ` · <a href="${esc(L.link)}" target="_blank" rel="noopener">dengarkan di sini ↗</a>` : ""}`;
}
song.addEventListener("error", () => { if (C.lagu.file) songMissing(); });
song.addEventListener("play", () => setPlaying(true));
song.addEventListener("pause", () => setPlaying(false));
const playSong = () => { if (!C.lagu.file) { songMissing(); return; } song.play().catch(songMissing); };
$("#playBtn").onclick = () => { if (song.paused) playSong(); else song.pause(); };

// Hati melayang + konfeti
const cv = $("#hearts"), cx = cv.getContext("2d"); let W, H, parts = [];
function size(){ const r = devicePixelRatio || 1; W = innerWidth; H = innerHeight; cv.width = W*r; cv.height = H*r; cx.setTransform(r,0,0,r,0,0); }
size(); addEventListener("resize", size);
const COLORS = ["#f26b9b","#c2185b","#ffb3cb","#e8b04b","#ffd6e3"];
function heartPath(x,y,s){ cx.beginPath(); cx.moveTo(x,y+s*.3); cx.bezierCurveTo(x,y,x-s*.5,y,x-s*.5,y+s*.3); cx.bezierCurveTo(x-s*.5,y+s*.6,x,y+s*.8,x,y+s); cx.bezierCurveTo(x,y+s*.8,x+s*.5,y+s*.6,x+s*.5,y+s*.3); cx.bezierCurveTo(x+s*.5,y,x,y,x,y+s*.3); cx.fill(); }
function spawnHeart(x,y){ parts.push({x,y,vx:(Math.random()-.5)*1.5,vy:-1-Math.random()*2,s:10+Math.random()*14,c:COLORS[Math.random()*3|0],life:1,heart:true,a:0}); }
function burst(x,y,n){ for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2, v=3+Math.random()*7; parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-4,s:6+Math.random()*8,c:COLORS[Math.random()*5|0],life:1,heart:Math.random()<.4,a:Math.random()*6,g:true}); } }
let ambient = 0;
function loop(){
  cx.clearRect(0,0,W,H);
  if (!reduce && ++ambient % 40 === 0) parts.push({x:Math.random()*W,y:H+20,vx:0,vy:-.6-Math.random()*.6,s:8+Math.random()*12,c:COLORS[Math.random()*3|0],life:.55,heart:true,a:0,amb:true});
  parts = parts.filter(p => p.life > 0 && p.y > -40 && p.y < H+60);
  for (const p of parts){
    p.x += p.vx + (p.amb ? Math.sin(p.y/40)*.4 : 0); p.y += p.vy; p.a += .05;
    if (p.g){ p.vy += .18; p.vx *= .99; p.life -= .008; } else if (!p.amb) p.life -= .012;
    cx.globalAlpha = Math.max(0, Math.min(1, p.life)); cx.fillStyle = p.c;
    if (p.heart) heartPath(p.x, p.y, p.s);
    else { cx.save(); cx.translate(p.x,p.y); cx.rotate(p.a); cx.fillRect(-p.s/2,-p.s/4,p.s,p.s/2); cx.restore(); }
  }
  cx.globalAlpha = 1; requestAnimationFrame(loop);
}
loop();
$("#confettiBtn").onclick = e => { const r = e.target.getBoundingClientRect(); burst(r.left + r.width/2, r.top, 120);
  if (song.paused && C.lagu.file) playSong(); };

// Muat isi dari Firestore
render();
loadContent()
  .then(async j => {
    if (!j) return;
    C = merge(j); render();
    const ids = C.galeri.map(g => g.photo).filter(Boolean);
    await Promise.all(ids.map(id => loadPhoto(id).then(d => { if (d) photos[id] = d; }).catch(() => {})));
    renderGallery();
  })
  .catch(err => console.warn("Isi dari Firebase belum bisa dimuat:", err));
