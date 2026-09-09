const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {Readable} = require('node:stream');
const {createPersonalMeta} = require('./personal-meta');

function fixture(t, runner, overrides = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-meta-'));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const tokens = {a: 'facebook-user-a-token-0000000000', b: 'facebook-user-b-token-0000000000'};
  const fetchImpl = async (url, options) => {
    const who = options.headers.Authorization.endsWith(tokens.a) ? 'a' : 'b';
    const endpoint = new URL(url).pathname;
    assert.ok(!endpoint.endsWith('/debug_token'), 'ordinary users must not require a developer credential');
    overrides.requests?.push(new URL(url).searchParams.get('fields'));
    const payload = overrides.pictureError && new URL(url).searchParams.get('fields')?.includes('profile_picture_uri') ? {error:{code:100,message:'Photo unavailable'}} : overrides.error ? {error: overrides.error}
      : endpoint.endsWith('/app') ? {id: overrides.app_id || '2093320124537661', name: 'Tryv CRM'}
      : endpoint.endsWith('/me/permissions') ? {data: (overrides.scopes || ['ads_read']).map(permission=>({permission,status:'granted'}))}
      : endpoint.endsWith('/me/adaccounts') ? overrides.catalog || {data: [{id: who === 'a' ? 'act_111' : 'act_222', name: who}]}
        : {id: who, name: `Facebook ${who}`};
    return {ok: !payload.error, status:payload.error?400:200, json: async () => payload};
  };
  const api = createPersonalMeta({directory, fetchImpl, runReport: runner || (async ({token}) => ({tokenUsed: token}))});
  const sessionA = api.issueSession({id: 'user-a', email: 'a@example.test'}), sessionB = api.issueSession({id: 'user-b', email: 'b@example.test'});
  async function request(token, route, method = 'GET', payload) {
    const req = Readable.from(payload === undefined ? [] : [JSON.stringify(payload)]);
    req.method = method; req.headers = {authorization: `Bearer ${token}`};
    const user = api.session(token);
    if (!user) return {status: 401};
    let result;
    try { await api.handle(req, {}, user, new URL(route, 'http://localhost'), (_, status, body) => {result = {status, body};}); }
    catch (e) { result = {status: e.status, body: {error: e.message}}; }
    return result;
  }
  async function connect(session, token) {
    const nonce = (await request(session, '/api/meta/challenge', 'POST')).body.nonce;
    return request(session, '/api/meta/connection', 'POST', {nonce, accessToken: token});
  }
  return {api, directory, tokens, sessionA, sessionB, request, connect};
}

test('sessions and encrypted connections remain isolated across users', async t => {
  const f = fixture(t);
  assert.notEqual(f.sessionA, f.sessionB);
  assert.equal((await f.connect(f.sessionA, f.tokens.a)).status, 200);
  assert.equal((await f.connect(f.sessionB, f.tokens.b)).status, 200);
  const [a, b] = await Promise.all([f.request(f.sessionA, '/api/meta-accounts'), f.request(f.sessionB, '/api/meta-accounts')]);
  assert.deepEqual(a.body.accounts.map(a => a.id), ['act_111']);
  assert.deepEqual(b.body.accounts.map(a => a.id), ['act_222']);
  for (const file of fs.readdirSync(f.directory).filter(n => n.endsWith('.json'))) {
    const text = fs.readFileSync(path.join(f.directory, file), 'utf8');
    assert.ok(!text.includes(f.tokens.a) && !text.includes(f.tokens.b) && !text.includes('example.test'));
  }
  const restored = createPersonalMeta({directory: f.directory});
  assert.equal(restored.session(f.sessionA).id, 'user-a');
  assert.equal(restored.connection(restored.session(f.sessionA)).token,f.tokens.a);
  assert.equal(restored.connection(restored.session(f.sessionB)).token,f.tokens.b);
  const freshSession=restored.issueSession({id:'user-a',email:'a@example.test'});assert.equal(restored.connection(restored.session(freshSession)).token,f.tokens.a);
});

test('challenge belongs to one session and cannot be replayed', async t => {
  const f = fixture(t);
  const nonce = (await f.request(f.sessionA, '/api/meta/challenge', 'POST')).body.nonce;
  assert.equal((await f.request(f.sessionB, '/api/meta/connection', 'POST', {nonce, accessToken: f.tokens.a})).status, 400);
  assert.equal((await f.request(f.sessionA, '/api/meta/connection', 'POST', {nonce, accessToken: f.tokens.a})).status, 400);
});

test('report account authorization precedes execution; caller identity cannot be overridden', async t => {
  let executions = 0;
  const f = fixture(t, async input => { executions++; return {used: input.token}; });
  await f.connect(f.sessionA, f.tokens.a);
  const url = '/api/meta-spend?from=2026-09-01&to=2026-09-02&accounts=';
  assert.equal((await f.request(f.sessionA, url + 'act_222&user_id=user-b')).status, 403);
  assert.equal(executions, 0);
  assert.equal((await f.request(f.sessionA, url + 'act_111')).body.used, f.tokens.a);
  assert.equal((await f.request(f.sessionB, url + 'act_111')).status, 409);
  assert.equal((await f.request(f.sessionA, '/api/tasks')).status, 403);
});

test('settings cannot target another account; disconnect and logout revoke access', async t => {
  const f = fixture(t);
  await f.connect(f.sessionA, f.tokens.a);
  assert.equal((await f.request(f.sessionA, '/api/alert-plans', 'PUT', {plans: {act_222: {deposit: 42}}})).status, 403);
  assert.equal((await f.request(f.sessionA, '/api/alert-plans', 'PUT', {plans: {act_111: {deposit: 42}}})).status, 200);
  assert.deepEqual((await f.request(f.sessionB, '/api/alert-plans')).body, {plans: {}});
  await f.request(f.sessionA, '/api/meta/connection', 'DELETE');
  assert.equal((await f.request(f.sessionA, '/api/meta-accounts')).status, 409);
  await f.request(f.sessionA, '/api/session', 'DELETE');
  assert.equal(f.api.session(f.sessionA), null);
});

test('disconnect during a running report prevents stale results from returning', async t => {
  let finish, started;
  const ready = new Promise(resolve => {started = resolve;});
  const f = fixture(t, () => {started(); return new Promise(resolve => {finish = resolve;});});
  await f.connect(f.sessionA, f.tokens.a);
  const result = f.request(f.sessionA, '/api/meta-analysis?from=2026-09-01&to=2026-09-02&accounts=act_111');
  await ready;
  await f.request(f.sessionA, '/api/meta/connection', 'DELETE');
  finish({accounts: {}});
  assert.equal((await result).status, 409);
});

test('tokens from other apps, missing permissions, and expired access are rejected', async t => {
  for (const [overrides, expected] of [[{app_id: 'other-app'}, 403], [{scopes: ['public_profile']}, 403], [{error:{code:190}}, 409], [{error:{code:200}}, 403]]) {
    const f = fixture(t, undefined, overrides);
    assert.equal((await f.connect(f.sessionA, f.tokens.a)).status, expected);
    assert.equal(f.api.read('connection', 'user-a'), null);
  }
});

test('empty account list is valid and can be refreshed when Meta access changes', async t => {
  const overrides={catalog:{data:[]}},f=fixture(t,undefined,overrides);
  assert.equal((await f.connect(f.sessionA,f.tokens.a)).status,200);
  assert.equal((await f.request(f.sessionA,'/api/meta-accounts')).body.account_count,0);
  overrides.catalog={data:[{id:'act_111',name:'Newly granted'}]};
  assert.equal((await f.request(f.sessionA,'/api/meta-accounts')).body.account_count,1);
  overrides.catalog={data:[]};
  assert.equal((await f.request(f.sessionA,'/api/meta-spend?from=2026-09-01&to=2026-09-02&accounts=act_111')).status,403);
});

test('expired stored connection cannot run reports and profiles are private', async t => {
  const f=fixture(t);await f.connect(f.sessionA,f.tokens.a);
  assert.equal((await f.request(f.sessionA,'/api/account-profiles','PUT',{items:[{id:'one',accountIds:['act_111']}],activeId:'one'})).status,200);
  assert.deepEqual((await f.request(f.sessionB,'/api/account-profiles')).body.items,[]);
  f.api.write('connection','user-a',{...f.api.read('connection','user-a'),expiresAt:1});
  assert.equal((await f.request(f.sessionA,'/api/meta/connection')).body.expired,true);
  assert.equal((await f.request(f.sessionA,'/api/meta-accounts')).status,409);
});

test('account catalog requests and returns the owning business photo', async t => {
  const requests=[], f=fixture(t,null,{requests,catalog:{data:[{id:'act_111',name:'Account',business:{id:'900',name:'BM',profile_picture_uri:'https://example.test/bm.png'}}]}});
  await f.connect(f.sessionA,f.tokens.a);
  const result=await f.request(f.sessionA,'/api/meta-accounts');
  assert.equal(result.body.accounts[0].business_profile_picture_uri,'https://example.test/bm.png');
  assert.ok(requests.some(fields=>fields?.includes('business{id,name,profile_picture_uri}')));
});
test('unavailable business photo does not prevent loading authorized accounts', async t => {
  const f=fixture(t,null,{pictureError:true});await f.connect(f.sessionA,f.tokens.a);
  const result=await f.request(f.sessionA,'/api/meta-accounts');
  assert.equal(result.status,200);assert.equal(result.body.accounts[0].id,'act_111');assert.equal(result.body.accounts[0].business_profile_picture_uri,'');
});
