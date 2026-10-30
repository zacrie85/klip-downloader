/* ============ KLIP DOWNLOADER v1.5.1 — renderer logic (layout 30/70) ============ */
const api = window.klip;
const $ = (id) => document.getElementById(id);

const el = {
  verBadge: $('verBadge'), verFoot: $('verFoot'), engineBadge: $('engineBadge'),
  urlInput: $('urlInput'), btnPaste: $('btnPaste'),
  btnDownload: $('btnDownload'), btnMp3: $('btnMp3'),
  qualitySel: $('qualitySel'), thumbChk: $('thumbChk'), parallelSel: $('parallelSel'),
  btnEngineUpdate: $('btnEngineUpdate'),
  folderInfo: $('folderInfo'), btnPickFolder: $('btnPickFolder'), btnOpenFolder: $('btnOpenFolder'),
  queueLine: $('queueLine'), activeList: $('activeList'), logBox: $('logBox'),
  btnRefresh: $('btnRefresh'), fileList: $('fileList'),
  btnBack: $('btnBack'), btnFwd: $('btnFwd'), btnReload: $('btnReload'), btnHome: $('btnHome'),
  addrInput: $('addrInput'), btnGo: $('btnGo'),
  loadBar: $('loadBar'), browser: $('browser'),
  btnUseUrl: $('btnUseUrl'), detectChip: $('detectChip'),
  mediaChip: $('mediaChip'), mediaChipUrl: $('mediaChipUrl'), mediaCount: $('mediaCount'),
  siteChip: $('siteChip'), siteChipTitle: $('siteChipTitle'),
  cardSource: $('cardSource'), toast: $('toast')
};

const rows = new Map(); // id -> {root, title, pct, bar, speed, eta, cancelBtn, state}
let toastTimer = null;
let lastAutoUrl = null;

// v1.3.0: daftar media hasil capture browser (terbaru di depan)
const mediaList = []; // [{url, referer, t}]

// v1.5.1: hasil resolusi stream dari browser built-in (Vidio/GoodShort)
// {pageUrl, entries:[{url,outName}], title, referer} — null bila belum ada
let siteResolved = null;
let siteResolveTimers = [];

/* ---------------- util ---------------- */
function toast(msg, kind = 'info', ms = 3400) {
  el.toast.textContent = msg;
  el.toast.className = 'toast ' + (kind === 'info' ? '' : kind);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.add('hidden'), ms);
}

function humanSize(b) {
  if (!b && b !== 0) return '';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0, n = Number(b);
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return n.toFixed(n >= 100 || i === 0 ? 0 : 1) + ' ' + u[i];
}

function extIcon(name) {
  const e = (name.split('.').pop() || '').toLowerCase();
  if (['mp3', 'm4a', 'wav', 'opus', 'ogg'].includes(e)) return '🎵';
  if (['jpg', 'jpeg', 'png', 'webp'].includes(e)) return '🖼';
  return '🎬';
}

function baseName(p) {
  try { return p.replace(/^.*[\\/]/, ''); } catch (e) { return p; }
}

function normalizeUrlOrSearch(t) {
  t = (t || '').trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  if (/^[\w-]+(\.[\w-]+)+(\/|$|\?)/.test(t)) return 'https://' + t;
  return 'https://duckduckgo.com/?q=' + encodeURIComponent(t);
}

/* Pola URL video yang dikenali otomatis dari browser */
const VIDEO_PATTERNS = [
  /youtube\.com\/watch\?/i, /youtu\.be\//i, /youtube\.com\/shorts\//i,
  /youtube\.com\/live\//i, /m\.youtube\.com\/watch/i,
  /tiktok\.com\/.+\/video\//i, /vt\.tiktok\.com\//i,
  /instagram\.com\/(p|reel|reels|tv)\//i,
  /facebook\.com\/watch\/?/i, /facebook\.com\/.+\/videos\//i, /fb\.watch\//i,
  /twitter\.com\/.+\/status\/\d+/i, /x\.com\/.+\/status\/\d+/i,
  /vimeo\.com\/\d+/i, /dailymotion\.com\/video\//i, /dai\.ly\//i,
  /drive\.google\.com\/file\/d\//i,
  /bilibili\.com\/video\//i, /twitch\.tv\/videos\//i,
  // v1.3.0: situs short drama (URL halaman episode → auto-isi)
  /flickreels\.net\/playlist\//i,
  /goodshort\.com\/(drama|episode)\//i,
  /shortical\.com\/.*\(id=\d+\)/i,
  // v1.4.0: BiliBili TV (bilibili.tv) — episode/video short drama
  //   /id/play/{season}/{ep} → 1 episode · /id/play/{season} → 1 drama (playlist)
  //   /id/video/{aid} → video tunggal
  /bilibili\.tv\/(?:[a-zA-Z]{2}(?:-[a-zA-Z0-9]{2,6})?\/)?video\/\d+/i,
  /bilibili\.tv\/(?:[a-zA-Z]{2}(?:-[a-zA-Z0-9]{2,6})?\/)?play\/\d+(?:\/\d+)?/i,
  // v1.5.0: Dramaharian — URL drama (playlist) atau episode tunggal
  /dramaharian\.com\/(drama|tonton)\/[\w.-]+\/[^/?#]+(\/\d+)?/i,
  // v1.5.0: Vidio — VOD watch/embed, series premier (playlist), live TV
  /vidio\.com\/(watch|embed)\/\d+(?:-[^/?#]+)?/i,
  /vidio\.com\/premier\/\d+\/[^/?#]+/i,
  /vidio\.com\/live\/\d+/i
];
function isVideoUrl(u) { return VIDEO_PATTERNS.some((r) => r.test(u || '')); }

/* ---------------- baris progress per-download ---------------- */
function rowFor(id, initTitle) {
  let r = rows.get(id);
  if (r) return r;

  const root = document.createElement('div');
  root.className = 'dl-row-card';
  root.innerHTML = `
    <div class="dl-row-top">
      <span class="dl-ico">⬇</span>
      <span class="dl-title"></span>
      <span class="dl-pct">0%</span>
      <button class="btn danger tiny dl-cancel" title="Batalkan download ini">✕</button>
    </div>
    <div class="bar"><div class="bar-fill"></div></div>
    <div class="dl-row-meta">
      <span class="dl-speed">—</span>
      <span class="dl-eta"></span>
      <span class="spacer"></span>
      <span class="dl-state">Menunggu…</span>
    </div>`;

  const refs = {
    title: root.querySelector('.dl-title'),
    pct: root.querySelector('.dl-pct'),
    bar: root.querySelector('.bar-fill'),
    speed: root.querySelector('.dl-speed'),
    eta: root.querySelector('.dl-eta'),
    state: root.querySelector('.dl-state'),
    cancelBtn: root.querySelector('.dl-cancel')
  };
  refs.title.textContent = initTitle || 'Menyiapkan…';

  refs.cancelBtn.addEventListener('click', async () => {
    if (root.classList.contains('err')) { removeRow(id, 0); return; }
    await api.downloadCancel(id);
    refs.state.textContent = 'Membatalkan…';
  });

  el.activeList.appendChild(root);
  r = { root, refs };
  rows.set(id, r);
  updateQueueLine();
  return r;
}

function removeRow(id, delay = 0) {
  const r = rows.get(id);
  if (!r) return;
  rows.delete(id);
  if (delay > 0) {
    r.root.classList.add('ok');
    r.refs.state.textContent = '✅ Selesai';
    setTimeout(() => { try { r.root.remove(); } catch (e) {} updateQueueLine(); }, delay);
  } else {
    try { r.root.remove(); } catch (e) {}
    updateQueueLine();
  }
}

function updateQueueLine() {
  const n = rows.size;
  el.queueLine.classList.toggle('hidden', n === 0);
  if (n > 0) {
    el.queueLine.textContent = `⬇ ${n} download terdaftar — bekerja paralel sesuai pengaturan`;
  }
}

/* ---------------- init ---------------- */
(async function init() {
  try {
    const info = await api.getInfo();
    el.verBadge.textContent = 'v' + info.version;
    el.verFoot.textContent = info.version;
    el.folderInfo.textContent = info.outDir;
    el.folderInfo.title = info.outDir;
    const ev = await api.engineVersion().catch(() => null);
    el.engineBadge.textContent = 'Engine: ' + (ev || 'tidak terdeteksi');
  } catch (e) {
    console.error('init gagal:', e);
  }
  // paralel tersimpan di localStorage
  try {
    const saved = localStorage.getItem('klip.parallel');
    if (saved) el.parallelSel.value = saved;
    await api.setConcurrent(parseInt(el.parallelSel.value, 10) || 3);
  } catch (e) {}
  refreshList();
})();

api.onEvent(handleEvent);

/* ---------------- mulai download ---------------- */
async function startDownload(mode) {
  let u = (el.urlInput.value || '').trim();
  if (u && !/^https?:\/\//i.test(u) && /^[\w-]+(\.[\w-]+)+/.test(u)) u = 'https://' + u;
  if (!/^https?:\/\//i.test(u)) {
    toast('Masukkan URL video yang valid dulu ya 😊', 'warn');
    el.urlInput.focus();
    return;
  }
  el.urlInput.value = u;

  const opts = { mode, thumb: el.thumbChk.checked };
  // v1.3.0: sambungkan referer bila URL berasal dari media capture
  const mi = mediaList.find((m) => m.url === u);
  if (mi && mi.referer) opts.referer = mi.referer;
  // v1.5.1: stream hasil resolusi browser built-in (Vidio/GoodShort)
  if (siteResolved && samePageUrl(u, siteResolved.pageUrl)) {
    opts.directEntries = siteResolved.entries;
    opts.referer = siteResolved.referer;
  }
  const r = await api.downloadStart(u, el.qualitySel.value, opts);
  if (r && r.error) { toast('❌ ' + r.error, 'err', 6000); return; }
  if (r && r.playlist) {
    toast(`📜 ${r.count} episode masuk antrean — diunduh paralel 🚀`, 'ok', 5000);
  } else {
    const en = siteResolved && samePageUrl(u, siteResolved.pageUrl) ? siteResolved.entries[0] : null;
    rowFor(r.id, en ? en.outName : 'Menyiapkan unduhan…');
    toast(mode === 'mp3' ? '🎵 Download MP3 dimulai 🚀' : '⬇ Download video dimulai 🚀', 'ok');
  }
}

/* ---------------- v1.3.0: chip media hasil capture browser ---------------- */
function showMediaChip() {
  if (!mediaList.length) return;
  const latest = mediaList[0];
  try {
    el.mediaChipUrl.textContent = latest.url.length > 62 ? latest.url.slice(0, 62) + '…' : latest.url;
    el.mediaChipUrl.title = latest.url;
  } catch (e) {}
  el.mediaCount.textContent = String(mediaList.length);
  el.mediaChip.classList.remove('hidden');
}

el.mediaChip.addEventListener('click', () => {
  if (!mediaList.length) return;
  const m = mediaList[0];
  el.urlInput.value = m.url;
  el.cardSource.classList.add('flash');
  el.urlInput.classList.add('flash');
  setTimeout(() => {
    el.cardSource.classList.remove('flash');
    el.urlInput.classList.remove('flash');
  }, 1600);
  el.urlInput.focus();
  toast('🎯 URL video dari browser siap diunduh — klik Video/MP3 🚀', 'ok', 4200);
});

el.btnDownload.addEventListener('click', () => startDownload('video'));
el.btnMp3.addEventListener('click', () => startDownload('mp3'));
el.urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') startDownload('video'); });

el.btnPaste.addEventListener('click', async () => {
  try {
    const t = await api.readClipboard();
    if (t) {
      el.urlInput.value = t;
      el.urlInput.focus();
      toast('URL ditempel dari clipboard 📋');
    } else {
      toast('Clipboard kosong', 'warn');
    }
  } catch (e) { toast('Gagal membaca clipboard', 'err'); }
});

el.btnEngineUpdate.addEventListener('click', async () => {
  toast('Memeriksa update engine…');
  const r = await api.updateEngine();
  if (r && r.error) { toast(r.error, 'err'); return; }
  if (r && r.updated) {
    toast('Engine diupdate! Restart aplikasi agar efeknya aktif ✅', 'ok', 6000);
  } else {
    toast('Engine sudah versi terbaru ✅', 'ok');
  }
  const ev = await api.engineVersion().catch(() => null);
  el.engineBadge.textContent = 'Engine: ' + (ev || 'tidak terdeteksi');
});

el.btnOpenFolder.addEventListener('click', () => api.openFolder());
el.btnRefresh.addEventListener('click', refreshList);

el.btnPickFolder.addEventListener('click', async () => {
  const r = await api.chooseFolder();
  if (r && r.ok) {
    el.folderInfo.textContent = r.outDir;
    el.folderInfo.title = r.outDir;
    toast('📁 Folder simpan diganti: ' + r.outDir, 'ok', 5000);
    refreshList();
  }
});

el.parallelSel.addEventListener('change', async () => {
  const v = parseInt(el.parallelSel.value, 10) || 3;
  try { localStorage.setItem('klip.parallel', String(v)); } catch (e) {}
  await api.setConcurrent(v);
  toast(`⚡ Download paralel: ${v} video bersamaan`, 'ok');
});

function appendLog(line, level) {
  el.logBox.classList.remove('hidden');
  el.logBox.textContent += (el.logBox.textContent ? '\n' : '') + line;
  el.logBox.scrollTop = el.logBox.scrollHeight;
}

/* ---------------- events dari engine ---------------- */
function handleEvent(evt) {
  if (!evt || !evt.type) return;
  switch (evt.type) {
    case 'queued': {
      rowFor(evt.id, evt.title || 'Masuk antrean…');
      const r = rows.get(evt.id);
      if (r) r.refs.state.textContent = '⏳ Menunggu slot paralel…';
      break;
    }
    case 'start': {
      const r = rowFor(evt.id, evt.title || 'Mengunduh…');
      r.refs.state.textContent = evt.mode === 'mp3' ? '🎵 Mengunduh audio…' : '⬇ Mengunduh…';
      break;
    }
    case 'progress': {
      const r = rows.get(evt.id);
      if (!r) break;
      r.refs.bar.style.width = Math.min(100, evt.pct || 0) + '%';
      r.refs.pct.textContent = (evt.pct || 0).toFixed(1) + '%';
      r.refs.speed.textContent = evt.speed && evt.speed !== 'Unknown' ? '⚡ ' + evt.speed : '⚡ —';
      r.refs.eta.textContent = evt.eta && evt.eta !== 'Unknown' ? '⏳ ETA ' + evt.eta : '';
      break;
    }
    case 'file': {
      const r = rows.get(evt.id);
      if (!r) break;
      r.refs.title.textContent = baseName(evt.file);
      r.refs.pct.textContent = '100%';
      r.refs.bar.style.width = '100%';
      r.refs.state.textContent = '🛠 Finalisasi…';
      break;
    }
    case 'done': {
      const name = evt.file ? baseName(evt.file) : 'file';
      removeRow(evt.id, 1800);
      toast('✅ Selesai: ' + name, 'ok', 4000);
      refreshList();
      break;
    }
    case 'dh-info': {
      // v1.5.0: info progres ekspansi Dramaharian
      appendLog('[Dramaharian] ' + evt.line, 'info');
      break;
    }
    case 'error': {
      const r = rows.get(evt.id);
      if (r) {
        r.root.classList.add('err');
        r.refs.state.textContent = '❌ Gagal';
        r.refs.title.textContent = evt.message || 'Download gagal';
        r.refs.title.title = evt.message || '';
        r.refs.speed.textContent = '';
        r.refs.eta.textContent = '';
        r.refs.cancelBtn.textContent = '✕';
        r.refs.cancelBtn.title = 'Tutup baris ini';
      }
      // v1.3.0 + v1.5.1: panduan khusus situs drama & Vidio/GoodShort
      const u = (el.urlInput.value || '').toLowerCase();
      const dramaSite = /(flickreels\.net|shortical\.com|goodshort\.com|bilibili\.tv|dramaharian\.com)/.test(u);
      const bili = /bilibili\.tv/.test(u);
      const vidio = /vidio\.com/.test(u);
      const gshort = /goodshort\.com/.test(u);
      toast(vidio
        ? '❌ Vidio gagal diunduh. Solusi: buka dulu videonya di BROWSER aplikasi (link disiapkan otomatis ±7 detik) lalu klik tombol 📺. Konten premium → login vidio.com di browser ini dulu. Konten DRM tidak bisa diunduh.'
        : gshort
          ? '❌ GoodShort gagal via URL langsung (dilindungi WAF). Solusi: buka episode-nya di BROWSER aplikasi → tunggu chip 📺 "Link video siap" → klik → download otomatis. Atau tekan Play lalu pakai chip 🎯'
          : dramaSite && bili
            ? '❌ BiliBili TV gagal diunduh (kemungkinan konten VIP/region). Coba: buka episode di BROWSER aplikasi → tekan Play → klik chip 🎯 "Video terdeteksi" di menu kiri'
            : dramaSite
              ? '❌ Situs drama ini video-nya dinamis. Buka episode-nya di BROWSER aplikasi → tekan Play → klik chip 🎯 "Video terdeteksi" di menu kiri'
              : '❌ ' + (evt.message || 'Download gagal'), 'err', 9000);
      appendLog((evt.message || 'ERROR'), 'error');
      break;
    }
    case 'cancelled': {
      removeRow(evt.id, 0);
      break;
    }
    case 'status': {
      // aktif/antre dari engine — info singkat saja
      break;
    }
    case 'log': {
      appendLog(evt.line, evt.level);
      break;
    }
    case 'browser-fail': {
      toast('Gagal memuat halaman (cek koneksi internet)', 'warn');
      break;
    }
    case 'engine-update': {
      appendLog(evt.line, 'info');
      break;
    }
    case 'playlist-start': {
      toast('📜 Membaca isi playlist… sebentar ya', 'info');
      break;
    }
    case 'playlist-info': {
      toast(`📜 ${evt.count} item playlist masuk antrean — diunduh paralel 🚀`, 'ok', 5000);
      break;
    }
    case 'media-found': {
      // v1.3.0: video terdeteksi saat user menonton di browser built-in
      try {
        if (evt.url && !mediaList.some((m) => m.url === evt.url)) {
          const first = mediaList.length === 0;
          mediaList.unshift({ url: evt.url, referer: evt.referer || '', t: Date.now() });
          if (mediaList.length > 8) mediaList.length = 8;
          showMediaChip();
          // toast hanya untuk deteksi pertama — hindari spam saat streaming
          if (first) toast('🎯 Video terdeteksi di browser! Klik chip hijau "Video terdeteksi" di menu kiri untuk mengunduh', 'ok', 6000);
        }
      } catch (e) {}
      break;
    }
  }
}

/* ---------------- daftar file ---------------- */
async function refreshList() {
  try {
    const files = await api.listDownloads();
    renderFiles(files);
  } catch (e) {}
}

function renderFiles(files) {
  el.fileList.innerHTML = '';
  if (!files || !files.length) {
    const d = document.createElement('div');
    d.className = 'empty';
    d.textContent = 'Belum ada file yang diunduh. Video hasil download akan muncul di sini 🎬';
    el.fileList.appendChild(d);
    return;
  }
  for (const f of files) {
    const row = document.createElement('div');
    row.className = 'file-row';

    const ico = document.createElement('div');
    ico.className = 'f-ico';
    ico.textContent = extIcon(f.name);

    const info = document.createElement('div');
    info.className = 'f-info';
    const nm = document.createElement('div');
    nm.className = 'f-name';
    nm.textContent = f.name;
    nm.title = f.name;
    const mt = document.createElement('div');
    mt.className = 'f-meta';
    mt.textContent = humanSize(f.size) + ' · ' + new Date(f.mtime).toLocaleString('id-ID');
    info.appendChild(nm); info.appendChild(mt);

    const btn = document.createElement('button');
    btn.className = 'btn ghost small';
    btn.textContent = '▶ Buka';
    btn.addEventListener('click', async () => {
      const r = await api.openFile(f.path);
      if (r && r.error) toast(r.error, 'err');
    });

    row.appendChild(ico); row.appendChild(info); row.appendChild(btn);
    el.fileList.appendChild(row);
  }
}

/* ---------------- browser ---------------- */
const wb = el.browser;

el.btnBack.addEventListener('click', () => { try { wb.goBack(); } catch (e) {} });
el.btnFwd.addEventListener('click', () => { try { wb.goForward(); } catch (e) {} });
el.btnReload.addEventListener('click', () => { try { wb.reload(); } catch (e) {} });
el.btnHome.addEventListener('click', () => { try { wb.loadURL('https://www.youtube.com'); } catch (e) {} });

function go() {
  const u = normalizeUrlOrSearch(el.addrInput.value);
  if (u) { try { wb.loadURL(u); } catch (e) {} }
}
el.btnGo.addEventListener('click', go);
el.addrInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });

wb.addEventListener('did-start-loading', () => el.loadBar.classList.add('on'));
wb.addEventListener('did-stop-loading', () => el.loadBar.classList.remove('on'));
wb.addEventListener('did-navigate', (e) => { if (e.url) onNav(e.url); });
wb.addEventListener('did-navigate-in-page', (e) => { if (e.url) onNav(e.url, true); });

let navTimer = null;
function onNav(url, inPage) {
  el.addrInput.value = url;
  clearTimeout(navTimer);
  navTimer = setTimeout(() => checkDetect(url), inPage ? 700 : 150);
  // v1.5.1: halaman Vidio/GoodShort → siapkan link stream otomatis
  if (getResolveSite(url)) scheduleSiteResolve(url);
  else clearSiteState();
}

function checkDetect(url) {
  if (!url || !isVideoUrl(url)) return;
  if (url === lastAutoUrl) return;
  lastAutoUrl = url;
  sendToSource(url, true);
}

/* -------- v1.5.1: resolusi otomatis stream dari browser built-in -------- */
// Vidio modern tidak punya playlist publik (yt-dlp → 404) dan API GoodShort
// diblokir WAF bila diakses di luar halaman. Solusi: inject JS ke halaman
// di browser built-in → minta link stream PERSIS seperti player web situs
// (cookie + fingerprint asli) → validasi di main → antre download.
const VIDIO_RESOLVE_JS = `(async () => {
  const out = { ok:false, candidates:[], id:null, kind:null };
  try {
    const m = location.pathname.match(/\\/(?:watch|embed)\\/(\\d+)/) || location.pathname.match(/\\/live\\/(\\d+)/);
    if (!m) return out;
    out.id = m[1];
    out.kind = /^\\/live\\//.test(location.pathname) ? 'live' : 'video';
    const id = out.id;
    const abs = (u) => { try { return new URL(u, location.origin).href; } catch (e) { return null; } };
    const csrfEl = document.querySelector('meta[name="csrf-token"]');
    const H = csrfEl && csrfEl.content ? { 'X-CSRF-Token': csrfEl.content } : {};
    // 1) endpoint token player modern (dipakai player web vidio)
    try {
      const r = await fetch('/live/' + id + '/tokens', { method:'POST', credentials:'include', headers:H });
      if (r.ok) {
        const j = await r.json().catch(() => ({}));
        if (j && j.hls_url) out.candidates.push(abs(j.hls_url));
        if (j && j.token) {
          out.candidates.push(abs('/videos/' + id + '/playlist.m3u8?' + j.token));
          out.candidates.push(abs('/live/' + id + '/tokens?' + j.token));
        }
        if (j && j.dash_url) out.candidates.push(abs(j.dash_url));
      }
    } catch (e) {}
    // 2) interactions_stream — premium dgn session login
    try {
      const r2 = await fetch('/interactions_stream.json?video_id=' + id + '&type=' + (out.kind === 'live' ? 'livestreamings' : 'videos'), { credentials:'include' });
      if (r2.ok) {
        const j2 = await r2.json().catch(() => ({}));
        if (j2 && j2.source) out.candidates.push(abs(j2.source));
        if (j2 && j2.source_dash) out.candidates.push(abs(j2.source_dash));
      }
    } catch (e) {}
    // 3) playlist publik lama (video lama masih jalan)
    out.candidates.push(abs('/videos/' + id + '/playlist.m3u8'));
    out.candidates.push('https://api.vidio.com/videos/' + id + '/playlist.m3u8');
    out.candidates = out.candidates.filter(Boolean);
    out.ok = out.candidates.length > 0;
  } catch (e) { out.err = String((e && e.message) || e); }
  return out;
})()`;

// GoodShort — episode tunggal (/episode/{book}/{chapter})
// v1.5.2 FIX: nomor episode diambil dari slug URL situs ("001-69606228" → EP 1,
// "013-69606240" → EP 13 — pola NNN-chapterId terverifikasi). Sebelumnya ep:1
// di-hardcode sehingga episode ke-2 dst bernama sama dan menimpa file EP 1.
const GOODSHORT_EP_RESOLVE_JS = `(async () => {
  const out = { ok:false, entries:[], title:null };
  try {
    const m = location.pathname.match(/\\/episode\\/([a-z0-9-]+)\\/([a-z0-9-]+)/i);
    if (!m) return out;
    const bookId = m[1].split('-').pop();
    const chapterId = m[2].split('-').pop();
    const r = await fetch('/hwycreels/chapter/detail', {
      method:'POST', credentials:'include',
      headers: { 'Content-Type':'application/json;charset=UTF-8', 'platform':'WEB', 'currentLanguage': (localStorage.getItem('currentLanguage') || 'en') },
      body: JSON.stringify({ bookId:String(bookId), chapterId:String(chapterId), num:16 })
    });
    if (r.ok) {
      const j = await r.json().catch(() => ({}));
      if (j && j.status === 0 && j.data && j.data.m3u8Path) {
        // nomor episode: segmen angka pertama slug chapter ("013" → 13)
        let epNum = parseInt(String(m[2].split('-')[0] || ''), 10);
        if (!Number.isFinite(epNum) || epNum <= 0) {
          const cand = j.data.num != null ? j.data.num : (j.data.number != null ? j.data.number : j.data.sort);
          epNum = parseInt(String(cand == null ? '' : cand), 10);
        }
        if (!Number.isFinite(epNum) || epNum <= 0) epNum = 1;
        out.entries.push({ url: j.data.m3u8Path, ep: epNum });
        if (j.data.book && j.data.book.name) out.title = j.data.book.name;
        out.ok = true;
      }
    }
  } catch (e) { out.err = String((e && e.message) || e); }
  return out;
})()`;

// GoodShort — halaman drama (/drama/{book}) → semua episode yang punya m3u8Path
const GOODSHORT_DRAMA_RESOLVE_JS = `(async () => {
  const out = { ok:false, entries:[], title:null };
  try {
    const m = location.pathname.match(/\\/drama\\/([a-z0-9-]+)/i);
    if (!m) return out;
    const bookId = m[1].split('-').pop();
    const r = await fetch('/hwycreels/chapter/page', {
      method:'POST', credentials:'include',
      headers: { 'Content-Type':'application/json;charset=UTF-8', 'platform':'WEB', 'currentLanguage': (localStorage.getItem('currentLanguage') || 'en') },
      body: JSON.stringify({ bookId:String(bookId), current:1, size:500 })
    });
    if (r.ok) {
      const j = await r.json().catch(() => ({}));
      const recs = j && j.status === 0 && j.data && Array.isArray(j.data.records) ? j.data.records : [];
      recs.forEach((rec, i) => { if (rec && rec.m3u8Path) out.entries.push({ url: rec.m3u8Path, ep: i + 1 }); });
      if (j && j.status === 0 && j.data && j.data.book && j.data.book.name) out.title = j.data.book.name;
      out.ok = out.entries.length > 0;
    }
  } catch (e) { out.err = String((e && e.message) || e); }
  return out;
})()`;

// Deteksi situs dari URL — {kind:'vidio'|'gs-ep'|'gs-drama', referer} | null
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

function siteInjectJs(kind) {
  if (kind === 'vidio') return VIDIO_RESOLVE_JS;
  if (kind === 'gs-ep') return GOODSHORT_EP_RESOLVE_JS;
  if (kind === 'gs-drama') return GOODSHORT_DRAMA_RESOLVE_JS;
  return null;
}

function samePageUrl(a, b) {
  try {
    return new URL(a).pathname.replace(/\/$/, '') === new URL(b).pathname.replace(/\/$/, '');
  } catch (e) { return false; }
}

function clearSiteState() {
  siteResolveTimers.forEach(clearTimeout);
  siteResolveTimers = [];
  siteResolved = null;
  el.siteChip.classList.add('hidden');
}

function scheduleSiteResolve(pageUrl) {
  clearSiteState();
  // token/API situs biasanya siap segera setelah halaman terbuka — coba beberapa kali
  [1200, 3500, 7000].forEach((t) => {
    siteResolveTimers.push(setTimeout(() => tryResolveSite(pageUrl), t));
  });
}

async function tryResolveSite(pageUrl) {
  const site = getResolveSite(pageUrl);
  if (!site) return;
  let wbUrl = '';
  try { wbUrl = wb.getURL() || ''; } catch (e) {}
  if (!wbUrl || !samePageUrl(wbUrl, pageUrl)) return; // halaman sudah berganti
  if (siteResolved) return;                            // sudah berhasil sebelumnya
  const js = siteInjectJs(site.kind);
  if (!js) return;
  let res = null;
  try { res = await wb.executeJavaScript(js, false); } catch (e) { return; }

  // vidio: kandidat URL divalidasi satu per satu di main
  if (site.kind === 'vidio') {
    if (!res || !res.ok || !Array.isArray(res.candidates) || !res.candidates.length) return;
    let title = '';
    try { title = wb.getTitle() || ''; } catch (e) {}
    let r = null;
    try { r = await api.resolveVidio({ candidates: res.candidates, title }); } catch (e) { return; }
    let nowUrl = '';
    try { nowUrl = wb.getURL() || ''; } catch (e) {}
    if (!samePageUrl(nowUrl, pageUrl)) return;
    if (r && r.ok && r.url) {
      siteResolved = { pageUrl, entries: [{ url: r.url, outName: r.outName || title }], title: r.outName || title, referer: site.referer };
      el.siteChipTitle.textContent = siteResolved.title;
      el.siteChip.classList.remove('hidden');
      toast('📺 Link video Vidio siap — klik tombol 📺 hijau untuk langsung mengunduh!', 'ok', 5200);
    }
    return;
  }

  // goodshort: 1 atau banyak episode; entri pertama divalidasi di main
  if (!res || !res.ok || !Array.isArray(res.entries) || !res.entries.length) return;
  let title2 = res.title || '';
  if (!title2) { try { title2 = (wb.getTitle() || '').replace(/\s*[|\u2013\u2014-]\s*GoodShort.*$/i, ''); } catch (e) {} }
  let r2 = null;
  try { r2 = await api.resolveGoodshort({ entries: res.entries, title: title2 }); } catch (e) { return; }
  let nowUrl2 = '';
  try { nowUrl2 = wb.getURL() || ''; } catch (e) {}
  if (!samePageUrl(nowUrl2, pageUrl)) return;
  if (r2 && r2.ok && Array.isArray(r2.entries) && r2.entries.length) {
    siteResolved = { pageUrl, entries: r2.entries, title: r2.outName || title2, referer: site.referer };
    const n = r2.entries.length;
    // v1.5.2: episode tunggal → tampilkan nama file persis (mis. "Judul - EP 2")
    el.siteChipTitle.textContent = n > 1
      ? `${siteResolved.title} — ${n} episode siap`
      : (r2.entries[0].outName || siteResolved.title);
    el.siteChip.classList.remove('hidden');
    toast(n > 1
      ? `📺 ${n} episode GoodShort siap — klik tombol 📺 hijau untuk mengunduh semuanya!`
      : '📺 Link episode GoodShort siap — klik tombol 📺 hijau untuk mengunduh!', 'ok', 5200);
  }
}

// klik chip 📺 → isi URL + langsung mulai download (1 episode atau semua)
el.siteChip.addEventListener('click', async () => {
  if (!siteResolved) return;
  el.urlInput.value = siteResolved.pageUrl;
  el.cardSource.scrollIntoView({ behavior: 'smooth', block: 'start' });
  await startDownload('video');
});

el.btnUseUrl.addEventListener('click', () => {
  let u = '';
  try { u = wb.getURL() || ''; } catch (e) {}
  if (!u || u === 'about:blank') { toast('Belum ada halaman yang terbuka', 'warn'); return; }
  sendToSource(u, false);
});

function sendToSource(url, auto) {
  el.urlInput.value = url;
  el.detectChip.classList.remove('hidden');
  setTimeout(() => el.detectChip.classList.add('hidden'), 6000);
  el.cardSource.classList.add('flash');
  el.urlInput.classList.add('flash');
  el.cardSource.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => {
    el.cardSource.classList.remove('flash');
    el.urlInput.classList.remove('flash');
  }, 1600);
  toast(auto
    ? '🎯 Video terdeteksi! URL sudah otomatis terisi — klik Video/MP3'
    : 'URL dikirim ke Sumber Video — klik Video/MP3 🚀', 'ok', 4200);
  el.btnDownload.focus();
}
