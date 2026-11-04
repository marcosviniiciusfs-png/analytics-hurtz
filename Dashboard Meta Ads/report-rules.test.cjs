'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {evaluateReport} = require('./report-rules');

const find = (findings, metric) => findings.find(item => item.metric === metric);

test('CPM above R$ 25 is flagged and explains frequency and CTR causes', () => {
  const findings = evaluateReport({cpm: 31, ctr: 0.7, frequency: 4.2});
  const cpm = find(findings, 'CPM');
  assert.equal(cpm.status, 'alto');
  assert.match(cpm.suggestion, /frequência de 4,2/);
  assert.match(cpm.suggestion, /CTR baixo/);
});

test('CPM at or below R$ 25 is not flagged', () => {
  assert.equal(find(evaluateReport({cpm: 25, ctr: 1.8}), 'CPM'), undefined);
});

test('CTR below 1% is critical and points to the opening of the video when hook rate is low', () => {
  const ctr = find(evaluateReport({ctr: 0.6, hookRate: 18}), 'CTR');
  assert.equal(ctr.status, 'crítico');
  assert.match(ctr.suggestion, /3 primeiros segundos/);
  assert.match(ctr.suggestion, /hook rate de 18,00%/);
});

test('CTR above 1.5% is good, between 1% and 1.5% is medium', () => {
  assert.equal(find(evaluateReport({ctr: 1.8}), 'CTR').status, 'bom');
  assert.equal(find(evaluateReport({ctr: 1.2}), 'CTR').status, 'médio');
});

test('cost per lead above the account maximum is flagged with the likely causes', () => {
  const cpl = find(evaluateReport({costPerLead: 42, ctr: 0.9, frequency: 3.8}, {maxCostPerLead: 30}), 'Custo por lead');
  assert.equal(cpl.status, 'alto');
  assert.match(cpl.message, /R\$ 42,00.*R\$ 30,00/);
  assert.match(cpl.suggestion, /CTR abaixo do esperado/);
  assert.match(cpl.suggestion, /frequência alta/);
});

test('cost per lead is ignored when the account has no maximum set', () => {
  assert.equal(find(evaluateReport({costPerLead: 99}, {}), 'Custo por lead'), undefined);
});

test('high frequency is flagged on its own', () => {
  assert.equal(find(evaluateReport({frequency: 3.5}), 'Frequência').status, 'alto');
});

test('findings are ordered from the most critical to the least', () => {
  const statuses = evaluateReport({cpm: 40, ctr: 0.5, frequency: 4}).map(item => item.status);
  assert.equal(statuses[0], 'crítico');
});

test('high cost per click is flagged, with the CTR as the likely cause when it is low', () => {
  const cpc = find(evaluateReport({cpc: 3.4, ctr: 0.9}), 'CPC');
  assert.equal(cpc.status, 'médio');
  assert.match(cpc.suggestion, /gancho e a chamada/);
  assert.equal(find(evaluateReport({cpc: 1.8}), 'CPC'), undefined);
});

test('CTR on the link below 0.5% is critical; when the ad itself has good CTR, the offer is the suspect', () => {
  const link = find(evaluateReport({ctr: 1.9, linkCtr: 0.3}), 'CTR no link');
  assert.equal(link.status, 'crítico');
  assert.match(link.suggestion, /não leva ao clique/);
  assert.equal(find(evaluateReport({ctr: 1.9, linkCtr: 1.4}), 'CTR no link').status, 'bom');
});

test('spend above R$ 100 with no lead or conversation is critical', () => {
  const result = find(evaluateReport({spend: 180, results: 0}), 'Resultado');
  assert.equal(result.status, 'crítico');
  assert.match(result.message, /R\$ 180,00/);
  assert.equal(find(evaluateReport({spend: 180, results: 3}), 'Resultado'), undefined);
});

test('no result is not reported when Meta did not return the action list', () => {
  assert.equal(find(evaluateReport({spend: 180, results: null}), 'Resultado'), undefined);
});

test('low hook rate is a high-priority finding, a good one is only informative', () => {
  assert.equal(find(evaluateReport({hookRate: 12}), 'Hook rate (3s)').status, 'alto');
  assert.equal(find(evaluateReport({hookRate: 40}), 'Hook rate (3s)').status, 'info');
});
