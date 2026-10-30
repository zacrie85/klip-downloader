/* Test v1.4.0 — Dukungan BiliBili TV (bilibili.tv)
 * 1) Pola URL (isPlaylistUrl + VIDEO_PATTERNS) untuk semua bentuk URL bilibili.tv
 * 2) Ekspansi playlist nyata: URL drama → seluruh episode (yt-dlp --flat-playlist)
 * Jalankan: node scripts/test_v14.js
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

let fail = 0;
function check(name, cond) {
  console.log((cond ? '  ✅' : '  ❌') + ' ' + name);
  if (!cond) fail++;
}

// ---- salinan logika v1.4.0 dari main.js / app.js ----
function isPlaylistUrl(u) {
  if (/youtube\.com\/watch\?/i.test(u)) return false;
  if (/bilibili\.tv\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?play\/\d+\/?([?#]|$)/i.test(u)) return true;
  return (
    /[?&]list=/i.test(u) ||
    /youtube\.com\/playlist\?/i.test(u) ||
    /youtube\.com\/channel\//i.test(u) ||
    /youtube\.com\/@[\w.-]+(\/videos?)?\/?$/i.test(u)
  );
}
const BILI_PATTERNS = [
  /bilibili\.tv\/(?:[a-zA-Z]{2}(?:-[a-zA-Z0-9]{2,6})?\/)?video\/\d+/i,
  /bilibili\.tv\/(?:[a-zA-Z]{2}(?:-[a-zA-Z0-9]{2,6})?\/)?play\/\d+(?:\/\d+)?/i
];
function isVideoUrlBili(u) { return BILI_PATTERNS.some((r) => r.test(u || '')); }

console.log('== 1) Pola URL ==');
check('episode: bilibili.tv/id/play/2130147/13810256 → video URL', isVideoUrlBili('https://www.bilibili.tv/id/play/2130147/13810256'));
check('drama:   bilibili.tv/id/play/2130147 → video URL', isVideoUrlBili('https://www.bilibili.tv/id/play/2130147'));
check('drama:   bilibili.tv/en/play/34613 → video URL', isVideoUrlBili('https://www.bilibili.tv/en/play/34613'));
check('video:   bilibili.tv/id/video/2045730385 → video URL', isVideoUrlBili('https://www.bilibili.tv/id/video/2045730385'));
check('lang ganda: bilibili.tv/zh-Hans/play/123/456 → video URL', isVideoUrlBili('https://www.bilibili.tv/zh-Hans/play/123/456'));
check('tanpa lang: bilibili.tv/play/34613/341736 → video URL', isVideoUrlBili('https://www.bilibili.tv/play/34613/341736'));
check('drama URL → dianggap PLAYLIST (isPlaylistUrl)', isPlaylistUrl('https://www.bilibili.tv/id/play/2130147?bstar_from=bstar-web.short-drama.0.0'));
check('episode URL → BUKAN playlist', !isPlaylistUrl('https://www.bilibili.tv/id/play/2130147/13810256'));
check('video URL → BUKAN playlist', !isPlaylistUrl('https://www.bilibili.tv/id/video/2045730385'));
check('YouTube watch?v= tetap single', !isPlaylistUrl('https://www.youtube.com/watch?v=abc&list=xyz'));
check('YouTube playlist tetap playlist', isPlaylistUrl('https://www.youtube.com/playlist?list=xyz'));
check('URL halaman daftar (short-drama) BUKAN video URL', !isVideoUrlBili('https://www.bilibili.tv/id/short-drama'));

console.log('== 2) Ekspansi playlist drama nyata ==');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'klip14-'));
const wrap = path.join(tmp, 'ytdlp');
fs.writeFileSync(wrap, '#!/bin/bash\nexec /home/z/.venv/bin/python3 -m yt_dlp "$@"\n');
fs.chmodSync(wrap, '755');

const r = spawnSync(wrap, ['-J', '--flat-playlist', '--playlist-items', '1-200',
  'https://www.bilibili.tv/id/play/2130147'], { encoding: 'utf8', timeout: 90000 });
if (r.status !== 0 && !r.stdout) {
  console.log('  ❌ flat-playlist gagal:', (r.stderr || '').slice(0, 200));
  fail++;
} else {
  try {
    const j = JSON.parse(r.stdout);
    const entries = (j.entries || []).filter((x) => x && (x.url || x.id));
    check('_type=playlist', j._type === 'playlist');
    check('judul drama terbaca: "' + (j.title || '').slice(0, 40) + '"', !!j.title);
    check('episode >= 10 (dapat ' + entries.length + ')', entries.length >= 10);
    check('URL episode mengandung /play/{season}/{ep}', /bilibili\.tv\/[a-z-]+\/play\/\d+\/\d+/i.test(entries[0] && entries[0].url || ''));
    console.log('  contoh:', entries.slice(0, 2).map((e) => (e.title || 'E?') + ' → ' + String(e.url).slice(0, 58)).join(' | '));
  } catch (e) {
    console.log('  ❌ parse gagal:', e.message);
    fail++;
  }
}

console.log(fail === 0 ? '\nSEMUA TEST LULUS ✅' : `\n${fail} TEST GAGAL ❌`);
process.exit(fail === 0 ? 0 : 1);
