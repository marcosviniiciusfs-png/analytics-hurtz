/* Relatórios com o Akash Relatórios.
   1) "Consultar campanhas": para cada conta selecionada, busca em /api/meta-spend as campanhas
      com veiculação no período e mostra a lista para o usuário escolher quais entram.
   2) Cada campanha recebe um grupo sugerido (mesma regra do Akash: palavras-chave e limpeza do nome).
      Campanhas com o mesmo grupo somam numa linha só do relatório, como no Akash.
   3) "Gerar relatórios (Akash)": monta as linhas do export com só as campanhas escolhidas,
      desenha cada relatório com o motor do Akash (akash/core.js + akash/report.js) num iframe
      1920x1080 isolado, gera o PNG e baixa todos num .zip. */
(function () {
  const MESSAGE_KEY = 'onsite_conversion.messaging_conversation_started_7d';
  const consultButton = document.querySelector('#akashReportButton');
  const status = document.querySelector('#reportStatus');
  const picker = document.querySelector('#akashPicker');
  if (!consultButton || !picker) return;

  const base = new URL('akash/', location.href).href;
  let state = null; // { from, to, accounts: [{ id, name, campaigns: [{ id, name, spend, results, indicator, selected, group }] }] }

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const money = value => 'R$ ' + Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const count = value => Number(value || 0).toLocaleString('pt-BR');

  function setStatus(text, isError) {
    if (!status) return;
    status.textContent = text;
    status.classList.toggle('error', !!isError);
  }

  function selectedAccountIds() {
    return [...document.querySelectorAll('#reportAccountOptions input:checked')].map(input => input.value);
  }

  // Tipo de resultado do dashboard -> indicador que o Akash reconhece (core.js, INDICADORES).
  function indicatorFor(resultType) {
    const t = String(resultType || '');
    if (/lead/i.test(t)) return 'lead';
    if (t === MESSAGE_KEY || /messaging_conversation/i.test(t)) return MESSAGE_KEY;
    return '';
  }

  // Grupo sugerido: a mesma função que o Akash usa (palavras-chave padrão + nome limpo).
  function suggestGroup(name) {
    return HurtzCore.guessGroup(name, HurtzCore.DEFAULT_KEYWORDS);
  }

  function campaignsOf(row) {
    return (row.campaigns || [])
      .filter(c => !c.no_delivery_in_period && (Number(c.spend || 0) > 0 || Number(c.results || 0) > 0))
      .map(c => {
        const name = String(c.campaign_name || c.name || '').trim();
        return {
          id: String(c.campaign_id || name),
          name,
          spend: Number(c.spend || 0),
          results: Number(c.results || 0),
          indicator: indicatorFor(c.result_type),
          selected: true,
          group: suggestGroup(name),
        };
      });
  }

  function exportRows(campaigns, from, to) {
    return campaigns.map(c => ({
      'Início dos relatórios': from,
      'Encerramento dos relatórios': to,
      'Nome da campanha': c.name,
      'Veiculação da campanha': '',
      'Resultados': c.results || '',
      'Indicador de resultados': c.indicator,
      'Custo por resultados': c.results ? c.spend / c.results : '',
      'Valor gasto (BRL)': c.spend,
      'Impressões': 0,
      'Alcance': 0,
    }));
  }

  /* ---------- passo 1: consulta e escolha das campanhas ---------- */
  async function consultCampaigns() {
    const ids = selectedAccountIds();
    const from = document.querySelector('#reportDateFrom')?.value;
    const to = document.querySelector('#reportDateTo')?.value;
    if (!ids.length) return alert('Selecione pelo menos uma conta.');
    if (!from || !to) return alert('Informe o período (data inicial e final).');
    if (from > to) return alert('A data inicial deve ser anterior à data final.');
    if (typeof HurtzCore === 'undefined') {
      return alert('Motor do Akash não carregou. Recarregue a página.');
    }

    consultButton.disabled = true;
    picker.hidden = true;
    try {
      setStatus(`Consultando campanhas de ${ids.length} conta(s) no período...`);
      const query = `from=${from}&to=${to}&accounts=${encodeURIComponent(ids.join(','))}`;
      const response = await fetch(`/api/meta-spend?${query}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Falha ao consultar a Meta.');

      const accounts = ids.map(id => {
        const row = payload.accounts?.[id];
        return { id, name: (row?.name || id).trim(), campaigns: row ? campaignsOf(row) : [] };
      });
      state = { from, to, accounts };
      renderPicker();
      const withCampaigns = accounts.filter(a => a.campaigns.length).length;
      setStatus(`${withCampaigns} de ${accounts.length} conta(s) com campanhas veiculadas no período. Escolha as campanhas e gere os relatórios.`);
    } catch (error) {
      setStatus(error.message, true);
    } finally {
      consultButton.disabled = false;
    }
  }

  function groupSummary(account) {
    const counts = new Map();
    account.campaigns.filter(c => c.selected).forEach(c => counts.set(c.group, (counts.get(c.group) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }

  function renderPicker() {
    if (!state) { picker.hidden = true; return; }
    const cards = state.accounts.map(account => {
      if (!account.campaigns.length) {
        return `<section class="akash-account is-empty"><header><h3>${esc(account.name)}</h3><span>Sem campanhas com veiculação no período</span></header></section>`;
      }
      const selectedCount = account.campaigns.filter(c => c.selected).length;
      const groups = groupSummary(account);
      const merged = groups.filter(([, n]) => n > 1).map(([label, n]) => `<span class="akash-chip">${esc(label)} · ${n} campanhas</span>`).join('');
      const groupList = [...new Set(account.campaigns.map(c => c.group))];
      const datalist = groupList.map(g => `<option value="${esc(g)}"></option>`).join('');
      const rows = account.campaigns.map((c, index) => `
        <tr class="${c.selected ? '' : 'is-off'}">
          <td class="pick"><input type="checkbox" data-account="${esc(account.id)}" data-index="${index}" ${c.selected ? 'checked' : ''} aria-label="Incluir ${esc(c.name)}"></td>
          <td class="name" title="${esc(c.name)}">${esc(c.name)}</td>
          <td class="num">${money(c.spend)}</td>
          <td class="num">${count(c.results)}</td>
          <td><input type="text" class="group-input" list="akash-groups-${esc(account.id)}" data-account="${esc(account.id)}" data-index="${index}" value="${esc(c.group)}" aria-label="Grupo de ${esc(c.name)}"></td>
        </tr>`).join('');
      return `
        <section class="akash-account">
          <header>
            <div><h3>${esc(account.name)}</h3><span>${selectedCount} de ${account.campaigns.length} campanhas selecionadas</span></div>
            <div class="akash-account-actions">
              <button type="button" data-toggle-account="${esc(account.id)}">${selectedCount ? 'Desmarcar todas' : 'Marcar todas'}</button>
            </div>
          </header>
          ${merged ? `<div class="akash-merged"><small>Agrupadas no relatório:</small> ${merged}</div>` : ''}
          <div class="akash-table-wrap"><table class="akash-table">
            <thead><tr><th></th><th>Campanha</th><th class="num">Gasto</th><th class="num">Resultados</th><th>Grupo no relatório</th></tr></thead>
            <tbody>${rows}</tbody>
          </table></div>
          <datalist id="akash-groups-${esc(account.id)}">${datalist}</datalist>
        </section>`;
    }).join('');

    const anySelected = state.accounts.some(a => a.campaigns.some(c => c.selected));
    picker.innerHTML = `
      <div class="akash-picker-head">
        <div><p class="eyebrow">AKASH RELATÓRIOS</p><h2>Escolha as campanhas</h2>
        <p>Período ${esc(state.from)} a ${esc(state.to)}. Só entram campanhas com veiculação no período. Campanhas com o mesmo grupo somam numa linha.</p></div>
        <button type="button" class="create-report-button" id="akashGenerate" ${anySelected ? '' : 'disabled'}>Gerar relatórios (Akash)</button>
      </div>
      ${cards}`;
    picker.hidden = false;
  }

  picker.addEventListener('change', event => {
    const target = event.target;
    if (!state) return;
    if (target.matches('input[type="checkbox"][data-index]')) {
      const account = state.accounts.find(a => a.id === target.dataset.account);
      const campaign = account?.campaigns[Number(target.dataset.index)];
      if (campaign) campaign.selected = target.checked;
      renderPicker();
    } else if (target.matches('.group-input')) {
      const account = state.accounts.find(a => a.id === target.dataset.account);
      const campaign = account?.campaigns[Number(target.dataset.index)];
      if (campaign) campaign.group = target.value.trim() || suggestGroup(campaign.name);
      renderPicker();
    }
  });

  picker.addEventListener('click', event => {
    if (!state) return;
    const toggle = event.target.closest('[data-toggle-account]');
    if (toggle) {
      const account = state.accounts.find(a => a.id === toggle.dataset.toggleAccount);
      const next = !account.campaigns.some(c => c.selected);
      account.campaigns.forEach(c => { c.selected = next; });
      renderPicker();
      return;
    }
    if (event.target.closest('#akashGenerate')) generateReports(event.target.closest('#akashGenerate'));
  });

  /* ---------- passo 2: desenho e download ---------- */
  // Desenha o relatório num iframe 1920x1080 (CSS e fontes do Akash ficam isolados do painel) e devolve o PNG em base64.
  function renderPng(model, texts, label) {
    return new Promise((resolve, reject) => {
      const frame = document.createElement('iframe');
      frame.setAttribute('aria-hidden', 'true');
      frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:1920px;height:1080px;border:0;visibility:hidden';
      frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><base href="${base}">` +
        `<link rel="stylesheet" href="report.css"></head><body style="margin:0;background:#fff">` +
        `<div id="akash-root"></div>` +
        `<script src="core.js"><\/script><script src="report.js"><\/script><script src="vendor/html-to-image.js"><\/script>` +
        `</body></html>`;
      const cleanup = () => frame.remove();
      frame.onload = async () => {
        try {
          const win = frame.contentWindow, doc = frame.contentDocument;
          const root = doc.getElementById('akash-root');
          root.innerHTML = win.HurtzReport.render(model, texts, { base });
          const el = root.firstElementChild;
          await doc.fonts.ready;
          win.HurtzReport.fit(el);
          const opts = { width: 1920, height: 1080, pixelRatio: 1, cacheBust: false };
          await win.htmlToImage.toPng(el, opts); // aquecimento, como no site do Akash
          const url = await win.htmlToImage.toPng(el, opts);
          cleanup();
          resolve(url.split(',')[1]);
        } catch (error) {
          cleanup();
          reject(new Error(`${label}: ${error.message}`));
        }
      };
      document.body.appendChild(frame);
    });
  }

  async function generateReports(button) {
    if (!state) return;
    if (typeof JSZip === 'undefined' || typeof htmlToImage === 'undefined') {
      return alert('Motor do Akash não carregou. Recarregue a página.');
    }
    button.disabled = true;
    const failures = [];
    try {
      const zip = new JSZip();
      const usedNames = new Set();
      const accounts = state.accounts.filter(a => a.campaigns.some(c => c.selected));
      let done = 0;
      for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        const chosen = account.campaigns.filter(c => c.selected);
        setStatus(`Gerando relatório ${i + 1} de ${accounts.length}: ${account.name}...`);
        try {
          const parsed = HurtzCore.parseRows(exportRows(chosen, state.from, state.to));
          const groups = {};
          chosen.forEach(c => { groups[c.name] = c.group || suggestGroup(c.name); });
          const cfg = Object.assign(HurtzCore.defaultCfg(), { nome: account.name.toUpperCase(), groups });
          const model = HurtzCore.buildModel(parsed, cfg, null);
          const texts = HurtzCore.gerarTextos(model);
          const png = await renderPng(model, texts, account.name);
          const slug = HurtzCore.slug(account.name);
          let fileName = `relatorio-${slug}-${state.to}.png`, suffix = 2;
          while (usedNames.has(fileName)) fileName = `relatorio-${slug}-${state.to}-${suffix++}.png`;
          usedNames.add(fileName);
          zip.file(fileName, png, { base64: true });
          done++;
        } catch (error) {
          failures.push(error.message);
        }
      }
      if (!done) throw new Error(failures.length ? failures.join(' · ') : 'Nenhum relatório gerado.');
      setStatus('Montando o arquivo .zip...');
      const blob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `relatorios-akash-${state.from}-a-${state.to}.zip`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 60000);
      const extra = failures.length ? ` Não gerados: ${failures.join(' · ')}` : '';
      setStatus(`${done} relatório(s) do Akash gerado(s) e baixado(s).${extra}`, failures.length > 0);
    } catch (error) {
      setStatus(error.message, true);
    } finally {
      button.disabled = false;
    }
  }

  /* ---------- estilo do seletor (injetado para não mexer no CSS do painel) ---------- */
  const style = document.createElement('style');
  style.textContent = `
    .akash-picker{margin-top:18px;display:grid;gap:14px}
    .akash-picker[hidden]{display:none}
    .akash-picker-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap}
    .akash-picker-head h2{margin:2px 0 4px}
    .akash-picker-head p{margin:0;color:var(--muted,#6b7280);font-size:14px}
    .akash-account{border:1px solid var(--line,#e5e7eb);border-radius:14px;padding:14px 16px;background:var(--panel,#fff)}
    .akash-account header{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
    .akash-account h3{margin:0;font-size:16px}
    .akash-account header span{font-size:13px;color:var(--muted,#6b7280)}
    .akash-account.is-empty{opacity:.7}
    .akash-account-actions button{font-size:13px;padding:6px 10px;border-radius:8px;border:1px solid var(--line,#d1d5db);background:transparent;cursor:pointer}
    .akash-merged{margin:10px 0 2px;font-size:13px;display:flex;flex-wrap:wrap;gap:6px;align-items:center}
    .akash-chip{background:#fff1ee;color:#c2410c;border-radius:999px;padding:3px 10px;font-weight:600}
    .akash-table-wrap{overflow-x:auto;margin-top:10px}
    .akash-table{width:100%;border-collapse:collapse;font-size:13px}
    .akash-table th,.akash-table td{padding:7px 8px;border-bottom:1px solid var(--line,#eef0f3);text-align:left;vertical-align:middle}
    .akash-table th{font-size:12px;text-transform:uppercase;letter-spacing:.03em;color:var(--muted,#6b7280)}
    .akash-table .num{text-align:right;white-space:nowrap}
    .akash-table .name{max-width:360px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .akash-table .pick{width:28px}
    .akash-table tr.is-off td{opacity:.45}
    .akash-table .group-input{width:100%;min-width:180px;padding:6px 8px;border-radius:8px;border:1px solid var(--line,#d1d5db);font:inherit}
  `;
  document.head.appendChild(style);

  consultButton.addEventListener('click', consultCampaigns);
})();
