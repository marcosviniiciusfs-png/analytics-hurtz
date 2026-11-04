'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {performanceMessages} = require('./report-message');

const metrics = {spend: 300, results: 6, costPerResult: 50, cpm: 12.5, cpc: 1.8, ctr: 1.2, linkCtr: 0.4, frequency: 2.1, hookRate: 18};

test('the first message is the header, and each account has its own message with the main, secondary and action items', () => {
  const [header, first] = performanceMessages({period: '30/10 a 01/11', accounts: [
    {name: 'CA - Um', metrics, findings: [
      {metric: 'CTR no link', status: 'crítico', value: '0,40%', message: 'Só 0,40% das impressões viraram clique no link.', suggestion: 'Revise a oferta.'},
      {metric: 'CPC', status: 'médio', value: 'R$ 3,00', message: 'O custo por clique está em R$ 3,00.', suggestion: 'Teste públicos mais frios.'},
      {metric: 'Hook rate (3s)', status: 'info', value: '18,00%', message: 'x', suggestion: 'y'},
    ]},
  ]});
  assert.equal(header, '📈 *Relatório de performance*\n30/10 a 01/11');
  assert.match(first, /^📣 \*CA - Um\*\n🏆 \*Principais\*\n💵 Valor usado: R\$\s?300,00\n🎯 Resultados: 6\n💲 Custo por resultado: R\$\s?50,00/);
  assert.match(first, /📊 \*Secundárias\*\n📢 CPM: R\$\s?12,50 · 🖱️ CPC: R\$\s?1,80\n👆 CTR: 1,20% · 🔗 CTR no link: 0,40%\n👥 Frequência: 2,1 · ⏱️ Gancho 3s: 18,00%/);
  assert.match(first, /🧭 \*Ações sugeridas\*\n\n🔴 \*CTR no link\* \(0,40%\)\nSó 0,40% das impressões viraram clique no link\.\n👉 Revise a oferta\./);
  assert.match(first, /🟠 \*CPC\* \(R\$ 3,00\)/);
  assert.doesNotMatch(first, /Hook rate \(3s\)\*/, 'informative findings are not listed as actions');
});

test('each account goes in its own message, in the order given', () => {
  const messages = performanceMessages({period: 'p', accounts: [
    {name: 'CA - Um', metrics, findings: []},
    {name: 'CA - Dois', metrics: null, findings: []},
  ]});
  assert.equal(messages.length, 3);
  assert.match(messages[1], /^📣 \*CA - Um\*/);
  assert.match(messages[1], /✅ Nenhum ponto de atenção no período\./);
  assert.equal(messages[2], '📣 *CA - Dois*\n⚪ Sem dados no período');
});

test('missing values are shown as no data, and no result is shown as such', () => {
  const [, text] = performanceMessages({period: 'p', accounts: [
    {name: 'CA - Um', metrics: {spend: 40, results: 0, costPerResult: null, cpm: null, cpc: null, ctr: null, linkCtr: null, frequency: null, hookRate: null}, findings: []},
  ]});
  assert.match(text, /🎯 Resultados: 0\n💲 Custo por resultado: sem resultado/);
  assert.match(text, /📢 CPM: sem dado · 🖱️ CPC: sem dado/);
});

test('with no accounts, a single message says so', () => {
  assert.deepEqual(performanceMessages({period: 'p', accounts: []}), ['📈 *Relatório de performance*\np\n\nNenhuma conta no período.']);
});
