'use strict';
// Palavras que disparam um alerta na hora, quando alguém envia a palavra no grupo de destino.
// Cada tipo de alerta tem a sua palavra; a comparação ignora maiúsculas e acentos.
const {SEPARATOR, formatBrl} = require('./balance-schedule');

const TRIGGER_KINDS = {
  saldo: 'Saldo das contas',
  frequencia: 'Frequência das contas',
  limites: 'Limites de gasto',
  relatorio: 'Relatório das contas (3 dias)',
};

const MAX_WORD = 40;

// Texto sem acentos, em minúsculas, com espaços normalizados.
const normalizeText = value => String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

// Aceita só os tipos conhecidos e palavras não vazias; ignora o resto.
function normalizeTriggerWords(input) {
  const words = {};
  for (const kind of Object.keys(TRIGGER_KINDS)) {
    const word = String(input?.[kind] || '').trim().slice(0, MAX_WORD);
    if (word) words[kind] = word;
  }
  return words;
}

// Só letras e números, separados por espaço: a pontuação não impede a palavra de casar.
const comparable = value => normalizeText(value).replace(/[^a-z0-9]+/g, ' ').trim();

// Primeiro tipo cuja palavra aparece no texto, como palavra inteira ou expressão.
function matchTrigger(text, words) {
  const haystack = ` ${comparable(text)} `;
  for (const kind of Object.keys(TRIGGER_KINDS)) {
    const word = comparable(words?.[kind]);
    if (word && haystack.includes(` ${word} `)) return kind;
  }
  return null;
}

const percent = value => `${Number(value).toFixed(2).replace('.', ',')}%`;

// Frequência atual de cada conta, com a comparação com o máximo configurado.
function frequencyText({time, accounts, maxFrequency}) {
  const blocks = accounts.map(account => {
    if (account.frequency == null) return `📣 *${account.name}*\n⚪ Frequência: sem dado`;
    const value = Number(account.frequency).toFixed(1).replace('.', ',');
    const status = maxFrequency > 0
      ? (account.frequency > maxFrequency ? `🔴 acima do máximo de ${Number(maxFrequency).toFixed(1).replace('.', ',')}` : `🟢 dentro do máximo de ${Number(maxFrequency).toFixed(1).replace('.', ',')}`)
      : '';
    return [`📣 *${account.name}*`, `📊 Frequência: ${value}${status ? ` ${status}` : ''}`].join('\n');
  });
  return [`📊 *Frequência das contas às ${time}*`, blocks.join(`\n\n${SEPARATOR}\n\n`)].join('\n\n');
}

// Resultados de uma conta: leads, ou conversas iniciadas no WhatsApp quando não há leads.
function resultsOf(actions) {
  const find = type => {
    const item = (actions || []).find(entry => entry.action_type === type);
    return item ? Number(item.value) : null;
  };
  return find('lead') ?? find('onsite_conversion.messaging_conversation_started_7d');
}

// Métricas de uma conta no período, a partir da linha de Insights da Meta.
function parseWindowRow(row) {
  if (!row) return null;
  const spend = row.spend != null ? Number(row.spend) : null;
  const results = resultsOf(row.actions);
  return {
    spend,
    results,
    costPerResult: spend != null && results > 0 ? spend / results : null,
    cpm: row.cpm != null ? Number(row.cpm) : null,
    uniqueCtr: row.unique_ctr != null ? Number(row.unique_ctr) : null,
  };
}

// Relatório de cada conta: valor usado, resultado, custo por lead, CPM e CTR único.
function reportText({period, accounts}) {
  const blocks = accounts.map(({name, metrics}) => {
    if (!metrics) return `📣 *${name}*\n⚪ Sem dados no período`;
    return [
      `📣 *${name}*`,
      `💵 Valor usado: ${metrics.spend == null ? 'sem dado' : formatBrl(metrics.spend)}`,
      `🎯 Resultado: ${metrics.results == null ? 'sem dado' : metrics.results}`,
      `💲 Custo por lead: ${metrics.costPerResult == null ? 'sem resultado' : formatBrl(metrics.costPerResult)}`,
      `📢 CPM: ${metrics.cpm == null ? 'sem dado' : formatBrl(metrics.cpm)}`,
      `👆 CTR único: ${metrics.uniqueCtr == null ? 'sem dado' : percent(metrics.uniqueCtr)}`,
    ].join('\n');
  });
  return [`📈 *Relatório das contas: ${period}*`, blocks.join(`\n\n${SEPARATOR}\n\n`)].join('\n\n');
}

module.exports = {TRIGGER_KINDS, normalizeTriggerWords, matchTrigger, frequencyText, parseWindowRow, reportText};
