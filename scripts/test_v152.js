/**
 * scripts/test_v152.js — Test unit v1.5.2 (fix nama file GoodShort tertimpa)
 * Jalankan: node scripts/test_v152.js
 * Akar bug: GOODSHORT_EP_RESOLVE_JS meng-hardcode ep:1 → semua episode tunggal
 * bernama "Judul - EP 1" dan file saling tertimpa.
 * Fix: nomor episode dari slug URL situs ("001-69606228" → 1, "013-…" → 13,
 * pola NNN-chapterId terverifikasi dari URL nyata drama Awakening) + fallback
 * field API + dedupe nama dalam batch (main.js).
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
async function ok(name, fn) {
  try { await fn(); pass++; console.log('  PASS  ' + name); }
  catch (e) { fail++; console.log('  FAIL  ' + name + '\n        ' + e.message); }
}

// ---------- load inject JS dari app.js (evaluasi escape seperti browser) ----------
const appSrc = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'app.js'), 'utf8');
function extractInject(name) {
  const m = appSrc.match(new RegExp('const ' + name + ' = `([\\s\\S]*?)`;'));
  if (!m) throw new Error(name + ' tidak ditemukan di app.js');
  assert(!m[1].includes('`'), name + ' berisi backtick (rusak)');
  assert(!m[1].includes('${'), name + ' berisi ${ (rusak)');
  return Function('return `' + m[1] + '`')();
}
let GS_EP_JS, GS_DRAMA_JS, VIDIO_JS;
try {
  GS_EP_JS = extractInject('GOODSHORT_EP_RESOLVE_JS');
  GS_DRAMA_JS = extractInject('GOODSHORT_DRAMA_RESOLVE_JS');
  VIDIO_JS = extractInject('VIDIO_RESOLVE_JS');
} catch (e) { console.error('FATAL', e.message); process.exit(1); }

// ---------- replika main.js ----------
function safeOutName(title) {
  let s = String(title || '');
  s = s.replace(/\s*[|\u2013\u2014-]\s*Vidio.*$/i, '');
  s = s.replace(/\s*[|\u2013\u2014-]\s*GoodShort.*$/i, '');
  s = s.replace(/\s*[\u2013\u2014-]\s*Nonton.*$/i, '');
  s = s.replace(/[<>:"/\\|?*\x00-\x1f]/g, '');
  s = s.replace(/\s+/g, ' ').trim();
  return ((s.length > 90 ? s.slice(0, 90).trim() : s) || 'video-situs');
}

// replika goodshort:resolve (main.js v1.5.2, termasuk dedupe)
function mapGsEntries(payload, checkFirstOk) {
  const title = safeOutName(payload.title || 'goodshort');
  const raw = Array.isArray(payload.entries) ? payload.entries
    .filter((x) => x && typeof x.url === 'string' && /^https?:\/\//.test(x.url))
    .slice(0, 200) : [];
  if (!raw.length) return { ok: false, reason: 'tidak ada kandidat episode' };
  if (!checkFirstOk) return { ok: false, reason: 'link episode tidak valid' };
  const seen = new Map();
  return {
    ok: true,
    entries: raw.map((x, i) => {
      let nm = `${title} - EP ${x.ep || i + 1}`;
      const dup = (seen.get(nm) || 0) + 1;
      seen.set(nm, dup);
      if (dup > 1) nm = `${nm} (${dup})`;
      return { url: x.url, outName: nm };
    }),
    outName: title
  };
}

// ---------- jalankan inject JS episode dengan stub browser ----------
// IIFE memakai location.pathname, fetch, localStorage → di-supply sbg parameter
function runGsEpJs(pathname, apiData) {
  const fakeLoc = { pathname };
  const fakeFetch = async (url, opts) => ({
    ok: true,
    json: async () => ({ status: 0, data: apiData })
  });
  const fakeLs = { getItem: () => 'en' };
  return new Function('location', 'fetch', 'localStorage', 'return (' + GS_EP_JS + ')')(fakeLoc, fakeFetch, fakeLs);
}

const STREAM = 'https://hls-play.goodreels.com/up/abc/index.m3u8';
const BOOK = { name: 'Awakening: Poseidon s Heir | GoodShort' };

(async () => {
  console.log('\n[1] Inject JS tetap valid (regresi struktur)');
  await ok('GS_EP_JS: endpoint + parsing slug ada, ep:1 hardcode HILANG', () => {
    new Function(GS_EP_JS);
    assert(GS_EP_JS.includes('/hwycreels/chapter/detail'), 'API chapter/detail hilang');
    assert(GS_EP_JS.includes("m3u8Path"), 'field m3u8Path hilang');
    assert(GS_EP_JS.includes("split('-').pop()"), 'parsing id dari slug hilang');
    assert(GS_EP_JS.includes("split('-')[0]"), 'parsing nomor episode dari slug hilang');
    assert(!/ep:\s*1\s*\}/.test(GS_EP_JS), 'ep:1 masih di-hardcode!');
  });
  await ok('GS_DRAMA_JS & VIDIO_JS tetap valid', () => {
    new Function(GS_DRAMA_JS);
    assert(GS_DRAMA_JS.includes('/hwycreels/chapter/page'));
    new Function(VIDIO_JS);
  });

  console.log('\n[2] Nomor episode dari slug URL (slug NYATA drama Awakening)');
  await ok('EP1: /episode/…/001-69606228 → ep 1', async () => {
    const r = await runGsEpJs('/episode/awakening-poseidon-s-heir-31001854937/001-69606228',
      { m3u8Path: STREAM, book: BOOK });
    assert(r.ok);
    assert.strictEqual(r.entries[0].ep, 1);
    assert.strictEqual(r.entries[0].url, STREAM);
  });
  await ok('EP2: /episode/…/002-69606229 → ep 2 (dulu: ep 1 → TERTIMPA)', async () => {
    const r = await runGsEpJs('/episode/awakening-poseidon-s-heir-31001854937/002-69606229',
      { m3u8Path: STREAM, book: BOOK });
    assert.strictEqual(r.entries[0].ep, 2);
  });
  await ok('EP13: /episode/…/013-69606240 → ep 13', async () => {
    const r = await runGsEpJs('/episode/awakening-poseidon-s-heir-31001854937/013-69606240',
      { m3u8Path: STREAM, book: BOOK });
    assert.strictEqual(r.entries[0].ep, 13);
  });
  await ok('judul diambil dari API book.name (suffix situs dibuang nanti)', async () => {
    const r = await runGsEpJs('/episode/awakening-poseidon-s-heir-31001854937/002-69606229',
      { m3u8Path: STREAM, book: BOOK });
    assert.strictEqual(r.title, 'Awakening: Poseidon s Heir | GoodShort');
  });

  console.log('\n[3] Fallback nomor episode kalau slug tidak numerik');
  await ok('slug "abc-123" + API num=7 → ep 7 (fallback field API)', async () => {
    const r = await runGsEpJs('/episode/my-drama-123/abc-69606240',
      { m3u8Path: STREAM, book: BOOK, num: 7 });
    assert.strictEqual(r.entries[0].ep, 7);
  });
  await ok('slug "abc-123" + API number=9 → ep 9', async () => {
    const r = await runGsEpJs('/episode/my-drama-123/abc-69606240',
      { m3u8Path: STREAM, book: BOOK, number: 9 });
    assert.strictEqual(r.entries[0].ep, 9);
  });
  await ok('slug & field API tidak valid → ep 1 (tidak crash)', async () => {
    const r = await runGsEpJs('/episode/my-drama-123/abc',
      { m3u8Path: STREAM, book: BOOK, sort: 'xx' });
    assert.strictEqual(r.entries[0].ep, 1);
  });
  await ok('path bukan episode → ok:false tanpa crash', async () => {
    const r = await runGsEpJs('/drama/my-drama-123', { m3u8Path: STREAM });
    assert.strictEqual(r.ok, false);
  });
  await ok('API gagal (status !== 0) → ok:false tanpa crash', async () => {
    const fakeLoc = { pathname: '/episode/my-drama-123/002-69606229' };
    const fakeFetch = async () => ({ ok: true, json: async () => ({ status: 8, message: 'Access Denied' }) });
    const r = await new Function('location', 'fetch', 'localStorage', 'return (' + GS_EP_JS + ')')(fakeLoc, fakeFetch, { getItem: () => 'en' });
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.entries.length, 0);
  });

  console.log('\n[4] Pemetaan entri + dedupe nama (main.js v1.5.2)');
  await ok('EP 5 dan EP 2 → nama berbeda (urutan bebas)', () => {
    const r = mapGsEntries({ title: 'X | GoodShort', entries: [{ url: 'https://c/5.m3u8', ep: 5 }, { url: 'https://c/2.m3u8', ep: 2 }] }, true);
    assert(r.ok);
    assert.strictEqual(r.entries[0].outName, 'X - EP 5');
    assert.strictEqual(r.entries[1].outName, 'X - EP 2');
  });
  await ok('dua entri ep sama → suffix (2) mencegah timpa', () => {
    const r = mapGsEntries({ title: 'X', entries: [{ url: 'https://c/a.m3u8', ep: 1 }, { url: 'https://c/b.m3u8', ep: 1 }] }, true);
    assert.strictEqual(r.entries[0].outName, 'X - EP 1');
    assert.strictEqual(r.entries[1].outName, 'X - EP 1 (2)');
  });
  await ok('tanpa ep → tetap EP 1..N berurutan', () => {
    const r = mapGsEntries({ title: 'X', entries: [{ url: 'https://c/1.m3u8' }, { url: 'https://c/2.m3u8' }, { url: 'https://c/3.m3u8' }] }, true);
    assert.strictEqual(r.entries[2].outName, 'X - EP 3');
  });
  await ok('nama file dari judul situs dibersihkan safeOutName', () => {
    const r = mapGsEntries({ title: 'Awakening: Poseidon s Heir EP 2 | GoodShort', entries: [{ url: 'https://c/2.m3u8', ep: 2 }] }, true);
    assert.strictEqual(r.entries[0].outName, 'Awakening Poseidon s Heir EP 2 - EP 2');
  });
  await ok('entri rusak/kosong → ok:false tanpa crash', () => {
    assert.strictEqual(mapGsEntries({ entries: [null, {}, { url: 'nope' }] }, true).ok, false);
    assert.strictEqual(mapGsEntries({}, true).ok, false);
  });

  console.log(`\n=== Hasil: ${pass} pass, ${fail} fail ===`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
