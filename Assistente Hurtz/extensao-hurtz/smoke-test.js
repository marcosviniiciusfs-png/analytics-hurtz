const fs = require('fs');
const path = require('path');

const required = [
  'manifest.json', 'service-worker.js', 'offscreen.html', 'offscreen.js',
  'popup.html', 'popup.css', 'popup.js'
];
for (const file of required) {
  if (!fs.existsSync(path.join(__dirname, file))) throw new Error(`Arquivo ausente: ${file}`);
}

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8'));
if (manifest.manifest_version !== 3) throw new Error('A extensão precisa usar Manifest V3');
for (const permission of ['activeTab', 'tabCapture', 'offscreen', 'storage']) {
  if (!manifest.permissions.includes(permission)) throw new Error(`Permissão ausente: ${permission}`);
}

const worker = fs.readFileSync(path.join(__dirname, 'service-worker.js'), 'utf8');
const offscreen = fs.readFileSync(path.join(__dirname, 'offscreen.js'), 'utf8');
const popup = fs.readFileSync(path.join(__dirname, 'popup.js'), 'utf8');
if (!worker.includes('getMediaStreamId')) throw new Error('Seleção da aba não implementada');
if (!offscreen.includes('ws://127.0.0.1:8766')) throw new Error('Canal local do Hurtz ausente');
if (!offscreen.includes('chromeMediaSourceId')) throw new Error('Captura isolada da aba ausente');
for (const host of ['meet.google.com', 'zoom.us', 'teams.microsoft.com', 'webex.com']) {
  if (!popup.includes(host)) throw new Error(`Plataforma ausente: ${host}`);
}
console.log('[OK] Extensão Hurtz validada');
