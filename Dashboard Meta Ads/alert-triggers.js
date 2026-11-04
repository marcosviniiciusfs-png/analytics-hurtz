'use strict';
// Palavras que disparam um alerta na hora, quando alguém envia a palavra no grupo de destino.
// Cada tipo de alerta tem a sua palavra; a comparação ignora maiúsculas e acentos.
const {SEPARATOR} = require('./balance-schedule');

const TRIGGER_KINDS = {
  saldo: 'Saldo das contas',
  frequencia: 'Frequência das contas',
  limites: 'Limites de gasto',
  relatorio: 'Relatório de performance (3 dias)',
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

module.exports = {TRIGGER_KINDS, normalizeTriggerWords, matchTrigger, frequencyText};
