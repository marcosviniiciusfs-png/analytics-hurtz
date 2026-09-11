'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFile} = require('node:child_process');

const fail = (status, message) => Object.assign(new Error(message), {status});
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const VERSION = 'v25.0';
const APP_ID = '2093320124537661';

function createPersonalMeta({directory = process.env.META_PERSONAL_DATA_DIR || '/opt/meta-ads-cli/secrets/personal', fetchImpl = fetch, runReport, oauthConfig} = {}) {
  fs.mkdirSync(directory, {recursive: true, mode: 0o700});
  const keyPath = path.join(directory, 'encryption.key');
  try { fs.writeFileSync(keyPath, crypto.randomBytes(32), {flag: 'wx', mode: 0o600}); } catch (e) { if (e.code !== 'EEXIST') throw e; }
  const key = fs.readFileSync(keyPath);
  if (key.length !== 32) throw new Error('Chave de conexões inválida.');
  const location = (kind, id) => path.join(directory, `${kind}-${hash(id)}.json`);
  function read(kind, id) {
    try {
      const payload = JSON.parse(fs.readFileSync(location(kind, id), 'utf8'));
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(payload.iv, 'base64'));
      decipher.setAAD(Buffer.from(`${kind}:${id}`));
      decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
      return JSON.parse(Buffer.concat([decipher.update(Buffer.from(payload.data, 'base64')), decipher.final()]).toString());
    } catch (e) { if (e.code === 'ENOENT') return null; throw fail(500, 'Não foi possível ler a conexão.'); }
  }
  function write(kind, id, value) {
    const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(Buffer.from(`${kind}:${id}`));
    const data = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
    const target = location(kind, id), temp = `${target}.${crypto.randomBytes(8).toString('hex')}.tmp`;
    fs.writeFileSync(temp, JSON.stringify({iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64')}), {mode: 0o600});
    fs.renameSync(temp, target);
  }
  function remove(kind, id) { try { fs.unlinkSync(location(kind, id)); } catch (e) { if (e.code !== 'ENOENT') throw e; } }
  function issueSession(user) {
    if (!user?.id) throw fail(401, 'Usuário não identificado.');
    const token = `pa_${crypto.randomBytes(32).toString('base64url')}`;
    write('session', token, {id: user.id, email: user.email || '', expires: Date.now() + 7 * 86400000});
    return token;
  }
  function session(token) {
    if (!/^pa_[A-Za-z0-9_-]{43}$/.test(token || '')) return null;
    const value = read('session', token);
    if (!value || value.expires <= Date.now()) { remove('session', token); return null; }
    return {...value, sessionHash: hash(token)};
  }
  const challenges = new Map();
  const exchanges=new Map();
  const tokenService=require('./facebook-token');
  const exchangeToken=token=>tokenService.exchange(token,{fetchImpl,...(oauthConfig!==undefined?{config:oauthConfig}:{})});
  async function upgradeConnection(user){const conn=read('connection',user.id),renewBefore=14*86400000;if(!conn||(conn.dataExpiresAt&&conn.dataExpiresAt<=Date.now())||(conn.expiresAt&&conn.expiresAt>Date.now()+renewBefore))return conn;
    if(exchanges.has(user.id))return exchanges.get(user.id);
    if(conn.exchangeAttemptAt&&Date.now()-conn.exchangeAttemptAt<3600000)return conn;
    if(!(oauthConfig===undefined?tokenService.configuration():oauthConfig))return conn;
    const promise=(async()=>{const upgraded=await exchangeToken(conn.token);const latest=read('connection',user.id);if(!latest||latest.revision!==conn.revision)return latest;const result={...latest,...(upgraded||{}),exchangeAttemptAt:Date.now()};write('connection',user.id,result);return result})().finally(()=>exchanges.delete(user.id));exchanges.set(user.id,promise);return promise;
  }
  async function graph(token, endpoint, params = {}) {
    const url = new URL(`https://graph.facebook.com/${VERSION}/${endpoint}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    let response, payload;
    try {
      response = await fetchImpl(url, {headers: {Authorization: `Bearer ${token}`}, signal: AbortSignal.timeout(45000)});
      payload = await response.json();
    } catch { throw fail(502, 'A Meta não respondeu. Tente novamente.'); }
    if (!response.ok || payload.error) {
      console.warn(JSON.stringify({event:'meta_graph_error',endpoint,status:response.status,code:payload.error?.code,subcode:payload.error?.error_subcode,trace:payload.error?.fbtrace_id}));
      if (payload.error?.code === 190) throw fail(409, 'Sua conexão com o Facebook expirou. Conecte novamente.');
      if ([10,200,294].includes(payload.error?.code)) throw fail(403, 'O Facebook não liberou a leitura dos anúncios. Reconecte e autorize as contas nas configurações do Tryv CRM.');
      throw fail(502, 'A Meta não autorizou esta consulta. Verifique as permissões da conexão.');
    }
    return payload;
  }
  async function rows(token, endpoint, params = {}) {
    const result = []; let after;
    for (let page = 0; page < 100; page++) {
      const payload = await graph(token, endpoint, {...params, limit: 100, ...(after ? {after} : {})});
      result.push(...(payload.data || []));
      if (!payload.paging?.next) return result;
      after = payload.paging?.cursors?.after;
      if (!after) throw fail(502, 'A Meta não retornou a lista completa. Tente novamente.');
    }
    throw fail(502, 'A lista de contas excedeu o limite desta consulta.');
  }
  function connection(user) {
    const value = read('connection', user.id);
    if (!value) throw fail(409, 'Conecte sua conta do Facebook para consultar os anúncios.');
    if ((value.expiresAt && value.expiresAt <= Date.now()) || (value.dataExpiresAt && value.dataExpiresAt <= Date.now())) throw fail(409, 'Sua conexão com o Facebook expirou. Conecte novamente.');
    return value;
  }
  async function catalog(user, pictures = false) {
    const conn = connection(user);
    let accounts;
    if (pictures) {try {accounts = await rows(conn.token, 'me/adaccounts', {fields: 'id,name,account_status,currency,business{id,name,profile_picture_uri},is_prepay_account'});} catch { /* Optional business photo must not block the account catalog. */ }}
    if (!accounts) accounts = await rows(conn.token, 'me/adaccounts', {fields: 'id,name,account_status,currency,business,is_prepay_account'});
    if (read('connection', user.id)?.revision !== conn.revision) throw fail(409, 'A conexão mudou. Atualize a consulta.');
    return {conn, accounts};
  }
  async function authorizeAccounts(user, ids) {
    if (!ids.length || ids.length > 100 || ids.some(id => !/^act_\d+$/.test(id))) throw fail(400, 'Selecione contas válidas.');
    const result = await catalog(user), allowed = new Set(result.accounts.map(a => a.id));
    if (ids.some(id => !allowed.has(id))) throw fail(403, 'Uma das contas não está autorizada para seu Facebook.');
    return result;
  }
  async function report(user, kind, url) {
    const from = url.searchParams.get('from'), to = url.searchParams.get('to');
    const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
    if (!validDate(from) || !validDate(to) || from > to || Date.parse(to) - Date.parse(from) > 366 * 86400000) throw fail(400, 'Informe um período válido de até um ano.');
    const ids = [...new Set((url.searchParams.get('accounts') || '').split(',').filter(Boolean))];
    const {conn} = await authorizeAccounts(user, ids);
    const runner = runReport || ((input) => new Promise((resolve, reject) => {
      const child = execFile(process.env.META_PYTHON || 'python3', [process.env.META_PERSONAL_RUNNER || '/opt/meta-ads-cli/monitor/personal_report.py'], {timeout: 180000, maxBuffer: 16 * 1024 * 1024}, (error, stdout) => {
        if (error) return reject(fail(502, 'Não foi possível concluir o relatório da Meta.'));
        try { const payload = JSON.parse(stdout); if (payload.error) throw new Error(); resolve(payload); } catch { reject(fail(502, 'Não foi possível concluir o relatório da Meta.')); }
      });
      child.stdin.on('error', () => {});
      child.stdin.end(JSON.stringify(input));
    }));
    const result = await runner({token: conn.token, kind, from, to, ids, reportOnly: url.searchParams.get('report') === '1'});
    // A disconnect/reconnect while a report is running must not release stale data.
    if (read('connection', user.id)?.revision !== conn.revision) throw fail(409, 'A conexão mudou. Atualize a consulta.');
    return result;
  }
  function body(req) {
    return new Promise((resolve, reject) => {
      let text = '';
      req.on('data', data => { text += data; if (text.length > 512 * 1024) { reject(fail(413, 'Requisição muito grande.')); req.destroy(); } });
      req.on('end', () => { try { resolve(JSON.parse(text || '{}')); } catch { reject(fail(400, 'Dados inválidos.')); } });
      req.on('error', () => reject(fail(400, 'Requisição interrompida.')));
    });
  }
  const campaignManager=require('./campaign-manager').createCampaignManager({graph,rows,authorizeAccounts,connection,read,write,fetchImpl});
  async function handle(req, res, user, url, send) {
    if(url.pathname.startsWith('/api/ads-manager/'))return send(res,200,await campaignManager.handle(req,user,url));
    const route = url.pathname;
    if (route === '/api/session') {
      if (req.method === 'DELETE') { remove('session', String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')); return send(res, 200, {ok: true}); }
      return send(res, 200, {ok: true, user: {id: user.id, email: user.email}, personal: true});
    }
    if (route === '/api/meta/connection' && req.method === 'GET') {
      const conn = await upgradeConnection(user);
      const expired = Boolean(conn && ((conn.expiresAt && conn.expiresAt <= Date.now()) || (conn.dataExpiresAt && conn.dataExpiresAt <= Date.now())));
      return send(res, 200, {appId: APP_ID, version: VERSION, connected: Boolean(conn) && !expired, expired, name: conn?.name || '', expiresAt: conn?.expiresAt || null});
    }
    if (route === '/api/meta/challenge' && req.method === 'POST') {
      for (const [id, item] of challenges) if (item.expires <= Date.now()) challenges.delete(id);
      if (challenges.size > 5000) throw fail(429, 'Tente conectar novamente em alguns minutos.');
      const nonce = crypto.randomBytes(32).toString('base64url');
      challenges.set(nonce, {user: user.id, session: user.sessionHash, expires: Date.now() + 10 * 60000});
      return send(res, 200, {nonce});
    }
    if (route === '/api/meta/connection' && req.method === 'POST') {
      const payload = await body(req), challenge = challenges.get(payload.nonce);
      challenges.delete(payload.nonce);
      if (!challenge || challenge.user !== user.id || challenge.session !== user.sessionHash || challenge.expires <= Date.now()) throw fail(400, 'A tentativa de conexão expirou. Tente novamente.');
      if (typeof payload.accessToken !== 'string' || payload.accessToken.length < 20 || payload.accessToken.length > 4096) throw fail(400, 'Autorização do Facebook inválida.');
      let token = payload.accessToken;
      // /debug_token requires an app/developer credential. Normal users authenticate
      // their token via /app, /me and /me/permissions instead; all are answered by Meta.
      const [application, me, permissionRows] = await Promise.all([
        graph(token, 'app', {fields: 'id,name'}),
        graph(token, 'me', {fields: 'id,name'}),
        rows(token, 'me/permissions'),
      ]);
      const scopes=permissionRows.filter(item=>item.status==='granted').map(item=>item.permission);
      if(application.id!==APP_ID)throw fail(403,'Conecte o Facebook pelo aplicativo Tryv CRM.');
      if(!me.id||!scopes.some(scope=>['ads_read','ads_management'].includes(scope)))throw fail(403,'Autorize a leitura de anúncios pelo Tryv CRM em Editar configurações no Facebook.');
      const accounts = await rows(token, 'me/adaccounts', {fields: 'id,name'});
      // SDK expiry is only a conservative UI hint, never an authorization decision:
      // every catalog/report is checked live against Meta with this user's token.
      const seconds=Number(payload.expiresIn),shortExpiry=Number.isFinite(seconds)&&seconds>0?Date.now()+Math.min(seconds,60*86400)*1000:0;
      const upgraded=await exchangeToken(token);if(upgraded)token=upgraded.token;
      write('connection', user.id, {token, facebookId: me.id, name: me.name, scopes, revision: crypto.randomUUID(), expiresAt:upgraded?.expiresAt||shortExpiry, longLived:Boolean(upgraded), dataExpiresAt: 0});
      return send(res, 200, {connected: true, name: me.name, accountCount: accounts.length});
    }
    if (route === '/api/meta/connection' && req.method === 'DELETE') {
      remove('connection', user.id);
      remove('settings', user.id);
      return send(res, 200, {ok: true});
    }
    if (route === '/api/meta-accounts' && req.method === 'GET') {
      const {accounts} = await catalog(user, true);
      return send(res, 200, {account_count: accounts.length, business_count: new Set(accounts.map(a => a.business?.id).filter(Boolean)).size, accounts: accounts.map(a => ({...a, business_name: a.business?.name || '', business_id: a.business?.id || '', business_profile_picture_uri: a.business?.profile_picture_uri || ''}))});
    }
    if (route === '/api/meta-monitor-config' && req.method === 'GET') {
      const {accounts} = await catalog(user);
      return send(res, 200, {accounts: accounts.map(({id, name}) => ({id, name}))});
    }
    if (route === '/api/meta-monitor-config/sync' && req.method === 'POST') {
      const payload = await body(req), ids = Array.isArray(payload.accounts) ? payload.accounts.map(a => a?.id) : [];
      const {accounts} = await authorizeAccounts(user, ids);
      return send(res, 200, {accounts: accounts.filter(a => ids.includes(a.id)).map(({id, name}) => ({id, name}))});
    }
    if (['/api/meta-spend', '/api/meta-analysis'].includes(route) && req.method === 'GET') return send(res, 200, await report(user, route.endsWith('spend') ? 'spend' : 'analysis', url));
    if (['/api/alert-plans', '/api/account-profiles'].includes(route)) {
      const key = route === '/api/alert-plans' ? 'plans' : 'profiles', settings = read('settings', user.id) || {};
      if (req.method === 'GET') return send(res, 200, settings[key] || (key === 'plans' ? {plans: {}} : {items: [], activeId: null}));
      if (req.method !== 'PUT') throw fail(405, 'Método não permitido.');
      const payload = await body(req);
      let ids;
      if (key === 'plans') {
        if (!payload.plans || typeof payload.plans !== 'object' || Array.isArray(payload.plans)) throw fail(400, 'Planejamentos inválidos.');
        ids = Object.keys(payload.plans);
      } else {
        if (!Array.isArray(payload.items) || payload.items.some(p => !Array.isArray(p.accountIds))) throw fail(400, 'Perfis inválidos.');
        ids = [...new Set(payload.items.flatMap(p => p.accountIds))];
      }
      if (ids.length) await authorizeAccounts(user, ids);
      // Read again after awaiting the Meta API so parallel writes don't lose another setting.
      write('settings', user.id, {...(read('settings', user.id) || {}), [key]: payload});
      return send(res, 200, {ok: true});
    }
    // Existing administrative routes use shared resources and are never delegated to personal sessions.
    throw fail(403, 'Esta função está disponível apenas no acesso administrativo.');
  }
  return {issueSession, session, handle, read, write, remove, directory, connection, graph, rows, catalog, authorizeAccounts, report};
}
module.exports = {createPersonalMeta};
