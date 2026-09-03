const $ = (selector) => document.querySelector(selector);
let state = {};

document.querySelectorAll('.tabs button').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.tabs button,.panel').forEach((element) => element.classList.remove('active'));
  button.classList.add('active');
  $(`#${button.dataset.tab}`).classList.add('active');
}));

$('#collectBtn').addEventListener('click', async () => {
  $('#collectBtn').disabled = true;
  const result = await send({ type: 'COLLECT_VISIBLE' });
  $('#collectBtn').disabled = false;
  if (result.ok) toast(`${result.added} novo(s) perfil(is) adicionado(s).`);
  await load();
});

$('#queueList').addEventListener('click', async ({ target }) => {
  const button = target.closest('button[data-id]');
  if (!button) return;
  const item = state.queue.find((entry) => entry.id === button.dataset.id);
  if (button.dataset.action === 'open') await send({ type: 'OPEN_ITEM', username: item.username });
  if (button.dataset.action === 'done') await send({ type: 'COMPLETE_ITEM', id: item.id });
  if (button.dataset.action === 'remove') await send({ type: 'REMOVE_ITEM', id: item.id });
  await load();
});

$('#scheduleForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const result = await send({ type: 'SCHEDULE', target: $('#scheduleTarget').value, when: $('#scheduleWhen').value, label: $('#scheduleLabel').value });
  if (result.ok) { event.target.reset(); toast('Lembrete criado.'); }
  await load();
});

$('#scheduleList').addEventListener('click', async ({ target }) => {
  const button = target.closest('button[data-id]');
  if (!button) return;
  await send({ type: 'DELETE_SCHEDULE', id: button.dataset.id });
  await load();
});

$('#settingsForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const result = await send({ type: 'SAVE_SETTINGS', settings: { dailyLimit: +$('#dailyLimit').value, breakMinutes: +$('#breakMinutes').value, notifications: $('#notifications').checked } });
  if (result.ok) toast('Ajustes salvos.');
  await load();
});

$('#exportBtn').addEventListener('click', () => {
  const rows = [['usuario', 'nome', 'concluido_em'], ...state.history.map((item) => [item.username, item.name, new Date(item.completedAt).toISOString()])];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell || '').replaceAll('"', '""')}"`).join(',')).join('\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv' }));
  link.download = `growflow-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click(); URL.revokeObjectURL(link.href);
});

async function load() {
  const response = await send({ type: 'GET_STATE' }, false);
  if (!response.ok) return;
  state = response;
  const today = new Date().toISOString().slice(0, 10);
  const stats = state.stats?.date === today ? state.stats : { reviewed: 0, collected: 0 };
  $('#reviewedCount').textContent = stats.reviewed;
  $('#limitLabel').textContent = `/ ${state.settings.dailyLimit}`;
  $('#collectedToday').textContent = `${stats.collected} hoje`;
  $('#queueBadge').textContent = state.queue.length;
  $('#dailyLimit').value = state.settings.dailyLimit;
  $('#breakMinutes').value = state.settings.breakMinutes;
  $('#notifications').checked = state.settings.notifications;
  renderQueue(); renderSchedules(); renderHistory(); checkConnection();
}

function renderQueue() {
  $('#queueList').innerHTML = state.queue.length ? state.queue.map((item) => `<article class="item">
    ${item.avatar ? `<img class="avatar" src="${escapeHtml(item.avatar)}">` : `<span class="avatar">${escapeHtml(item.username[0].toUpperCase())}</span>`}
    <div class="details"><strong>@${escapeHtml(item.username)}</strong><span>${escapeHtml(item.name)}</span></div>
    <div class="actions"><button class="icon" data-id="${item.id}" data-action="open" title="Abrir perfil">Abrir</button><button class="icon done" data-id="${item.id}" data-action="done" title="Marcar revisado">✓</button><button class="icon" data-id="${item.id}" data-action="remove" title="Remover">×</button></div>
  </article>`).join('') : empty('Nenhum perfil na fila. Abra uma lista, busca ou página no Instagram e use “Coletar perfis visíveis”.');
}

function renderSchedules() {
  $('#scheduleList').innerHTML = state.schedules.length ? state.schedules.sort((a,b) => a.when-b.when).map((item) => `<article class="item"><span class="avatar">◷</span><div class="details"><strong>${escapeHtml(item.label)}</strong><span>@${escapeHtml(item.target)} · ${new Date(item.when).toLocaleString('pt-BR')}</span></div><button class="icon" data-id="${item.id}">×</button></article>`).join('') : empty('Nenhum lembrete agendado.');
}

function renderHistory() {
  $('#historyList').innerHTML = state.history.length ? state.history.slice(0, 30).map((item) => `<article class="item"><span class="avatar">✓</span><div class="details"><strong>@${escapeHtml(item.username)}</strong><span>${new Date(item.completedAt).toLocaleString('pt-BR')}</span></div></article>`).join('') : empty('As revisões concluídas aparecerão aqui.');
}

async function checkConnection() {
  const tabs = await chrome.tabs.query({ url: 'https://www.instagram.com/*' });
  $('#connection').textContent = tabs.length ? '● Instagram aberto' : '○ Instagram fechado';
  $('#connection').classList.toggle('online', tabs.length > 0);
}

async function send(payload, showError = true) {
  try {
    const response = await chrome.runtime.sendMessage(payload);
    if (!response?.ok && showError) toast(response?.error || 'Não foi possível concluir.', true);
    return response || { ok: false };
  } catch (error) {
    if (showError) toast(error.message, true);
    return { ok: false, error: error.message };
  }
}

function toast(message, error = false) {
  $('#toast').textContent = message; $('#toast').className = error ? 'show error' : 'show';
  clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').className = '', 2600);
}
function empty(message) { return `<div class="empty">${message}</div>`; }
function escapeHtml(value = '') { const div = document.createElement('div'); div.textContent = value; return div.innerHTML; }
load();
