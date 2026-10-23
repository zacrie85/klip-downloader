/**
 * Patch electron-builder 24.13.3 agar BUILD NSIS di Linux TANPA wine:
 * - isMacOsCatalina() dipaksa true → electron-builder memakai UninstallerReader
 *   (pure JS) untuk membuat uninstaller, alih-alih menjalankan installer via wine.
 * Dipakai dengan: NODE_OPTIONS="--require ./scripts/patch-macos-check.js"
 */
try {
  const p = require.resolve('app-builder-lib/out/util/macosVersion');
  const mod = require(p);
  mod.isMacOsCatalina = () => true;
  console.log('[patch-macos-check] isMacOsCatalina -> true (wine tidak dibutuhkan)');
} catch (e) {
  console.warn('[patch-macos-check] gagal patch:', e.message);
}
