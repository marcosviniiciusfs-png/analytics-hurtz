'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {formatPerformanceMessage} = require('./report-message');
const {SEPARATOR} = require('./balance-schedule');

const metrics = {spend: 300, results: 6, costPerResult: 50, cpm: 12.5, cpc: 1.8, ctr: 1.2, linkCtr: 0.4, frequency: 2.1, hookRate: 18};

test('performance message shows the main and secondary metrics and the suggested actions, with emojis', () => {
  const text = formatPerformanceMessage({period: '30/10 a 01/11', accounts: [
    {name: 'CA - Um', metrics, findings: [
      {metric: 'CTR no link', status: 'crítico', value: '0,40%', message: 'Só 0,40% das impressões viraram clique no link.', suggestion: 'Revise a oferta.'},
      {metric: 'CPC', status: 'médio', value: 'R$ 3,00', message: 'O custo por clique está em R$ 3,00.', suggestion: 'Teste públicos mais frios.'},
      {metric: 'Hook rate (3s)', status: 'info', value: '18,00%', message: 'x', suggestion: 'y'},
    ]},
  ]});
  assert.match(text, /^📈 \*Relatório de performance\*\n30\/10 a 01\/11/);
  assert.match(text, /📣 \*CA - Um\*\n🏆 \*Principais\*\n💵 Valor usado: R\$\s?300,00\n🎯 Resultados: 6\n💲 Custo por resultado: R\$\s?50,00/);
  assert.match(text, /📊 \*Secundárias\*\n📢 CPM: R\$\s?12,50 · 🖱️ CPC: R\$\s?1,80\n👆 CTR: 1,20% · 🔗 CTR no link: 0,40%\n👥 Frequência: 2,1 · ⏱️ Gancho 3s: 18,00%/);
  assert.match(text, /🧭 \*Ações sugeridas\*\n\n🔴 \*CTR no link\* \(0,40%\)\nSó 0,40% das impressões viraram clique no link\.\n👉 Revise a oferta\./);
  assert.match(text, /🟠 \*CPC\* \(R\$ 3,00\)/);
  assert.doesNotMatch(text, /Hook rate \(3s\)\*/, 'informative findings are not listed as actions');
});

test('accounts are separated by the ===== line with blank lines around it', () => {
  const text = formatPerformanceMessage({period: 'p', accounts: [
    {name: 'CA - Um', metrics, findings: []},
    {name: 'CA - Dois', metrics: null, findings: []},
  ]});
  assert.match(text, new RegExp(`CA - Um[\\s\\S]*\\n\\n${SEPARATOR}\\n\\n📣 \\*CA - Dois\\*\\n⚪ Sem dados no período`));
  assert.match(text, /✅ Nenhum ponto de atenção no período\./);
});

test('missing values are shown as no data, and no result is shown as such', () => {
  const text = formatPerformanceMessage({period: 'p', accounts: [
    {name: 'CA - Um', metrics: {spend: 40, results: 0, costPerResult: null, cpm: null, cpc: null, ctr: null, linkCtr: null, frequency: null, hookRate: null}, findings: []},
  ]});
  assert.match(text, /🎯 Resultados: 0\n💲 Custo por resultado: sem resultado/);
  assert.match(text, /📢 CPM: sem dado · 🖱️ CPC: sem dado/);
});
