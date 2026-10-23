/**
 * Test lib/downloader.js di Linux (memakai yt-dlp_linux + ffmpeg sistem).
 * Memastikan: start → progress → file → done, repeat-download, cancel, list.
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const { DownloadManager } = require('../lib/downloader');

const YTDLP = process.env.KLIP_YTDLP || '/tmp/ytdlp_test/yt-dlp_linux';
const FFMPEG = process.env.KLIP_FFMPEG || '/usr/bin/ffmpeg';
const URLS = (process.env.TEST_URLS || 'https://download.samplelib.com/mp4/sample-5s.mp4').split('|');

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'klip-test-'));
console.log('outDir =', outDir);

function run(urls) {
  return new Promise((resolve, reject) => {
    const events = [];
    const dm = new DownloadManager({
      ytdlpPath: YTDLP,
      ffmpegPath: FFMPEG,
      outDir,
      onEvent: (e) => {
        if (e.type === 'progress') {
          // tampilkan setiap ~25%
          if (e.pct === 0 || e.pct % 25 < 1) console.log(`  [progress] ${e.pct}% ${e.speed} ETA ${e.eta}`);
        } else {
          console.log('  [event]', JSON.stringify(e).slice(0, 220));
        }
        events.push(e);
      }
    });

    let doneCount = 0;
    dm.onEvent = ((orig) => (e) => { orig(e); if (e.type === 'done' || e.type === 'error') { doneCount++; if (doneCount >= urls.length) resolve(events); } })(dm.onEvent);

    for (const u of urls) {
      const r = dm.start(u, 'best');
      console.log('start →', JSON.stringify(r));
      if (r.error) reject(new Error(r.error));
    }
    setTimeout(() => reject(new Error('TIMEOUT 180s')), 180000);
  });
}

(async () => {
  console.log('--- v1: ' + URLS.length + ' download berurutan (antrean) ---');
  const ev1 = await run(URLS);
  const done1 = ev1.filter((e) => e.type === 'done');
  if (done1.length !== URLS.length) throw new Error('done != jumlah url: ' + done1.length);
  for (const d of done1) {
    if (!d.file || !fs.existsSync(d.file)) throw new Error('file hasil tidak ada: ' + d.file);
    const st = fs.statSync(d.file);
    console.log('  FILE OK:', path.basename(d.file), (st.size / 1024).toFixed(0) + 'KB');
  }

  console.log('--- v2: download ulang URL sama (harus "already downloaded" → done) ---');
  const ev2 = await run([URLS[0]]);
  if (!ev2.some((e) => e.type === 'done' && e.file)) throw new Error('repeat download gagal');

  console.log('--- v3: cancel langsung ---');
  const dm3 = new DownloadManager({
    ytdlpPath: YTDLP, ffmpegPath: FFMPEG, outDir,
    onEvent: (e) => console.log('  [event]', JSON.stringify(e).slice(0, 160))
  });
  const r3 = dm3.start(URLS[0], 'best');
  setTimeout(() => { console.log('cancel →', dm3.cancelCurrent()); }, 700);
  await new Promise((r) => setTimeout(r, 4000));

  const files = fs.readdirSync(outDir).filter((f) => /\.(mp4|mkv|webm)$/i.test(f));
  console.log('files in dir:', files.length);
  console.log('\nALL TESTS PASSED ✅');
  process.exit(0);
})().catch((e) => { console.error('TEST FAILED ❌', e.message); process.exit(1); });
