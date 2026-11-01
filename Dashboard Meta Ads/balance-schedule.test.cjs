'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {normalizeTimes, dueSlots, balanceTimeText} = require('./balance-schedule');

test('normalizeTimes keeps unique valid HH:MM values, sorted, at most two', () => {
  assert.deepEqual(normalizeTimes(['18:00', '09:00', '09:00', '25:00', 'abc', '12:30']), ['09:00', '12:30']);
  assert.deepEqual(normalizeTimes(undefined), []);
});

test('a slot is due during the 30 minutes after its time in São Paulo', () => {
  // São Paulo é UTC-3: 09:00 local é 12:00 UTC.
  assert.deepEqual(dueSlots(['09:00', '18:00'], Date.UTC(2026, 10, 1, 12, 0)), ['09:00']);
  assert.deepEqual(dueSlots(['09:00', '18:00'], Date.UTC(2026, 10, 1, 12, 29)), ['09:00']);
  assert.deepEqual(dueSlots(['09:00', '18:00'], Date.UTC(2026, 10, 1, 12, 30)), []);
  assert.deepEqual(dueSlots(['09:00', '18:00'], Date.UTC(2026, 10, 1, 21, 5)), ['18:00']);
  assert.deepEqual(dueSlots([], Date.UTC(2026, 10, 1, 12, 0)), []);
});

test('balance message lists each account with its balance, or says it is unavailable', () => {
  const text = balanceTimeText({time: '09:00', accounts: [
    {name: 'CA - Um', balance: 1234.5},
    {name: 'CA - Dois', balance: null},
  ]});
  assert.match(text, /Saldo das contas às 09:00/);
  assert.match(text, /CA - Um: R\$\s?1\.234,50/);
  assert.match(text, /CA - Dois: saldo indisponível/);
});
