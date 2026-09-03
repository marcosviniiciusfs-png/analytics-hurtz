const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const workspace = __dirname;
const sourceHtml = path.join(workspace, 'Relatorio-primeira-semana-julho-corrigido.html');
const outputHtml = path.join(workspace, 'analise-profunda-contas-primeira-semana-julho.html');
const outputPdf = path.join(workspace, 'analise-profunda-contas-primeira-semana-julho.pdf');
const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const accountMetrics = {
  'CA - Consorcio Certicon': { apiName: 'CA - Consórcio Certicon', spend: 396.43, impressions: 38135, reach: 20549, clicks: 931, ctr: 2.441327, cpc: 0.425811, cpm: 10.395437, frequency: 1.855808 },
  'CA - Investbens': { apiName: 'CA - Investbens', spend: 597.27, impressions: 61160, reach: 26793, clicks: 2308, ctr: 3.773708, cpc: 0.258783, cpm: 9.765697, frequency: 2.282686 },
  'CA - Ramos solucoes': { apiName: 'CA - Ramos soluções', spend: 310.17, impressions: 22775, reach: 17640, clicks: 722, ctr: 3.170143, cpc: 0.429598, cpm: 13.61888, frequency: 1.2911 },
  'CA - Progresso': { apiName: 'CA - Progresso', spend: 370.58, impressions: 49597, reach: 24192, clicks: 1106, ctr: 2.229974, cpc: 0.335063, cpm: 7.471823, frequency: 2.050141 },
  'Gomes Invest': { apiName: 'Gomes Invest', spend: 273.61, impressions: 17134, reach: 11247, clicks: 901, ctr: 5.25855, cpc: 0.303674, cpm: 15.968834, frequency: 1.523428 },
  'Ribeiro 02': { apiName: 'Ribeiro 02', spend: 736.57, impressions: 66815, reach: 33187, clicks: 1528, ctr: 2.286912, cpc: 0.482048, cpm: 11.024022, frequency: 2.013288 },
  'CA - Topazio - 3356': { apiName: 'CA - Topázio - 3356', spend: 533.70, impressions: 19356, reach: 13881, clicks: 576, ctr: 2.975821, cpc: 0.926563, cpm: 27.572846, frequency: 1.394424 },
  'CA - Topazio 03 - 7219': { apiName: 'CA - Topázio 03 - 7219', spend: 180.45, impressions: 8873, reach: 6636, clicks: 453, ctr: 5.105376, cpc: 0.398344, cpm: 20.336977, frequency: 1.337101 },
  'CA - Malta Investimento': { apiName: 'CA - Malta Investimento', spend: 449.25, impressions: 51457, reach: 31639, clicks: 1806, ctr: 3.509727, cpc: 0.248754, cpm: 8.730591, frequency: 1.626379 },
  'B2 Investimento': { apiName: '[CA] B2_INVESTIMENTO', spend: 661.00, impressions: 43409, reach: 27718, clicks: 1074, ctr: 2.474141, cpc: 0.615456, cpm: 15.227257, frequency: 1.566094 },
  'LD': { apiName: 'CA - LD Consórcio', spend: 266.31, impressions: 22978, reach: 17832, clicks: 983, ctr: 4.278005, cpc: 0.270916, cpm: 11.589782, frequency: 1.288582 },
  'Ideal Credito': { apiName: 'CA - Ideal Créditos', spend: 290.20, impressions: 10885, reach: 6605, clicks: 648, ctr: 5.953147, cpc: 0.44784, cpm: 26.660542, frequency: 1.647994 },
  'Talisma': { apiName: 'Talismã', spend: 162.67, impressions: 11281, reach: 7868, clicks: 680, ctr: 6.027834, cpc: 0.239221, cpm: 14.419821, frequency: 1.433782 },
  'Grupo Uniao': { apiName: 'CA - Grupo União', spend: 682.76, impressions: 32193, reach: 19490, clicks: 1218, ctr: 3.783431, cpc: 0.560558, cpm: 21.208337, frequency: 1.65177 },
};

function stripTags(value) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function brl(value) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function pct(value) {
  return `${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function num(value) {
  return Number(value).toLocaleString('pt-BR');
}

function moneyTextToNumber(value) {
  return Number(String(value).replace(/[^\d,]/g, '').replace(',', '.')) || 0;
}

function parseAccounts() {
  const html = fs.readFileSync(sourceHtml, 'utf8');
  return [...html.matchAll(/<section class="account">([\s\S]*?)<\/section>/g)].map((sectionMatch) => {
    const section = sectionMatch[1];
    const heading = stripTags(section.match(/<h2>([\s\S]*?)<\/h2>/)?.[1] || '');
    const [accountName] = heading.split(' - 29/06/2026');
    const spendText = stripTags(section.match(/<div class="spend">([\s\S]*?)<\/div>/)?.[1] || '').replace('Valor gasto: ', '');
    const groups = [...section.matchAll(/<div class="group">([\s\S]*?)<\/div>\s*<\/div>/g)].map((match) => {
      const groupHtml = `${match[1]}</div>`;
      const title = stripTags(groupHtml.match(/<div class="group-title">([\s\S]*?)<\/div>/)?.[1] || '');
      const text = stripTags(groupHtml);
      const leads = Number(text.match(/LEADS:\s*(\d+)/)?.[1] || 0);
      const cplText = text.match(/Custo por lead:\s*(R\$\s*[\d.,]+)/)?.[1] || '';
      const cpl = cplText ? moneyTextToNumber(cplText) : null;
      const raw = stripTags(groupHtml.match(/<div class="raw">([\s\S]*?)<\/div>/)?.[1] || '');
      return { title, text, leads, cpl, cplText, raw, confirmed: leads > 0 && Boolean(cplText) };
    });
    const confirmedGroups = groups.filter((group) => group.confirmed);
    const notes = groups
      .filter((group) => !group.confirmed)
      .map((group) => group.raw || group.text.replace(group.title, '').trim())
      .filter(Boolean);
    const totalLeads = confirmedGroups.reduce((sum, group) => sum + group.leads, 0);
    const approvedSpend = moneyTextToNumber(spendText);
    return { accountName, spendText, approvedSpend, groups, confirmedGroups, notes, totalLeads };
  });
}

function bestGroup(account) {
  return [...account.confirmedGroups].sort((a, b) => {
    if (a.cpl !== b.cpl) return a.cpl - b.cpl;
    return b.leads - a.leads;
  })[0];
}

function worstGroup(account) {
  return [...account.confirmedGroups].sort((a, b) => {
    if (b.cpl !== a.cpl) return b.cpl - a.cpl;
    return b.leads - a.leads;
  })[0];
}

function buildAnalysis(account) {
  const metrics = accountMetrics[account.accountName];
  const best = bestGroup(account);
  const worst = worstGroup(account);
  const approvedCpl = account.totalLeads > 0 ? account.approvedSpend / account.totalLeads : null;
  const good = [];
  const attention = [];
  const improve = [];

  if (metrics.ctr >= 5) good.push(`CTR forte de ${pct(metrics.ctr)}, sinal de criativo/oferta com boa capacidade de gerar clique.`);
  else if (metrics.ctr >= 3) good.push(`CTR saudável de ${pct(metrics.ctr)}, com margem para evoluir criativos sem sinal crítico de baixa atração.`);
  else attention.push(`CTR de ${pct(metrics.ctr)} abaixo do grupo mais forte das contas; vale revisar gancho, criativo e promessa inicial.`);

  if (metrics.cpc <= 0.30) good.push(`CPC baixo de ${brl(metrics.cpc)}, mostrando tráfego barato para o período.`);
  else if (metrics.cpc <= 0.50) good.push(`CPC controlado de ${brl(metrics.cpc)}, aceitável para campanhas de captação.`);
  else attention.push(`CPC de ${brl(metrics.cpc)} pressiona a eficiência; priorizar criativos e públicos que reduzem custo de clique.`);

  if (metrics.cpm <= 10) good.push(`CPM competitivo de ${brl(metrics.cpm)}, bom para ganhar volume com menor custo de mídia.`);
  else if (metrics.cpm >= 20) attention.push(`CPM alto de ${brl(metrics.cpm)}, exigindo mais cuidado com público, posicionamento e fadiga criativa.`);

  if (metrics.frequency > 2) attention.push(`Frequência em ${metrics.frequency.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}; há risco de repetição de audiência se o volume subir sem renovar criativos.`);
  else good.push(`Frequência controlada em ${metrics.frequency.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}, sem sinal forte de saturação.`);

  if (best) good.push(`Melhor bloco: ${best.title}, com ${best.leads} leads e CPL de ${best.cplText}.`);
  if (worst && best && worst.title !== best.title) attention.push(`Bloco mais pesado: ${worst.title}, com CPL de ${worst.cplText}; precisa de auditoria antes de escalar.`);
  if (account.notes.length) attention.push(`Existem campanhas com gasto sem lead confirmado separado no retorno da API; esse gasto deve continuar sendo auditado no Gerenciador.`);

  if (approvedCpl !== null) {
    if (approvedCpl <= 3) good.push(`CPL geral estimado pelo consolidado aprovado em ${brl(approvedCpl)}, muito eficiente para captação.`);
    else if (approvedCpl > 7) attention.push(`CPL geral pelo consolidado aprovado em ${brl(approvedCpl)}, acima do ideal das melhores contas do período.`);
  }

  if (metrics.ctr < 3) improve.push('Testar novos criativos com promessa mais direta nos primeiros segundos e CTA mais explícito.');
  if (metrics.cpc > 0.50) improve.push('Separar orçamento dos conjuntos/campanhas com CPC alto e redistribuir para os criativos de melhor clique.');
  if (metrics.cpm > 20) improve.push('Abrir públicos ou revisar posicionamentos para reduzir custo de entrega.');
  if (worst && worst.cpl && best && worst.cpl > best.cpl * 2) improve.push(`Revisar ${worst.title}: o CPL está muito acima do melhor bloco (${best.title}).`);
  if (account.notes.length) improve.push('Conferir no Gerenciador as campanhas com gasto sem lead confirmado e decidir se continuam, pausam ou recebem novo evento de conversão.');
  if (!improve.length) improve.push('Manter a estrutura vencedora e testar variações incrementais de criativo para aumentar volume sem perder CPL.');

  return {
    good: good.slice(0, 4),
    attention: attention.slice(0, 4),
    improve: improve.slice(0, 4),
  };
}

function renderAccount(account) {
  const metrics = accountMetrics[account.accountName];
  const analysis = buildAnalysis(account);
  const approvedCpl = account.totalLeads > 0 ? brl(account.approvedSpend / account.totalLeads) : 'Sem lead';
  const groupsRows = account.groups.map((group) => `
        <tr>
          <td>${esc(group.title)}</td>
          <td>${group.confirmed ? num(group.leads) : 'Sem lead confirmado'}</td>
          <td>${group.cplText ? esc(group.cplText) : '-'}</td>
          <td>${group.raw ? esc(group.raw) : '-'}</td>
        </tr>`).join('');

  return `
    <section class="page account-page">
      <div class="page-head">
        <div>
          <p class="eyebrow">Análise por conta</p>
          <h2>${esc(account.accountName)}</h2>
          <p class="sub">Período: 29/06/2026 a 05/07/2026</p>
        </div>
        <div class="stamp">HURTZ</div>
      </div>

      <div class="kpis">
        <div><span>Leads aprovados</span><strong>${num(account.totalLeads)}</strong></div>
        <div><span>CPL consolidado</span><strong>${esc(approvedCpl)}</strong></div>
        <div><span>Valor gasto aprovado</span><strong>${esc(account.spendText)}</strong></div>
        <div><span>CTR</span><strong>${pct(metrics.ctr)}</strong></div>
        <div><span>CPC</span><strong>${brl(metrics.cpc)}</strong></div>
        <div><span>CPM</span><strong>${brl(metrics.cpm)}</strong></div>
      </div>

      <div class="metrics-line">
        <span>Impressões: <b>${num(metrics.impressions)}</b></span>
        <span>Alcance: <b>${num(metrics.reach)}</b></span>
        <span>Cliques: <b>${num(metrics.clicks)}</b></span>
        <span>Frequência: <b>${metrics.frequency.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></span>
        <span>Gasto API para métricas auxiliares: <b>${brl(metrics.spend)}</b></span>
      </div>

      <div class="analysis-grid">
        <article>
          <h3>O que está bom</h3>
          <ul>${analysis.good.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>
        </article>
        <article>
          <h3>Ponto de atenção</h3>
          <ul>${analysis.attention.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>
        </article>
        <article>
          <h3>O que pode melhorar</h3>
          <ul>${analysis.improve.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>
        </article>
      </div>

      <h3 class="table-title">Abertura por grupo do relatório aprovado</h3>
      <table>
        <thead><tr><th>Grupo</th><th>Leads</th><th>CPL</th><th>Observação</th></tr></thead>
        <tbody>${groupsRows}</tbody>
      </table>

      <p class="footnote">Leads, CPL e valor gasto aprovado vêm do relatório validado. CTR, CPC, CPM, impressões, alcance, cliques e frequência foram coletados da API Meta no mesmo período.</p>
    </section>`;
}

function buildHtml(accounts) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Análise profunda - primeira semana de julho</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #111827; font-family: Arial, Helvetica, sans-serif; background: #fff; }
    .page { page-break-after: always; }
    .cover { min-height: 270mm; display: flex; flex-direction: column; justify-content: center; border-top: 8px solid #ff4b13; padding: 28mm 16mm; }
    .cover h1 { font-size: 38px; margin: 0 0 12px; line-height: 1.05; }
    .cover p { color: #4b5563; font-size: 15px; max-width: 620px; line-height: 1.5; }
    .cover .brand { color: #ff4b13; font-weight: 800; letter-spacing: 6px; margin-bottom: 34px; }
    .account-page { padding-top: 2mm; }
    .page-head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e5e7eb; padding-bottom: 14px; margin-bottom: 16px; }
    .eyebrow { color: #ff4b13; text-transform: uppercase; font-size: 11px; font-weight: 800; letter-spacing: 1px; margin: 0 0 5px; }
    h2 { font-size: 25px; margin: 0 0 5px; color: #07142f; }
    .sub { margin: 0; color: #4b5563; font-size: 12px; }
    .stamp { color: #ff4b13; font-weight: 800; letter-spacing: 5px; font-size: 16px; margin-top: 8px; }
    .kpis { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-bottom: 10px; }
    .kpis div { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 9px; min-height: 64px; background: #fbfcfe; }
    .kpis span { display: block; color: #6b7280; font-size: 10px; text-transform: uppercase; font-weight: 700; margin-bottom: 7px; }
    .kpis strong { color: #ff4b13; font-size: 17px; line-height: 1.1; }
    .metrics-line { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 14px; font-size: 11px; color: #374151; }
    .metrics-line span { border: 1px solid #e5e7eb; border-radius: 999px; padding: 5px 8px; }
    .analysis-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
    article { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; min-height: 158px; }
    article h3 { margin: 0 0 9px; font-size: 15px; color: #082b73; }
    ul { margin: 0; padding-left: 17px; }
    li { margin-bottom: 7px; font-size: 11.4px; line-height: 1.35; color: #1f2937; }
    .table-title { margin: 12px 0 7px; font-size: 14px; color: #07142f; }
    table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
    th, td { border: 1px solid #e5e7eb; padding: 7px; vertical-align: top; text-align: left; }
    th { background: #f3f5f8; color: #374151; font-size: 10px; text-transform: uppercase; }
    td:first-child { font-weight: 700; color: #111827; width: 29%; }
    td:nth-child(2), td:nth-child(3) { width: 14%; }
    .footnote { font-size: 10px; color: #6b7280; margin-top: 10px; line-height: 1.35; }
  </style>
</head>
<body>
  <section class="page cover">
    <div class="brand">HURTZ</div>
    <h1>Análise profunda das contas Meta Ads</h1>
    <p>Período analisado: 29 de junho de 2026 a 05 de julho de 2026.</p>
    <p>Este PDF parte do relatório aprovado e adiciona uma leitura estratégica por conta usando métricas auxiliares da API Meta: CTR, CPC, CPM, impressões, alcance, cliques e frequência.</p>
    <p>Os pontos abaixo destacam o que está bom, os principais pontos de atenção e o que pode ser melhorado em cada conta.</p>
  </section>
  ${accounts.map(renderAccount).join('\n')}
</body>
</html>`;
}

function main() {
  const accounts = parseAccounts();
  fs.writeFileSync(outputHtml, buildHtml(accounts), 'utf8');
  const result = spawnSync(edgePath, [
    '--headless',
    '--disable-gpu',
    `--print-to-pdf=${outputPdf}`,
    `file:///${outputHtml.replace(/\\/g, '/')}`,
  ], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'Falha ao gerar PDF');
  }
  console.log(JSON.stringify({ outputHtml, outputPdf, accounts: accounts.length }, null, 2));
}

main();
