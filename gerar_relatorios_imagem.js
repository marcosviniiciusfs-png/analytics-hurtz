const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const workspace = __dirname;
const sourceHtml = path.join(workspace, 'Relatorio-primeira-semana-julho-corrigido.html');
const outDir = path.join(workspace, 'relatorios-imagem-primeira-semana-julho');
const logoPath = 'C:/Users/Brito/Desktop/principal/Projetos/CBO/hurtz-logo-transparente.png';
const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

function stripTags(value) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function moneyToNumber(value) {
  return Number(value.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
}

function numberToMoney(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function icon(kind) {
  const icons = {
    users: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="8" r="3"/><circle cx="16.5" cy="8.5" r="2.5"/><circle cx="5.5" cy="10" r="2.2"/><path d="M3.5 19c.5-3.3 2.8-5.2 5.5-5.2s5 1.9 5.5 5.2H3.5Z"/><path d="M13.5 18.9c.4-2.4 2-3.9 4-3.9 1.8 0 3.3 1.3 3.8 3.9h-7.8Z"/></svg>',
    target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>',
    money: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><circle cx="12" cy="12" r="8"/><path d="M12 7v10M8.5 10c.5-1 1.7-1.6 3.5-1.6 2 0 3.5.9 3.5 2.3 0 3-7 1.4-7 4.3 0 1.3 1.5 2.3 3.5 2.3 1.7 0 3-.6 3.7-1.7"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l2 2 4-5"/><path d="M5 4h14v16H5z"/><path d="M8 4V2h8v2"/></svg>',
    trend: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19h16"/><path d="M7 16l4-4 3 3 5-7"/><path d="M15 8h4v4"/></svg>',
    calendar: '<svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/></svg>',
    building: '<svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><path d="M4 20h16"/><path d="M6 20V8l5-4 5 4v12"/><path d="M10 20v-6h4v6"/><path d="M8 10h1M15 10h1"/></svg>',
    chart: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19h16"/><path d="M7 16v-5M12 16V8M17 16v-9"/><path d="M5 9l7-5 7 5"/></svg>',
  };
  return icons[kind];
}

function parseAccounts() {
  const html = fs.readFileSync(sourceHtml, 'utf8');
  const sections = [...html.matchAll(/<section class="account">([\s\S]*?)<\/section>/g)];
  return sections.map((sectionMatch) => {
    const section = sectionMatch[1];
    const heading = stripTags(section.match(/<h2>([\s\S]*?)<\/h2>/)?.[1] || '');
    const [accountName] = heading.split(' - 29/06/2026');
    const spendText = stripTags(section.match(/<div class="spend">([\s\S]*?)<\/div>/)?.[1] || '').replace('Valor gasto: ', '');
    const groups = [...section.matchAll(/<div class="group">([\s\S]*?)<\/div>\s*<\/div>/g)].map((match) => {
      const groupHtml = match[1] + '</div>';
      const title = stripTags(groupHtml.match(/<div class="group-title">([\s\S]*?)<\/div>/)?.[1] || '');
      const text = stripTags(groupHtml);
      const leads = Number(text.match(/LEADS:\s*(\d+)/)?.[1] || 0);
      const cpl = text.match(/Custo por lead:\s*(R\$\s*[\d.,]+)/)?.[1] || '';
      const raw = stripTags(groupHtml.match(/<div class="raw">([\s\S]*?)<\/div>/)?.[1] || '');
      const isConfirmed = leads > 0 && cpl;
      return { title, leads, cpl, raw, text, isConfirmed };
    });
    const confirmedGroups = groups.filter((group) => group.isConfirmed);
    const notes = groups
      .filter((group) => !group.isConfirmed)
      .map((group) => group.raw || group.text.replace(group.title, '').trim())
      .filter(Boolean);
    const totalLeads = confirmedGroups.reduce((sum, group) => sum + group.leads, 0);
    const spend = moneyToNumber(spendText);
    const overallCpl = totalLeads > 0 ? numberToMoney(spend / totalLeads) : 'Sem lead';
    return { accountName, spendText, spend, groups, confirmedGroups, notes, totalLeads, overallCpl };
  });
}

function campaignLabel(account) {
  const names = account.confirmedGroups.map((group) => group.title.split(' - ')[0]);
  const unique = [...new Set(names)].slice(0, 3);
  return unique.length ? unique.join(', ') : 'Campanhas com gasto';
}

function fitGroups(groups) {
  if (groups.length <= 4) return groups;
  const top = groups.slice(0, 3);
  const rest = groups.slice(3);
  const restLeads = rest.reduce((sum, group) => sum + group.leads, 0);
  return [
    ...top,
    { title: `OUTROS GRUPOS (${rest.length})`, leads: restLeads, cpl: 'Detalhado', isConfirmed: true },
  ];
}

function buildHtml(account) {
  const visibleGroups = fitGroups(account.confirmedGroups);
  const noteText = account.notes.length
    ? account.notes.join(' ')
    : 'Todos os grupos exibidos possuem leads e custo por lead confirmados no relatório aprovado.';
  const groupRows = visibleGroups.map((group) => `
          <div class="group-row">
            <div class="name">${esc(group.title)}</div>
            <div><span class="label">Leads</span><span class="value">${esc(group.leads)}</span></div>
            <div><span class="label">CPL</span><span class="value">${esc(group.cpl)}</span></div>
          </div>`).join('');

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Relatorio imagem - ${esc(account.accountName)}</title>
  <style>
    :root { --orange:#ff4b13; --orange-soft:#fff1eb; --blue:#082b73; --ink:#111827; --muted:#5b6472; --line:#e8edf4; --panel:#fff; --bg:#fbfcfe; }
    * { box-sizing: border-box; }
    body { margin:0; background:#e9edf4; font-family:Arial, Helvetica, sans-serif; color:var(--ink); }
    .canvas { width:1600px; height:900px; margin:0 auto; background:var(--bg); border-top:9px solid var(--orange); border-radius:0 0 20px 20px; overflow:hidden; position:relative; padding:42px 38px 30px; }
    .header { display:grid; grid-template-columns:1fr 330px; gap:34px; align-items:center; margin-bottom:30px; }
    h1 { margin:0 0 12px; font-size:60px; line-height:1; letter-spacing:0; color:#0c1220; }
    .client-name { margin:0; font-size:30px; color:var(--blue); font-weight:500; }
    .logo-box { height:152px; border-left:2px solid #cfd6e0; display:flex; justify-content:center; align-items:center; }
    .logo-box img { width:210px; height:150px; object-fit:contain; }
    .meta-row { display:flex; gap:52px; align-items:center; margin:-8px 0 20px 24px; color:#1b2230; font-size:17px; }
    .meta-item { display:flex; align-items:center; gap:12px; white-space:nowrap; }
    .meta-icon { width:30px; height:30px; color:var(--orange); flex:0 0 auto; }
    .meta-item strong { margin-right:4px; }
    .meta-item .accent { color:var(--orange); font-weight:700; }
    .main-grid { display:grid; grid-template-columns:206px 206px 206px 1fr; gap:14px; align-items:stretch; }
    .metric-card,.analysis-card,.note-card { background:var(--panel); border:1px solid var(--line); border-radius:11px; box-shadow:0 10px 25px rgba(15,23,42,.045); }
    .metric-card { height:378px; padding:30px 22px 22px; display:flex; flex-direction:column; align-items:center; justify-content:flex-start; text-align:center; }
    .icon-bubble { width:78px; height:78px; border-radius:50%; display:grid; place-items:center; background:var(--orange-soft); color:var(--orange); margin-bottom:22px; }
    .icon-bubble svg { width:42px; height:42px; }
    .metric-label { min-height:38px; font-size:14px; font-weight:800; display:flex; align-items:center; justify-content:center; text-transform:uppercase; }
    .metric-line { width:76px; height:2px; background:#edb199; margin:14px 0; }
    .metric-value { color:var(--orange); font-weight:800; font-size:31px; line-height:1.1; min-height:58px; display:flex; align-items:center; justify-content:center; text-align:center; flex-wrap:wrap; }
    .mini-bars { margin-top:auto; height:86px; display:flex; align-items:end; justify-content:center; gap:16px; width:100%; }
    .mini-bars span { width:31px; background:var(--orange); display:block; }
    .mini-bars span:nth-child(1) { height:34px; } .mini-bars span:nth-child(2) { height:54px; } .mini-bars span:nth-child(3) { height:78px; }
    .donut { width:88px; height:88px; border-radius:50%; margin-top:auto; background:conic-gradient(var(--orange) 0 76%, #f4ddd3 76% 88%, #d8dee8 88% 100%); position:relative; }
    .donut:after { content:""; position:absolute; inset:25px; background:#fff; border-radius:50%; }
    .analysis-card { height:378px; padding:24px 30px; display:grid; grid-template-columns:245px 1fr; gap:26px; }
    .analysis-title { grid-column:1/-1; display:flex; align-items:center; gap:13px; color:var(--blue); font-size:19px; font-weight:800; text-transform:uppercase; margin-bottom:-4px; }
    .analysis-title .small-bubble { width:42px; height:42px; border-radius:50%; display:grid; place-items:center; background:var(--blue); color:#fff; }
    .highlight-box { border:1px solid #f0ded5; background:#fffdfb; border-radius:16px; padding:21px 18px; align-self:stretch; display:flex; flex-direction:column; justify-content:center; }
    .highlight-box h3 { margin:0 0 18px; color:var(--blue); font-size:17px; text-transform:uppercase; }
    .big-number { color:var(--orange); font-size:58px; line-height:.95; font-weight:800; margin-bottom:18px; }
    .big-number span { font-size:24px; margin-left:7px; }
    .highlight-box p { border-top:2px solid #edb199; padding-top:17px; margin:0; color:#313947; font-size:16px; line-height:1.45; }
    .group-list { display:grid; gap:12px; align-content:center; }
    .group-row { display:grid; grid-template-columns:1fr 104px 122px; align-items:center; gap:12px; padding:15px 18px; border:1px solid var(--line); border-radius:12px; background:#fff; min-height:72px; }
    .group-row .name { font-size:17px; font-weight:800; color:#111827; line-height:1.25; }
    .group-row .label { display:block; color:var(--muted); font-size:12px; font-weight:700; text-transform:uppercase; margin-bottom:5px; }
    .group-row .value { color:var(--orange); font-size:20px; font-weight:800; }
    .observation { padding:13px 18px; color:#3b4350; background:#f7f9fc; border:1px solid var(--line); border-radius:12px; font-size:14px; line-height:1.35; max-height:76px; overflow:hidden; }
    .bottom-grid { display:grid; grid-template-columns:1.25fr .95fr .95fr; gap:14px; margin-top:16px; }
    .note-card { min-height:174px; padding:24px 28px; display:grid; grid-template-columns:84px 1fr; gap:22px; align-items:center; }
    .note-icon { width:82px; height:82px; border-radius:50%; display:grid; place-items:center; background:var(--blue); color:#fff; }
    .note-icon.orange { background:var(--orange-soft); color:var(--blue); }
    .note-icon svg { width:42px; height:42px; }
    .note-card h3 { margin:0 0 12px; font-size:18px; color:#121826; }
    .note-card h3:after { content:""; display:block; width:43px; height:2px; background:var(--orange); margin-top:12px; }
    .note-card p { margin:0; color:#2f3745; line-height:1.45; font-size:15px; }
    .footer { position:absolute; left:0; right:0; bottom:16px; color:#404857; font-size:16px; text-align:center; }
    .footer:before,.footer:after { content:""; display:inline-block; width:32%; height:2px; background:#f0b39d; vertical-align:middle; margin:0 22px; }
    .footer strong { color:var(--orange); }
  </style>
</head>
<body>
  <main class="canvas">
    <header class="header">
      <div>
        <h1>Relatório de Performance</h1>
        <p class="client-name">${esc(account.accountName)}</p>
      </div>
      <aside class="logo-box"><img src="file:///${logoPath.replace(/ /g, '%20')}" alt="Hurtz"></aside>
    </header>
    <section class="meta-row" aria-label="Metadados do relatório">
      <div class="meta-item">${icon('calendar')}<span><strong>Período:</strong> 29 de junho a 05 de julho</span></div>
      <div class="meta-item">${icon('building')}<span><strong>Campanhas:</strong> <span class="accent">${esc(campaignLabel(account))}</span></span></div>
    </section>
    <section class="main-grid">
      <article class="metric-card"><div class="icon-bubble">${icon('users')}</div><div class="metric-label">Leads</div><div class="metric-line"></div><div class="metric-value">${esc(account.totalLeads)}</div><div class="mini-bars"><span></span><span></span><span></span></div></article>
      <article class="metric-card"><div class="icon-bubble">${icon('target')}</div><div class="metric-label">Custo por lead</div><div class="metric-line"></div><div class="metric-value">${esc(account.overallCpl)}</div><div class="donut"></div></article>
      <article class="metric-card"><div class="icon-bubble">${icon('money')}</div><div class="metric-label">Valor gasto</div><div class="metric-line"></div><div class="metric-value">${esc(account.spendText)}</div><div class="mini-bars"><span></span><span></span><span></span></div></article>
      <article class="analysis-card">
        <div class="analysis-title"><span class="small-bubble">${icon('chart')}</span>Desempenho por grupo de campanha</div>
        <div class="highlight-box"><h3>Total confirmado</h3><div class="big-number">${esc(account.totalLeads)}<span>leads</span></div><p>Investimento total de <strong>${esc(account.spendText)}</strong> no período analisado.</p></div>
        <div class="group-list">${groupRows}<div class="observation">${esc(noteText)}</div></div>
      </article>
    </section>
    <section class="bottom-grid">
      <article class="note-card"><div class="note-icon">${icon('doc')}</div><div><h3>Resumo do período</h3><p>${esc(account.accountName)} gerou ${esc(account.totalLeads)} leads confirmados, com investimento total de ${esc(account.spendText)} entre 29/06/2026 e 05/07/2026.</p></div></article>
      <article class="note-card"><div class="note-icon orange">${icon('check')}</div><div><h3>O que foi analisado</h3><p>Os resultados foram separados por grupo de campanha usando os dados consolidados no relatório aprovado.</p></div></article>
      <article class="note-card"><div class="note-icon orange">${icon('trend')}</div><div><h3>Ponto de atenção</h3><p>${esc(noteText)}</p></div></article>
    </section>
    <div class="footer">Relatório de Desenvolvido por <strong>Hurtz</strong></div>
  </main>
</body>
</html>`;
}

function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const accounts = parseAccounts();
  const written = [];
  for (const account of accounts) {
    const base = `relatorio-imagem-${slugify(account.accountName)}`;
    const htmlPath = path.join(outDir, `${base}.html`);
    const pngPath = path.join(outDir, `${base}.png`);
    fs.writeFileSync(htmlPath, buildHtml(account), 'utf8');
    const result = spawnSync(edgePath, [
      '--headless',
      '--disable-gpu',
      '--window-size=1600,900',
      `--screenshot=${pngPath}`,
      `file:///${htmlPath.replace(/\\/g, '/')}`,
    ], { encoding: 'utf8' });
    if (result.status !== 0) {
      throw new Error(`Falha ao renderizar ${account.accountName}: ${result.stderr || result.stdout}`);
    }
    written.push({ account: account.accountName, htmlPath, pngPath });
  }
  console.log(JSON.stringify(written, null, 2));
}

main();
