/* Test v1.3.0 — unit test lib/mediacapture.js + DownloadManager (referer/direct)
 * Jalankan: node scripts/test_v13.js  (tanpa Electron)
 */
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { createMediaTracker, isMediaUrl, isMediaContentType, shouldCapture } = require('../lib/mediacapture');
const { DownloadManager, DIRECT_MEDIA_RE } = require('../lib/downloader');

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log('  ✔', name); }
  catch (e) { fail++; console.log('  ✘', name, '→', e.message); }
}

console.log('== 1) isMediaUrl ==');
t('m3u8 polos', () => assert(isMediaUrl('https://cdn.example.com/v/1.m3u8')));
t('m3u8 + query', () => assert(isMediaUrl('https://x.y/a/video.m3u8?verify=abc123')));
t('mp4', () => assert(isMediaUrl('https://x.y/film.mp4')));
t('ts segment diabaikan (manifest mewakili)', () => assert(!isMediaUrl('https://x.y/h/seg_00001.ts')));
t('mpd dash', () => assert(isMediaUrl('https://x.y/a.mpd?tok=1')));
t('audio m4a diabaikan (hindari sfx UI)', () => assert(!isMediaUrl('https://x.y/song.m4a')));
t('HTML bukan media', () => assert(!isMediaUrl('https://x.y/page.html')));
t('path berisi "mp4" tapi bukan file', () => assert(!isMediaUrl('https://x.y/mp4-tips-untuk-kamu')));
t('blob: di-skip', () => assert(!isMediaUrl('blob:https://x.y/1234')));
t('data: di-skip', () => assert(!isMediaUrl('data:video/mp4;base64,xxx')));

console.log('== 2) isMediaContentType ==');
t('video/mp4', () => assert(isMediaContentType('video/mp4')));
t('vnd.apple.mpegurl', () => assert(isMediaContentType('application/vnd.apple.mpegurl')));
t('dash+xml', () => assert(isMediaContentType('application/dash+xml')));
t('audio/webm ditolak (filter sfx)', () => assert(!isMediaContentType('audio/webm')));
t('text/html ditolak', () => assert(!isMediaContentType('text/html; charset=utf-8')));

console.log('== 2b) shouldCapture (penggabung URL + resourceType) ==');
t('m3u8 → ya', () => assert(shouldCapture('https://cdn.x/v/ep.m3u8?tok=1', 'xhr')));
t('success.mp3 (sfx) → tidak', () => assert(!shouldCapture('https://www.youtube.com/s/search/audio/success.mp3', 'media')));
t('segment .ts → tidak', () => assert(!shouldCapture('https://cdn.x/h/seg_1.ts', 'xhr')));
t('elemen <video> tanpa ekstensi → ya', () => assert(shouldCapture('https://cdn.x/stream?token=1', 'media')));
t('googlevideo (YouTube) → tidak', () => assert(!shouldCapture('https://rr4---sn-x.googlevideo.com/videoplayback?id=1', 'media')));
t('halaman html → tidak', () => assert(!shouldCapture('https://x.y/page.html', 'document')));

console.log('== 3) createMediaTracker ==');
const events = [];
const tr = createMediaTracker((e) => events.push(e));
t('note URL valid → tersimpan', () => {
  assert(tr.note('https://cdn1.example.com/drama/ep1.m3u8?x=1', 'https://shortical.com/'));
  assert.strictEqual(tr.count(), 1);
  assert.strictEqual(tr.list()[0].referer, 'https://shortical.com/');
});
t('duplikat dalam 8 menit → diabaikan', () => {
  assert(!tr.note('https://cdn1.example.com/drama/ep1.m3u8?x=1'));
  assert.strictEqual(tr.count(), 1);
});
t('segment ts juga dicatat, list terbaru dulu', () => {
  tr.note('https://cdn1.example.com/drama/seg_2.ts', '');
  assert.strictEqual(tr.list()[0].url.includes('seg_2.ts'), true);
  assert.strictEqual(tr.count(), 2);
});
t('event media-found ter-emit', () => {
  assert(events.length >= 2);
  assert.strictEqual(events[0].type, 'media-found');
  assert.strictEqual(events[0].count, 1);
});
t('host tidak valid ditolak', () => {
  assert(!tr.note('https://localhost/x.m3u8'));
  assert(!tr.note('not-a-url'));
});
t('clear mengosongkan', () => {
  tr.clear();
  assert.strictEqual(tr.count(), 0);
});

console.log('== 4) DIRECT_MEDIA_RE ==');
t('episode page flickreels BUKAN direct', () => assert(!DIRECT_MEDIA_RE.test('https://www.flickreels.net/id/playlist/bukan-dia-tapi-kau/1292/episode-1')));
t('m3u8 = direct', () => assert(DIRECT_MEDIA_RE.test('https://dirjqbe1kaah2.cloudfront.net/193/1/video.m3u8')));

console.log('== 5) DownloadManager: referer + direct diplumbing ke args ==');
(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'klip13-'));
  // stub ytdlp: script shell yang print argumen lalu sukses + print path file
  const stub = path.join(tmp, 'ytdlp-stub.sh');
  fs.writeFileSync(stub, '#!/bin/bash\nsleep 30\n');
  fs.chmodSync(stub, '755');
  const outDir = path.join(tmp, 'out');
  fs.mkdirSync(outDir);
  const dm = new DownloadManager({ ytdlpPath: stub, ffmpegPath: '/usr/bin/ffmpeg', outDir, onEvent: () => {} });
  t('start menerima referer tanpa error', () => {
    const r = dm.start('https://cdn.example.com/a/video.m3u8?tok=1', 'best', { referer: 'https://shortical.com/x(id=1)' });
    assert(r && r.id, 'harus punya id');
    const item = dm.active.get(r.id);
    assert(item, 'item harus aktif (stub sleep)');
    assert.strictEqual(item.referer, 'https://shortical.com/x(id=1)');
    assert.strictEqual(item.thumb, true);
  });
  t('cancel item berjalan', () => {
    const ids = [...dm.active.keys()];
    assert.strictEqual(dm.cancel(ids[0]), true);
  });

  console.log(`\nHASIL: ${pass} pass, ${fail} fail`);
  process.exit(fail ? 1 : 0);
})();
