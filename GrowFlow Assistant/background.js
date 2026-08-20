const DEFAULTS = {
  queue: [],
  history: [],
  schedules: [],
  settings: { dailyLimit: 30, breakMinutes: 3, notifications: true },
  stats: { date: '', reviewed: 0, collected: 0 }
};

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get(Object.keys(DEFAULTS));
  const missing = Object.fromEntries(Object.entries(DEFAULTS).filter(([key]) => current[key] === undefined));
  if (Object.keys(missing).length) await chrome.storage.local.set(missing);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse).catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});

chrome.alarms.onAlarm.addListener(async ({ name }) => {
  if (!name.startsWith('growflow:')) return;
  const id = name.slice('growflow:'.length);
  const { schedules = [] } = await chrome.storage.local.get('schedules');
  const item = schedules.find((entry) => entry.id === id);
  if (!item) return;
  await chrome.storage.local.set({ schedules: schedules.filter((entry) => entry.id !== id) });
  await openInstagram(item.target || '');
});

async function handleMessage(message, sender) {
  if (message.type === 'GET_STATE') return { ok: true, ...(await chrome.storage.local.get(Object.keys(DEFAULTS))) };
  if (message.type === 'COLLECT_VISIBLE') {
    const tab = await instagramTab();
    if (!tab?.id) throw new Error('Abra o Instagram em uma aba para coletar os perfis visíveis.');
    const result = await chrome.tabs.sendMessage(tab.id, { type: 'SCAN_VISIBLE' });
    const storage = await chrome.storage.local.get(['queue', 'stats']);
    const current = storage.queue || [];
    const known = new Set(current.map((item) => item.username));
    const additions = result.profiles.filter((profile) => !known.has(profile.username)).map((profile) => ({
      ...profile, id: crypto.randomUUID(), action: 'revisar', status: 'pending', createdAt: Date.now()
    }));
    const stats = todayStats(storage.stats);
    stats.collected += additions.length;
    await chrome.storage.local.set({ queue: [...current, ...additions], stats });
    return { ok: true, found: result.profiles.length, added: additions.length };
  }
  if (message.type === 'OPEN_ITEM') {
    await openInstagram(message.username);
    return { ok: true };
  }
  if (message.type === 'COMPLETE_ITEM') {
    const storage = await chrome.storage.local.get(['queue', 'history', 'stats', 'settings']);
    const item = (storage.queue || []).find((entry) => entry.id === message.id);
    if (!item) throw new Error('Item não encontrado.');
    const stats = todayStats(storage.stats);
    if (stats.reviewed >= (storage.settings?.dailyLimit || 30)) throw new Error('Limite diário atingido. Retome amanhã ou ajuste o limite.');
    stats.reviewed += 1;
    const completed = { ...item, status: 'completed', completedAt: Date.now() };
    await chrome.storage.local.set({
      queue: storage.queue.filter((entry) => entry.id !== message.id),
      history: [completed, ...(storage.history || [])].slice(0, 500),
      stats
    });
    return { ok: true };
  }
  if (message.type === 'REMOVE_ITEM') {
    const { queue = [] } = await chrome.storage.local.get('queue');
    await chrome.storage.local.set({ queue: queue.filter((entry) => entry.id !== message.id) });
    return { ok: true };
  }
  if (message.type === 'SAVE_SETTINGS') {
    await chrome.storage.local.set({ settings: message.settings });
    return { ok: true };
  }
  if (message.type === 'SCHEDULE') {
    const when = new Date(message.when).getTime();
    if (!Number.isFinite(when) || when <= Date.now()) throw new Error('Escolha uma data e hora futuras.');
    const { schedules = [] } = await chrome.storage.local.get('schedules');
    const item = { id: crypto.randomUUID(), when, target: message.target.replace(/^@/, ''), label: message.label || 'Revisar perfil' };
    await chrome.alarms.create(`growflow:${item.id}`, { when });
    await chrome.storage.local.set({ schedules: [...schedules, item] });
    return { ok: true };
  }
  if (message.type === 'DELETE_SCHEDULE') {
    const { schedules = [] } = await chrome.storage.local.get('schedules');
    await chrome.alarms.clear(`growflow:${message.id}`);
    await chrome.storage.local.set({ schedules: schedules.filter((item) => item.id !== message.id) });
    return { ok: true };
  }
  throw new Error('Comando desconhecido.');
}

function todayStats(stats = {}) {
  const date = new Date().toISOString().slice(0, 10);
  return stats.date === date ? { ...stats } : { date, reviewed: 0, collected: 0 };
}

async function instagramTab() {
  const tabs = await chrome.tabs.query({ url: 'https://www.instagram.com/*' });
  return tabs.find((tab) => tab.active) || tabs[0];
}

async function openInstagram(username) {
  const url = username ? `https://www.instagram.com/${encodeURIComponent(username)}/` : 'https://www.instagram.com/';
  const tab = await instagramTab();
  if (tab?.id) await chrome.tabs.update(tab.id, { url, active: true });
  else await chrome.tabs.create({ url });
}
