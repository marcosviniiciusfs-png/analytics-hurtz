const supported = [
  'meet.google.com',
  'zoom.us',
  'teams.microsoft.com',
  'teams.live.com',
  'webex.com'
];
let activeTab = null;
let state = { state: 'idle' };

const title = document.getElementById('tabTitle');
const host = document.getElementById('tabHost');
const message = document.getElementById('message');
const toggle = document.getElementById('toggle');

function isSupported(url) {
  try {
    return supported.some((domain) => new URL(url).hostname.endsWith(domain));
  } catch {
    return false;
  }
}

function render(status) {
  state = status || { state: 'idle' };
  const active = state.state === 'active' || state.state === 'connecting';
  document.body.classList.toggle('active', state.state === 'active');
  toggle.classList.toggle('stop', active);
  toggle.textContent = active
    ? (state.state === 'connecting' ? 'Conectando ao Hurtz...' : 'Desconectar reunião')
    : 'Conectar esta reunião';
  toggle.disabled = state.state === 'connecting' || (!active && !isSupported(activeTab?.url));
  if (state.state === 'active') message.textContent = 'Conectado. Somente o áudio desta aba está sendo enviado.';
  else if (state.state === 'error') message.textContent = state.message || 'Não foi possível conectar.';
  else if (!isSupported(activeTab?.url)) message.textContent = 'Abra uma aba do Meet, Zoom, Teams ou Webex para conectar.';
  else message.textContent = 'Pronto para enviar somente esta reunião ao Hurtz.';
}

async function init() {
  [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  title.textContent = activeTab?.title || 'Nenhuma aba selecionada';
  try { host.textContent = new URL(activeTab.url).hostname; } catch { host.textContent = ''; }
  const status = await chrome.runtime.sendMessage({ type: 'get-status' });
  render(status);
}

toggle.addEventListener('click', async () => {
  if (state.state === 'active' || state.state === 'connecting') {
    await chrome.runtime.sendMessage({ type: 'stop-capture' });
    render({ state: 'idle' });
    return;
  }
  render({ state: 'connecting', title: activeTab.title });
  const result = await chrome.runtime.sendMessage({
    type: 'start-capture',
    tab: { id: activeTab.id, title: activeTab.title, url: activeTab.url }
  });
  if (!result?.ok) render({ state: 'error', message: result?.error });
});

chrome.runtime.onMessage.addListener((payload) => {
  if (payload.target === 'popup' && payload.type === 'status') render(payload.status);
});

init();
