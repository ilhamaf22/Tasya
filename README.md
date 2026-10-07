# Kado Ulang Tahun — panduan deploy (Vercel + Firebase)

Isi folder:

| File | Fungsi |
|---|---|
| `index.html`, `main.js`, `style.css` | Halaman ulang tahun untuk dia |
| `update.html`, `admin.js` | Halaman admin, terbuka di `/update` (pakai PIN) |
| `data.js` | Isi cadangan dan koneksi ke Firestore |
| `firebase-config.js` | Konfigurasi Firebase (sudah diisi) |
| `firestore.rules` | Aturan keamanan database |
| `vercel.json` | Supaya `/update` bisa dibuka tanpa `.html` |

Semua gratis: Firebase paket **Spark** (Firestore saja) dan Vercel paket **Hobby**.
Foto disimpan langsung di Firestore (sudah diperkecil otomatis), jadi tidak perlu Firebase Storage,
yang sekarang mewajibkan paket berbayar Blaze.

---

## 1. Buat proyek Firebase

1. Buka https://console.firebase.google.com lalu klik **Create a project**. Google Analytics boleh dimatikan.
2. Di halaman proyek, klik ikon **Web (`</>`)** untuk menambah aplikasi web. Nama bebas, hosting tidak perlu dicentang.
3. Salin isi `firebaseConfig` yang muncul ke file `firebase-config.js`.

## 2. Aktifkan Firestore

1. Menu **Build → Firestore Database → Create database**.
2. Pilih lokasi terdekat, misalnya `asia-southeast2 (Jakarta)`, lalu mode **production**.
3. Buka tab **Rules**, hapus isinya, tempel isi file `firestore.rules`, lalu klik **Publish**.

## 3. Buat PIN admin

PIN tidak disimpan di kode, tapi di Firestore, di dokumen yang tidak bisa dibaca dari website.

1. Di **Firestore Database → Data**, klik **+ Start collection**.
2. Collection ID: `admin` → Next.
3. Document ID: `secret`.
4. Tambahkan field: nama `pin`, tipe **string**, value PIN pilihanmu (misalnya `250314`).
5. Klik **Save**.

Pakai minimal 6 digit supaya tidak mudah ditebak. Untuk mengganti PIN, ubah value di dokumen itu.

## 4. Tambahkan lagu

Taruh file MP3 di folder ini dengan nama `lagu.mp3`.
Lagu tidak disimpan di Firebase karena satu dokumen Firestore maksimal 1 MB.
Kalau nama filenya lain, ubah di halaman admin bagian **Lagu**.

## 5. Deploy ke Vercel

**Cara A: lewat GitHub (disarankan)**

1. Buat repository baru di GitHub, lalu unggah semua file di folder ini.
2. Buka https://vercel.com/new, pilih repository tadi.
3. **Framework Preset: Other**. Build Command dan Output Directory dikosongkan.
4. Klik **Deploy**. Setiap kali kamu push ke GitHub, Vercel otomatis deploy ulang.

**Cara B: lewat terminal**

```bash
npm i -g vercel
cd kado-ultah
vercel          # deploy pertama, ikuti pertanyaannya
vercel --prod   # terbitkan ke domain utama
```

## 6. Isi kontennya

1. Buka `https://domainmu.vercel.app/update` lalu masukkan PIN.
2. Isi nama, surat, foto, doa, dan lainnya.
3. Klik **Simpan**. Halaman utama langsung menampilkan isi baru saat dibuka atau di-refresh.

---

## Batas gratis yang relevan

- Firestore: 1 GiB penyimpanan, 50.000 baca dan 20.000 tulis per hari. Satu kunjungan memakai
  sekitar 1 baca + 1 baca per foto, jadi jauh di bawah batas.
- Foto diperkecil ke sekitar 300–700 KB per foto.

## Kalau ada masalah

- **"Firebase belum diatur"** di `/update`: `firebase-config.js` masih berisi `ISI_...`.
- **"PIN salah"** padahal sudah benar: rules terbaru belum di-Publish, dokumen `admin/secret`
  belum dibuat, atau field `pin` bertipe number (harus **string**).
- **"Ditolak Firestore"** saat menyimpan: rules belum di-Publish, atau PIN diganti di Firestore
  saat halaman admin masih terbuka. Klik **Keluar**, lalu masukkan PIN lagi.
- **Halaman utama masih menampilkan isi contoh**: belum pernah menekan Simpan di `/update`,
  atau buka Console browser (F12) untuk melihat pesan errornya.
- Foto yang dihapus dari galeri tetap tersimpan di Firestore (tidak tampil lagi). Ini tidak masalah
  untuk kuota gratis; kalau mau bersih, hapus manual di koleksi `photos`.