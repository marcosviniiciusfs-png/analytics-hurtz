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
