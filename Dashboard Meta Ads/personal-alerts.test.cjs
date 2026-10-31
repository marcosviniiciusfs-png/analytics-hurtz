'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {runPersonalAlerts} = require('./personal-alerts');

function deps(overrides = {}) {
  const sent = [], marked = [], seen = new Set();
  const base = {
    loadConfig: async () => ({enabled: true, dryRun: false, instance: 'inst', groupJid: 'grupo@g.us', thresholds: [75, 90, 100, 120], balanceThresholds: [50, 75, 90, 100]}),
    loadPlans: async () => ({'act_1': {name: 'CA - Um', dailyLimit: 100, deposit: 1000}, 'act_2': {name: 'CA - Cartão', paymentType: 'credit', dailyLimit: 50}}),
    fetchBalances: async () => ({'act_1': {audited: true, balance: 480}}),
    fetchSpend: async () => ({'act_1': 80}),
    alreadySent: async (userId, key) => seen.has(key),
    send: async (config, text) => sent.push({config, text}),
    markSent: async (userId, key, now, meta) => { seen.add(key); marked.push({userId, key, meta}); },
    ...overrides,
  };
  return {deps: base, sent, marked};
}

const users = [{id: 'user-a'}];
const dateKey = '2026-10-31';

test('sends only the alerts of the user own accounts, to the configured group', async () => {
  const {deps: d, sent} = deps();
  const results = await runPersonalAlerts({users, dateKey, now: new Date(), deps: d});
  assert.ok(sent.length > 0);
  assert.ok(sent.every(item => item.config.groupJid === 'grupo@g.us'));
  assert.ok(sent.every(item => !/Cartão/.test(item.text)), 'credit accounts are not evaluated');
  assert.ok(results.every(item => item.userId === 'user-a'));
});

test('an alert already sent on the same day is not sent again', async () => {
  const {deps: d, sent} = deps();
  await runPersonalAlerts({users, dateKey, now: new Date(), deps: d});
  const first = sent.length;
  await runPersonalAlerts({users, dateKey, now: new Date(), deps: d});
  assert.equal(sent.length, first);
});

test('a failed WhatsApp send is retried in the next cycle, not recorded as sent', async () => {
  const {deps: d, marked} = deps({send: async () => { throw new Error('offline'); }});
  const results = await runPersonalAlerts({users, dateKey, now: new Date(), deps: d});
  assert.ok(results.some(item => item.error === 'envio falhou'));
  assert.equal(marked.filter(item => item.meta.delivered === true).length, 0);
});

test('dry run records alerts as not delivered and never calls WhatsApp', async () => {
  const {deps: d, sent, marked} = deps({loadConfig: async () => ({enabled: true, dryRun: true, instance: 'i', groupJid: 'g@g.us'})});
  await runPersonalAlerts({users, dateKey, now: new Date(), deps: d});
  assert.equal(sent.length, 0);
  assert.ok(marked.length > 0);
  assert.ok(marked.every(item => item.meta.delivered === false));
});

test('disabled or incomplete configuration sends nothing', async () => {
  const {deps: d, sent} = deps({loadConfig: async () => ({enabled: false, instance: 'i', groupJid: 'g@g.us'})});
  const results = await runPersonalAlerts({users, dateKey, now: new Date(), deps: d});
  assert.equal(sent.length, 0);
  assert.equal(results[0].skipped, 'desativado');
});

test('a balance failure does not stop the spend alerts', async () => {
  const {deps: d, sent} = deps({fetchBalances: async () => { throw new Error('Meta indisponível'); }});
  const results = await runPersonalAlerts({users, dateKey, now: new Date(), deps: d});
  assert.ok(results.some(item => item.error === 'saldo pré-pago indisponível'));
  assert.ok(sent.some(item => /limite diário/.test(item.text)));
});

test('card accounts get daily limit alerts too, without a balance alert', async () => {
  const {deps: d, sent} = deps({fetchSpend: async () => ({'act_1': 80, 'act_2': 60})});
  await runPersonalAlerts({users, dateKey, now: new Date(), deps: d});
  assert.ok(sent.some(item => /CA - Cartão/.test(item.text) && /limite diário/.test(item.text)), 'card account gets a limit alert');
  assert.ok(!sent.some(item => /CA - Cartão/.test(item.text) && /Saldo/.test(item.text)), 'card account gets no balance alert');
});
