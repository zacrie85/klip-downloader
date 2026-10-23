# 🎬 Klip Downloader

**Downloader video + browser built-in — 100% lokal, gratis, tanpa batas.**

![Version](https://img.shields.io/badge/version-1.0.0-green) ![Platform](https://img.shields.io/badge/platform-Windows%20x64-blue)

Klip Downloader adalah aplikasi Windows untuk **mengunduh video** dari YouTube, TikTok, Instagram, Facebook, X/Twitter, Vimeo, Google Drive, Dailymotion, dan **1000+ situs lain** — dilengkapi **browser built-in** sehingga kamu bisa browsing, menonton, dan langsung mengunduh dalam satu aplikasi.

---

## ✨ Fitur

| Fitur | Keterangan |
|---|---|
| 🌐 **Browser Built-in** | Buka YouTube / situs mana pun langsung dari aplikasi. Tonton video di dalam aplikasi. |
| 🎯 **Deteksi Otomatis URL** | Saat membuka halaman video (YouTube, TikTok, dll.), URL otomatis terisi ke menu Sumber Video. |
| 📥 **Download Sekali Klik** | Tempel URL → klik Download. Selesai. |
| ⚙️ **Pilihan Kualitas** | Terbaik (otomatis), ≤1080p, ≤720p, ≤480p, ≤360p. |
| ⚡ **Antrean Download** | Bisa antre beberapa video sekaligus, diproses berurutan. |
| 📊 **Progress Real-time** | Persentase, kecepatan, ETA, dan bisa dibatalkan kapan saja. |
| 🛠 **Update Engine 1-Klik** | Update yt-dlp ke versi terbaru langsung dari aplikasi. |
| 🔒 **100% Lokal** | Tanpa server, tanpa akun, tanpa telemetri. Semua proses di komputarmu. |

## 📦 Instalasi

1. Unduh `Klip-Downloader-Setup-1.0.0.exe` dari [halaman Releases](../../releases).
2. Jika Windows SmartScreen muncul (karena aplikasi belum ditandatangani), klik **More info → Run anyway**.
3. Ikuti wizard instalasi, selesai!

## 🚀 Cara Pakai

### Cara 1 — Lewat Browser Built-in
1. Di kotak **🌐 Browser**, buka situs video (default: YouTube) atau ketik alamat di address bar.
2. Tonton / cari video yang kamu mau.
3. Saat membuka halaman video, URL **otomatis terisi** ke menu **📥 Sumber Video** — tinggal klik **⬇ Download**.
4. Bisa juga klik **⬇ Gunakan URL Halaman Ini untuk Download** kapan saja.

### Cara 2 — Tempel URL
1. Salin link video dari browser/apapun.
2. Klik **📋 Tempel** (atau tempel manual) di kotak **📥 Sumber Video**.
3. Pilih kualitas → klik **⬇ Download**.

### 💡 Tips YouTube
Bila YouTube menampilkan *"Sign in to confirm you're not a bot"* saat download: **login dulu ke YouTube lewat browser built-in** di aplikasi, lalu coba download lagi. Cookie login dipakai otomatis oleh engine dan tersimpan hanya di komputarmu.

## 📁 Lokasi Hasil Download

Video tersimpan di: `C:\Users\<nama>\Videos\Klip Downloader` (bisa dibuka cepat lewat tombol **Buka Folder**).

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
- Aplikasi ini tidak berafiliasi dengan YouTube, TikTok, Instagram, Facebook, atau platform lainnya.

## 📄 Lisensi

MIT © 2026 [zacrie85](https://github.com/zacrie85)
