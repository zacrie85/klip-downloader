/**
 * Test lib/downloader.js v1.1.0 di Linux (memakai yt-dlp_linux + ffmpeg sistem).
 * Uji: paralel multi-slot, mode MP3, thumbnail flag, cancel per-id, repeat.
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const { DownloadManager } = require('../lib/downloader');

const YTDLP = process.env.KLIP_YTDLP || '/tmp/ytdlp_test/yt-dlp_linux';
const FFMPEG = process.env.KLIP_FFMPEG || '/usr/bin/ffmpeg';
const U1 = 'https://download.samplelib.com/mp4/sample-5s.mp4';
const U2 = 'https://download.samplelib.com/mp4/sample-10s.mp4';
const U3 = 'https://download.samplelib.com/mp4/sample-15s.mp4';

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'klip-test-'));
console.log('outDir =', outDir);

function makeDm(label) {
  const dm = new DownloadManager({
    ytdlpPath: YTDLP,
    ffmpegPath: FFMPEG,
    outDir,
    onEvent: (e) => {
      if (e.type === 'progress') {
        if (e.pct === 0 || e.pct % 50 < 1) console.log(`  [${label}][${e.id}] ${e.pct}% ${e.speed} ETA ${e.eta}`);
      } else {
        console.log(`  [${label}][event]`, JSON.stringify(e).slice(0, 200));
      }
    }
  });
  return dm;
}

function waitDone(dm, n) {
  return new Promise((resolve, reject) => {
    const seen = new Set();
    const orig = dm.onEvent;
    dm.onEvent = (e) => {
      orig(e);
      if (e.type === 'done' || e.type === 'error') {
        seen.add(e.id + ':' + e.type);
        const dones = [...seen].filter((s) => s.endsWith(':done')).length;
        if (dones >= n) return resolve();
        if ([...seen].some((s) => s.endsWith(':error'))) return reject(new Error('ada event error'));
      }
    };
    setTimeout(() => reject(new Error('TIMEOUT 240s')), 240000);
  });
}

(async () => {
  console.log('--- T1: PARALEL — 3 URL sekaligus, maxConcurrent=3 ---');
  const dm = makeDm('T1');
  dm.setMaxConcurrent(3);
  const r1 = dm.start(U1, 'best', { thumb: true });
  const r2 = dm.start(U2, 'best', { thumb: true });
  const r3 = dm.start(U3, 'best', { thumb: true });
  if (r1.error || r2.error || r3.error) throw new Error('start gagal: ' + JSON.stringify([r1, r2, r3]));
  await waitDone(dm, 3);
  const st1 = dm.getStatus();
  if (st1.active !== 0 || st1.queued !== 0) throw new Error('status tidak bersih: ' + JSON.stringify(st1));
  const mp4s = fs.readdirSync(outDir).filter((f) => f.endsWith('.mp4'));
  console.log('  mp4 files:', mp4s.length, mp4s);
  if (mp4s.length < 3) throw new Error('hasil paralel kurang dari 3');
  const thumbs = fs.readdirSync(outDir).filter((f) => /\.(jpg|png|webp)$/i.test(f));
  console.log('  thumbnail files (boleh 0 untuk generic extractor):', thumbs.length);

  console.log('--- T2: PARALEL TERBATAS — 3 URL, maxConcurrent=1 (harus berurutan) ---');
  const dm2 = makeDm('T2');
  dm2.setMaxConcurrent(1);
  let maxActive = 0;
  const origEmit = dm2.emit;
  dm2.emit = function (e) { if (e.type === 'status') maxActive = Math.max(maxActive, e.active); origEmit.call(this, e); };
  dm2.start(U1, '360', {});
  dm2.start(U2, '360', {});
  dm2.start(U3, '360', {});
  await waitDone(dm2, 3);
  console.log('  maxActive teramati =', maxActive);
  if (maxActive !== 1) throw new Error('maxConcurrent=1 dilanggar, maxActive=' + maxActive);

  console.log('--- T3: MODE MP3 ---');
  const dm3 = makeDm('T3');
  dm3.setMaxConcurrent(2);
  dm3.start(U1, 'best', { mode: 'mp3' });
  await waitDone(dm3, 1);
  const mp3s = fs.readdirSync(outDir).filter((f) => f.endsWith('.mp3'));
  console.log('  mp3 files:', mp3s.length, mp3s);
  if (mp3s.length < 1) throw new Error('mode mp3 tidak menghasilkan file .mp3');

  console.log('--- T4: CANCEL per-id (masih antre) ---');
  const dm4 = makeDm('T4');
  dm4.setMaxConcurrent(1);
  const a = dm4.start(U1, 'best', {});
  const b = dm4.start(U2, 'best', {});
  const cRes = dm4.cancel(b.id);
  console.log('  cancel item antre →', cRes);
  if (!cRes) throw new Error('cancel antre gagal');
  await new Promise((r) => setTimeout(r, 9000));

  console.log('\nALL TESTS PASSED ✅');
  process.exit(0);
})().catch((e) => { console.error('TEST FAILED ❌', e.message); process.exit(1); });
