/**
 * patch-nsis-nodewine.js — patch electron-builder agar build NSIS di Linux
 * TIDAK menjalankan installer via wine (langkah "harvest uninstaller").
 *
 * Latar: wine di lingkungan terbatas (seccomp) mati dengan SIGSYS ("bad
 * system call") saat menjalankan installer tahap-1. electron-builder sudah
 * punya jalur pure-JS (UninstallerReader) untuk macOS Catalina — patch ini
 * mengaktifkan jalur itu juga di Linux. Idempotent: aman dijalankan berulang.
 */
const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'node_modules', 'app-builder-lib', 'out', 'targets', 'nsis', 'NsisTarget.js');
if (!fs.existsSync(target)) {
  console.error('patch-nsis-nodewine: NsisTarget.js tidak ditemukan — jalankan npm install dulu.');
  process.exit(1);
}

let src = fs.readFileSync(target, 'utf8');
const orig = 'if ((0, macosVersion_1.isMacOsCatalina)()) {';

if (src.includes('patch-nsis-nodewine') || /isMacOsCatalina\)\(\)\s*\|\|\s*process\.platform === "linux"/.test(src)) {
  console.log('patch-nsis-nodewine: sudah diterapkan, skip.');
  process.exit(0);
}
if (!src.includes(orig)) {
  console.error('patch-nsis-nodewine: pola asli tidak ditemukan (versi electron-builder berubah?) — skip tanpa patch.');
  process.exit(0);
}

src = src.replace(
  orig,
  'if ((0, macosVersion_1.isMacOsCatalina)() || process.platform === "linux") { /* patch-nsis-nodewine */'
);
fs.writeFileSync(target, src, 'utf8');
console.log('patch-nsis-nodewine: OK — Linux kini pakai UninstallerReader (tanpa wine).');
