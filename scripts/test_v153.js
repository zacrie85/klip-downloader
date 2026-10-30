/**
 * scripts/test_v153.js — Test unit v1.5.3 (fix BiliBili "Postprocessing:
 * Error opening output files: Invalid argument")
 * Jalankan: node scripts/test_v153.js
 * Menguji:
 *  1. Retry otomatis sekali dalam mode SLIM (tanpa --add-metadata & thumbnail)
 *     saat kegagalan postprocessing → download akhirnya sukses.
 *  2. Kegagalan BUKAN postprocessing → TIDAK di-retry (1 error saja).
 *  3. Kegagalan postprocessing terus-menerus → retry tepat 1x lalu error jelas.
 *  4. Event 'start' ulang dipancarkan (baris UI di-reset).
 * Fake engine = skrip shell yang menyimulasikan perilaku yt-dlp + args.log.
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const assert = require('assert');
const { DownloadManager } = require('../lib/downloader');

let pass = 0, fail = 0;
async function ok(name, fn) {
  try { await fn(); pass++; console.log('  PASS  ' + name); }
  catch (e) { fail++; console.log('  FAIL  ' + name + '\n        ' + e.message); }
}

const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'klip153-'));
const OUTDIR = path.join(WORK, 'out');
fs.mkdirSync(OUTDIR, { recursive: true });
const FINAL = path.join(OUTDIR, 'E2 [23391057].mp4');
fs.writeFileSync(FINAL, 'dummy-mp4-data');
const FAKE = path.join(WORK, 'fake-ytdlp.sh');
fs.writeFileSync(FAKE, `#!/usr/bin/env bash
BIN_DIR="$(dirname "$0")"
MODE="$(cat "$BIN_DIR/mode.txt" 2>/dev/null || echo fail-once)"
echo "$@" >> "$BIN_DIR/args.log"
if [ "$MODE" = "bad-url" ]; then
  echo "ERROR: Requested format is not available"
  exit 1
fi
if echo "$@" | grep -q -- '--add-metadata'; then
  # percobaan penuh (bukan slim) → selalu gagal di postprocessing
  echo "ERROR: Postprocessing: Error opening output files: Invalid argument"
  exit 1
fi
if [ "$MODE" = "fail-always" ]; then
  echo "ERROR: Postprocessing: Error opening output files: Invalid argument"
  exit 1
fi
echo "$1" > /dev/null
echo "${FINAL}"
exit 0
`);
fs.chmodSync(FAKE, 0o755);

function run(mode, extraOpts = {}) {
  fs.writeFileSync(path.join(WORK, 'mode.txt'), mode);
  fs.writeFileSync(path.join(WORK, 'args.log'), '');
  const events = [];
  const dm = new DownloadManager(Object.assign({
    ytdlpPath: FAKE,
    ffmpegPath: '/usr/bin/ffmpeg',
    outDir: OUTDIR,
    onEvent: (e) => events.push(e)
  }, extraOpts));
  const doneP = new Promise((resolve) => {
    const orig = dm.onEvent;
    dm.onEvent = (e) => {
      orig(e);
      if (e.type === 'done' || e.type === 'error') setTimeout(() => resolve(events), 30);
    };
  });
  dm.start('https://www.bilibili.tv/id/play/2268965/23391057', 'best', { mode: 'video', thumb: true });
  return doneP.then((ev) => ({ events, argsLog: fs.readFileSync(path.join(WORK, 'args.log'), 'utf8') }));
}

function countType(ev, t) { return ev.filter((e) => e.type === t).length; }
function argsBlocks(log) { return log.split('\n').filter(Boolean); } // 1 baris = 1 pemanggilan engine

(async () => {
  console.log('\n[1] Retry postprocessing → slim → sukses');
  await ok('gagal PP sekali → retry otomatis → done (tanpa event error)', async () => {
    const { events, argsLog } = await run('fail-once');
    assert.strictEqual(countType(events, 'error'), 0, 'tidak boleh ada event error, dapat: ' + JSON.stringify(events.filter(e => e.type === 'error')));
    assert.strictEqual(countType(events, 'done'), 1, 'harus done');
    assert.strictEqual(countType(events, 'start'), 2, 'start 2x (penuh + slim)');
    const warns = events.filter((e) => e.type === 'log' && /mencoba ulang/i.test(e.line || ''));
    assert(warns.length >= 1, 'harus ada log percobaan ulang');
    assert(events.find((e) => e.type === 'done' && e.file === FINAL), 'file akhir benar');
    const blocks = argsBlocks(argsLog);
    assert.strictEqual(blocks.length, 2, 'engine dipanggil 2x');
    assert(blocks[0].includes('--add-metadata'), 'panggilan 1 harus mode penuh');
    assert(!blocks[1].includes('--add-metadata'), 'panggilan 2 (slim) TANPA --add-metadata');
    assert(!blocks[1].includes('--write-thumbnail'), 'panggilan 2 (slim) TANPA thumbnail');
    assert(blocks[1].includes('--windows-filenames'), 'arg inti tetap ada di mode slim');
  });

  console.log('\n[2] Kegagalan bukan postprocessing → tidak di-retry');
  await ok('format tidak tersedia → 1 error, engine dipanggil 1x', async () => {
    const { events, argsLog } = await run('bad-url');
    assert.strictEqual(countType(events, 'error'), 1);
    assert.strictEqual(countType(events, 'start'), 1);
    assert.strictEqual(countType(events, 'done'), 0);
    assert.strictEqual(argsBlocks(argsLog).length, 1, 'tidak boleh retry');
    assert(/format is not available/.test(events.find(e => e.type === 'error').message));
  });

  console.log('\n[3] Postprocessing selalu gagal → retry tepat 1x lalu error');
  await ok('2 panggilan engine, 1 event error dengan pesan asli', async () => {
    const { events, argsLog } = await run('fail-always');
    assert.strictEqual(countType(events, 'error'), 1);
    assert.strictEqual(countType(events, 'start'), 2, 'tepat 2 percobaan');
    assert.strictEqual(argsBlocks(argsLog).length, 2, 'tidak boleh lebih dari 1 retry');
    assert(/Invalid argument/.test(events.find(e => e.type === 'error').message), 'pesan error dipertahankan');
  });

  console.log('\n[4] Regresi kecil');
  await ok('pola error postprocessing terdeteksi (semua varian)', () => {
    const RE = /postprocessing|error opening output|incorrect codec parameters/i;
    assert(RE.test('ERROR: Postprocessing: Error opening output files: Invalid argument'));
    assert(RE.test('ERROR: Postprocessing: Could not write header (incorrect codec parameters ?): Invalid argument'));
    assert(!RE.test('ERROR: HTTP Error 404: Not Found'));
    assert(!RE.test('ERROR: Sign in to confirm your age'));
  });

  console.log(`\n=== Hasil: ${pass} pass, ${fail} fail ===`);
  fs.rmSync(WORK, { recursive: true, force: true });
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
