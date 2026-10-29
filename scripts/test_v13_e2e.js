/* Test E2E v1.3.0 — DownloadManager mengunduh m3u8 asli (FlickReels)
 * mensimulasikan alur: capture browser → URL m3u8 + referer → yt-dlp.
 * Jalankan: node scripts/test_v13_e2e.js
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawnSync } = require('child_process');
const { DownloadManager } = require('../lib/downloader');

// wrapper yt-dlp: python3 -m yt_dlp
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'klip13e2e-'));
const wrap = path.join(tmp, 'ytdlp');
fs.writeFileSync(wrap, '#!/bin/bash\nexec /home/z/.venv/bin/python3 -m yt_dlp "$@"\n');
fs.chmodSync(wrap, '755');

const outDir = path.join(tmp, 'out');
fs.mkdirSync(outDir);

// ambil m3u8 segar dari halaman episode flickreels
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36';
const page = spawnSync('curl', ['-sL', '-A', UA, 'https://www.flickreels.net/id/playlist/bukan-dia-tapi-kau/1292/episode-1'], { encoding: 'utf8', timeout: 60000 });
const m = (page.stdout || '').match(/https?:\/\/[^"' <>\s]*\.m3u8[^"' <>\s]*/);
if (!m) { console.log('GAGAL: m3u8 tidak ditemukan di halaman'); process.exit(1); }
const m3u8 = m[0];
console.log('m3u8:', m3u8.slice(0, 90) + '…');

const dm = new DownloadManager({
  ytdlpPath: wrap,
  ffmpegPath: '/usr/bin/ffmpeg',
  outDir,
  onEvent: (e) => {
    if (e.type === 'progress' && Math.round(e.pct) % 50 === 0) console.log(`  [${e.id}] ${e.pct.toFixed(0)}% ${e.speed || ''}`);
    if (e.type === 'done') console.log('  DONE →', e.file);
    if (e.type === 'error') console.log('  ERROR →', e.message);
  }
});

// persis seperti renderer: referer halaman episode yang mengirim video
const r = dm.start(m3u8, 'best', { referer: 'https://www.flickreels.net/id/playlist/bukan-dia-tapi-kau/1292/episode-1' });
if (r.error) { console.log('start error:', r.error); process.exit(1); }

const t0 = Date.now();
const iv = setInterval(() => {
  if (dm.active.size === 0 || Date.now() - t0 > 180000) {
    clearInterval(iv);
    try { dm.cancelAll(); } catch (e) {}
    const files = fs.readdirSync(outDir).filter((f) => f.endsWith('.mp4') || f.endsWith('.mkv') || f.endsWith('.webm'));
    console.log('file hasil:', files);
    if (files.length) {
      const st = fs.statSync(path.join(outDir, files[0]));
      console.log(`E2E OK — ${(st.size / 1024 / 1024).toFixed(1)} MB dalam ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      process.exit(0);
    }
    console.log('E2E GAGAL — tidak ada file');
    process.exit(1);
  }
}, 1000);
