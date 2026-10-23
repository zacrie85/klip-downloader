/**
 * lib/downloader.js — Engine download berbasis yt-dlp.
 * v1.1.0: DOWNLOAD PARALEL (multi-slot), cancel per-item, mode MP3, thumbnail.
 * Mendukung YouTube, TikTok, Instagram, Facebook, X/Twitter, Vimeo,
 * Google Drive, Dailymotion, dan 1000+ situs lain.
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

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
      thumb: opts.thumb !== false
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

  async _run(item) {
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
      '--add-metadata',
      '--retries', '5',
      '--fragment-retries', '5',
      '--socket-timeout', '20',
      '--concurrent-fragments', '4',
      '-o', path.join(this.outDir, '%(title).100s [%(id)s].%(ext)s'),
      '--print', 'after_move:filepath',
      '--no-simulate'
    ];

    if (cur.mode === 'mp3') {
      // Audio saja → MP3 kualitas terbaik + cover tertanam
      args.push(
        '-f', 'bestaudio/b',
        '-x', '--audio-format', 'mp3', '--audio-quality', '0',
        '--embed-thumbnail'
      );
    } else {
      args.push(
        '--merge-output-format', 'mp4',
        '-S', 'res,ext:mp4:m4a',
        ...formatArgs(cur.quality)
      );
      if (cur.thumb) args.push('--write-thumbnail', '--convert-thumbnails', 'jpg');
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
        else this._finish(cur, 'error', cur.lastError || ('Engine berhenti dengan kode ' + code));
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

module.exports = { DownloadManager, MEDIA_EXTS, THUMB_EXTS, formatArgs };
