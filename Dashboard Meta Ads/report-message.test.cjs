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
