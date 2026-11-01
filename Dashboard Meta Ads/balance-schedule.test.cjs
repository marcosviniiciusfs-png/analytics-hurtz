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

const labels = {yesterday: '31/10', before: '30/10'};

test('balance message shows balance, yesterday spend and change against the day before, one block per account', () => {
  const text = balanceTimeText({time: '09:00', labels, accounts: [
    {name: 'CA - Um', balance: 1234.5, spendYesterday: 150, spendBefore: 100, dailyLimit: 0, weeklyLimit: 0},
    {name: 'CA - Dois', balance: null, spendYesterday: 0, spendBefore: 0, dailyLimit: 0, weeklyLimit: 0},
  ]});
  assert.match(text, /\*Saldo das contas às 09:00\*/);
  assert.match(text, /\*CA - Um\*\n💰 Saldo agora: R\$\s?1\.234,50\n🧾 Gasto de 31\/10: R\$\s?150,00\n⚖️ 📈 50,0% acima de 30\/10/);
  assert.match(text, /\*CA - Dois\*\n💰 Saldo agora: saldo indisponível/);
  assert.match(text, /CA - Um[\s\S]*\n\n📣 \*CA - Dois\*/, 'accounts are separated by a blank line');
});

test('limit lines show how far yesterday spend is above or below the daily and weekly limits', () => {
  const text = balanceTimeText({time: '09:00', labels, accounts: [
    {name: 'CA - Um', balance: 500, spendYesterday: 120, spendBefore: 60, dailyLimit: 100, weeklyLimit: 0},
    {name: 'CA - Dois', balance: 500, spendYesterday: 70, spendBefore: 140, dailyLimit: 100, weeklyLimit: 700},
  ]});
  const [first, second] = text.split('\n\n').slice(1);
  assert.match(first, /🎯 Limite diário \(R\$\s?100,00\): 🔴 20,0% acima/);
  assert.doesNotMatch(first, /Média diária do semanal/, 'no weekly line without a weekly limit');
  assert.match(second, /🎯 Limite diário \(R\$\s?100,00\): 🟢 30,0% abaixo/);
  assert.match(second, /🗓️ Média diária do semanal \(R\$\s?100,00\): 🟢 30,0% abaixo/);
  assert.match(second, /📉 50,0% abaixo de 30\/10/);
});
