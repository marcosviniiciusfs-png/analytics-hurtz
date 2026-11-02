'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {normalizeTriggerWords, matchTrigger, frequencyText, parseWindowRow, reportText} = require('./alert-triggers');

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

test('window row becomes spend, results, cost per result, CPM and unique CTR', () => {
  const metrics = parseWindowRow({spend: '300.00', cpm: '12.5', unique_ctr: '1.8', actions: [{action_type: 'lead', value: '6'}]});
  assert.equal(metrics.spend, 300);
  assert.equal(metrics.results, 6);
  assert.equal(metrics.costPerResult, 50);
  assert.equal(metrics.cpm, 12.5);
  assert.equal(metrics.uniqueCtr, 1.8);
  assert.equal(parseWindowRow(undefined), null);
});

test('results fall back to messaging conversations when there are no leads', () => {
  const metrics = parseWindowRow({spend: '40', actions: [{action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '4'}]});
  assert.equal(metrics.results, 4);
  assert.equal(metrics.costPerResult, 10);
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

test('report text lists spend, results, cost per lead, CPM and unique CTR for each account', () => {
  const text = reportText({period: '30/10 a 01/11', accounts: [
    {name: 'CA - Um', metrics: {spend: 300, results: 6, costPerResult: 50, cpm: 12.5, uniqueCtr: 1.8}},
    {name: 'CA - Dois', metrics: null},
  ]});
  assert.match(text, /📈 \*Relatório das contas: 30\/10 a 01\/11\*/);
  assert.match(text, /📣 \*CA - Um\*\n💵 Valor usado: R\$\s?300,00\n🎯 Resultado: 6\n💲 Custo por lead: R\$\s?50,00\n📢 CPM: R\$\s?12,50\n👆 CTR único: 1,80%/);
  assert.match(text, /📣 \*CA - Dois\*\n⚪ Sem dados no período/);
});
