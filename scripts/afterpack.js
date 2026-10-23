/**
 * afterPack: embed icon + version info ke exe Windows memakai resedit (pure JS).
 * Pengganti rcedit yang membutuhkan wine di Linux.
 */
const path = require('path');
const fs = require('fs');
const ResEdit = require('resedit');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;

  const exeName = context.packager.appInfo.productFilename + '.exe';
  const exePath = path.join(context.appOutDir, exeName);
  if (!fs.existsSync(exePath)) throw new Error('exe tidak ditemukan: ' + exePath);

  const appInfo = context.packager.appInfo;
  const version = appInfo.version || '1.0.0';
  const parts = version.split('.').map((n) => parseInt(n, 10) || 0);
  const [maj, min, pat] = parts;

  console.log('afterPack: menanam icon + version info ke', exeName);

  const data = fs.readFileSync(exePath);
  const exe = ResEdit.NtExecutable.from(data);
  const res = ResEdit.NtExecutableResource.from(exe);

  // --- Icon ---
  const iconPath = path.join(context.packager.projectDir, 'build', 'icon.ico');
  const iconFile = ResEdit.Data.IconFile.from(fs.readFileSync(iconPath));
  const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
  const iconGroupID = groups.length ? groups[0].id : 1;
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
    res.entries,
    iconGroupID,
    1033,
    iconFile.icons.map((item) => item.data)
  );

  // --- Version info ---
  const viList = ResEdit.Resource.VersionInfo.fromEntries(res.entries);
  const vi = viList[0];
  if (vi) {
    vi.setFileVersion(maj, min, pat, 0, 1033);
    vi.setProductVersion(maj, min, pat, 0, 1033);
    vi.setStringValues(
      { lang: 1033, codepage: 1200 },
      {
        FileDescription: appInfo.description || 'Klip Downloader - video downloader with built-in browser',
        ProductName: 'Klip Downloader',
        CompanyName: 'zacrie85',
        LegalCopyright: 'Copyright (c) 2026 zacrie85',
        OriginalFilename: exeName,
        InternalName: 'Klip Downloader'
      }
    );
    vi.outputToResourceEntries(res.entries);
  }

  res.outputResource(exe);
  fs.writeFileSync(exePath, Buffer.from(exe.generate()));
  console.log('afterPack: OK');
};
