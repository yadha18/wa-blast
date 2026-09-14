# Deploy ke Railway

Proyek ini di-deploy sebagai **2 service terpisah** dari repo yang sama: `server` (backend persisten) dan `client` (frontend statis).

## Persiapan

1. Push folder `wa-blast/` ini ke repository GitHub.
2. Buat akun di [railway.app](https://railway.app) dan hubungkan ke GitHub.

## 1. Deploy Backend (`server`)

1. **New Project → Deploy from GitHub repo** → pilih repo ini.
2. Di pengaturan service, set **Root Directory** ke `server`.
3. Railway otomatis mendeteksi Node.js (via Nixpacks) dan menjalankan `npm install` lalu `npm start`.
4. **Tambahkan Volume** (penting!):
   - Buka tab **Settings → Volumes** pada service ini.
   - Klik **New Volume**, mount path: `/data`.
   - Tanpa ini, sesi login WhatsApp dan database akan **hilang setiap kali redeploy**.
5. Set **Environment Variables** (tab Variables):
   ```
   DATA_DIR=/data
   CLIENT_ORIGIN=http://localhost:5173
   ```
   (`CLIENT_ORIGIN` akan diupdate lagi setelah frontend selesai di-deploy — lihat langkah 3.)
6. Deploy. Setelah selesai, buka tab **Settings → Networking → Generate Domain** untuk mendapat URL publik, misalnya:
   `https://wa-blast-server-production.up.railway.app`
7. Cek log deploy — pastikan muncul `[WA] Memulai koneksi ke WhatsApp...` dan `WA Bulk Blast server running on...`.

## 2. Deploy Frontend (`client`)

1. Di project Railway yang sama, klik **New Service → GitHub repo** (repo yang sama lagi).
2. Set **Root Directory** ke `client`.
3. Set **Environment Variable**:
   ```
   VITE_BACKEND_URL=https://wa-blast-server-production.up.railway.app
   ```
   (pakai URL backend dari langkah 1.6 — **tanpa trailing slash**, dan **wajib di-set sebelum build** karena Vite meng-inline env var saat build, bukan runtime.)
4. Deploy. Generate domain publik untuk service ini juga, misalnya:
   `https://wa-blast-client-production.up.railway.app`

## 3. Hubungkan Balik CORS Backend → Frontend

1. Kembali ke service **server**, buka tab **Variables**.
2. Update `CLIENT_ORIGIN` menjadi URL frontend dari langkah 2.4:
   ```
   CLIENT_ORIGIN=https://wa-blast-client-production.up.railway.app
   ```
3. Redeploy service `server` agar CORS & Socket.io mengizinkan origin frontend yang benar.

## 4. Scan QR & Uji Coba

1. Buka URL frontend di browser.
2. QR code akan muncul (dikirim real-time via Socket.io dari backend).
3. Scan dengan WhatsApp di HP → Perangkat Tertaut → Tautkan Perangkat.
4. Sesi tersimpan permanen di volume `/data/sessions` — tidak perlu scan ulang setelah redeploy backend (selama volume tidak dihapus).

## Catatan Biaya & Batasan

- Railway free tier punya kuota jam eksekusi bulanan terbatas — backend ini harus **selalu hidup** (bukan sleep/idle) karena harus mempertahankan koneksi WhatsApp terus-menerus. Untuk pemakaian produksi, gunakan plan berbayar (Hobby/Pro) agar service tidak di-suspend.
- Volume Railway punya batas ukuran sesuai plan — cukup untuk sessions + SQLite + banner gambar dalam ukuran wajar, tapi pantau jika mengunggah banyak banner besar.
- Jika ingin frontend tetap di Vercel (bukan Railway) dan hanya backend di Railway, itu juga bisa — cukup set `VITE_BACKEND_URL` saat build di Vercel dan `CLIENT_ORIGIN` di Railway mengarah ke domain Vercel-nya. Langkah-langkahnya sama, hanya platform frontend-nya beda.
