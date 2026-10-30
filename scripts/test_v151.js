/**
 * scripts/test_v151.js — Test unit v1.5.1 (fix download Vidio + GoodShort)
 * Jalankan: node scripts/test_v151.js
 * Menguji: validitas inject-JS ketiga situs, pola URL, safeOutName,
 *          pemetaan entri goodshort, dan validasi stream nyata (live API).
 */
const assert = require('assert');
const https = require('https');
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
async function ok(name, fn) {
  try { await fn(); pass++; console.log('  PASS  ' + name); }
  catch (e) { fail++; console.log('  FAIL  ' + name + '\n        ' + e.message); }
}

// ---------- replika main.js ----------
const app_ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36';

function checkStreamUrl(url, referer) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const lib = u.protocol === 'https:' ? require('https') : require('http');
      const req = lib.get(u, {
        headers: { 'User-Agent': app_ua, 'Accept': '*/*', ...(referer ? { 'Referer': referer } : {}) },
        timeout: 9000
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && !res.headers.location.startsWith('/drm')) {
          res.resume();
          const next = new URL(res.headers.location, u).href;
          return checkStreamUrl(next, referer).then(resolve);
        }
        if (res.statusCode !== 200) { res.resume(); return resolve({ ok: false, reason: 'HTTP ' + res.statusCode }); }
        let buf = '', doneF = false;
        res.on('data', (d) => {
          if (doneF) return;
          doneF = true; buf += d.toString('utf8'); res.destroy();
          if (buf.includes('#EXTM3U') || buf.includes('#EXT-X')) return resolve({ ok: true, url });
          if (buf.length > 4) return resolve({ ok: true, url });
          resolve({ ok: false, reason: 'isi kosong' });
        });
        res.on('error', () => { if (!doneF) { doneF = true; resolve({ ok: false, reason: 'koneksi terputus' }); } });
      });
      req.on('timeout', () => { try { req.destroy(new Error('timeout')); } catch (e) {} });
      req.on('error', (e) => resolve({ ok: false, reason: e.message }));
    } catch (e) { resolve({ ok: false, reason: e.message }); }
  });
}

function safeOutName(title) {
  let s = String(title || '');
  s = s.replace(/\s*[|\u2013\u2014-]\s*Vidio.*$/i, '');
  s = s.replace(/\s*[|\u2013\u2014-]\s*GoodShort.*$/i, '');
  s = s.replace(/\s*[\u2013\u2014-]\s*Nonton.*$/i, '');
  s = s.replace(/[<>:"/\\|?*\x00-\x1f]/g, '');
  s = s.replace(/\s+/g, ' ').trim();
  return ((s.length > 90 ? s.slice(0, 90).trim() : s) || 'video-situs');
}

// ---------- load inject JS dari app.js (evaluasi escape seperti browser) ----------
const appSrc = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'app.js'), 'utf8');
function extractInject(name) {
  const m = appSrc.match(new RegExp('const ' + name + ' = `([\\s\\S]*?)`;'));
  if (!m) throw new Error(name + ' tidak ditemukan di app.js');
  assert(!m[1].includes('`'), name + ' berisi backtick (rusak)');
  assert(!m[1].includes('${'), name + ' berisi ${ (rusak)');
  // evaluasi escape string template PERSIS seperti yang dilakukan browser
  return Function('return `' + m[1] + '`')();
}
let VIDIO_JS, GS_EP_JS, GS_DRAMA_JS;
try {
  VIDIO_JS = extractInject('VIDIO_RESOLVE_JS');
  GS_EP_JS = extractInject('GOODSHORT_EP_RESOLVE_JS');
  GS_DRAMA_JS = extractInject('GOODSHORT_DRAMA_RESOLVE_JS');
} catch (e) { console.error('FATAL', e.message); process.exit(1); }

// replika getResolveSite renderer
function getResolveSite(u) {
  try {
    const x = new URL(u);
    if (/(^|\.)vidio\.com$/i.test(x.hostname)) {
      if (/\/(watch|embed|live)\/\d+/.test(x.pathname)) return { kind: 'vidio', referer: 'https://www.vidio.com/' };
      return null;
    }
    if (/(^|\.)goodshort\.com$/i.test(x.hostname)) {
      if (/\/episode\/[a-z0-9-]+\/[a-z0-9-]+/i.test(x.pathname)) return { kind: 'gs-ep', referer: 'https://www.goodshort.com/' };
      if (/\/drama\/[a-z0-9-]+/i.test(x.pathname)) return { kind: 'gs-drama', referer: 'https://www.goodshort.com/' };
      return null;
    }
  } catch (e) {}
  return null;
}

// replika pemetaan entri goodshort di main.js
function mapGsEntries(payload, checkFirstOk) {
  const title = safeOutName(payload.title || 'goodshort');
  const raw = Array.isArray(payload.entries) ? payload.entries
    .filter((x) => x && typeof x.url === 'string' && /^https?:\/\//.test(x.url))
    .slice(0, 200) : [];
  if (!raw.length) return { ok: false, reason: 'tidak ada kandidat episode' };
  if (!checkFirstOk) return { ok: false, reason: 'link episode tidak valid' };
  return { ok: true, entries: raw.map((x, i) => ({ url: x.url, outName: `${title} - EP ${x.ep || i + 1}` })), outName: title };
}

(async () => {
  console.log('\n[1] Inject JS (3 situs) valid & lengkap');
  await ok('VIDIO_RESOLVE_JS bisa di-parse + endpoint lengkap', () => {
    new Function(VIDIO_JS);
    assert(VIDIO_JS.includes("(async () => {"), 'bukan IIFE async');
    assert(VIDIO_JS.includes("/live/' + id + '/tokens"), 'token endpoint hilang');
    assert(VIDIO_JS.includes('interactions_stream.json'), 'interactions hilang');
    assert(VIDIO_JS.includes("credentials:'include'"), 'credentials hilang');
    // escape regex benar → /^(?:\/live\/)/ harus tertulis dgn escape tunggal di runtime string
    assert(VIDIO_JS.includes('/^\\/live\\//'), 'escape regex live rusak: ' + JSON.stringify(VIDIO_JS.slice(0, 300)));
  });
  await ok('GOODSHORT_EP_RESOLVE_JS valid + API chapter/detail', () => {
    new Function(GS_EP_JS);
    assert(GS_EP_JS.includes('/hwycreels/chapter/detail'), 'API chapter/detail hilang');
    assert(GS_EP_JS.includes("m3u8Path"), 'field m3u8Path hilang');
    assert(GS_EP_JS.includes("split('-').pop()"), 'parsing id dari slug hilang');
  });
  await ok('GOODSHORT_DRAMA_RESOLVE_JS valid + API chapter/page', () => {
    new Function(GS_DRAMA_JS);
    assert(GS_DRAMA_JS.includes('/hwycreels/chapter/page'), 'API chapter/page hilang');
    assert(GS_DRAMA_JS.includes('records'), 'parsing records hilang');
  });
  await ok('regex path inject JS benar (simulasi runtime di Node)', () => {
    // VIDIO_JS punya 2 regex (watch/embed ATAU live) — keduanya diekstrak & diuji
    const regexes = [];
    let rx = /location\.pathname\.match\((\/[^\n]+?\/)\)/g;
    let mm;
    while ((mm = rx.exec(VIDIO_JS))) regexes.push(mm[1]);
    assert(regexes.length >= 2, 'vidio harus punya 2 regex path, dapat ' + regexes.length);
    const res = regexes.map((src) => new Function('return ' + src)());
    assert(res[0].test('/watch/8715189-episode-01'));
    assert(res[0].test('/embed/7115874-abc'));
    assert(res[1].test('/live/5075-sctv'));
    assert(!res[0].test('/premier/2885/x') && !res[1].test('/premier/2885/x'));
    const m2 = GS_EP_JS.match(/location\.pathname\.match\((\/[^\n]+?\/i?)\)/);
    assert(m2, 'regex path gs-ep tidak ditemukan');
    const re2 = new Function('return ' + m2[1])();
    assert(re2.test('/episode/awakening-poseidon-s-heir-31001854937/001-69606228'));
    const m3 = GS_DRAMA_JS.match(/location\.pathname\.match\((\/[^\n]+?\/i?)\)/);
    const re3 = new Function('return ' + m3[1])();
    assert(re3.test('/drama/awakening-poseidon-s-heir-31001854937'));
  });

  console.log('\n[2] Deteksi situs (getResolveSite)');
  await ok('vidio watch/embed/live → kind vidio', () => {
    assert.strictEqual(getResolveSite('https://www.vidio.com/watch/8715189-episode-01').kind, 'vidio');
    assert.strictEqual(getResolveSite('https://www.vidio.com/watch/8715189').kind, 'vidio');
    assert.strictEqual(getResolveSite('https://www.vidio.com/live/5075-sctv').kind, 'vidio');
    assert.strictEqual(getResolveSite('https://www.vidio.com/'), null);
  });
  await ok('goodshort episode & drama → kind gs-ep/gs-drama', () => {
    assert.strictEqual(getResolveSite('https://www.goodshort.com/episode/awakening-poseidon-s-heir-31001854937/001-69606228').kind, 'gs-ep');
    assert.strictEqual(getResolveSite('https://www.goodshort.com/drama/awakening-poseidon-s-heir-31001854937').kind, 'gs-drama');
    assert.strictEqual(getResolveSite('https://www.goodshort.com/'), null);
    assert.strictEqual(getResolveSite('https://youtube.com/watch?v=x'), null);
  });

  console.log('\n[3] safeOutName (judul → nama file)');
  await ok('buang suffix " | Vidio" (urutan strip benar)', () => {
    assert.strictEqual(safeOutName('Episode 01 - Terlalu Manis | Vidio'), 'Episode 01 - Terlalu Manis');
  });
  await ok('buang suffix " | GoodShort"', () => {
    assert.strictEqual(safeOutName('Awakening: Poseidon s Heir EP 1 | GoodShort'), 'Awakening Poseidon s Heir EP 1');
  });
  await ok('karakter ilegal dibuang, spasi rapikan', () => {
    assert.strictEqual(safeOutName('  A<B>C  "D"  '), 'ABC D');
  });
  await ok('judul kosong → fallback', () => {
    assert.strictEqual(safeOutName(''), 'video-situs');
  });

  console.log('\n[4] Pemetaan entri GoodShort (main.js)');
  await ok('3 episode → outName EP 1..3', () => {
    const r = mapGsEntries({ title: 'Awakening: Poseidon s Heir | GoodShort', entries: [{ url: 'https://cdn.x/1.m3u8' }, { url: 'https://cdn.x/2.m3u8' }, { url: 'https://cdn.x/3.m3u8' }] }, true);
    assert(r.ok);
    assert.strictEqual(r.entries[0].outName, 'Awakening Poseidon s Heir - EP 1');
    assert.strictEqual(r.entries[2].outName, 'Awakening Poseidon s Heir - EP 3');
  });
  await ok('entri pertama tidak valid → ok:false', () => {
    const r = mapGsEntries({ title: 'X', entries: [{ url: 'https://cdn.x/1.m3u8' }] }, false);
    assert.strictEqual(r.ok, false);
  });
  await ok('entri kosong/rusak → ok:false tanpa crash', () => {
    assert.strictEqual(mapGsEntries({ entries: [null, {}, { url: 'notaurl' }] }, true).ok, false);
    assert.strictEqual(mapGsEntries({}, true).ok, false);
  });

  console.log('\n[5] Validasi stream nyata (live API)');
  await ok('playlist hidup (vidio lama) → ok:true', async () => {
    const v = await checkStreamUrl('https://api.vidio.com/videos/7115874/playlist.m3u8', 'https://www.vidio.com/');
    assert(v.ok, 'harus ok: ' + (v.reason || ''));
  });
  await ok('playlist mati (vidio modern) → ok:false (HTTP 404)', async () => {
    const v = await checkStreamUrl('https://api.vidio.com/videos/9670252/playlist.m3u8', 'https://www.vidio.com/');
    assert.strictEqual(v.ok, false);
    assert(/HTTP 404/.test(v.reason), 'reason: ' + v.reason);
  });
  await ok('domain sampah → ok:false tanpa crash', async () => {
    const v = await checkStreamUrl('https://tidak-ada-domain-xyz-12345.example/playlist.m3u8');
    assert.strictEqual(v.ok, false);
  });
  await ok('regresi: m3u8 dramaharian tetap lolos validasi', async () => {
    const j = await new Promise((resolve, reject) => {
      https.get('https://dramaharian.com/api/content/watch/10297/1?provider=dramabite', { headers: { 'Accept': 'application/json', 'X-Device-Id': 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' } }, (r) => {
        let o = ''; r.on('data', (d) => o += d); r.on('end', () => { try { resolve(JSON.parse(o)); } catch (e) { reject(e); } });
      }).on('error', reject);
    });
    const u = j.data.video.hls;
    const v = await checkStreamUrl(u, 'https://dramaharian.com/');
    assert(v.ok, 'm3u8 dramaharian harus lolos: ' + (v.reason || ''));
  });

  console.log(`\n=== Hasil: ${pass} pass, ${fail} fail ===`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
