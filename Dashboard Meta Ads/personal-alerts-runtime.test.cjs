'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {Readable} = require('node:stream');
const {createPersonalMeta} = require('./personal-meta');

const facebookToken = 'facebook-user-a-token-0000000000';

function setup(t) {
  process.env.PERSONAL_ALERTS_DISABLED = '1';
  process.env.EVOLUTION_API_URL = 'http://evolution.test';
  process.env.EVOLUTION_API_KEY = 'test-key';
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-alerts-'));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const sent = [];
  const fetchImpl = async (url, options = {}) => {
    const endpoint = new URL(url).pathname;
    if (endpoint.endsWith('/message/sendText/inst')) {
      sent.push(JSON.parse(options.body));
      return {ok: true, status: 200, json: async () => ({})};
    }
    let payload = {id: 'me', name: 'Usuária A'};
    if (endpoint.endsWith('/oauth/access_token')) payload = {access_token: facebookToken, expires_in: 5184000};
    else if (endpoint.endsWith('/debug_token')) payload = {data: {is_valid: true, type: 'USER', app_id: '2093320124537661', scopes: ['ads_read'], expires_at: 0, data_access_expires_at: 0}};
    else if (endpoint.endsWith('/app')) payload = {id: '2093320124537661', name: 'Tryv CRM'};
    else if (endpoint.endsWith('/me/permissions')) payload = {data: [{permission: 'ads_read', status: 'granted'}]};
    else if (endpoint.endsWith('/me/adaccounts')) payload = {data: [{id: 'act_111', name: 'CA - Um', is_prepay_account: true}]};
    else if (/\/act_111$/.test(endpoint)) payload = {id: 'act_111', currency: 'BRL', is_prepay_account: true, funding_source_details: {display_string: 'Saldo disponível (R$480,00 BRL)'}};
    else if (/\/act_111\/insights$/.test(endpoint)) payload = {data: [{spend: '80.00'}]};
    return {ok: !payload.error, status: payload.error ? 400 : 200, json: async () => payload};
  };
  const api = createPersonalMeta({directory, fetchImpl, oauthConfig: {appId: '2093320124537661', secret: 'fixture-secret'}});
  const token = api.issueSession({id: 'user-a', email: 'a@example.test'});
  return {api, token, sent};
}

async function request(api, token, route, method = 'GET', payload) {
  const req = Readable.from(payload === undefined ? [] : [JSON.stringify(payload)]);
  req.method = method; req.headers = {authorization: `Bearer ${token}`};
  const user = api.session(token);
  if (!user) return {status: 401};
  let result;
  try { await api.handle(req, {}, user, new URL(route, 'http://localhost'), (_, status, body) => { result = {status, body}; }); }
  catch (e) { result = {status: e.status, body: {error: e.message}}; }
  return result;
}

test('alert config is disabled by default and cannot be enabled without WhatsApp and group', async t => {
  const {api, token} = setup(t);
  assert.equal((await request(api, token, '/api/alert-config')).body.config.enabled, false);
  assert.equal((await request(api, token, '/api/alert-config', 'PUT', {enabled: true, instance: '', groupJid: ''})).status, 400);
});

test('a full cycle sends balance and spend alerts for the connected account and does not repeat them the same day', async t => {
  const {api, token, sent} = setup(t);
  const connected = await request(api, token, '/api/meta/challenge', 'POST');
  assert.equal((await request(api, token, '/api/meta/connection', 'POST', {nonce: connected.body.nonce, accessToken: facebookToken})).status, 200);
  api.write('settings', 'user-a', {flow_whatsapp_instance: 'inst', plans: {act_111: {name: 'CA - Um', dailyLimit: 100, deposit: 1000}}});
  api.write('alert-config', 'user-a', {enabled: true, dryRun: false, instance: 'inst', groupJid: 'grupo@g.us', thresholds: [75, 90, 100, 120], balanceThresholds: [50, 75, 90, 100]});
  api.write('alert-index', 'global', {userIds: ['user-a']});

  const results = await api.runAlertCycle(Date.UTC(2026, 9, 31, 15));
  assert.ok(results.some(item => item.delivered === true), 'at least one alert is delivered');
  assert.ok(sent.length > 0);
  assert.ok(sent.every(item => item.number === 'grupo@g.us'));
  assert.ok(sent.some(item => /R\$ 480,00/.test(item.text)), 'the real pre-paid balance is in the message');

  const before = sent.length;
  await api.runAlertCycle(Date.UTC(2026, 9, 31, 15, 30));
  assert.equal(sent.length, before, 'same-day alerts are not sent again');
});

test('preview shows the messages the alerts would send, without sending or recording anything', async t => {
  const {api, token, sent} = setup(t);
  const connected = await request(api, token, '/api/meta/challenge', 'POST');
  assert.equal((await request(api, token, '/api/meta/connection', 'POST', {nonce: connected.body.nonce, accessToken: facebookToken})).status, 200);
  api.write('settings', 'user-a', {flow_whatsapp_instance: 'inst', plans: {act_111: {name: 'CA - Um', dailyLimit: 100, deposit: 1000}}});
  api.write('alert-config', 'user-a', {enabled: true, dryRun: true, instance: 'inst', groupJid: 'grupo@g.us', thresholds: [75, 90, 100, 120], balanceThresholds: [50, 75, 90, 100]});
  const preview = await request(api, token, '/api/alert-preview');
  assert.equal(preview.status, 200);
  assert.equal(preview.body.dryRun, true);
  assert.ok(preview.body.messages.some(item => /R\$ 480,00/.test(item.text)), 'the real balance appears in the preview');
  assert.equal(sent.length, 0, 'nothing is sent');
  assert.equal(api.read('alert-sent', 'user-a'), null, 'nothing is recorded');
});

test('account report route returns the parsed metrics and findings of the connected account only', async t => {
  const {api, token} = setup(t);
  const connected = await request(api, token, '/api/meta/challenge', 'POST');
  assert.equal((await request(api, token, '/api/meta/connection', 'POST', {nonce: connected.body.nonce, accessToken: facebookToken})).status, 200);
  const report = await request(api, token, '/api/account-report?account=act_111');
  assert.equal(report.status, 200);
  assert.equal(report.body.metrics.spend, 80);
  assert.ok(Array.isArray(report.body.findings));
  assert.equal((await request(api, token, '/api/account-report?account=act_999')).status, 403);
  assert.equal((await request(api, token, '/api/account-report?account=abc')).status, 400);
});

test('send-now posts every account balance to the group, and only in live mode', async t => {
  const {api, token, sent} = setup(t);
  const connected = await request(api, token, '/api/meta/challenge', 'POST');
  assert.equal((await request(api, token, '/api/meta/connection', 'POST', {nonce: connected.body.nonce, accessToken: facebookToken})).status, 200);
  api.write('settings', 'user-a', {flow_whatsapp_instance: 'inst', plans: {}});
  assert.equal((await request(api, token, '/api/alert-balance-now', 'POST')).status, 400, 'needs WhatsApp and group first');

  api.write('alert-config', 'user-a', {enabled: false, dryRun: true, instance: 'inst', groupJid: 'grupo@g.us', thresholds: [75], balanceThresholds: [50]});
  const validation = await request(api, token, '/api/alert-balance-now', 'POST');
  assert.equal(validation.status, 200);
  assert.equal(validation.body.sent, false);
  assert.equal(sent.length, 0, 'validation mode sends nothing');

  api.write('alert-config', 'user-a', {enabled: false, dryRun: false, instance: 'inst', groupJid: 'grupo@g.us', thresholds: [75], balanceThresholds: [50]});
  const live = await request(api, token, '/api/alert-balance-now', 'POST');
  assert.equal(live.status, 200);
  assert.equal(live.body.sent, true);
  assert.equal(live.body.accounts, 1);
  assert.equal(sent.length, 1);
  assert.match(sent[0].text, /📣 \*CA - Um\*\n💰 Saldo agora: R\$\s?480,00/);
  assert.match(sent[0].text, /🧾 Gasto de \d{2}\/\d{2}: R\$\s?80,00/, 'yesterday spend is included');
});

test('balance times are saved with at most two valid HH:MM values', async t => {
  const {api, token} = setup(t);
  api.write('settings', 'user-a', {flow_whatsapp_instance: 'inst', plans: {}});
  const saved = await request(api, token, '/api/alert-config', 'PUT', {enabled: false, balanceTimes: ['18:00', '09:00', '09:00', '25:00', '12:30']});
  assert.equal(saved.status, 200);
  assert.deepEqual(saved.body.config.balanceTimes, ['09:00', '12:30']);
});

test('balance alerts go out at the chosen time, regardless of limit or deposit, and only once per day', async t => {
  const {api, token, sent} = setup(t);
  const connected = await request(api, token, '/api/meta/challenge', 'POST');
  assert.equal((await request(api, token, '/api/meta/connection', 'POST', {nonce: connected.body.nonce, accessToken: facebookToken})).status, 200);
  api.write('settings', 'user-a', {flow_whatsapp_instance: 'inst', plans: {}});
  api.write('alert-config', 'user-a', {enabled: true, dryRun: false, instance: 'inst', groupJid: 'grupo@g.us', balanceTimes: ['09:00'], thresholds: [75, 90, 100, 120], balanceThresholds: [50, 75, 90, 100]});
  api.write('alert-index', 'global', {userIds: ['user-a']});

  // 12:10 UTC é 09:10 em São Paulo, dentro da janela do horário 09:00.
  await api.runAlertCycle(Date.UTC(2026, 9, 31, 12, 10));
  const balanceMessages = sent.filter(item => /Saldo das contas às 09:00/.test(item.text));
  assert.equal(balanceMessages.length, 1);
  assert.match(balanceMessages[0].text, /📣 \*CA - Um\*\n💰 Saldo agora: R\$\s?480,00/);

  await api.runAlertCycle(Date.UTC(2026, 9, 31, 12, 25));
  assert.equal(sent.filter(item => /Saldo das contas às 09:00/.test(item.text)).length, 1, 'the same slot is not repeated the same day');
});

test('alerts cover only the accounts of the active profile in Contas', async t => {
  const {api, token, sent} = setup(t);
  const connected = await request(api, token, '/api/meta/challenge', 'POST');
  assert.equal((await request(api, token, '/api/meta/connection', 'POST', {nonce: connected.body.nonce, accessToken: facebookToken})).status, 200);
  api.write('alert-config', 'user-a', {enabled: true, dryRun: false, instance: 'inst', groupJid: 'grupo@g.us', balanceTimes: ['09:00'], thresholds: [75, 90, 100, 120], balanceThresholds: [50, 75, 90, 100]});
  api.write('alert-index', 'global', {userIds: ['user-a']});
  const outside = {id: 'p1', name: 'Outro', accountIds: ['act_999']};
  const inside = {id: 'p2', name: 'Principal', accountIds: ['act_111']};
  const balanceMessages = () => sent.filter(item => /Saldo das contas às 09:00/.test(item.text));

  api.write('settings', 'user-a', {flow_whatsapp_instance: 'inst', plans: {}, profiles: {items: [outside, inside], activeId: 'p1'}});
  await api.runAlertCycle(Date.UTC(2026, 9, 31, 12, 10));
  assert.equal(balanceMessages().length, 0, 'an account outside the active profile is not sent');

  api.write('settings', 'user-a', {flow_whatsapp_instance: 'inst', plans: {}, profiles: {items: [outside, inside], activeId: 'p2'}});
  await api.runAlertCycle(Date.UTC(2026, 9, 31, 12, 10));
  assert.equal(balanceMessages().length, 1, 'the account of the active profile is sent');
  assert.match(balanceMessages()[0].text, /CA - Um/);
});

test('a trigger word sent in the target group sends its alert now, once per message, and only with the right token', async t => {
  const {api, token, sent} = setup(t);
  const connected = await request(api, token, '/api/meta/challenge', 'POST');
  assert.equal((await request(api, token, '/api/meta/connection', 'POST', {nonce: connected.body.nonce, accessToken: facebookToken})).status, 200);
  api.write('settings', 'user-a', {flow_whatsapp_instance: 'inst', plans: {}});
  api.write('alert-config', 'user-a', {enabled: true, dryRun: false, instance: 'inst', groupJid: 'grupo@g.us', balanceTimes: [], thresholds: [75, 90, 100, 120], balanceThresholds: [50, 75, 90, 100], triggerWords: {saldo: 'saldo'}, webhookToken: 'tokentokentokentoken123'});
  api.write('alert-index', 'global', {userIds: ['user-a']});
  const message = (id, fromMe = false, text = 'saldo por favor') => ({event: 'messages.upsert', data: {key: {remoteJid: 'grupo@g.us', fromMe, id}, message: {conversation: text}}});

  await api.handleAlertWebhook('tokentokentokentoken123', message('MSG-OWN', true), Date.UTC(2026, 9, 31, 12, 10));
  assert.equal(sent.length, 0, 'the account\'s own messages do not trigger');

  await api.handleAlertWebhook('tokentokentokentoken123', message('MSG-1'), Date.UTC(2026, 9, 31, 12, 10));
  assert.equal(sent.length, 1);
  assert.match(sent[0].text, /Saldo das contas às/);

  await api.handleAlertWebhook('tokentokentokentoken123', message('MSG-1'), Date.UTC(2026, 9, 31, 12, 10));
  assert.equal(sent.length, 1, 'the same message is not handled twice');

  await api.handleAlertWebhook('wrong-token-wrong-token-1', message('MSG-2'), Date.UTC(2026, 9, 31, 12, 10));
  assert.equal(sent.length, 1, 'a wrong token does nothing');
});

test('the report word sends the performance analysis of each account to the group, without an image', async t => {
  const {api, token, sent} = setup(t);
  const connected = await request(api, token, '/api/meta/challenge', 'POST');
  assert.equal((await request(api, token, '/api/meta/connection', 'POST', {nonce: connected.body.nonce, accessToken: facebookToken})).status, 200);
  api.write('settings', 'user-a', {flow_whatsapp_instance: 'inst', plans: {'act_111': {name: 'CA - Um', maxCostPerLead: 30}}});
  api.write('alert-config', 'user-a', {enabled: true, dryRun: false, instance: 'inst', groupJid: 'grupo@g.us', balanceTimes: [], thresholds: [75, 90, 100, 120], balanceThresholds: [50, 75, 90, 100], triggerWords: {relatorio: 'relatorio'}, webhookToken: 'tokentokentokentoken123'});
  api.write('alert-index', 'global', {userIds: ['user-a']});

  await api.handleAlertWebhook('tokentokentokentoken123', {event: 'messages.upsert', data: {key: {remoteJid: 'grupo@g.us', fromMe: false, id: 'MSG-REL'}, message: {conversation: 'Relatório'}}}, Date.UTC(2026, 9, 31, 12, 10));
  assert.equal(sent.length, 1);
  assert.match(sent[0].text, /^📈 \*Relatório de performance\*/);
  assert.match(sent[0].text, /📣 \*CA - Um\*\n🏆 \*Principais\*/);
  assert.match(sent[0].text, /📊 \*Secundárias\*/);
});
