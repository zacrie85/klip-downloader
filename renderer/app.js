/* ============ KLIP DOWNLOADER — renderer logic ============ */
const api = window.klip;
const $ = (id) => document.getElementById(id);

const el = {
  verBadge: $('verBadge'), verFoot: $('verFoot'), engineBadge: $('engineBadge'),
  urlInput: $('urlInput'), btnPaste: $('btnPaste'), btnDownload: $('btnDownload'),
  qualitySel: $('qualitySel'), btnEngineUpdate: $('btnEngineUpdate'),
  folderInfo: $('folderInfo'), btnOpenFolder: $('btnOpenFolder'),
  progressWrap: $('progressWrap'), progTitle: $('progTitle'), progPct: $('progPct'),
  barFill: $('barFill'), progSpeed: $('progSpeed'), progEta: $('progEta'),
  btnCancel: $('btnCancel'), logBox: $('logBox'),
  btnRefresh: $('btnRefresh'), fileList: $('fileList'),
  btnBack: $('btnBack'), btnFwd: $('btnFwd'), btnReload: $('btnReload'), btnHome: $('btnHome'),
  addrInput: $('addrInput'), btnGo: $('btnGo'),
  webWrap: $('webWrap'), loadBar: $('loadBar'), browser: $('browser'),
  btnUseUrl: $('btnUseUrl'), detectChip: $('detectChip'),
  cardSource: $('cardSource'), toast: $('toast')
};

let currentId = null;
let lastAutoUrl = null;
let toastTimer = null;

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
  if (e === 'mp3' || e === 'm4a' || e === 'wav' || e === 'opus' || e === 'ogg') return '🎵';
  return '🎬';
}

function normalizeUrlOrSearch(t) {
  t = (t || '').trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  if (/^[\w-]+(\.[\w-]+)+(\/|$|\?)/.test(t)) return 'https://' + t;
  return 'https://duckduckgo.com/?q=' + encodeURIComponent(t);
}

function baseName(p) {
  try { return p.replace(/^.*[\\/]/, ''); } catch (e) { return p; }
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
  /bilibili\.com\/video\//i, /twitch\.tv\/videos\//i
];
function isVideoUrl(u) { return VIDEO_PATTERNS.some((r) => r.test(u || '')); }

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
  refreshList();
})();

api.onEvent(handleEvent);

/* ---------------- download ---------------- */
el.btnDownload.addEventListener('click', startDownload);
el.urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') startDownload(); });

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

async function startDownload() {
  let u = (el.urlInput.value || '').trim();
  if (u && !/^https?:\/\//i.test(u) && /^[\w-]+(\.[\w-]+)+/.test(u)) u = 'https://' + u;
  if (!/^https?:\/\//i.test(u)) {
    toast('Masukkan URL video yang valid dulu ya 😊', 'warn');
    el.urlInput.focus();
    return;
  }
  el.urlInput.value = u;
  const r = await api.downloadStart(u, el.qualitySel.value);
  if (r && r.error) { toast(r.error, 'err'); return; }
  currentId = r.id;
  el.progressWrap.classList.remove('hidden');
  el.logBox.classList.add('hidden');
  el.logBox.textContent = '';
  el.progTitle.textContent = 'Menyiapkan unduhan…';
  el.progPct.textContent = '0%';
  el.progSpeed.textContent = '—';
  el.progEta.textContent = '';
  el.barFill.style.width = '0%';
  el.btnDownload.disabled = true;
  toast('Download dimulai 🚀', 'ok');
}

el.btnCancel.addEventListener('click', async () => {
  await api.downloadCancel();
  toast('Membatalkan download…', 'warn');
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

function appendLog(line, level) {
  el.logBox.classList.remove('hidden');
  el.logBox.textContent += (el.logBox.textContent ? '\n' : '') + line;
  if (level === 'error') {
    const span = document.createElement('span');
    span.className = 'err';
    span.textContent = line;
  }
  el.logBox.scrollTop = el.logBox.scrollHeight;
}

function handleEvent(evt) {
  if (!evt || !evt.type) return;
  switch (evt.type) {
    case 'progress': {
      if (evt.id !== currentId) return;
      el.barFill.style.width = Math.min(100, evt.pct || 0) + '%';
      el.progPct.textContent = (evt.pct || 0).toFixed(1) + '%';
      el.progTitle.textContent = 'Mengunduh video…';
      el.progSpeed.textContent = evt.speed && evt.speed !== 'Unknown' ? '⚡ ' + evt.speed : '⚡ —';
      el.progEta.textContent = evt.eta && evt.eta !== 'Unknown' ? '⏳ ETA ' + evt.eta : '';
      break;
    }
    case 'file': {
      if (evt.id !== currentId) return;
      el.progTitle.textContent = 'Finalisasi: ' + baseName(evt.file);
      el.progPct.textContent = '100%';
      el.barFill.style.width = '100%';
      break;
    }
    case 'done': {
      if (evt.id !== currentId) {
        refreshList();
        break;
      }
      el.progTitle.textContent = 'Selesai: ' + (evt.file ? baseName(evt.file) : 'video');
      el.barFill.style.width = '100%';
      el.progPct.textContent = '100%';
      el.progSpeed.textContent = '✅ Selesai';
      el.progEta.textContent = '';
      toast('✅ Download selesai! File ada di folder Klip Downloader', 'ok', 5000);
      el.btnDownload.disabled = false;
      currentId = null;
      refreshList();
      setTimeout(() => el.progressWrap.classList.add('hidden'), 2500);
      break;
    }
    case 'error': {
      if (evt.id === currentId) {
        el.progTitle.textContent = '❌ Gagal';
        el.progSpeed.textContent = '';
        el.btnDownload.disabled = false;
        currentId = null;
      }
      toast('❌ ' + (evt.message || 'Download gagal'), 'err', 6000);
      appendLog((evt.message || 'ERROR'), 'error');
      break;
    }
    case 'cancelled': {
      if (evt.id === currentId) {
        el.progTitle.textContent = 'Dibatalkan';
        el.btnDownload.disabled = false;
        currentId = null;
        setTimeout(() => el.progressWrap.classList.add('hidden'), 1200);
      }
      break;
    }
    case 'log': {
      if (evt.id === currentId) appendLog(evt.line, evt.level);
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
  // debounce supaya tidak spam saat YouTube navigasi dalam halaman
  clearTimeout(navTimer);
  navTimer = setTimeout(() => checkDetect(url), inPage ? 700 : 150);
}

function checkDetect(url) {
  if (!url || !isVideoUrl(url)) return;
  if (url === lastAutoUrl) return;
  lastAutoUrl = url;
  sendToSource(url, true);
}

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
    ? '🎯 Video terdeteksi! URL sudah otomatis terisi — klik Download'
    : 'URL dikirim ke Sumber Video — klik Download 🚀', 'ok', 4200);
  el.btnDownload.focus();
}
