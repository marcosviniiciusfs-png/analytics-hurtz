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
