'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {formatReportMessage} = require('./report-message');

test('message lists each finding with its icon and suggestion', () => {
  const text = formatReportMessage({name: 'CA - Teste', period: 'Hoje', findings: [
    {metric: 'CTR', status: 'crítico', value: '0,60%', message: 'O CTR está baixo.', suggestion: 'Revise o gancho.'},
  ]});
  assert.match(text, /Relatório de métricas — CA - Teste/);
  assert.match(text, /🔴 \*CTR\* \(0,60%\)/);
  assert.match(text, /👉 Revise o gancho\./);
});

test('message says so when nothing is out of the standard', () => {
  assert.match(formatReportMessage({name: 'CA', period: '', findings: []}), /Nenhuma métrica fora do padrão/);
});

test('frequency alert names the frequency, the limit and what it can influence', () => {
  const {frequencyAlertText} = require('./report-message');
  const text = frequencyAlertText({name: 'CA - Teste', metrics: {frequency: 4.2, cpm: 31, ctr: 0.7}, maxFrequency: 3});
  assert.match(text, /Frequência acima do máximo — CA - Teste/);
  assert.match(text, /frequência está em 4,2, acima do máximo de 3,0/);
  assert.match(text, /CPM atual: R\$ 31,00/);
  assert.match(text, /elevar o CPM e reduzir o CTR/);
});
