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

const labels = {yesterday: '31/10', before: '30/10', daysInMonth: 31};
// Cada conta vira um bloco; os blocos são separados por uma linha de =====.
const blocksOf = text => text.split('\n\n')[1].split('\n=====\n');

test('monthly limit is compared as a daily share of the month', () => {
  const text = balanceTimeText({time: '09:00', labels, accounts: [
    {name: 'CA - Um', balance: 500, spendYesterday: 90, spendBefore: 90, dailyLimit: 0, weeklyLimit: 0, monthlyLimit: 3100},
    {name: 'CA - Dois', balance: 500, spendYesterday: 90, spendBefore: 90, dailyLimit: 0, weeklyLimit: 0, monthlyLimit: 0},
  ]});
  const [first, second] = blocksOf(text);
  assert.match(first, /📅 Média diária do mensal \(R\$\s?100,00\): 🟢 10,0% abaixo/);
  assert.doesNotMatch(second, /Média diária do mensal/, 'no monthly line without a monthly limit');
});

test('balance message shows balance, yesterday spend and change against the day before, one block per account', () => {
  const text = balanceTimeText({time: '09:00', labels, accounts: [
    {name: 'CA - Um', balance: 1234.5, spendYesterday: 150, spendBefore: 100, dailyLimit: 0, weeklyLimit: 0},
    {name: 'CA - Dois', balance: null, spendYesterday: 0, spendBefore: 0, dailyLimit: 0, weeklyLimit: 0},
  ]});
  assert.match(text, /\*Saldo das contas às 09:00\*/);
  assert.match(text, /📣 \*CA - Um\*\n💰 Saldo agora: R\$\s?1\.234,50\n🧾 Gasto de 31\/10: R\$\s?150,00\n⚖️ 📈 50,0% acima de 30\/10/);
  assert.match(text, /📣 \*CA - Dois\* 🚨\n💰 Saldo agora: saldo indisponível/);
  assert.match(text, /CA - Dois[\s\S]*\n=====\n📣 \*CA - Um\*/, 'accounts are separated by a ===== line');
});

test('accounts without balance go first with a siren, then accounts with balance, then cards', () => {
  const text = balanceTimeText({time: '09:00', labels, accounts: [
    {name: 'CA - Cartão', balance: null, isCard: true, spendYesterday: 40, spendBefore: 40, dailyLimit: 0, weeklyLimit: 0},
    {name: 'CA - Com saldo', balance: 300, spendYesterday: 10, spendBefore: 10, dailyLimit: 0, weeklyLimit: 0},
    {name: 'CA - Sem saldo', balance: null, spendYesterday: 0, spendBefore: 0, dailyLimit: 0, weeklyLimit: 0},
  ]});
  const [first, second, third] = blocksOf(text);
  assert.match(first, /^📣 \*CA - Sem saldo\* 🚨/);
  assert.match(second, /^📣 \*CA - Com saldo\*(?! 🚨)/);
  assert.match(third, /^💳 \*CA - Cartão\*(?! 🚨)/);
  assert.match(third, /💰 Saldo agora: conta cartão/);
  assert.doesNotMatch(third, /saldo indisponível|🚨/);
});

test('limit lines show how far yesterday spend is above or below the daily and weekly limits', () => {
  const text = balanceTimeText({time: '09:00', labels, accounts: [
    {name: 'CA - Um', balance: 500, spendYesterday: 120, spendBefore: 60, dailyLimit: 100, weeklyLimit: 0},
    {name: 'CA - Dois', balance: 500, spendYesterday: 70, spendBefore: 140, dailyLimit: 100, weeklyLimit: 700},
  ]});
  const [first, second] = blocksOf(text);
  assert.match(first, /🎯 Limite diário \(R\$\s?100,00\): 🔴 20,0% acima/);
  assert.doesNotMatch(first, /Média diária do semanal/, 'no weekly line without a weekly limit');
  assert.match(second, /🎯 Limite diário \(R\$\s?100,00\): 🟢 30,0% abaixo/);
  assert.match(second, /🗓️ Média diária do semanal \(R\$\s?100,00\): 🟢 30,0% abaixo/);
  assert.match(second, /📉 50,0% abaixo de 30\/10/);
});
