'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {normalizeTriggerWords, matchTrigger, frequencyText} = require('./alert-triggers');

test('trigger words are kept per alert type, trimmed, and empty ones are dropped', () => {
  assert.deepEqual(normalizeTriggerWords({saldo: '  Saldo ', frequencia: '', relatorio: 'relatório', outro: 'x'}), {saldo: 'Saldo', relatorio: 'relatório'});
  assert.deepEqual(normalizeTriggerWords(undefined), {});
});

test('a word matches as a whole word, ignoring case and accents', () => {
  const words = {saldo: 'saldo', limites: 'limite'};
  assert.equal(matchTrigger('Bom dia, pode mandar o SALDO?', words), 'saldo');
  assert.equal(matchTrigger('me manda o saldo por favor', words), 'saldo');
  assert.equal(matchTrigger('saldoo', words), null, 'a longer word is not a match');
  assert.equal(matchTrigger('quais os limites', words), null, 'a plural is not a match of limite');
  assert.equal(matchTrigger('Limite de gasto', {limites: 'limite de gasto'}), 'limites');
  assert.equal(matchTrigger('oi', {}), null);
});

test('when two words are in the same message, the first alert type in order wins', () => {
  assert.equal(matchTrigger('saldo e relatorio', {saldo: 'saldo', relatorio: 'relatorio'}), 'saldo');
});

test('frequency text compares each account with the maximum', () => {
  const text = frequencyText({time: '10:00', maxFrequency: 3, accounts: [
    {name: 'CA - Um', frequency: 3.2},
    {name: 'CA - Dois', frequency: 2},
    {name: 'CA - Três', frequency: null},
  ]});
  assert.match(text, /📣 \*CA - Um\*\n📊 Frequência: 3,2 🔴 acima do máximo de 3,0/);
  assert.match(text, /📣 \*CA - Dois\*\n📊 Frequência: 2,0 🟢 dentro do máximo de 3,0/);
  assert.match(text, /📣 \*CA - Três\*\n⚪ Frequência: sem dado/);
});
