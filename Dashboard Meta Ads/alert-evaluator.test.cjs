'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {evaluateAccountAlerts} = require('./alert-evaluator');

const plan = {dailyLimit: 100, deposit: 1000};

test('daily limit alerts fire at each reached threshold and are critical from 100%', () => {
  const alerts = evaluateAccountAlerts({name: 'CA - Teste', dateKey: '2026-10-31', plan, spend: 91, balance: null});
  assert.deepEqual(alerts.map(a => a.key), ['2026-10-31:CA - Teste:limit:75', '2026-10-31:CA - Teste:limit:90']);
  assert.deepEqual(alerts.map(a => a.severity), ['warning', 'warning']);
  const critical = evaluateAccountAlerts({name: 'CA - Teste', dateKey: '2026-10-31', plan, spend: 100, balance: null});
  assert.equal(critical.find(a => a.key.endsWith(':limit:100')).severity, 'critical');
});

test('balance alerts use the real pre-paid balance against the deposit', () => {
  const alerts = evaluateAccountAlerts({name: 'CA - Teste', dateKey: '2026-10-31', plan, spend: null, balance: 480});
  assert.deepEqual(alerts.map(a => a.key), [
    '2026-10-31:CA - Teste:balance:50',
  ]);
  assert.match(alerts[0].text, /R\$ 480,00/);
  assert.match(alerts[0].text, /52% do depósito/);
});

test('zero balance triggers the critical balance threshold', () => {
  const alerts = evaluateAccountAlerts({name: 'CA', dateKey: '2026-10-31', plan, spend: null, balance: 0});
  assert.equal(alerts.at(-1).key, '2026-10-31:CA:balance:100');
  assert.equal(alerts.at(-1).severity, 'critical');
});

test('no alerts without a daily limit, a deposit, or the data needed for each rule', () => {
  assert.deepEqual(evaluateAccountAlerts({name: 'CA', dateKey: 'd', plan: {}, spend: 500, balance: 0}), []);
  assert.deepEqual(evaluateAccountAlerts({name: 'CA', dateKey: 'd', plan, spend: null, balance: null}), []);
});

test('keys differ by day so the same threshold can alert again the next day', () => {
  const day1 = evaluateAccountAlerts({name: 'CA', dateKey: '2026-10-31', plan, spend: 80, balance: null});
  const day2 = evaluateAccountAlerts({name: 'CA', dateKey: '2026-11-01', plan, spend: 80, balance: null});
  assert.notEqual(day1[0].key, day2[0].key);
});
