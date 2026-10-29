/**
 * lib/mediacapture.js — v1.3.0
 * Pelacak request media dari browser built-in (session Electron).
 * Memungkinkan download dari situs yang TIDAK didukung yt-dlp langsung
 * (mis. FlickReels, Shortical, GoodShort — situs short drama berbasis SPA):
 * user menonton episode di browser aplikasi → request .m3u8/.mp4 ditangkap
 * → URL dikirim ke menu Sumber Video untuk diunduh yt-dlp.
 */

// URL video/stream yang dicatat (manifest + kontainer video)
const MEDIA_URL_RE =
  /\.(m3u8|mpd|mp4|m4v|webm|mkv|mov|flv|3gp)(\?|#|$)/i;

// Segmen pecahan (.ts/.m4s) & audio UI (sfx .mp3/dll) SENGAJA diabaikan —
// manifest m3u8/mpd sudah mewakili seluruh stream, dan segment/audio
// hanya menghasilkan spam + false positive (mis. efek suara YouTube).
const IGNORED_MEDIA_RE = /\.(ts|m4s|mp3|m4a|aac|flac|wav|opus|ogg)(\?|#|$)/i;

// Content-Type respons yang menandakan video (menangkap URL tanpa ekstensi,
// mis. googlevideo videoplayback / CDN drama tanpa akhiran)
const MEDIA_CT_RE = /(video\/|mpegurl|dash\+xml|matroska)/i;

// URL yang diabaikan (blob/MSE tidak bisa diunduh eksternal; data: terlalu kecil)
const SKIP_RE = /^(blob:|data:|about:|chrome|devtools:)/i;

// Host yang di-skip: YouTube sudah didukung penuh lewat URL halaman —
// capture googlevideo (videoplayback) hanya bikin chip menyala tanpa guna
const SKIP_HOST_RE = /(^|\.)googlevideo\.com$/i;

const MAX_LIST = 60;        // simpan maksimal N URL terakhir
const DEDUPE_MS = 8 * 60000; // URL sama dianggap duplikat selama 8 menit

function isMediaUrl(u) {
  if (!u || SKIP_RE.test(u)) return false;
  if (IGNORED_MEDIA_RE.test(u)) return false;
  return MEDIA_URL_RE.test(u);
}

function isMediaContentType(ct) {
  if (!ct) return false;
  return MEDIA_CT_RE.test(String(ct));
}

/**
 * Keputusan capture utk satu request browser.
 * @param {string} url
 * @param {string} resourceType  resourceType Electron ('media' = elemen <video>/<audio>)
 */
function shouldCapture(url, resourceType) {
  if (!url || SKIP_RE.test(url)) return false;
  if (IGNORED_MEDIA_RE.test(url)) return false;
  try { if (SKIP_HOST_RE.test(new URL(url).hostname)) return false; } catch (e) { return false; }
  if (MEDIA_URL_RE.test(url)) return true;               // manifest/kontainer video
  if (resourceType === 'media') return true;              // elemen <video> tanpa ekstensi
  return false;
}

/**
 * Buat pelacak media.
 * @param {function} emit  callback({type:'media-found', url, referer, count})
 */
function createMediaTracker(emit) {
  const list = [];          // [{url, referer, t, host}] — terbaru di akhir
  const seen = new Map();   // url -> timestamp terakhir tercatat

  function note(url, referer) {
    try {
      if (!url || SKIP_RE.test(url)) return false;
      const now = Date.now();
      const last = seen.get(url);
      if (last && (now - last) < DEDUPE_MS) return false;

      let host = '';
      try { host = new URL(url).hostname; } catch (e) { return false; }
      // host tidak wajar (mis. hasil ekstensi) → abaikan
      if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host)) return false;

      seen.set(url, now);
      if (seen.size > 400) {
        // buang entri lama agar Map tidak tumbuh tanpa batas
        for (const [k, t] of seen) if (now - t > DEDUPE_MS * 2) seen.delete(k);
      }
      list.push({ url, referer: referer || '', t: now, host });
      if (list.length > MAX_LIST) list.splice(0, list.length - MAX_LIST);

      if (typeof emit === 'function') {
        emit({ type: 'media-found', url, referer: referer || '', count: list.length });
      }
      return true;
    } catch (e) { return false; }
  }

  return {
    note,
    isMediaUrl,
    list: () => list.slice().reverse(), // terbaru dulu
    count: () => list.length,
    clear: () => { list.length = 0; seen.clear(); }
  };
}

module.exports = { createMediaTracker, isMediaUrl, isMediaContentType, shouldCapture, MEDIA_URL_RE, MEDIA_CT_RE };
