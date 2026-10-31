'use strict';
// Central de alertas: usa somente as rotas pessoais da conta logada.
// Layout em bento grid: cada bloco ocupa a altura da linha, sem espaços vazios.

const apState = {instance: '', connected: false, configured: false, config: null, plans: {}, pollTimer: null};

async function apJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let payload = null;
  try { payload = JSON.parse(text); } catch { /* resposta sem JSON */ }
  if (!response.ok) throw new Error(payload?.error || 'Não foi possível concluir a solicitação.');
  return payload;
}

function apEl(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function buildAlertsPanel() {
  const panel = document.querySelector('#alertsPanel');
  if (!panel || panel.dataset.ready) return;
  panel.dataset.ready = '1';
  panel.innerHTML = `
    <div class="ap-bento">
      <section class="ap-tile ap-hero">
        <div>
          <p class="ap-eyebrow">Automações no WhatsApp</p>
          <h2>Alertas de gasto e saldo</h2>
        </div>
        <div class="ap-hero-main">
          <p class="ap-hero-number" id="apHeroNumber">—</p>
          <p class="ap-muted" id="apHeroText">Carregando...</p>
        </div>
        <div class="ap-chips">
          <div class="ap-chip" id="apChipWhats"><span class="ap-dot"></span><div><small>WhatsApp</small><strong>—</strong></div></div>
          <div class="ap-chip" id="apChipAlerts"><span class="ap-dot"></span><div><small>Alertas</small><strong>—</strong></div></div>
        </div>
      </section>
      <section class="ap-tile ap-accent">
        <h3>Verificação automática</h3>
        <p class="ap-accent-value">15 min</p>
        <p class="ap-accent-text">Os alertas são checados a cada 15 minutos nas contas com limite configurado.</p>
      </section>
      <section class="ap-tile ap-conn">
        <h3>Conexão do WhatsApp</h3>
        <p class="ap-muted" id="apConnText">Verificando...</p>
        <dl class="ap-stats">
          <div><dt>Instância</dt><dd id="apStatInstance">—</dd></div>
          <div><dt>Estado</dt><dd id="apStatState">—</dd></div>
        </dl>
        <div class="ap-qr" id="apQr" hidden></div>
        <div class="ap-actions ap-foot">
          <button type="button" class="ap-btn ap-btn-primary" id="apConnect" hidden>Conectar WhatsApp</button>
          <button type="button" class="ap-btn" id="apDisconnect" hidden>Desconectar</button>
        </div>
      </section>
      <section class="ap-tile ap-group">
        <h3>Grupo de destino</h3>
        <p class="ap-muted" id="apGroupText">Conecte o WhatsApp para escolher o grupo.</p>
        <dl class="ap-stats">
          <div><dt>Grupo salvo</dt><dd id="apStatGroupName">—</dd></div>
          <div><dt>Identificador</dt><dd id="apStatGroupId">—</dd></div>
        </dl>
        <div class="ap-field">
          <select id="apGroupSelect" disabled><option value="">Selecione um grupo</option></select>
        </div>
        <div class="ap-actions ap-foot">
          <button type="button" class="ap-btn" id="apLoadGroups" disabled>Carregar grupos</button>
        </div>
      </section>
      <section class="ap-tile ap-rules">
        <h3>Regras</h3>
        <div class="ap-toggles">
          <label class="ap-toggle"><input type="checkbox" id="apEnabled"><span>Ativar alertas</span></label>
          <label class="ap-toggle"><input type="checkbox" id="apDryRun"><span>Modo de validação (não envia)</span></label>
        </div>
        <div class="ap-field">
          <span class="ap-label">Faixas do limite diário</span>
          <div class="ap-thresholds" id="apThresholds" role="group" aria-label="Faixas do limite diário">
            <button type="button" class="ap-threshold" data-value="50" aria-pressed="false">50%</button>
            <button type="button" class="ap-threshold" data-value="75" aria-pressed="false">75%</button>
            <button type="button" class="ap-threshold" data-value="100" aria-pressed="false">100%</button>
          </div>
          <small class="ap-muted">Você recebe um aviso ao atingir cada faixa escolhida, uma vez por dia.</small>
        </div>
        <div class="ap-actions ap-foot">
          <button type="button" class="ap-btn ap-btn-primary" id="apSave">Salvar regras</button>
          <span class="ap-status-text" id="apSaveStatus"></span>
        </div>
      </section>
      <section class="ap-tile ap-summary">
        <h3>Resumo</h3>
        <div class="ap-meter"><span id="apMeterFill"></span></div>
        <dl class="ap-stats">
          <div><dt>Contas com limite</dt><dd id="apStatAccounts">—</dd></div>
          <div><dt>Faixas do limite</dt><dd id="apStatThresholds">—</dd></div>
          <div><dt>Grupo</dt><dd id="apStatGroup">—</dd></div>
          <div><dt>Modo</dt><dd id="apStatMode">—</dd></div>
        </dl>
        <p class="ap-muted ap-foot">Só entram alertas de contas com limite diário e depósito configurados.</p>
      </section>
      <section class="ap-tile ap-preview-tile">
        <div class="ap-row">
          <div>
            <h3>Prévia de hoje</h3>
            <p class="ap-muted">Mostra as mensagens que sairiam agora, sem enviar nada.</p>
          </div>
          <button type="button" class="ap-btn" id="apPreview">Ver prévia</button>
        </div>
        <div class="ap-preview" id="apPreviewList">
          <p class="ap-muted">Clique em "Ver prévia" para conferir as mensagens de agora.</p>
        </div>
      </section>
    </div>`;
  document.querySelector('#apConnect').onclick = startWhatsappConnect;
  document.querySelector('#apDisconnect').onclick = disconnectWhatsapp;
  document.querySelector('#apLoadGroups').onclick = loadWhatsappGroups;
  document.querySelector('#apSave').onclick = saveAlertRules;
  document.querySelector('#apPreview').onclick = showAlertPreview;
  document.querySelectorAll('#apThresholds .ap-threshold').forEach(button => {
    button.onclick = () => button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
  });
}

function setChip(id, tone, label, value) {
  const chip = document.querySelector(id);
  chip.dataset.tone = tone;
  chip.querySelector('strong').textContent = value;
  chip.querySelector('small').textContent = label;
}

// Contas que de fato geram alerta: pré-pagas, com limite diário e depósito.
function configuredAccounts(plans) {
  const entries = Object.values(plans || {}).filter(plan => plan && typeof plan === 'object');
  // Cartão precisa só de limite diário; pré-pago também precisa de depósito.
  const ready = entries.filter(plan => Number(plan.dailyLimit) > 0 && (plan.paymentType === 'credit' || Number(plan.deposit) > 0));
  return {ready: ready.length, configured: entries.length};
}

function renderAlertStatus() {
  const {connected, configured, instance, config} = apState;
  const whatsappValue = connected ? 'Conectado' : configured ? 'Desconectado' : 'Não conectado';
  setChip('#apChipWhats', connected ? 'ok' : 'off', 'WhatsApp', whatsappValue);
  const enabled = Boolean(config?.enabled);
  setChip('#apChipAlerts', enabled ? 'ok' : 'off', 'Alertas', enabled ? 'Ligados' : 'Desligados');
  const dry = config?.dryRun !== false;


  document.querySelector('#apConnText').textContent = connected
    ? `Conectado. Instância ${instance}.`
    : configured ? 'WhatsApp desconectado. Conecte de novo para receber os alertas.' : 'Nenhum WhatsApp conectado. Conecte para escolher o grupo.';
  document.querySelector('#apConnect').hidden = connected;
  document.querySelector('#apDisconnect').hidden = !connected;
  document.querySelector('#apLoadGroups').disabled = !connected;
  document.querySelector('#apGroupSelect').disabled = !connected;
  document.querySelector('#apGroupText').textContent = connected
    ? (config?.groupJid ? 'Grupo salvo. Carregue a lista para trocar.' : 'Escolha o grupo que vai receber os alertas.')
    : 'Conecte o WhatsApp para escolher o grupo.';

  const groupSelect = document.querySelector('#apGroupSelect');
  if (config?.groupJid && ![...groupSelect.options].some(option => option.value === config.groupJid)) {
    groupSelect.append(new Option(config.groupName || config.groupJid, config.groupJid));
  }
  if (config?.groupJid) groupSelect.value = config.groupJid;
  document.querySelector('#apEnabled').checked = enabled;
  document.querySelector('#apDryRun').checked = dry;
  const selectedThresholds = config?.thresholds || [50, 75, 100];
  document.querySelectorAll('#apThresholds .ap-threshold').forEach(button => {
    button.setAttribute('aria-pressed', String(selectedThresholds.includes(Number(button.dataset.value))));
  });

  document.querySelector('#apStatInstance').textContent = instance || '—';
  document.querySelector('#apStatState').textContent = connected ? 'Conectado' : configured ? 'Desconectado' : 'Sem instância';
  document.querySelector('#apStatGroupName').textContent = config?.groupName || (config?.groupJid ? 'Sem nome salvo' : 'Não escolhido');
  document.querySelector('#apStatGroupId').textContent = config?.groupJid ? config.groupJid.replace(/@g\.us$/, '') : '—';
  const accounts = configuredAccounts(apState.plans);
  const accountTotal = apState.accountTotal || accounts.configured;
  document.querySelector('#apStatAccounts').textContent = accountTotal ? `${accounts.ready} de ${accountTotal}` : 'Nenhuma conta';
  document.querySelector('#apStatThresholds').textContent = (config?.thresholds || [75, 90, 100, 120]).map(value => `${value}%`).join(' · ');
  document.querySelector('#apStatGroup').textContent = config?.groupName || (config?.groupJid ? 'Grupo salvo' : 'Não escolhido');
  document.querySelector('#apStatMode').textContent = !enabled ? 'Desligado' : dry ? 'Validação' : 'Envio real';
  const ready = accounts.ready, total = accountTotal;
  document.querySelector('#apHeroNumber').textContent = total ? `${ready}/${total}` : '0';
  document.querySelector('#apHeroText').textContent = total ? `contas prontas para alertar, com limite diário e depósito.` : 'Nenhuma conta tem limite diário e depósito. Configure em Contas.';
  document.querySelector('#apMeterFill').style.width = total ? `${Math.round((ready / total) * 100)}%` : '0%';
}

async function refreshAlertStatus() {
  const status = await apJson('/api/flow/whatsapp/instance');
  apState.configured = Boolean(status.configured);
  apState.instance = status.instance || '';
  apState.connected = Boolean(status.connected);
  apState.config = (await apJson('/api/alert-config')).config;
  apState.plans = await apJson('/api/alert-plans').catch(() => ({}));
  apState.accountTotal = (await apJson('/api/meta-accounts').catch(() => ({}))).account_count ?? null;
  renderAlertStatus();
}

function stopQrPolling() {
  clearInterval(apState.pollTimer);
  apState.pollTimer = null;
}

async function startWhatsappConnect() {
  const button = document.querySelector('#apConnect');
  button.disabled = true;
  try {
    const created = await apJson('/api/flow/whatsapp/instance', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{}'});
    apState.instance = created.instance;
    const qrBox = document.querySelector('#apQr');
    const qr = created.qr || (await apJson(`/api/flow/whatsapp/qr?instance=${encodeURIComponent(created.instance)}`)).qr;
    qrBox.innerHTML = '';
    const img = apEl('img');
    img.src = qr;
    img.alt = 'QR Code para conectar o WhatsApp';
    qrBox.append(apEl('p', 'ap-muted', 'No celular: WhatsApp > Aparelhos conectados > Conectar aparelho. Aponte a câmera para o código.'), img);
    qrBox.hidden = false;
    stopQrPolling();
    apState.pollTimer = setInterval(async () => {
      try {
        const status = await apJson('/api/flow/whatsapp/instance');
        if (status.connected) {
          stopQrPolling();
          qrBox.hidden = true;
          await refreshAlertStatus();
        }
      } catch { /* tenta de novo no próximo ciclo */ }
    }, 4000);
    setTimeout(stopQrPolling, 180000);
  } catch (error) {
    document.querySelector('#apConnText').textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

async function disconnectWhatsapp() {
  if (!confirm('Desconectar o WhatsApp dos alertas? Os alertas param até você conectar de novo.')) return;
  try {
    await apJson('/api/flow/whatsapp/instance', {method: 'DELETE'});
    await refreshAlertStatus();
  } catch (error) {
    document.querySelector('#apConnText').textContent = error.message;
  }
}

async function loadWhatsappGroups() {
  const button = document.querySelector('#apLoadGroups');
  const select = document.querySelector('#apGroupSelect');
  button.disabled = true;
  document.querySelector('#apGroupText').textContent = 'Carregando grupos. Pode levar cerca de 40 segundos...';
  try {
    const payload = await apJson(`/api/flow/whatsapp/groups?instance=${encodeURIComponent(apState.instance)}`);
    const groups = payload.groups || [];
    select.innerHTML = '';
    select.append(new Option('Selecione um grupo', ''));
    groups.sort((a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR')).forEach(group => select.append(new Option(group.name, group.id)));
    if (apState.config?.groupJid) select.value = apState.config.groupJid;
    if (apState.config?.groupJid && !select.value) select.append(new Option(apState.config.groupName || apState.config.groupJid, apState.config.groupJid));
    if (apState.config?.groupJid) select.value = apState.config.groupJid;
    document.querySelector('#apGroupText').textContent = `${groups.length} grupos disponíveis.`;
  } catch (error) {
    document.querySelector('#apGroupText').textContent = error.message;
  } finally {
    button.disabled = !apState.connected;
  }
}

function groupNameFor(groupJid) {
  const option = [...document.querySelector('#apGroupSelect').options].find(item => item.value === groupJid);
  return option && option.value ? option.text : (apState.config?.groupName || '');
}

async function saveAlertRules() {
  const status = document.querySelector('#apSaveStatus');
  const groupJid = document.querySelector('#apGroupSelect').value || apState.config?.groupJid || '';
  const enabled = document.querySelector('#apEnabled').checked;
  const thresholds = [...document.querySelectorAll('#apThresholds .ap-threshold[aria-pressed="true"]')].map(button => Number(button.dataset.value));
  if (enabled && !groupJid) { status.textContent = 'Escolha um grupo antes de ativar.'; return; }
  if (!thresholds.length) { status.textContent = 'Informe pelo menos uma faixa de percentual.'; return; }
  status.textContent = 'Salvando...';
  try {
    await apJson('/api/alert-config', {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({enabled, dryRun: document.querySelector('#apDryRun').checked, instance: apState.instance, groupJid, groupName: groupNameFor(groupJid), thresholds}),
    });
    status.textContent = 'Regras salvas.';
    await refreshAlertStatus();
  } catch (error) {
    status.textContent = error.message;
  }
}

async function showAlertPreview() {
  const list = document.querySelector('#apPreviewList');
  list.textContent = 'Calculando...';
  try {
    const payload = await apJson('/api/alert-preview');
    list.innerHTML = '';
    if (!payload.messages.length) {
      list.append(apEl('p', 'ap-muted', 'Nenhum alerta agora. Os alertas dependem de limite diário e depósito configurados nas contas.'));
      return;
    }
    payload.messages.forEach(item => list.append(apEl('pre', 'ap-message', item.text)));
  } catch (error) {
    list.textContent = error.message;
  }
}

// O app.js chama loadAlerts ao abrir a aba; initializeAlerts também monta o painel.
async function loadAlerts(retry = true) {
  buildAlertsPanel();
  try {
    await refreshAlertStatus();
  } catch (error) {
    // Na primeira abertura a sessão pode ainda não estar pronta: tenta uma vez mais.
    if (retry) return setTimeout(() => loadAlerts(false), 2000);
    document.querySelector('#apConnText').textContent = error.message;
  }
}

function initializeAlerts() {
  loadAlerts();
}

// O clique no menu não passa por initializeAlerts em todos os caminhos: monta o painel também aqui.
document.addEventListener('click', event => {
  if (event.target.closest('#alertsNav')) setTimeout(loadAlerts, 0);
});
if (new URLSearchParams(location.search).get('view') === 'alerts') setTimeout(loadAlerts, 0);
