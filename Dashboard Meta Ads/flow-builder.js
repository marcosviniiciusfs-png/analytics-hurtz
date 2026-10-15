(() => {
  const $ = id => document.getElementById(id);
  const api = async (path, options = {}) => {
    const response = await fetch(path, {headers: {'Content-Type': 'application/json', 'X-Require-Personal-Meta': '1', ...(options.headers || {})}, ...options});
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'Não foi possível concluir esta ação.');
    return body;
  };
  const status = text => { $('flowStatus').textContent = text; };
  const esc = value => String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  let currentFlow = null, catalog = {accounts: [], pages: []}, qrTimer = null;
  const lastFlowKey = 'traffic-pocket-last-open-flow';

  $('flowHttpPanel').insertAdjacentHTML('beforeend', '<div class="flow-endpoint-actions"><button type="button" id="flowListenHttpEndpoint">Ouvir endpoint para teste</button><button type="button" id="flowSendHttpSample" hidden>Enviar teste para a planilha</button><button type="button" id="flowCopyHttpEndpoint">Copiar endpoint</button></div><p class="flow-endpoint-listen" id="flowHttpListenStatus">Clique em “Ouvir endpoint” e envie um teste do seu site. Os campos recebidos aparecerão no mapeamento.</p><small>Depois de configurar, salve o fluxo e marque-o como ativo para receber os envios.</small><details class="flow-endpoint-example"><summary>Exemplo para conectar seu site</summary><pre id="flowHttpExample"></pre></details>');
  $('flowGoogleNode').insertAdjacentHTML('beforeend', '<p class="flow-google-account" id="flowGoogleAccount" hidden></p><button class="flow-google-switch" type="button" id="flowReconnectGoogle">Trocar conta Google</button><p class="flow-google-help" id="flowGoogleHelp" hidden>A conexão foi salva. Para listar planilhas automaticamente, <a id="flowEnableDriveApi" target="_blank" rel="noopener">ative a Google Drive API</a>. Ou cole a URL/ID da planilha abaixo.</p><label class="flow-manual-sheet">URL ou ID da planilha<div><input id="flowSpreadsheetManual" type="text" autocomplete="off" placeholder="Cole a URL ou o ID da planilha"><button type="button" id="flowUseSpreadsheet">Usar</button></div></label>');
  $('flowConnectGoogle').insertAdjacentElement('afterend', $('flowReconnectGoogle'));
  $('flowConnectGoogle').insertAdjacentElement('afterend', $('flowGoogleAccount'));
  $('flowToggleConnection').remove();
  document.querySelector('.flow-link').replaceChildren();
  $('flowHttpPanel').querySelectorAll(':scope > small').forEach(element => element.remove());
  $('flowHttpEndpoint').setAttribute('title', 'Endpoint exclusivo deste fluxo');
  const googleAdvanced = document.createElement('details');
  googleAdvanced.className = 'flow-google-advanced';
  googleAdvanced.innerHTML = '<summary>Outras opções da planilha</summary>';
  googleAdvanced.append($('flowReconnectGoogle'), $('flowGoogleHelp'), $('flowSpreadsheetManual').closest('label'));
  $('flowGoogleNode').append(googleAdvanced);
  $('flowGoogleNode').querySelector(':scope > p:not(.flow-google-account):not(.flow-google-help)')?.remove();
  const mappingSection = document.createElement('section');
  mappingSection.className = 'flow-mapping-section';
  mappingSection.setAttribute('aria-label', 'Mapeamento de colunas');
  mappingSection.append($('flowMapping'));
  document.querySelector('.flow-canvas').insertAdjacentElement('afterend', mappingSection);
  const endpointAdvanced = document.createElement('details');
  endpointAdvanced.className = 'flow-endpoint-advanced';
  endpointAdvanced.innerHTML = '<summary>Testar recebimento</summary>';
  endpointAdvanced.append($('flowListenHttpEndpoint'), $('flowSendHttpSample'), $('flowHttpListenStatus'));
  $('flowHttpPanel').append(endpointAdvanced);

  // O painel não inventa porcentagem: a Evolution só informa o resultado final
  // da geração. Enquanto ela processa, mostramos estado indeterminado acessível.
  $('flowQrPanel').innerHTML = '<div class="flow-qr-loading" id="flowQrLoading" role="status" hidden><span class="flow-circular-progress" role="progressbar" aria-label="Gerando QR Code" aria-valuetext="Aguardando resposta da Evolution API"><svg viewBox="0 0 48 48" aria-hidden="true"><circle class="flow-progress-track" cx="24" cy="24" r="19"></circle><circle class="flow-progress-range" cx="24" cy="24" r="19"></circle></svg></span><span id="flowQrLoadingText">Preparando conexão segura…</span></div><img id="flowQrImage" alt="QR Code para conectar o WhatsApp"><b id="flowQrStatus">Leia o QR Code no WhatsApp.</b>';
  const disconnectDialog = document.createElement('dialog');
  disconnectDialog.className = 'flow-dialog flow-disconnect-dialog'; disconnectDialog.setAttribute('aria-labelledby', 'flowDisconnectTitle'); disconnectDialog.setAttribute('aria-describedby', 'flowDisconnectDescription');
  disconnectDialog.innerHTML = '<div><span class="flow-dialog-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg></span><h3 id="flowDisconnectTitle">Desconectar WhatsApp?</h3><p id="flowDisconnectDescription">O fluxo ficará pausado até você conectar este WhatsApp novamente pelo QR Code.</p><div><button type="button" class="flow-cancel" id="flowCancelDisconnect">Manter conectado</button><button type="button" class="flow-danger" id="flowConfirmDisconnect">Desconectar WhatsApp</button></div></div>';
  document.body.append(disconnectDialog);
  const showQrLoading = text => { const panel = $('flowQrPanel'); panel.hidden = false; panel.setAttribute('aria-busy', 'true'); $('flowQrLoading').hidden = false; $('flowQrImage').hidden = true; $('flowQrStatus').hidden = true; $('flowQrLoadingText').textContent = text; };
  const hideQrLoading = () => { $('flowQrPanel').removeAttribute('aria-busy'); $('flowQrLoading').hidden = true; $('flowQrImage').hidden = false; $('flowQrStatus').hidden = false; };
  const askDisconnect = () => new Promise(resolve => { disconnectDialog.addEventListener('close', () => resolve(disconnectDialog.returnValue === 'disconnect'), {once: true}); disconnectDialog.showModal(); });
  $('flowCancelDisconnect', disconnectDialog)?.addEventListener('click', () => disconnectDialog.close('cancel'));
  $('flowConfirmDisconnect', disconnectDialog)?.addEventListener('click', () => disconnectDialog.close('disconnect'));

  function setWhatsAppButton(connected) {
    const button = $('flowConnectWhatsApp');
    button.dataset.connected = connected ? 'true' : 'false';
    button.classList.toggle('is-connected', connected);
    button.textContent = connected ? 'Desconectar WhatsApp' : 'Conectar WhatsApp por QR Code';
  }

  function searchControl(key, rows = [], selected = '') {
    const input = $(`flow${key}Search`), hidden = $(`flow${key}`), options = $(`flow${key}Options`);
    const selectedRow = rows.find(row => String(row.id) === String(selected));
    hidden.value = selectedRow ? selectedRow.id : '';
    input.value = selectedRow ? selectedRow.name : '';
    const render = () => {
      const term = input.value.trim().toLocaleLowerCase('pt-BR');
      const matches = rows.filter(row => `${row.name} ${row.id}`.toLocaleLowerCase('pt-BR').includes(term)).slice(0, 100);
      options.innerHTML = matches.length ? matches.map(row => `<li role="option" aria-selected="${String(row.id) === String(hidden.value)}"><button type="button" data-id="${esc(row.id)}">${esc(row.name)}<small>${esc(row.id)}</small></button></li>`).join('') : '<li class="flow-search-empty">Nenhum resultado encontrado.</li>';
      options.hidden = false; input.setAttribute('aria-expanded', 'true');
    };
    const choose = id => {
      const row = rows.find(item => String(item.id) === String(id));
      hidden.value = row?.id || ''; input.value = row?.name || ''; options.hidden = true; input.setAttribute('aria-expanded', 'false');
      input.dispatchEvent(new CustomEvent('flowchange', {bubbles: true, detail: row || null}));
    };
    input.onfocus = render; input.oninput = render;
    input.onkeydown = event => { if (event.key === 'Escape') { options.hidden = true; input.setAttribute('aria-expanded', 'false'); } };
    options.onclick = event => { const button = event.target.closest('button[data-id]'); if (button) choose(button.dataset.id); };
    return {clear(placeholder) { hidden.value = ''; input.value = ''; input.placeholder = placeholder; options.innerHTML = ''; options.hidden = true; }};
  }
  const controls = {};
  const resetControls = () => {
    const saved = currentFlow?.facebook || {}, fallback = (id, label) => id ? [{id, name: `${label} selecionado (${id})`}] : [];
    controls.adAccount = searchControl('AdAccount', catalog.accounts.length ? catalog.accounts : fallback(saved.adAccountId, 'Conta'), saved.adAccountId);
    controls.page = searchControl('Page', catalog.pages.length ? catalog.pages : fallback(saved.pageId, 'Página'), saved.pageId);
    controls.form = searchControl('Form', fallback(saved.formId, 'Formulário'), saved.formId); controls.group = searchControl('Group', [], '');
  };
  async function loadForms(selected = '') {
    if (!$('flowPage').value) return controls.form.clear('Escolha uma página primeiro');
    $('flowFormSearch').placeholder = 'Carregando formulários…';
    const data = await api(`/api/flow/meta/forms?pageId=${encodeURIComponent($('flowPage').value)}`);
    controls.form = searchControl('Form', data.forms || [], selected);
  }
  async function loadGroups(selected = '') {
    const instance = $('flowInstance').value.trim();
    if (!instance) return controls.group.clear('Conecte seu WhatsApp');
    $('flowGroupSearch').placeholder = 'Carregando grupos…';
    const data = await api(`/api/flow/whatsapp/groups?instance=${encodeURIComponent(instance)}`);
    controls.group = searchControl('Group', data.groups || [], selected);
  }
  async function syncWhatsAppState(selectedGroup = '') {
    const state = await api('/api/flow/whatsapp/instance');
    const instance = state.configured ? state.instance : '';
    $('flowInstance').value = instance;
    setWhatsAppButton(Boolean(state.connected));
    if (state.connected && instance) await loadGroups(selectedGroup);
    else controls.group.clear(state.configured ? 'WhatsApp desconectado' : 'Conecte seu WhatsApp');
    return state;
  }
  async function loadEditor() {
    status('Carregando conexão e dados do fluxo…');
    try {
      const [connection, nextCatalog] = await Promise.all([api(`/api/flows/${encodeURIComponent(currentFlow.id)}`), api('/api/flow/meta/catalog').catch(error => ({error}))]);
      currentFlow = connection; catalog = nextCatalog.error ? {accounts: [], pages: []} : nextCatalog;
      $('flowTitle').textContent = currentFlow.name; $('flowConnect').hidden = Boolean(catalog.connected) || currentFlow.source === 'http';
      $('flowSource').value = currentFlow.source || 'facebook'; $('flowDestination').value = currentFlow.destination || 'whatsapp'; updateFlowKinds();
      $('flowBuilder').hidden = false;
      resetControls(); $('flowEnabled').checked = Boolean(currentFlow.enabled); setWhatsAppButton(false);
      if ($('flowSource').value === 'facebook' && currentFlow.facebook?.pageId) await loadForms(currentFlow.facebook.formId);
      if ($('flowDestination').value === 'whatsapp') await syncWhatsAppState(currentFlow.whatsapp?.groupJid || '');
      if ($('flowDestination').value === 'google-sheets') await loadSpreadsheets(currentFlow.googleSheets?.spreadsheetId || '');
      if ($('flowSource').value === 'http') { const sample = await api(`/api/flows/${encodeURIComponent(currentFlow.id)}/http-sample`).catch(() => null); if (sample?.sample) applyHttpSample(sample.sample); }
      status(nextCatalog.error ? 'Conecte seu Facebook nas Configurações para escolher a página e o formulário.' : 'Configure os blocos e salve este fluxo.');
    } catch (error) { status(error.message); }
  }
  const projectCard = flow => {
    const origin = flow.source === 'http' ? 'Endpoint HTTP' : (flow.facebook?.formName || flow.facebook?.formId || 'Formulário ainda não escolhido');
    return `<button type="button" class="flow-project" data-flow-id="${esc(flow.id)}"><span class="flow-project-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 6h11M4 12h16M4 18h11"/><circle cx="18" cy="6" r="2"/><circle cx="8" cy="18" r="2"/></svg></span><span><strong>${esc(flow.name)}</strong><small>${esc(origin)}</small></span><b class="flow-project-state ${flow.enabled ? 'active' : ''}">${flow.enabled ? 'Ativo' : 'Rascunho'}</b><i aria-hidden="true">›</i></button>`;
  };
  async function listFlows() {
    $('flowProjects').innerHTML = '<p class="flow-project-empty">Carregando seus fluxos…</p>';
    try { const data = await api('/api/flows'); $('flowProjects').innerHTML = data.flows?.length ? data.flows.map(projectCard).join('') : '<div class="flow-project-empty"><strong>Nenhum fluxo criado</strong><span>Crie o primeiro fluxo para conectar seus leads ao destino desejado.</span></div>'; const lastId = sessionStorage.getItem(lastFlowKey); if (lastId && data.flows?.some(flow => flow.id === lastId) && !$('flowProjectsView').hidden) await openFlow(lastId); else if (lastId && !data.flows?.some(flow => flow.id === lastId)) sessionStorage.removeItem(lastFlowKey); }
    catch (error) { $('flowProjects').innerHTML = `<p class="flow-project-empty">${esc(error.message)}</p>`; }
  }
  async function openFlow(id) { clearInterval(httpListenTimer); currentFlow = {id}; sessionStorage.setItem(lastFlowKey, id); $('flowBuilder').hidden = true; $('flowSendHttpSample').hidden = true; $('flowListenHttpEndpoint').textContent = 'Ouvir endpoint para teste'; endpointAdvanced.querySelector('summary').textContent = 'Testar recebimento'; endpointAdvanced.open = false; googleAdvanced.open = false; $('flowTitle').textContent = 'Carregando fluxo…'; $('flowProjectsView').hidden = true; $('flowEditorView').hidden = false; await loadEditor(); }
  async function showQr(payload) {
    if (payload.connected) { $('flowQrPanel').hidden = true; setWhatsAppButton(true); await loadGroups(); status('WhatsApp já está conectado. Escolha o grupo de destino.'); return; }
    if (!payload.qr) throw new Error('A Evolution não retornou um QR Code.');
    $('flowInstance').value = payload.instance; hideQrLoading(); $('flowQrImage').src = payload.qr; $('flowQrPanel').hidden = false;
    $('flowQrStatus').textContent = 'Leia o QR Code em WhatsApp > Aparelhos conectados.';
    let checking = false;
    clearInterval(qrTimer); qrTimer = setInterval(async () => { if (checking) return; checking = true; try { const state = await api(`/api/flow/whatsapp/status?instance=${encodeURIComponent(payload.instance)}`); if (state.connected) { clearInterval(qrTimer); setWhatsAppButton(true); await loadGroups(); $('flowQrPanel').hidden = true; status('WhatsApp conectado. Escolha o grupo de destino.'); } } catch (error) { $('flowQrStatus').textContent = error.message; } finally { checking = false; } }, 1000);
  }
  let spreadsheetCatalog = [], sheetCatalog = [];
  let fieldChoices = ['name','full_name','email','phone','phone_number','message','created_time','fields.name','fields.email','fields.phone_number'];
  const flattenFields = (value, prefix = '') => Object.entries(value || {}).flatMap(([key, item]) => { const name = prefix ? `${prefix}.${key}` : key; return item && typeof item === 'object' && !Array.isArray(item) ? flattenFields(item, name) : [name]; }).slice(0, 100);
  let httpListenTimer = null;
  const normalizeField = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const suggestMapping = (headers, fields, saved = {}) => {
    const aliases = {nome: ['nome completo','full name','full_name','name'], telefone: ['whatsapp','telefone','phone','phone number','phone_number'], celular: ['whatsapp','telefone','phone','phone number','phone_number'], whatsapp: ['whatsapp','telefone','phone','phone number','phone_number'], interesse: ['interesse','interest'], email: ['email','e mail'], data: ['data de entrada','created time','created_time','date']};
    return Object.fromEntries(headers.map(header => {
      if (saved[header]) return [header, saved[header]];
      const normalizedHeader = normalizeField(header), preferred = Object.entries(aliases).find(([key]) => normalizedHeader.includes(key))?.[1] || [normalizedHeader];
      const field = fields.find(value => preferred.includes(normalizeField(value))) || fields.find(value => normalizeField(value) === normalizedHeader);
      return field ? [header, field] : [header, ''];
    }).filter(([, value]) => value));
  };
  const applyHttpSample = sample => { const fields = flattenFields(sample?.payload); if (!fields.length) return; fieldChoices = fields; const selected = sheetCatalog.find(row => row.name === $('flowSheet').value), saved = currentFlow?.googleSheets?.mapping || {}, suggested = suggestMapping(selected?.headers || [], fields, saved); renderMapping(selected?.headers || [], suggested); const suggestedCount = Object.keys(suggested).filter(header => !saved[header]).length; $('flowHttpListenStatus').textContent = suggestedCount ? `Teste recebido. Preenchi automaticamente ${suggestedCount} mapeamento(s); revise e clique em “Enviar teste para a planilha”.` : `Teste recebido agora: ${fields.join(', ')}. Clique em “Enviar teste para a planilha”.`; $('flowListenHttpEndpoint').textContent = 'Teste recebido'; endpointAdvanced.querySelector('summary').textContent = 'Teste recebido · Ver detalhes'; $('flowSendHttpSample').hidden = false; clearInterval(httpListenTimer); if (suggestedCount && selected?.headers?.length) setTimeout(() => $('flowBuilder').requestSubmit(), 0); };
  function updateFlowKinds() {
    const source = $('flowSource').value, destination = $('flowDestination').value, canvas = document.querySelector('.flow-canvas'), connector = document.querySelector('.flow-link'), facebook = document.querySelector('.flow-facebook'), whatsapp = document.querySelector('.flow-whatsapp'), http = $('flowHttpPanel'), google = $('flowGoogleNode');
    // Mantém os dois tipos de origem/destino no mesmo canvas visual. Assim HTTP →
    // Sheets ocupa exatamente as posições de Facebook → WhatsApp.
    if (!canvas.contains(http)) canvas.insertBefore(http, connector);
    if (!canvas.contains(google)) canvas.insertBefore(google, whatsapp);
    http.classList.add('flow-node', 'flow-http');
    document.querySelector('.flow-facebook').hidden = source !== 'facebook';
    connector.hidden = false;
    whatsapp.hidden = destination !== 'whatsapp';
    google.hidden = destination !== 'google-sheets';
    mappingSection.hidden = destination !== 'google-sheets';
    http.hidden = source !== 'http';
    $('flowEditorView').querySelector('.flow-builder-heading p:not(.eyebrow)').textContent = source === 'http' ? 'Receba leads do seu site e envie para o destino escolhido.' : 'Escolha o formulário de origem e o destino dos leads.';
    $('flowConnect').hidden = source === 'http' || !catalog.connected;
    const endpoint = source === 'http' && currentFlow?.http?.endpoint ? `${window.HURTZ_API_BASE || location.origin}${currentFlow.http.endpoint}` : '';
    $('flowHttpEndpoint').textContent = endpoint;
    $('flowHttpExample').textContent = endpoint ? `fetch(${JSON.stringify(endpoint)}, {\n  method: 'POST',\n  headers: {'Content-Type': 'application/json'},\n  body: JSON.stringify({name: 'Maria', email: 'maria@exemplo.com', phone: '+55 11 99999-9999'})\n});` : '';
  }
  function renderMapping(headers = [], mapping = {}) {
    $('flowMapping').innerHTML = headers.length ? `<div class="flow-mapping-heading"><strong>Mapeamento de colunas</strong><small>${headers.length} ${headers.length === 1 ? 'coluna' : 'colunas'} · deslize para ver todas</small></div><div class="flow-mapping-scroll" tabindex="0" role="region" aria-label="Mapeamento das colunas da planilha">${headers.map(header => `<label>${esc(header)}<select data-sheet-header="${esc(header)}"><option value="">Não enviar</option>${fieldChoices.map(field => `<option value="${esc(field)}" ${mapping[header] === field ? 'selected' : ''}>${esc(field)}</option>`).join('')}</select></label>`).join('')}</div>` : '<small>Escolha uma aba que tenha os nomes das colunas na primeira linha.</small>';
  }
  function spreadsheetId(value) {
    const text = String(value || '').trim();
    const urlMatch = text.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]{20,200})/);
    return (urlMatch?.[1] || text).match(/^[A-Za-z0-9_-]{20,200}$/)?.[0] || '';
  }
  async function loadSpreadsheets(selected = '') {
    const state = await api('/api/flow/google/status');
    $('flowConnectGoogle').textContent = state.connected ? 'Google Sheets conectado' : 'Conectar Google Sheets';
    $('flowGoogleAccount').hidden = !state.connected; $('flowGoogleAccount').textContent = state.email ? `Conta conectada: ${state.email}` : 'Conta conectada. Use “Trocar conta Google” uma vez para identificar o e-mail desta conexão antiga.';
    if (!state.connected) return;
    try { const data = await api('/api/flow/google/spreadsheets'); spreadsheetCatalog = data.spreadsheets || []; $('flowGoogleHelp').hidden = true; }
    catch (error) { spreadsheetCatalog = []; $('flowGoogleHelp').hidden = false; $('flowEnableDriveApi').href = `https://console.cloud.google.com/apis/library/drive.googleapis.com?project=${encodeURIComponent(state.projectNumber || '')}`; status(`${error.message} Cole a URL/ID da planilha ou ative a Google Drive API.`); }
    $('flowSpreadsheet').innerHTML = '<option value="">Selecione uma planilha</option>' + spreadsheetCatalog.map(row => `<option value="${esc(row.id)}">${esc(row.name)}</option>`).join('');
    const persisted = selected || currentFlow?.googleSheets?.spreadsheetId || ''; if (persisted && ![...$('flowSpreadsheet').options].some(option => option.value === persisted)) $('flowSpreadsheet').append(new Option('Planilha salva', persisted));
    $('flowSpreadsheet').value = persisted;
    if ($('flowSpreadsheet').value) await loadSheets(currentFlow?.googleSheets?.sheetName || '');
  }
  async function loadSheets(selected = '') {
    const spreadsheetId = $('flowSpreadsheet').value; if (!spreadsheetId) return;
    const data = await api(`/api/flow/google/spreadsheets/${encodeURIComponent(spreadsheetId)}/sheets`); sheetCatalog = data.sheets || [];
    $('flowSheet').innerHTML = '<option value="">Selecione uma aba</option>' + sheetCatalog.map(row => `<option value="${esc(row.name)}">${esc(row.name)}</option>`).join('');
    $('flowSheet').value = selected; const sheet = sheetCatalog.find(row => row.name === $('flowSheet').value); renderMapping(sheet?.headers || [], currentFlow?.googleSheets?.mapping || {});
  }
  $('flowCreate').onclick = () => { $('flowName').value = ''; $('flowCreateDialog').showModal(); $('flowName').focus(); };
  $('flowCancelCreate').onclick = () => $('flowCreateDialog').close();
  $('flowCreateForm').onsubmit = async event => { event.preventDefault(); try { const flow = await api('/api/flows', {method: 'POST', body: JSON.stringify({name: $('flowName').value.trim()})}); $('flowCreateDialog').close(); await openFlow(flow.id); } catch (error) { $('flowName').setCustomValidity(error.message); $('flowName').reportValidity(); } };
  $('flowProjects').onclick = event => { const card = event.target.closest('[data-flow-id]'); if (card) openFlow(card.dataset.flowId); };
  $('flowBack').onclick = () => { clearInterval(qrTimer); clearInterval(httpListenTimer); sessionStorage.removeItem(lastFlowKey); $('flowEditorView').hidden = true; $('flowProjectsView').hidden = false; listFlows(); };
  $('flowConnect').onclick = loadEditor;
  $('flowPageSearch').addEventListener('flowchange', () => loadForms());
  $('flowSource').onchange = updateFlowKinds;
  $('flowDestination').onchange = async () => { updateFlowKinds(); try { if ($('flowDestination').value === 'google-sheets') await loadSpreadsheets(); else await syncWhatsAppState(currentFlow?.whatsapp?.groupJid || ''); } catch (error) { status(error.message); } };
  $('flowConnectGoogle').onclick = async () => { try { const state = await api('/api/flow/google/status'); if (!state.configured) throw new Error('A conexão Google ainda não foi configurada no servidor.'); if (!state.connected) { const result = await api('/api/flow/google/connect', {method: 'POST', body: '{}'}); location.assign(result.url); return; } await loadSpreadsheets(); } catch (error) { status(error.message); } };
  $('flowReconnectGoogle').onclick = async () => { try { const result = await api('/api/flow/google/connect', {method: 'POST', body: '{}'}); location.assign(result.url); } catch (error) { status(error.message); } };
  $('flowSpreadsheet').onchange = () => loadSheets('');
  $('flowUseSpreadsheet').onclick = async () => { const id = spreadsheetId($('flowSpreadsheetManual').value); if (!id) { $('flowSpreadsheetManual').setCustomValidity('Cole uma URL ou ID de planilha válido.'); $('flowSpreadsheetManual').reportValidity(); return; } $('flowSpreadsheetManual').setCustomValidity(''); if (![...$('flowSpreadsheet').options].some(option => option.value === id)) $('flowSpreadsheet').append(new Option('Planilha informada manualmente', id)); $('flowSpreadsheet').value = id; try { await loadSheets(''); } catch (error) { status(error.message); } };
  $('flowListenHttpEndpoint').onclick = async () => { if (!currentFlow?.id) return; try { await api(`/api/flows/${encodeURIComponent(currentFlow.id)}/http-sample`, {method: 'DELETE'}); clearInterval(httpListenTimer); endpointAdvanced.querySelector('summary').textContent = 'Aguardando teste do site'; $('flowListenHttpEndpoint').textContent = 'Ouvindo…'; $('flowHttpListenStatus').textContent = 'Aguardando o próximo POST do seu site neste endpoint. O teste não será enviado à planilha enquanto o fluxo estiver inativo.'; httpListenTimer = setInterval(async () => { try { const data = await api(`/api/flows/${encodeURIComponent(currentFlow.id)}/http-sample`); if (data.sample) applyHttpSample(data.sample); } catch (error) { clearInterval(httpListenTimer); $('flowHttpListenStatus').textContent = error.message; } }, 1200); } catch (error) { $('flowHttpListenStatus').textContent = error.message; } };
  $('flowSendHttpSample').onclick = async event => { if (!currentFlow?.id) return; const button = event.currentTarget; button.disabled = true; button.textContent = 'Enviando…'; try { await api(`/api/flows/${encodeURIComponent(currentFlow.id)}/http-sample/deliver`, {method: 'POST', body: '{}'}); $('flowHttpListenStatus').textContent = 'Teste enviado com sucesso para a planilha. Confira uma nova linha na aba selecionada.'; button.textContent = 'Teste enviado'; } catch (error) { $('flowHttpListenStatus').textContent = `Não foi possível enviar o teste: ${error.message}`; button.textContent = 'Tentar enviar novamente'; button.disabled = false; } };
  $('flowCopyHttpEndpoint').onclick = async () => { const endpoint = $('flowHttpEndpoint').textContent; if (!endpoint) return; try { await navigator.clipboard.writeText(endpoint); $('flowCopyHttpEndpoint').textContent = 'Copiado'; setTimeout(() => { $('flowCopyHttpEndpoint').textContent = 'Copiar endpoint'; }, 1600); } catch { status('Não foi possível copiar. Selecione e copie o endereço manualmente.'); } };
  $('flowSheet').onchange = () => { const sheet = sheetCatalog.find(row => row.name === $('flowSheet').value); renderMapping(sheet?.headers || [], currentFlow?.googleSheets?.mapping || {}); };
  let draftTimer = null;
  const saveDraftSoon = () => { if (!currentFlow?.id) return; clearTimeout(draftTimer); draftTimer = setTimeout(() => { status('Salvando alterações…'); $('flowBuilder').requestSubmit(); }, 700); };
  $('flowBuilder').addEventListener('change', saveDraftSoon);
  $('flowBuilder').addEventListener('flowchange', saveDraftSoon);
  $('flowDelete').onclick = async () => { if (!currentFlow || !confirm(`Excluir o fluxo "${currentFlow.name}"? Esta ação não pode ser desfeita.`)) return; try { await api(`/api/flows/${encodeURIComponent(currentFlow.id)}`, {method: 'DELETE'}); $('flowBack').click(); } catch (error) { status(error.message); } };
  $('flowConnectWhatsApp').onclick = async event => { const button = event.currentTarget; button.disabled = true; try { if (button.dataset.connected === 'true') { if (!(await askDisconnect())) return; status('Desconectando WhatsApp…'); await api('/api/flow/whatsapp/instance', {method: 'DELETE'}); clearInterval(qrTimer); $('flowQrPanel').hidden = true; controls.group.clear('Conecte seu WhatsApp'); setWhatsAppButton(false); status('WhatsApp desconectado.'); return; } showQrLoading('A Evolution está gerando seu QR Code…'); status('Aguardando o QR Code da Evolution…'); const result = await api('/api/flow/whatsapp/instance', {method: 'POST', body: '{}'}); await showQr(result); if (!result.connected) status('Leia o QR Code para conectar seu WhatsApp.'); } catch (error) { $('flowQrPanel').hidden = true; status(error.message); } finally { button.disabled = false; } };
  $('flowBuilder').onsubmit = async event => { event.preventDefault(); status('Salvando fluxo…'); const selectedSheet = sheetCatalog.find(row => row.name === $('flowSheet').value), mapping = Object.fromEntries([...document.querySelectorAll('[data-sheet-header]')].map(input => [input.dataset.sheetHeader, input.value]).filter(([, value]) => value)); const flow = {enabled: $('flowEnabled').checked, source: $('flowSource').value, destination: $('flowDestination').value, facebook: {adAccountId: $('flowAdAccount').value, pageId: $('flowPage').value, formId: $('flowForm').value}, whatsapp: {instance: $('flowInstance').value.trim(), groupJid: $('flowGroup').value}, googleSheets: {spreadsheetId: $('flowSpreadsheet').value, sheetName: $('flowSheet').value, headers: selectedSheet?.headers || [], mapping}}; try { currentFlow = await api(`/api/flows/${encodeURIComponent(currentFlow.id)}`, {method: 'PUT', body: JSON.stringify(flow)}); updateFlowKinds(); status(flow.enabled ? 'Fluxo ativo e pronto para receber leads.' : 'Fluxo salvo como rascunho.'); } catch (error) { status(error.message); } };
  // app.js valida uma sess\u00e3o existente de forma ass\u00edncrona. N\u00e3o deixe a
  // primeira listagem escapar para o host est\u00e1tico enquanto o roteador da API
  // ainda n\u00e3o foi instalado.
  if (window.HURTZ_API_ROUTER_READY) listFlows();
  else window.addEventListener('hurtz-api-router-ready', listFlows, {once: true});
})();
