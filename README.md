# 🎬 Klip Downloader

**Downloader video + browser built-in — 100% lokal, gratis, tanpa batas.**

![Version](https://img.shields.io/badge/version-1.5.2-green) ![Platform](https://img.shields.io/badge/platform-Windows%20x64-blue)

Klip Downloader adalah aplikasi Windows untuk **mengunduh video** dari YouTube, TikTok, Instagram, Facebook, X/Twitter, Vimeo, Google Drive, Dailymotion, **BiliBili TV, Vidio, Dramaharian, FlickReels, Shortical, GoodShort**, dan **1000+ situs lain** — dilengkapi **browser built-in** sehingga kamu bisa browsing, menonton, dan langsung mengunduh dalam satu aplikasi.

---

## ✨ Fitur

| Fitur | Keterangan |
|---|---|
| 🎯 **MEDIA CAPTURE — SITUS DRAMA** | **v1.3.0** — buka episode di **FlickReels / Shortical / GoodShort** di browser aplikasi, tekan **Play** → video terdeteksi otomatis (chip hijau 🎯) → klik → download. Bekerja juga untuk situs apa pun yang video-nya dinamis! |
| ✂️ **URL Episode Langsung** | **v1.3.0** — link episode FlickReels (dan kebanyakan situs) bisa langsung ditempel & diunduh tanpa buka browser. |
| 📺 **BILIBILI TV (SHORT DRAMA)** | **v1.4.0** — tempel URL episode `bilibili.tv/id/play/{drama}/{ep}` atau URL dramanya `bilibili.tv/id/play/{drama}` → **seluruh episode otomatis masuk antrean paralel** (contoh: 1 drama = 72 episode). Juga mendukung `bilibili.tv/id/video/{id}`. Deteksi otomatis saat browsing di browser aplikasi. |
| 🎭 **DRAMAHARIAN (SHORT DRAMA)** | **v1.5.0** — tempel URL drama `dramaharian.com/drama/{provider}/{id}` → **semua episode gratis otomatis masuk antrean paralel** dengan nama file rapi (`Judul Drama - EP 1.mp4`, dst). Mendukung semua provider (dramabite, dramawave, flextv, flickreels, freereels, dll). URL episode tunggal `/tonton/…` juga didukung. |
| 🎬 **GOODSHORT (SHORT DRAMA)** | **BARU v1.5.1 · diperbaiki v1.5.2** — buka episode `goodshort.com/episode/…` di browser aplikasi → link video otomatis siap (chip 📺) → klik → unduh dengan nama file unik per episode (`Judul - EP 2.mp4`, dst). Halaman drama → semua episode gratis masuk antrean paralel. |
| 📺 **VIDIO.COM** | **v1.5.0 · diperbaiki v1.5.1** — buka videonya di browser aplikasi → link stream disiapkan otomatis (chip 📺) → klik → unduh. Series `premier/…` otomatis. Premium: login di browser aplikasi (non-DRM). |
| 🖥 **Layout Baru 30/70** | Kolom kiri 30% berisi semua menu (berurutan atas–bawah), kolom kanan 70% penuh untuk browser. |
| 🌐 **Browser Built-in** | Buka YouTube / situs mana pun langsung dari aplikasi. Tonton video di dalam aplikasi. |
| 🎯 **Deteksi Otomatis URL** | Saat membuka halaman video (YouTube, TikTok, dll.), URL otomatis terisi ke menu Sumber Video. |
| 📥 **Download Sekali Klik** | Tempel URL → klik Video atau MP3. Selesai. |
| ⚡ **DOWNLOAD PARALEL** | Hingga **5 video bersamaan** — download pertama jalan, video berikutnya tetap bisa langsung diunduh. |
| 🎵 **Mode MP3** | Audio saja, kualitas terbaik + cover art otomatis tertanam. Hemat kuota! |
| 📜 **Dukungan Playlist** | Tempel link playlist/channel YouTube → semua video otomatis masuk antrean. |
| 🖼 **Thumbnail** | Gambar cover video (JPG) ikut disimpan (bisa dimatikan). |
| 📁 **Pilih Folder Simpan** | Bebas tentukan lokasi hasil download — tersimpan permanen. |
| ⚙️ **Pilihan Kualitas** | Terbaik (otomatis), ≤1080p, ≤720p, ≤480p, ≤360p. |
| 📊 **Progress Real-time** | Bar progress per-download, kecepatan, ETA, tombol batal per-item. |
| 🛠 **Update Engine 1-Klik** | Update yt-dlp ke versi terbaru langsung dari aplikasi. |
| 🔒 **100% Lokal** | Tanpa server, tanpa akun, tanpa telemetri. Semua proses di komputarmu. |

## 📦 Instalasi

1. Unduh `Klip-Downloader-Setup-1.5.2.exe` dari [halaman Releases](../../releases).
2. Jika Windows SmartScreen muncul (karena aplikasi belum ditandatangani), klik **More info → Run anyway**.
3. Ikuti wizard instalasi, selesai!

## 🚀 Cara Pakai

### Tata Letak (v1.2.0)
- **Kiri (30%)** — semua menu berurutan dari atas ke bawah: Sumber Video (URL, Video/MP3, kualitas, paralel, thumbnail, folder), progress download, dan Hasil Download.
- **Kanan (70%)** — browser built-in layar penuh untuk browsing & menonton.

### Cara 1 — Lewat Browser Built-in
1. Di panel **browser (kanan)**, buka situs video (default: YouTube) atau ketik alamat di address bar.
2. Tonton / cari video yang kamu mau.
3. Saat membuka halaman video, URL **otomatis terisi** ke menu **📥 Sumber Video** (kiri) — tinggal klik **⬇ Video** atau **🎵 MP3**.
4. Bisa juga klik **⬇ Gunakan URL Halaman Ini untuk Download** kapan saja.

### Cara 2 — Tempel URL
1. Salin link video dari browser/apapun.
2. Klik **📋 Tempel** (atau tempel manual) di panel **📥 Sumber Video** (kiri).
3. Pilih mode: **⬇ Video** (MP4) atau **🎵 MP3** (audio saja) → klik.

### ⚡ Download Paralel
Di baris pengaturan pilih **Paralel: 1–5** — jumlah video yang diunduh bersamaan. Setiap download punya bar progress + tombol batal sendiri.

### 📜 Playlist
Tempel link playlist (`youtube.com/playlist?list=…`) atau channel (`youtube.com/@nama/videos`) → semua video otomatis masuk antrean dan diunduh paralel (maks 200 item).

### 📺 BiliBili TV (Short Drama) — v1.4.0
1. Buka `bilibili.tv/id/short-drama` di browser aplikasi atau salin URL dramanya.
2. Tempel **URL drama** (`bilibili.tv/id/play/2130147`) → semua episode (bisa puluhan) otomatis masuk antrean paralel; atau tempel **URL satu episode** (`bilibili.tv/id/play/2130147/13810256`) untuk download episode itu saja.
3. Klik **⬇ Video** — selesai! Konten VIP/berbayar tetap hanya bisa diakses sesuai akunmu.

### 🎭 Dramaharian (Short Drama) — v1.5.0
1. Buka `dramaharian.com` di browser aplikasi, pilih drama yang kamu mau.
2. Salin URL dramanya (`dramaharian.com/drama/dramabite/10297`) → tempel di Sumber Video → klik **⬇ Video**.
3. **Semua episode gratis** otomatis dibaca lewat API situs lalu masuk antrean paralel — episode berbayar/terkunci dilewati otomatis. Nama file: `Judul Drama - EP 1.mp4`, `Judul Drama - EP 2.mp4`, dst.
4. Mau 1 episode saja? Buka episode-nya, salin URL `/tonton/{provider}/{id}/{ep}` lalu tempel.

### 📺 Vidio.com — v1.5.0
1. Tempel URL video (`vidio.com/watch/{id}-{slug}` atau `embed/…`) → klik **⬇ Video**. Konten gratis langsung terunduh.
2. **Konten premium / berlangganan**: buka `vidio.com` di **browser aplikasi** → **login** ke akun Vidio-mu → salin URL videonya → download. Cookie login dipakai otomatis oleh engine (tersimpan lokal di komputarmu).
3. **Series (`vidio.com/premier/…`)** → seluruh episode otomatis masuk antrean paralel.
4. **Live TV**: tonton dulu di browser aplikasi → bila yt-dlp gagal, tekan Play lalu pakai chip 🎯 "Video terdeteksi" di menu kiri.

### 💡 Tips YouTube
Bila YouTube menampilkan *"Sign in to confirm you're not a bot"* saat download: **login dulu ke YouTube lewat browser built-in** di aplikasi, lalu coba download lagi. Cookie login dipakai otomatis oleh engine dan tersimpan hanya di komputarmu.

## 📁 Lokasi Hasil Download

Default: `C:\Users\<nama>\Videos\Klip Downloader`. Ingin ganti? Klik **Pilih Folder** — pilihan tersimpan permanen. Buka cepat lewat tombol **Buka Folder**.

## 🛠 Update Engine

Situs video sering berubah — jika download tiba-tiba gagal, klik **🛠 Update Engine** untuk memperbarui yt-dlp ke versi terbaru, lalu restart aplikasi.

## 🧑‍💻 Build dari Source

```bash
npm install
# butuh file binari di folder bin/: yt-dlp.exe, ffmpeg.exe, ffprobe.exe, node.exe
bash scripts/download-binaries.sh   # unduh otomatis semua binari
npm run build:win                   # NODE_OPTIONS patch otomatis dipakai
```

Build Windows di Linux butuh: `NODE_OPTIONS="--require ./scripts/patch-macos-check.js" npx electron-builder --win` (script `build:win` sudah mengaturnya).

## ⚖️ Catatan

- Gunakan hanya untuk konten yang kamu punya izin untuk mengunduh.
- Aplikasi ini tidak berafiliasi dengan YouTube, TikTok, Instagram, Facebook, BiliBili, Vidio, Dramaharian, atau platform lainnya.

## 📄 Lisensi

MIT © 2026 [zacrie85](https://github.com/zacrie85)

## 🗒 Changelog

### v1.5.2
- **FIX GoodShort — nama file saling menimpa**: sebelumnya SEMUA episode tunggal dinamai `Judul - EP 1` (nomor episode di-hardcode), sehingga mengunduh episode ke-2 menimpa file episode pertama.
  - Nomor episode kini diambil dari slug URL situs: `…/episode/judul-drama-123/002-69606229` → **EP 2**, `013-…` → **EP 13** (pola `NNN-chapterId` resmi situs).
  - Fallback ke field nomor episode API bila slug tidak numerik; terakhir → EP 1.
  - Chip 📺 kini menampilkan **nama file persis** yang akan dihasilkan (mis. `Judul - EP 2`).
- **Anti-timpa ekstra**: dalam satu batch, bila dua entri menghasilkan nama sama, otomatis diberi suffix `(2)`, `(3)`, dst. Download tetap memakai `--no-overwrites`.
- Test: `scripts/test_v152.js` (16 pass) — slug EP 1/2/13 nyata, fallback, dedupe; seluruh suite lama tetap lulus (v151: 17, v15: 31, v14, v13: 31, downloader).

### v1.5.1
- **FIX Vidio (vidio.com)** — video modern tidak lagi punya playlist publik (yt-dlp → `HTTP 404`) dan konten premium butuh session:
  - Baru: buka videonya di **browser aplikasi** → link stream disiapkan **otomatis** (±7 detik, lewat endpoint token resmi player Vidio dari konteks halaman) → chip 📺 **"Link video siap"** muncul → klik → langsung unduh.
  - URL `watch/{id}` tanpa slug kini juga terdeteksi.
  - Konten premium: **login vidio.com di browser aplikasi** → link premium non-DRM ikut ter-resolve otomatis. Konten DRM tetap tidak bisa diunduh.
- **FIX GoodShort (goodshort.com)** — URL episode langsung gagal (`Unsupported URL` — yt-dlp tidak mendukung & API situs dilindungi WAF):
  - Baru: buka episode di **browser aplikasi** → link video diambil otomatis dari API resmi situs (dari konteks halaman) → chip 📺 → klik → unduh.
  - Baru: buka halaman **drama** `goodshort.com/drama/…` → **semua episode gratis** otomatis masuk antrean paralel dengan nama file `Judul - EP 1.mp4`, dst.
- Nama file otomatis dari judul halaman (suffix situs dibuang otomatis).
- Link stream selalu divalidasi sebelum diunduh (playlist mati/kedaluwarsa terdeteksi).
- Test: `scripts/test_v151.js` (17 pass) — inject JS ketiga situs, deteksi URL, nama file, validasi live.

### v1.5.0
- **Dramaharian (dramaharian.com)** — download short drama lewat API resmi situs:
  - URL drama `…/drama/{provider}/{id}` → semua episode gratis otomatis masuk antrean paralel (maks 200).
  - URL episode `…/tonton/{provider}/{id}/{ep}` → download episode tunggal.
  - Nama file rapi otomatis: `Judul Drama - EP {n}.mp4`.
  - Semua provider didukung (dramabite, dramawave, flextv, flickreels, freereels, dll).
  - Episode berbayar/terkunci dilewati otomatis + info progres di log.
- **Vidio (vidio.com)** — download VOD, series, dan live TV:
  - VOD `…/watch/{id}-{slug}` & `…/embed/{id}-{slug}` via extractor Vidio yt-dlp.
  - Series `…/premier/{id}/{slug}` → seluruh episode otomatis (playlist paralel).
  - Live TV `…/live/{id}` + fallback media capture.
  - Konten premium: login vidio.com di browser built-in → cookie otomatis dipakai engine.
- Deteksi otomatis URL untuk kedua situs saat browsing di browser aplikasi.
- Panduan error khusus Vidio (login premium/live) di toast.
- Test: `scripts/test_v15.js` (31 pass) + `scripts/test_v15_e2e.js` (API live + download nyata).

### v1.4.0
- **BiliBili TV (bilibili.tv)** — download video & short drama dari bilibili.tv (semua bahasa: /id/, /en/, dll.):
  - URL drama `…/play/{drama}` → seluruh episode otomatis masuk antrean paralel (playlist).
  - URL episode `…/play/{drama}/{ep}` & video `…/video/{id}` → download tunggal.
  - Deteksi otomatis saat membuka halaman episode di browser built-in.
  - Panduan khusus di toast bila download gagal (konten VIP/region).

### v1.3.0
- Media capture dari browser built-in untuk FlickReels / Shortical / GoodShort (chip 🎯 "Video terdeteksi").
- Header Referer otomatis untuk URL media hasil capture.
- Chip deteksi otomatis diperluas ke situs short drama.
