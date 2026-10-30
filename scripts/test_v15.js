/**
 * scripts/test_v15.js — Test unit v1.5.0 (tanpa Electron)
 * Jalankan: node scripts/test_v15.js
 * Menguji: pola URL dramaharian/vidio, sanitasi nama file, parsing ekspansi,
 *          dan keputusan isPlaylistUrl utk URL baru.
 */
const assert = require('assert');
const path = require('path');

let pass = 0, fail = 0;
function ok(name, fn) {
  try { fn(); pass++; console.log('  PASS  ' + name); }
  catch (e) { fail++; console.log('  FAIL  ' + name + '\n        ' + e.message); }
}

// ---------- replika fungsi main.js (tanpa dependensi Electron) ----------
const DRAMAHARIAN_RE = /^https?:\/\/(?:www\.)?dramaharian\.com\/(drama|tonton)\/([\w.-]+)\/([^/?#]+)(?:\/?(\d+)?(?:[?#].*)?)?$/i;

function safeFilename(s, max = 90) {
  const clean = String(s || '')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return (clean.length > max ? clean.slice(0, max).trim() : clean) || 'video';
}

function isDramaharianPlaylist(u) {
  return /dramaharian\.com\/drama\/[\w.-]+\/[^/?#]+\/?([?#]|$)/i.test(u);
}
function isDramaharianUrl(u) { return /dramaharian\.com\//i.test(u); }
function isVidioUrl(u) { return /vidio\.com\//i.test(u); }

function parseOgTitle(html) {
  const t = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i);
  if (!t) return null;
  return t[1].replace(/\s*—\s*Nonton Drama.*$/i, '').replace(/\s*\|\s*Dramaharian.*$/i, '').trim();
}

// ---------- 1) Pola URL Dramaharian ----------
console.log('\n[1] Pola URL Dramaharian');
ok('drama URL penuh → match, mode=drama', () => {
  const m = 'https://dramaharian.com/drama/dramabite/10297'.match(DRAMAHARIAN_RE);
  assert(m && m[1] === 'drama' && m[2] === 'dramabite' && m[3] === '10297' && !m[4]);
});
ok('tonton URL dengan episode → mode=tonton, ep=3', () => {
  const m = 'https://dramaharian.com/tonton/dramabite/10297/3'.match(DRAMAHARIAN_RE);
  assert(m && m[1] === 'tonton' && m[3] === '10297' && m[4] === '3');
});
ok('dramawave id alfanumerik → match', () => {
  const m = 'https://dramaharian.com/drama/dramawave/8XCdXEBsmX'.match(DRAMAHARIAN_RE);
  assert(m && m[2] === 'dramawave' && m[3] === '8XCdXEBsmX');
});
ok('prefix www. → match', () => {
  assert('https://www.dramaharian.com/drama/flextv/70OpP85Orl'.match(DRAMAHARIAN_RE));
});
ok('drama URL + trailing slash → tetap match', () => {
  assert('https://dramaharian.com/drama/dramabite/10297/'.match(DRAMAHARIAN_RE));
});
ok('URL homepage → TIDAK match', () => {
  assert(!'https://dramaharian.com/'.match(DRAMAHARIAN_RE));
  assert(!'https://dramaharian.com'.match(DRAMAHARIAN_RE));
});
ok('URL provider saja → TIDAK match', () => {
  assert(!'https://dramaharian.com/drama/dramabite'.match(DRAMAHARIAN_RE));
});
ok('URL lain (youtube) → TIDAK match', () => {
  assert(!'https://www.youtube.com/watch?v=abc'.match(DRAMAHARIAN_RE));
});

// ---------- 2) Keputusan playlist ----------
console.log('\n[2] Keputusan playlist Dramaharian');
ok('/drama/ → playlist (ekspansi semua episode)', () => {
  assert(isDramaharianPlaylist('https://dramaharian.com/drama/dramabite/10297'));
});
ok('/tonton/…/3 → bukan playlist (episode tunggal)', () => {
  assert(!isDramaharianPlaylist('https://dramaharian.com/tonton/dramabite/10297/3'));
});
ok('router dramaharian aktif utk URL drama', () => {
  assert(isDramaharianUrl('https://dramaharian.com/drama/dramabite/10297'));
});
ok('URL bukan dramaharian → router tidak aktif', () => {
  assert(!isDramaharianUrl('https://www.youtube.com/watch?v=x'));
});

// ---------- 3) Vidio ----------
console.log('\n[3] Pola URL Vidio');
const VIDIO_WATCH = /vidio\.com\/(watch|embed)\/\d+-[^/?#]+/i;
const VIDIO_PREMIER = /vidio\.com\/premier\/\d+\/[^/?#]+/i;
const VIDIO_LIVE = /vidio\.com\/live\/\d+/i;
ok('watch URL dengan slug → match', () => {
  assert(VIDIO_WATCH.test('https://www.vidio.com/watch/9637724-d-academy-8-top-17-group-1-result'));
});
ok('embed URL → match', () => {
  assert(VIDIO_WATCH.test('https://www.vidio.com/embed/7115874-fakta-temuan-suspek-cacar-monyet-di-jawa-tengah'));
});
ok('watch URL TANPA slug (id saja) → tidak match pola UI (yt-dlp juga tolak)', () => {
  assert(!VIDIO_WATCH.test('https://www.vidio.com/watch/9637724'));
});
ok('premier URL (series) → match', () => {
  assert(VIDIO_PREMIER.test('https://www.vidio.com/premier/2885/badai-pasti-berlalu'));
});
ok('live URL → match', () => {
  assert(VIDIO_LIVE.test('https://www.vidio.com/live/5075-sctv'));
});
ok('URL vidio → router dramaharian TIDAK aktif', () => {
  assert(!isDramaharianUrl('https://www.vidio.com/watch/9637724-abc'));
});
ok('URL vidio → tidak masuk jalur playlist yt-dlp dramaharian', () => {
  assert(!isDramaharianPlaylist('https://www.vidio.com/watch/9637724-abc'));
});

// ---------- 4) Sanitasi nama file ----------
console.log('\n[4] Sanitasi nama file (outName)');
ok('judul normal → tetap', () => {
  assert.strictEqual(safeFilename('Penangkap Boneka: Seluruh Keluargaku Adalah Bos Besar'), 'Penangkap Boneka Seluruh Keluargaku Adalah Bos Besar');
});
ok('karakter ilegal Windows dibuang', () => {
  assert.strictEqual(safeFilename('A<B>C"D/E\\F|G?H*I'), 'ABCDEFGHI');
});
ok('spasi berlebih dirapatkan', () => {
  assert.strictEqual(safeFilename('  Drama   Pendek  '), 'Drama Pendek');
});
ok('judul >90 karakter dipotong', () => {
  const long = 'X'.repeat(120);
  assert(safeFilename(long).length <= 90);
});
ok('judul kosong → fallback "video"', () => {
  assert.strictEqual(safeFilename(''), 'video');
  assert.strictEqual(safeFilename('///???'), 'video');
});

// ---------- 5) og:title parsing ----------
console.log('\n[5] Parsing judul drama dari og:title');
ok('og:title SSR dibersihkan dari suffix situs', () => {
  const html = '<meta property="og:title" content="Penangkap Boneka: Seluruh Keluargaku Adalah Bos Besar — Nonton Drama Sub Indo | Dramaharian">';
  assert.strictEqual(parseOgTitle(html), 'Penangkap Boneka: Seluruh Keluargaku Adalah Bos Besar');
});
ok('tanpa og:title → null (fallback provider+id)', () => {
  assert.strictEqual(parseOgTitle('<html><body>x</body></html>'), null);
});

// ---------- 6) Logika ekspansi chapter (replika) ----------
console.log('\n[6] Filter episode gratis dari payload API');
function filterFreeEps(chapters) {
  return chapters
    .filter((c) => c && Number(c.isCharge) === 0)
    .map((c) => parseInt(c.chapterId, 10))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
}
ok('12 gratis + sisanya berbayar → hanya gratis', () => {
  const chapters = [];
  for (let i = 1; i <= 70; i++) chapters.push({ chapterId: String(i), isCharge: i <= 12 ? 0 : 1 });
  const free = filterFreeEps(chapters);
  assert.strictEqual(free.length, 12);
  assert.strictEqual(free[0], 1);
  assert.strictEqual(free[11], 12);
});
ok('semua gratis → semua masuk', () => {
  const chapters = [{ chapterId: '3', isCharge: 0 }, { chapterId: '1', isCharge: 0 }, { chapterId: '2', isCharge: 0 }];
  assert.deepStrictEqual(filterFreeEps(chapters), [1, 2, 3]);
});
ok('semua berbayar → kosong', () => {
  assert.deepStrictEqual(filterFreeEps([{ chapterId: '1', isCharge: 1 }]), []);
});
ok('payload rusak/null → kosong tanpa crash', () => {
  assert.deepStrictEqual(filterFreeEps([null, undefined, {}]), []);
});

// ---------- 7) Nama file episode ----------
console.log('\n[7] Nama file hasil ekspansi');
ok('format "Judul - EP n"', () => {
  const title = parseOgTitle('<meta property="og:title" content="Kisah Cinta Ratu — Nonton Drama Sub Indo | Dramaharian">');
  const base = safeFilename(title);
  assert.strictEqual(base + ' - EP 7', 'Kisah Cinta Ratu - EP 7');
});

// ---------- hasil ----------
console.log(`\n=== Hasil: ${pass} pass, ${fail} fail ===`);
process.exit(fail ? 1 : 0);
