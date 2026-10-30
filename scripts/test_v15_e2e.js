/**
 * scripts/test_v15_e2e.js — E2E nyata: simulasi alur aplikasi terhadap API live.
 * 1) expandDramaharian utk URL drama (ekspansi episode gratis)
 * 2) expandDramaharian utk URL tonton (episode tunggal)
 * 3) verifikasi m3u8 pertama bisa dibaca yt-dlp
 */
const assert = require('assert');
const https = require('https');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36';
const DEV = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'; // UUID valid v4

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Accept': 'application/json', 'User-Agent': UA, 'X-Device-Id': DEV } }, (res) => {
      let out = '';
      res.on('data', (d) => out += d);
      res.on('end', () => { try { resolve(JSON.parse(out)); } catch (e) { reject(new Error('bad json')); } });
    }).on('error', reject);
  });
}

function filterFreeEps(chapters) {
  return chapters
    .filter((c) => c && Number(c.isCharge) === 0)
    .map((c) => parseInt(c.chapterId, 10))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
}

async function epUrl(provider, bookId, ep) {
  const j = await getJson(`https://dramaharian.com/api/content/watch/${encodeURIComponent(bookId)}/${ep}?provider=${encodeURIComponent(provider)}`);
  const vid = j && j.data && (j.data.video || (j.data.chapter && j.data.chapter.video));
  return (vid && (vid.hls || vid.default || vid.mp4)) || null;
}

(async () => {
  let pass = 0, fail = 0;
  const t = (name, fn) => fn().then(() => { pass++; console.log('  PASS  ' + name); })
    .catch((e) => { fail++; console.log('  FAIL  ' + name + '\n        ' + e.message); });

  // 1) Ekspansi drama penuh (dramabite/10297 — 12 episode gratis)
  await t('ekspansi drama penuh → ≥10 episode m3u8', async () => {
    const chap = await getJson('https://dramaharian.com/api/browse/chapters/10297?provider=dramabite');
    const free = filterFreeEps(chap.data || []);
    assert(free.length >= 10, 'gratis cuma ' + free.length);
    const urls = [];
    for (const ep of free.slice(0, 5)) {
      const u = await epUrl('dramabite', '10297', ep);
      assert(u && u.includes('.m3u8'), 'ep ' + ep + ' tanpa m3u8');
      urls.push(u);
    }
    console.log('        contoh EP1:', urls[0].slice(0, 80) + '…');
  });

  // 2) Episode tunggal dramawave
  await t('episode tunggal dramawave → m3u8', async () => {
    const u = await epUrl('dramawave', '8XCdXEBsmX', 1);
    assert(u && u.includes('.m3u8'), 'tanpa m3u8: ' + u);
  });

  // 3) m3u8 bisa dibaca yt-dlp (simulasi download engine)
  await t('m3u8 EP1 dikenali yt-dlp (duration > 0)', async () => {
    const u = await epUrl('dramabite', '10297', 1);
    const { execSync } = require('child_process');
    const out = execSync(`yt-dlp --simulate --print "%(duration)s" "${u}"`, { encoding: 'utf8', timeout: 60000 });
    const dur = parseFloat(out.trim());
    assert(dur > 30, 'durasi aneh: ' + dur);
    console.log('        durasi EP1:', dur.toFixed(0) + ' detik');
  });

  console.log(`\n=== E2E: ${pass} pass, ${fail} fail ===`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
