# Kado Ulang Tahun — panduan deploy (Vercel + Firebase)

Isi folder:

| File | Fungsi |
|---|---|
| `index.html`, `main.js`, `style.css` | Halaman ulang tahun untuk dia |
| `update.html`, `admin.js` | Halaman admin, terbuka di `/update` (pakai login) |
| `data.js` | Isi cadangan dan koneksi ke Firestore |
| `firebase-config.js` | **Wajib diisi**: konfigurasi Firebase dan email admin |
| `firestore.rules` | Aturan keamanan database |
| `vercel.json` | Supaya `/update` bisa dibuka tanpa `.html` |

Semua gratis: Firebase paket **Spark** (Firestore + Authentication) dan Vercel paket **Hobby**.
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
3. Buka tab **Rules**, hapus isinya, tempel isi file `firestore.rules`.
4. Ganti `emailkamu@gmail.com` dengan email admin-mu, lalu klik **Publish**.

## 3. Buat akun admin

1. Menu **Build → Authentication → Get started**.
2. Tab **Sign-in method** → aktifkan **Email/Password**.
3. Tab **Users** → **Add user** → isi email dan kata sandi untuk login admin.
4. Isi email yang sama di `ADMIN_EMAIL` pada `firebase-config.js`.
   Email di `firestore.rules` dan di `firebase-config.js` harus sama persis.

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

## 6. Izinkan domain Vercel di Firebase

**Authentication → Settings → Authorized domains → Add domain**, isi domain Vercel-mu,
misalnya `kado-ultah.vercel.app`.

## 7. Isi kontennya

1. Buka `https://domainmu.vercel.app/update` lalu login dengan akun admin.
2. Isi nama, surat, foto, doa, dan lainnya.
3. Klik **Simpan**. Halaman utama langsung menampilkan isi baru saat dibuka atau di-refresh.

---

## Batas gratis yang relevan

- Firestore: 1 GiB penyimpanan, 50.000 baca dan 20.000 tulis per hari. Satu kunjungan memakai
  sekitar 1 baca + 1 baca per foto, jadi jauh di bawah batas.
- Foto diperkecil ke sekitar 300–700 KB per foto.

## Kalau ada masalah

- **"Firebase belum diatur"** di `/update`: `firebase-config.js` masih berisi `ISI_...`.
- **"Ditolak Firestore"** saat menyimpan: rules belum di-publish, atau email di rules,
  `ADMIN_EMAIL`, dan email login tidak sama persis.
- **Halaman utama masih menampilkan isi contoh**: belum pernah menekan Simpan di `/update`,
  atau buka Console browser (F12) untuk melihat pesan errornya.
