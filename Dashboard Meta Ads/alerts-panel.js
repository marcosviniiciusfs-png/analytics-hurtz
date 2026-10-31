'use strict';
// Central de alertas: usa somente as rotas pessoais da conta logada.
// Carregado depois do app.js, por isso redefine initializeAlerts e loadAlerts.

const apState = {instance: '', connected: false, configured: false, config: null, pollTimer: null};

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
    <header class="ap-head">
      <div>
        <p class="ap-eyebrow">Automações</p>
        <h2>Alertas no WhatsApp</h2>
        <p class="ap-sub">Avisos de gasto e saldo enviados ao grupo que você escolher.</p>
      </div>
    </header>
    <div class="ap-chips">
      <div class="ap-chip" id="apChipWhats"><span class="ap-dot"></span><div><small>WhatsApp</small><strong>—</strong></div></div>
      <div class="ap-chip" id="apChipAlerts"><span class="ap-dot"></span><div><small>Alertas</small><strong>—</strong></div></div>
      <div class="ap-chip" id="apChipMode"><span class="ap-dot"></span><div><small>Modo</small><strong>—</strong></div></div>
    </div>
    <div class="ap-grid">
      <section class="ap-card">
        <h3>Conexão do WhatsApp</h3>
        <p class="ap-muted" id="apConnText">Verificando...</p>
        <div class="ap-qr" id="apQr" hidden></div>
        <div class="ap-actions">
          <button type="button" class="ap-btn ap-btn-primary" id="apConnect" hidden>Conectar WhatsApp</button>
          <button type="button" class="ap-btn" id="apDisconnect" hidden>Desconectar</button>
        </div>
      </section>
      <section class="ap-card">
        <h3>Grupo de destino</h3>
        <p class="ap-muted" id="apGroupText">Conecte o WhatsApp para escolher o grupo.</p>
        <div class="ap-field">
          <select id="apGroupSelect" disabled><option value="">Selecione um grupo</option></select>
        </div>
        <div class="ap-actions">
          <button type="button" class="ap-btn" id="apLoadGroups" disabled>Carregar grupos</button>
        </div>
      </section>
      <section class="ap-card ap-wide">
        <h3>Regras</h3>
        <div class="ap-toggles">
          <label class="ap-toggle"><input type="checkbox" id="apEnabled"><span>Ativar alertas</span></label>
          <label class="ap-toggle"><input type="checkbox" id="apDryRun"><span>Modo de validação (não envia)</span></label>
        </div>
        <div class="ap-field">
          <label for="apThresholds">Faixas do limite diário (%)</label>
          <input id="apThresholds" value="75, 90, 100, 120" placeholder="75, 90, 100, 120">
          <small class="ap-muted">Você recebe um aviso ao atingir cada faixa, uma vez por dia.</small>
        </div>
        <div class="ap-actions">
          <button type="button" class="ap-btn ap-btn-primary" id="apSave">Salvar regras</button>
          <span class="ap-status-text" id="apSaveStatus"></span>
        </div>
      </section>
      <section class="ap-card ap-wide">
        <div class="ap-row">
          <div>
            <h3>Prévia de hoje</h3>
            <p class="ap-muted">Mostra as mensagens que sairiam agora, sem enviar nada.</p>
          </div>
          <button type="button" class="ap-btn" id="apPreview">Ver prévia</button>
        </div>
        <div class="ap-preview" id="apPreviewList"></div>
      </section>
    </div>`;
  document.querySelector('#apConnect').onclick = startWhatsappConnect;
  document.querySelector('#apDisconnect').onclick = disconnectWhatsapp;
  document.querySelector('#apLoadGroups').onclick = loadWhatsappGroups;
  document.querySelector('#apSave').onclick = saveAlertRules;
  document.querySelector('#apPreview').onclick = showAlertPreview;
}

function setChip(id, tone, label, value) {
  const chip = document.querySelector(id);
  chip.dataset.tone = tone;
  chip.querySelector('strong').textContent = value;
  chip.querySelector('small').textContent = label;
}

function renderAlertStatus() {
  const {connected, configured, instance, config} = apState;
  const whatsappValue = connected ? 'Conectado' : configured ? 'Desconectado' : 'Não conectado';
  setChip('#apChipWhats', connected ? 'ok' : 'off', 'WhatsApp', whatsappValue);
  const enabled = Boolean(config?.enabled);
  setChip('#apChipAlerts', enabled ? 'ok' : 'off', 'Alertas', enabled ? 'Ligados' : 'Desligados');
  const dry = config?.dryRun !== false;
  setChip('#apChipMode', dry ? 'warn' : 'ok', 'Modo', dry ? 'Validação (não envia)' : 'Envio real');

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

  document.querySelector('#apEnabled').checked = enabled;
  document.querySelector('#apDryRun').checked = dry;
  if (config?.thresholds) document.querySelector('#apThresholds').value = config.thresholds.join(', ');
}

async function refreshAlertStatus() {
  const status = await apJson('/api/flow/whatsapp/instance');
  apState.configured = Boolean(status.configured);
  apState.instance = status.instance || '';
  apState.connected = Boolean(status.connected);
  apState.config = (await apJson('/api/alert-config')).config;
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
    document.querySelector('#apGroupText').textContent = `${groups.length} grupos disponíveis.`;
  } catch (error) {
    document.querySelector('#apGroupText').textContent = error.message;
  } finally {
    button.disabled = !apState.connected;
  }
}

async function saveAlertRules() {
  const status = document.querySelector('#apSaveStatus');
  const groupJid = document.querySelector('#apGroupSelect').value || apState.config?.groupJid || '';
  const enabled = document.querySelector('#apEnabled').checked;
  const thresholds = document.querySelector('#apThresholds').value.split(',').map(value => Number(value.trim())).filter(value => Number.isFinite(value) && value > 0);
  if (enabled && !groupJid) { status.textContent = 'Escolha um grupo antes de ativar.'; return; }
  if (!thresholds.length) { status.textContent = 'Informe pelo menos uma faixa de percentual.'; return; }
  status.textContent = 'Salvando...';
  try {
    await apJson('/api/alert-config', {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({enabled, dryRun: document.querySelector('#apDryRun').checked, instance: apState.instance, groupJid, thresholds}),
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

// O app.js chama loadAlerts ao abrir a aba; initializeAlerts é chamado em outros pontos. Os dois montam e atualizam o painel.
async function loadAlerts() {
  buildAlertsPanel();
  try {
    await refreshAlertStatus();
  } catch (error) {
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
