'use strict';
// Monta o texto do relatório de métricas que vai para o grupo do WhatsApp.

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

module.exports = {formatReportMessage};
