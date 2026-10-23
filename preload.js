const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('klip', {
  getInfo: () => ipcRenderer.invoke('app:getInfo'),
  engineVersion: () => ipcRenderer.invoke('engine:version'),
  downloadStart: (url, quality) => ipcRenderer.invoke('download:start', url, quality),
  downloadCancel: () => ipcRenderer.invoke('download:cancel'),
  listDownloads: () => ipcRenderer.invoke('downloads:list'),
  openFolder: () => ipcRenderer.invoke('downloads:openFolder'),
  openFile: (p) => ipcRenderer.invoke('downloads:openFile', p),
  readClipboard: () => ipcRenderer.invoke('clipboard:read'),
  updateEngine: () => ipcRenderer.invoke('engine:update'),
  onEvent: (cb) => {
    const h = (e, d) => { try { cb(d); } catch (err) { console.error('event handler', err); } };
    ipcRenderer.on('download:event', h);
    return () => ipcRenderer.removeListener('download:event', h);
  }
});
