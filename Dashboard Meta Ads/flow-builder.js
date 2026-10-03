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
    controls.adAccount = searchControl('AdAccount', catalog.accounts, currentFlow?.facebook?.adAccountId);
    controls.page = searchControl('Page', catalog.pages, currentFlow?.facebook?.pageId);
    controls.form = searchControl('Form', [], ''); controls.group = searchControl('Group', [], '');
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
      $('flowTitle').textContent = currentFlow.name; $('flowConnect').hidden = Boolean(catalog.connected);
      resetControls(); $('flowEnabled').checked = Boolean(currentFlow.enabled); setWhatsAppButton(false);
      if (currentFlow.facebook?.pageId) await loadForms(currentFlow.facebook.formId);
      await syncWhatsAppState(currentFlow.whatsapp?.groupJid || '');
      status(nextCatalog.error ? 'Conecte seu Facebook nas Configurações para escolher a página e o formulário.' : 'Configure os blocos e salve este fluxo.');
    } catch (error) { status(error.message); }
  }
  const projectCard = flow => {
    const origin = flow.facebook?.formName || flow.facebook?.formId || 'Formulário ainda não escolhido';
    return `<button type="button" class="flow-project" data-flow-id="${esc(flow.id)}"><span class="flow-project-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 6h11M4 12h16M4 18h11"/><circle cx="18" cy="6" r="2"/><circle cx="8" cy="18" r="2"/></svg></span><span><strong>${esc(flow.name)}</strong><small>${esc(origin)}</small></span><b class="flow-project-state ${flow.enabled ? 'active' : ''}">${flow.enabled ? 'Ativo' : 'Rascunho'}</b><i aria-hidden="true">›</i></button>`;
  };
  async function listFlows() {
    $('flowProjects').innerHTML = '<p class="flow-project-empty">Carregando seus fluxos…</p>';
    try { const data = await api('/api/flows'); $('flowProjects').innerHTML = data.flows?.length ? data.flows.map(projectCard).join('') : '<div class="flow-project-empty"><strong>Nenhum fluxo criado</strong><span>Crie o primeiro fluxo para conectar seus Leads Ads ao WhatsApp.</span></div>'; }
    catch (error) { $('flowProjects').innerHTML = `<p class="flow-project-empty">${esc(error.message)}</p>`; }
  }
  async function openFlow(id) { currentFlow = {id}; $('flowProjectsView').hidden = true; $('flowEditorView').hidden = false; await loadEditor(); }
  async function showQr(payload) {
    if (payload.connected) { $('flowQrPanel').hidden = true; setWhatsAppButton(true); await loadGroups(); status('WhatsApp já está conectado. Escolha o grupo de destino.'); return; }
    if (!payload.qr) throw new Error('A Evolution não retornou um QR Code.');
    $('flowInstance').value = payload.instance; hideQrLoading(); $('flowQrImage').src = payload.qr; $('flowQrPanel').hidden = false;
    $('flowQrStatus').textContent = 'Leia o QR Code em WhatsApp > Aparelhos conectados.';
    let checking = false;
    clearInterval(qrTimer); qrTimer = setInterval(async () => { if (checking) return; checking = true; try { const state = await api(`/api/flow/whatsapp/status?instance=${encodeURIComponent(payload.instance)}`); if (state.connected) { clearInterval(qrTimer); setWhatsAppButton(true); await loadGroups(); $('flowQrPanel').hidden = true; status('WhatsApp conectado. Escolha o grupo de destino.'); } } catch (error) { $('flowQrStatus').textContent = error.message; } finally { checking = false; } }, 1000);
  }
  $('flowCreate').onclick = () => { $('flowName').value = ''; $('flowCreateDialog').showModal(); $('flowName').focus(); };
  $('flowCancelCreate').onclick = () => $('flowCreateDialog').close();
  $('flowCreateForm').onsubmit = async event => { event.preventDefault(); try { const flow = await api('/api/flows', {method: 'POST', body: JSON.stringify({name: $('flowName').value.trim()})}); $('flowCreateDialog').close(); await openFlow(flow.id); } catch (error) { $('flowName').setCustomValidity(error.message); $('flowName').reportValidity(); } };
  $('flowProjects').onclick = event => { const card = event.target.closest('[data-flow-id]'); if (card) openFlow(card.dataset.flowId); };
  $('flowBack').onclick = () => { clearInterval(qrTimer); $('flowEditorView').hidden = true; $('flowProjectsView').hidden = false; listFlows(); };
  $('flowConnect').onclick = loadEditor;
  $('flowPageSearch').addEventListener('flowchange', () => loadForms());
  $('flowToggleConnection').onclick = event => { const connected = event.currentTarget.getAttribute('aria-pressed') !== 'true'; event.currentTarget.setAttribute('aria-pressed', connected); event.currentTarget.textContent = connected ? 'Blocos conectados' : 'Conectar blocos'; document.querySelector('.flow-canvas').classList.toggle('connected', connected); };
  $('flowConnectWhatsApp').onclick = async event => { const button = event.currentTarget; button.disabled = true; try { if (button.dataset.connected === 'true') { if (!(await askDisconnect())) return; status('Desconectando WhatsApp…'); await api('/api/flow/whatsapp/instance', {method: 'DELETE'}); clearInterval(qrTimer); $('flowQrPanel').hidden = true; controls.group.clear('Conecte seu WhatsApp'); setWhatsAppButton(false); status('WhatsApp desconectado.'); return; } showQrLoading('A Evolution está gerando seu QR Code…'); status('Aguardando o QR Code da Evolution…'); const result = await api('/api/flow/whatsapp/instance', {method: 'POST', body: '{}'}); await showQr(result); if (!result.connected) status('Leia o QR Code para conectar seu WhatsApp.'); } catch (error) { $('flowQrPanel').hidden = true; status(error.message); } finally { button.disabled = false; } };
  $('flowBuilder').onsubmit = async event => { event.preventDefault(); status('Salvando fluxo…'); const flow = {enabled: $('flowEnabled').checked, facebook: {adAccountId: $('flowAdAccount').value, pageId: $('flowPage').value, formId: $('flowForm').value}, whatsapp: {instance: $('flowInstance').value.trim(), groupJid: $('flowGroup').value}}; try { currentFlow = await api(`/api/flows/${encodeURIComponent(currentFlow.id)}`, {method: 'PUT', body: JSON.stringify(flow)}); status(flow.enabled ? 'Fluxo ativo. A Página foi inscrita automaticamente nos novos leads.' : 'Fluxo salvo como rascunho.'); } catch (error) { status(error.message); } };
  listFlows();
})();
