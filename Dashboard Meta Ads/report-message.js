'use strict';
// Monta o texto do relatório de métricas que vai para o grupo do WhatsApp.
const {formatBrl} = require('./balance-schedule');

const ICONS = {crítico: '🔴', alto: '🟡', médio: '🟠', bom: '🟢', info: '📌'};

function formatReportMessage({name, period, findings}) {
  const lines = [`📊 *Relatório de métricas — ${name}*`];
  if (period) lines.push(period);
  if (!findings.length) {
    lines.push('', 'Nenhuma métrica fora do padrão no período.');
    return lines.join('\n');
  }
  for (const finding of findings) {
    lines.push('', `${ICONS[finding.status] || '📌'} *${finding.metric}* (${finding.value})`, finding.message, `👉 ${finding.suggestion}`);
  }
  return lines.join('\n');
}

// Relatório de performance para o gestor, enviado ao grupo: métricas principais, secundárias e ações por conta.
const percentText = value => value == null ? 'sem dado' : `${Number(value).toFixed(2).replace('.', ',')}%`;
const moneyText = value => value == null ? 'sem dado' : formatBrl(value);

function performanceBlock({name, metrics, findings}) {
  if (!metrics) return `📣 *${name}*\n⚪ Sem dados no período`;
  const results = metrics.results == null ? 'sem dado' : metrics.results;
  const costPerResult = metrics.costPerResult == null ? 'sem resultado' : formatBrl(metrics.costPerResult);
  const issues = findings.filter(finding => finding.status !== 'info').map(finding =>
    `${ICONS[finding.status] || '📌'} *${finding.metric}* (${finding.value})\n${finding.message}\n👉 ${finding.suggestion}`);
  return [
    `📣 *${name}*`,
    '🏆 *Principais*',
    `💵 Valor usado: ${moneyText(metrics.spend)}`,
    `🎯 Resultados: ${results}`,
    `💲 Custo por resultado: ${costPerResult}`,
    '',
    '📊 *Secundárias*',
    `📢 CPM: ${moneyText(metrics.cpm)} · 🖱️ CPC: ${moneyText(metrics.cpc)}`,
    `👆 CTR: ${percentText(metrics.ctr)} · 🔗 CTR no link: ${percentText(metrics.linkCtr)}`,
    `👥 Frequência: ${metrics.frequency == null ? 'sem dado' : Number(metrics.frequency).toFixed(1).replace('.', ',')} · ⏱️ Gancho 3s: ${percentText(metrics.hookRate)}`,
    '',
    issues.length ? '🧭 *Ações sugeridas*' : '✅ Nenhum ponto de atenção no período.',
    ...issues.flatMap(issue => ['', issue]),
  ].join('\n');
}

// Uma mensagem de cabeçalho e uma mensagem por conta: cada uma vai num balão separado do WhatsApp.
function performanceMessages({period, accounts}) {
  const header = ['📈 *Relatório de performance*', period].filter(Boolean).join('\n');
  if (!accounts.length) return [`${header}\n\nNenhuma conta no período.`];
  return [header, ...accounts.map(performanceBlock)];
}

module.exports = {formatReportMessage, performanceMessages};

// Alerta de frequência: mensagem quando a frequência de uma conta passa do máximo definido.
const fmtNumber = (value, digits = 1) => Number(value).toFixed(digits).replace('.', ',');
function frequencyAlertText({name, metrics, maxFrequency}) {
  const lines = [`🟡 *Frequência acima do máximo — ${name}*`, `A frequência está em ${fmtNumber(metrics.frequency)}, acima do máximo de ${fmtNumber(maxFrequency)}.`];
  if (metrics.cpm != null) lines.push(`📈 CPM atual: R$ ${fmtNumber(metrics.cpm, 2)}.`);
  if (metrics.ctr != null) lines.push(`👆 CTR atual: ${fmtNumber(metrics.ctr, 2)}%.`);
  lines.push('', 'Possível influência: frequência alta faz o mesmo público ver o anúncio repetidamente, o que costuma elevar o CPM e reduzir o CTR.', '👉 Renove o criativo ou amplie o público para reduzir o desgaste.');
  return lines.join('\n');
}
module.exports.frequencyAlertText = frequencyAlertText;
