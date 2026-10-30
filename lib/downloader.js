/**
 * lib/downloader.js — Engine download berbasis yt-dlp.
 * v1.1.0: DOWNLOAD PARALEL (multi-slot), cancel per-item, mode MP3, thumbnail.
 * v1.3.0: dukungan URL media langsung (.m3u8/.mp4/dll dari media capture)
 *         + header Referer — untuk FlickReels, Shortical, GoodShort, dll.
 * v1.4.0: BiliBili TV (bilibili.tv) lewat extractor BiliIntl — episode
 *         tunggal maupun seluruh episode drama (playlist paralel).
 * v1.5.0: Dramaharian (dramaharian.com) via API resmi situsnya — seluruh
 *         episode gratis ekspansi otomatis + nama file rapi (outName).
 *         Vidio (vidio.com) via extractor Vidio/VidioPremier yt-dlp
 *         (konten premium: login dulu di browser built-in → cookie otomatis).
 * Mendukung YouTube, TikTok, Instagram, Facebook, X/Twitter, Vimeo,
 * Google Drive, Dailymotion, BiliBili TV, Vidio, Dramaharian, dan
 * 1000+ situs lain.
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// URL file media langsung (hasil capture browser) — skip logika playlist
const DIRECT_MEDIA_RE = /\.(m3u8|mpd|mp4|m4v|webm|mkv|mov|m4s|ts|flv|3gp|mp3|m4a|aac|flac|wav|opus|ogg)(\?|#|$)/i;

const MEDIA_EXTS = [
  '.mp4', '.mkv', '.webm', '.m4v', '.avi', '.mov', '.flv', '.ts', '.3gp',
  '.mp3', '.m4a', '.wav', '.opus', '.ogg',
  '.jpg', '.jpeg', '.png', '.webp'
];
const THUMB_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function formatArgs(quality) {
  switch (quality) {
    case '1080': return ['-f', 'bv*[height<=1080]+ba/b[height<=1080]/b'];
    case '720': return ['-f', 'bv*[height<=720]+ba/b[height<=720]/b'];
    case '480': return ['-f', 'bv*[height<=480]+ba/b[height<=480]/b'];
    case '360': return ['-f', 'bv*[height<=360]+ba/b[height<=360]/b'];
    default: return ['-f', 'bv*+ba/b'];
  }
}

class DownloadManager {
  /**
   * @param {object} opts { ytdlpPath, ffmpegPath, outDir, onEvent, cookiesProvider }
   *   cookiesProvider: async () => path file cookies Netscape (atau null)
   */
  constructor(opts) {
    this.ytdlpPath = opts.ytdlpPath;
    this.ffmpegPath = opts.ffmpegPath;
    this.outDir = opts.outDir;
    this.onEvent = opts.onEvent || (() => {});
    this.cookiesProvider = opts.cookiesProvider || null;
    this.maxConcurrent = 3;
    this.active = new Map(); // id -> item berjalan
    this.queue = [];
    this.seq = 0;
  }

  emit(evt) { try { this.onEvent(evt); } catch (e) {} }

  isBusy() { return this.active.size > 0; }

  getStatus() { return { active: this.active.size, queued: this.queue.length }; }

  setMaxConcurrent(n) {
    const v = Math.max(1, Math.min(6, parseInt(n, 10) || 3));
    this.maxConcurrent = v;
    this._pump();
    this._emitStatus();
    return v;
  }

  start(url, quality, opts = {}) {
    if (!this.ytdlpPath || !fs.existsSync(this.ytdlpPath)) {
      return { error: 'Engine yt-dlp tidak ditemukan di folder aplikasi.' };
    }
    if (this.queue.length >= 300) {
      return { error: 'Antrean penuh (maksimal 300 item). Tunggu download berjalan selesai.' };
    }
    const id = 'dl' + (++this.seq) + '_' + Date.now().toString(36);
    this.queue.push({
      id,
      url,
      quality: quality || 'best',
      mode: opts.mode === 'mp3' ? 'mp3' : 'video',
      title: opts.title || null,
      thumb: opts.thumb !== false,
      referer: (opts.referer && String(opts.referer)) || null,
      // v1.5.0: nama file kustom (mis. "Nama Drama - EP 3") — dipakai saat
      // URL media langsung (m3u8) yang judul aslinya hanya hash CDN
      outName: (opts.outName && String(opts.outName)) || null
    });
    this.emit({ type: 'queued', id, url, title: opts.title || null });
    this._pump();
    return { id };
  }

  cancel(id) {
    // Masih di antrean → langsung buang
    const qi = this.queue.findIndex((x) => x.id === id);
    if (qi >= 0) {
      this.queue.splice(qi, 1);
      this.emit({ type: 'cancelled', id });
      this._emitStatus();
      return true;
    }
    // Sedang berjalan → matikan prosesnya
    const c = this.active.get(id);
    if (c) {
      c.cancelled = true;
      this._kill(c);
      return true;
    }
    return false;
  }

  cancelAll() {
    let n = this.queue.length;
    const qids = this.queue.map((x) => x.id);
    this.queue = [];
    for (const c of this.active.values()) { c.cancelled = true; this._kill(c); n++; }
    for (const id of qids) this.emit({ type: 'cancelled', id });
    return n;
  }

  _kill(c) {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/PID', String(c.proc.pid), '/T', '/F'], { windowsHide: true });
      } else {
        c.proc.kill('SIGKILL');
      }
    } catch (e) {}
  }

  _pump() {
    while (this.active.size < this.maxConcurrent && this.queue.length > 0) {
      const item = this.queue.shift();
      this._run(item).catch((err) => {
        this.emit({ type: 'error', id: item.id, message: String((err && err.message) || err) });
        this.active.delete(item.id);
        this._pump();
        this._emitStatus();
      });
    }
    this._emitStatus();
  }

  _emitStatus() {
    this.emit({ type: 'status', active: this.active.size, queued: this.queue.length });
  }

  // v1.5.3: wrapper retry — kegagalan POSTPROCESSING (merge ffmpeg: "Error opening
  // output files: Invalid argument", dll.) dicoba ulang SEKALI otomatis dalam mode
  // slim (tanpa --add-metadata & thumbnail) supaya langkah ffmpeg opsional tidak
  // mengganggu merge wajib video+audio (kasus BiliBili DASH).
  async _run(item) {
    await this._attempt(item, true);
    const failMsg = item._failMsg || '';
    if (item._failMsg && /postprocessing|error opening output|incorrect codec parameters/i.test(failMsg)) {
      this.emit({ type: 'log', id: item.id, line: 'Postprocessing gagal — mencoba ulang otomatis tanpa metadata & thumbnail …', level: 'warn' });
      await this._attempt(Object.assign({}, item, { slim: true }), false);
    } else if (item._failMsg) {
      this._finish(item, 'error', failMsg);
    }
  }

  async _attempt(item, canRetry) {
    const cur = {
      ...item,
      cancelled: false,
      startedAt: Date.now(),
      file: null,
      lastError: null
    };
    this.active.set(cur.id, cur);
    this.emit({ type: 'start', id: cur.id, url: cur.url, quality: cur.quality, mode: cur.mode, title: cur.title });
    this._emitStatus();

    const args = [
      '--newline',
      '--progress',
      '--no-playlist',
      '--windows-filenames',
      '--trim-filenames', '120',
      '--ffmpeg-location', this.ffmpegPath,
      ...(cur.slim ? [] : ['--add-metadata']),
      '--retries', '5',
      '--fragment-retries', '5',
      '--socket-timeout', '20',
      '--concurrent-fragments', '4',
      '-o', cur.outName
        ? path.join(this.outDir, cur.outName + '.%(ext)s')
        : path.join(this.outDir, '%(title).100s [%(id)s].%(ext)s'),
      '--print', 'after_move:filepath',
      '--no-simulate'
    ];

    // v1.5.0: jangan timpa file lama dengan nama sama — tambah nomor urut
    if (cur.outName) args.push('--no-overwrites', '--continue');

    // v1.3.0: media langsung (m3u8/mp4 dari capture) → thumbnail/merge tidak relevan
    const direct = DIRECT_MEDIA_RE.test(cur.url);

    if (cur.mode === 'mp3') {
      // Audio saja → MP3 kualitas terbaik + cover tertanam
      args.push(
        '-f', 'bestaudio/b',
        '-x', '--audio-format', 'mp3', '--audio-quality', '0'
      );
      if (!direct && cur.thumb) args.push('--embed-thumbnail');
    } else {
      args.push(
        '--merge-output-format', 'mp4',
        '-S', 'res,ext:mp4:m4a',
        ...formatArgs(cur.quality)
      );
      if (!direct && cur.thumb && !cur.slim) args.push('--write-thumbnail', '--convert-thumbnails', 'jpg');
    }

    // v1.3.0: CDN situs drama sering mewajibkan Referer dari halaman asal
    if (cur.referer) {
      args.push('--referer', cur.referer);
      try {
        const o = new URL(cur.referer);
        args.push('--add-headers', 'Origin: ' + o.origin);
      } catch (e) {}
    }

    args.push(cur.url);

    // Cookies dari browser built-in (membantu YouTube yang minta verifikasi)
    if (this.cookiesProvider) {
      try {
        const cp = await this.cookiesProvider();
        if (cp && fs.existsSync(cp)) args.push('--cookies', cp);
      } catch (e) {}
    }

    // PATH di depan agar yt-dlp menemukan node.exe (JS runtime) di folder bin/
    const spawnEnv = Object.assign({}, process.env, {
      PATH: path.dirname(this.ytdlpPath) + path.delimiter + (process.env.PATH || '')
    });

    await new Promise((resolve) => {
      let buf = '';
      let proc;
      try {
        proc = spawn(this.ytdlpPath, args, { windowsHide: true, env: spawnEnv });
      } catch (e) {
        this._finish(cur, 'error', 'Gagal menjalankan engine: ' + e.message);
        return resolve();
      }
      cur.proc = proc;

      const onData = (d) => {
        buf += d.toString();
        let idx;
        while ((idx = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, idx).replace(/\r/g, '').trim();
          buf = buf.slice(idx + 1);
          if (line) this._handleLine(cur, line);
        }
      };

      proc.stdout.on('data', onData);
      proc.stderr.on('data', onData);
      proc.on('error', (err) => {
        this._finish(cur, 'error', 'Gagal menjalankan engine: ' + err.message);
        resolve();
      });
      proc.on('close', (code) => {
        if (cur.cancelled) this._finish(cur, 'cancelled');
        else if (code === 0) this._finish(cur, 'done', cur.file);
        else if (canRetry) {
          // tunda keputusan — _run() memilih: retry slim ATAU laporkan error
          item._failMsg = cur.lastError || ('Engine berhenti dengan kode ' + code);
          this.active.delete(cur.id);
        } else this._finish(cur, 'error', cur.lastError || ('Engine berhenti dengan kode ' + code));
        resolve();
      });
    });
  }

  _handleLine(cur, line) {
    // 1) Baris path absolut hasil --print after_move:filepath
    if (/^([A-Za-z]:[\\/]|\/)/.test(line) && !line.startsWith('[')) {
      const p = line;
      if (fs.existsSync(p) && !THUMB_EXTS.has(path.extname(p).toLowerCase())) {
        cur.file = p;
        this.emit({ type: 'file', id: cur.id, file: p });
      }
      return;
    }

    // 2) Progress: [download]  42.3% of    5.82MiB at    1.50MiB/s ETA 00:03
    let m = line.match(/\[download\]\s+([\d.]+)%\s+of\s+~?\s*(\S+)(?:\s+at\s+(\S+))?(?:\s+ETA\s+(\S+))?/);
    if (m) {
      this.emit({
        type: 'progress', id: cur.id,
        pct: parseFloat(m[1]), size: m[2], speed: m[3] || '', eta: m[4] || ''
      });
      return;
    }

    // 3) Sudah pernah diunduh
    if (line.includes('has already been downloaded')) {
      const f = line.replace(/^\[download\]\s*/, '').replace(/\s+has already been downloaded.*$/, '');
      const p = path.isAbsolute(f) ? f : path.join(this.outDir, f);
      if (fs.existsSync(p)) {
        cur.file = p;
        this.emit({ type: 'file', id: cur.id, file: p });
      }
      return;
    }

    // 4) Hasil merge / extract
    if ((m = line.match(/\[Merger\]\s+Merging formats into\s+"(.+)"/)) ||
        (m = line.match(/\[ExtractAudio\]\s+Destination:\s+(.+)/)) ||
        (m = line.match(/\[VideoRemuxer\]\s+Remuxing.*?into\s+"(.+)"/))) {
      const p = path.isAbsolute(m[1]) ? m[1] : path.join(this.outDir, m[1]);
      if (fs.existsSync(p)) {
        cur.file = p;
        this.emit({ type: 'file', id: cur.id, file: p });
      }
      return;
    }

    // 5) Error / warning / info penting
    if (line.startsWith('ERROR:') || line.startsWith('ERROR ')) {
      cur.lastError = line;
      this.emit({ type: 'log', id: cur.id, line, level: 'error' });
      return;
    }
    if (line.startsWith('WARNING:')) {
      this.emit({ type: 'log', id: cur.id, line, level: 'warn' });
      return;
    }
    if (line.startsWith('[download] Destination:') || line.includes('Merging formats')) {
      this.emit({ type: 'log', id: cur.id, line, level: 'info' });
      return;
    }
  }

  _finish(cur, type, extra) {
    this.active.delete(cur.id);
    if (type === 'done') {
      let file = extra || cur.file || this._newestFile(cur.startedAt);
      this.emit({ type: 'done', id: cur.id, file, mode: cur.mode });
    } else if (type === 'error') {
      this.emit({ type: 'error', id: cur.id, message: extra || 'Download gagal' });
    } else {
      this.emit({ type: 'cancelled', id: cur.id });
    }
    this._pump();
  }

  _newestFile(sinceMs) {
    try {
      let bestT = sinceMs - 2000;
      let bestP = null;
      for (const f of fs.readdirSync(this.outDir)) {
        if (!MEDIA_EXTS.includes(path.extname(f).toLowerCase())) continue;
        if (THUMB_EXTS.has(path.extname(f).toLowerCase())) continue;
        const p = path.join(this.outDir, f);
        try {
          const st = fs.statSync(p);
          if (st.mtimeMs > bestT) { bestT = st.mtimeMs; bestP = p; }
        } catch (e) {}
      }
      return bestP;
    } catch (e) { return null; }
  }
}

module.exports = { DownloadManager, MEDIA_EXTS, THUMB_EXTS, formatArgs, DIRECT_MEDIA_RE };
