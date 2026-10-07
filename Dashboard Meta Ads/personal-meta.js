'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFile} = require('node:child_process');

const fail = (status, message) => Object.assign(new Error(message), {status});
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const VERSION = 'v25.0';
const APP_ID = '2093320124537661';

function createPersonalMeta({directory = process.env.META_PERSONAL_DATA_DIR || '/opt/meta-ads-cli/secrets/personal', fetchImpl = fetch, runReport, oauthConfig, billingBalanceReader} = {}) {
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
  function leadFlow(formId) {
    const flow = read('lead-flow', String(formId));
    if (!flow?.enabled || !flow.userId || !flow.facebook?.pageId || !flow.whatsapp?.instance || !flow.whatsapp?.groupJid) return null;
    const conn = connection({id: flow.userId});
    const pageToken = conn.pageTokens?.[flow.facebook.pageId];
    return pageToken ? {...flow, pageToken} : null;
  }
  function flowIds(user) {
    const settings = read('settings', user.id) || {};
    let ids = Array.isArray(settings.flow_ids) ? settings.flow_ids.filter(id => typeof id === 'string' && /^[a-f0-9-]{36}$/i.test(id)) : [];
    // Migra o único fluxo criado na primeira versão para a estrutura de projetos.
    if (!ids.length && settings.lead_flow) {
      const id = crypto.randomUUID(), legacy = settings.lead_flow;
      const project = {id, userId: user.id, name: 'Fluxo principal', createdAt: Date.now(), updatedAt: Date.now(), ...legacy};
      write('lead-flow-project', id, project);
      if (legacy.facebook?.formId) write('lead-flow', legacy.facebook.formId, project);
      ids = [id]; write('settings', user.id, {...settings, flow_ids: ids});
    }
    return ids;
  }
  function project(user, id) {
    if (!/^[a-f0-9-]{36}$/i.test(id || '') || !flowIds(user).includes(id)) throw fail(404, 'Fluxo não encontrado.');
    const value = read('lead-flow-project', id);
    if (!value || value.userId !== user.id) throw fail(404, 'Fluxo não encontrado.');
    return value;
  }
  const publicFlow = value => ({id: value.id, name: value.name, enabled: Boolean(value.enabled), createdAt: value.createdAt, updatedAt: value.updatedAt, facebook: value.facebook || {}, whatsapp: value.whatsapp || {}});
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
  const queryPolicy = require('./meta-query-policy').createQueryPolicy();
  const challenges = new Map();
  const exchanges=new Map();
  const tokenService=require('./facebook-token');
  const exchangeToken=(token,facebookId)=>tokenService.exchange(token,{fetchImpl,facebookId,...(oauthConfig!==undefined?{config:oauthConfig}:{})});
  async function upgradeConnection(user){const conn=read('connection',user.id),renewBefore=14*86400000;if(!conn||conn.noFixedExpiry||(conn.dataExpiresAt&&conn.dataExpiresAt<=Date.now())||(conn.expiresAt&&conn.expiresAt>Date.now()+renewBefore))return conn;
    if(exchanges.has(user.id))return exchanges.get(user.id);
    if(conn.exchangeAttemptAt&&Date.now()-conn.exchangeAttemptAt<3600000)return conn;
    if(!(oauthConfig===undefined?tokenService.configuration():oauthConfig))return conn;
    const promise=(async()=>{const upgraded=await exchangeToken(conn.token,conn.facebookId);const latest=read('connection',user.id);if(!latest||latest.revision!==conn.revision)return latest;const improves=upgraded&&(upgraded.noFixedExpiry||!latest.expiresAt||upgraded.expiresAt>latest.expiresAt);const result={...latest,...(improves?upgraded:{}),exchangeAttemptAt:Date.now()};write('connection',user.id,result);return result})().finally(()=>exchanges.delete(user.id));exchanges.set(user.id,promise);return promise;
  }
  const graphPauses = new Map();
  async function graph(token, endpoint, params = {}, version = VERSION, method = 'GET') {
    const pauseKey = hash(token), previous = graphPauses.get(pauseKey);
    if (previous?.until > Date.now()) throw Object.assign(fail(429, 'A Meta limitou temporariamente as consultas. Aguarde antes de atualizar.'), {retryAfter: Math.ceil((previous.until - Date.now()) / 1000)});
    if (!/^v\d+\.\d+$/.test(version)) throw fail(500, 'Versão inválida da consulta Meta.');
    const url = new URL(`https://graph.facebook.com/${version}/${endpoint}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    let response, payload;
    try {
      response = await fetchImpl(url, {method, headers: {Authorization: `Bearer ${token}`}, signal: AbortSignal.timeout(45000)});
      payload = await response.json();
    } catch { throw fail(502, 'A Meta não respondeu. Tente novamente.'); }
    if (!response.ok || payload.error) {
      console.warn(JSON.stringify({event:'meta_graph_error',endpoint,status:response.status,code:payload.error?.code,subcode:payload.error?.error_subcode,message:payload.error?.message,trace:payload.error?.fbtrace_id}));
      if (payload.error?.code === 190) throw fail(409, 'Sua conexão com o Facebook expirou. Conecte novamente.');
      if(response.status===429||[4,17,32,613].includes(payload.error?.code)||(payload.error?.code>=80000&&payload.error?.code<=80014)||payload.error?.error_subcode===1504022){
        const strikes=previous&&Date.now()-previous.last<3600000?previous.strikes+1:1;
        const retryAfter=Math.max(Number(response.headers?.get('Retry-After'))||0,Math.min(1800,120*2**(strikes-1)));
        if(graphPauses.size>=200)graphPauses.delete(graphPauses.keys().next().value);
        graphPauses.set(pauseKey,{until:Date.now()+retryAfter*1000,last:Date.now(),strikes});
        throw Object.assign(fail(429,'A Meta limitou temporariamente as consultas. Aguarde antes de atualizar.'),{retryAfter});
      }
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
    if (pictures) {try {accounts = await rows(conn.token, 'me/adaccounts', {fields: 'id,name,account_status,currency,business{id,name,profile_picture_uri},is_prepay_account'});} catch(error) {if([403,409,429].includes(error.status))throw error; /* Optional business photo must not block the account catalog. */ }}
    if (!accounts) accounts = await rows(conn.token, 'me/adaccounts', {fields: 'id,name,account_status,currency,business,is_prepay_account'});
    if (read('connection', user.id)?.revision !== conn.revision) throw fail(409, 'A conexão mudou. Atualize a consulta.');
    return {conn, accounts};
  }
  const accountAuthorizations=new Map(),pendingAccountAuthorizations=new Map();
  async function authorizeAccounts(user, ids) {
    if (!ids.length || ids.length > 100 || ids.some(id => !/^act_\d+$/.test(id))) throw fail(400, 'Selecione contas válidas.');
    const conn=connection(user),key=user.id+':'+conn.revision,hit=accountAuthorizations.get(user.id);
    let result=hit?.revision===conn.revision&&hit.expires>Date.now()?hit.result:null;
    if(!result){let pending=pendingAccountAuthorizations.get(key);if(!pending){pending=catalog(user).then(result=>{accountAuthorizations.set(user.id,{revision:conn.revision,expires:Date.now()+60000,result});return result}).finally(()=>pendingAccountAuthorizations.delete(key));pendingAccountAuthorizations.set(key,pending)}result=await pending}
    if(connection(user).revision!==conn.revision)throw fail(409,'A conexão mudou. Atualize a consulta.');
    const allowed = new Set(result.accounts.map(a => a.id));
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
    const result = await queryPolicy.report(user.id + ':' + conn.revision, {token: conn.token, kind, from, to, ids, reportOnly: url.searchParams.get('report') === '1'}, runner, url.searchParams.get('refresh') === '1');
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
      if(!conn||expired||url.searchParams.get('verify')!=='1')return send(res,200,{appId:APP_ID,version:VERSION,connected:Boolean(conn)&&!expired,expired,name:conn?.name||'',expiresAt:conn?.expiresAt||null});
      try{await graph(conn.token,'me',{fields:'id'});return send(res,200,{appId:APP_ID,version:VERSION,connected:true,expired:false,name:conn.name||'',expiresAt:conn.expiresAt||null});}
      catch(error){if(error.status===409)return send(res,200,{appId:APP_ID,version:VERSION,connected:false,expired:false,rejected:true,name:conn.name||'',expiresAt:conn.expiresAt||null});throw error}
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
      const upgraded=await exchangeToken(token,me.id);
      if(!upgraded&&(oauthConfig===undefined?tokenService.configuration():oauthConfig))throw fail(502,'Não foi possível confirmar uma conexão duradoura com o Facebook. Tente novamente. A conexão anterior foi mantida.');
      if(upgraded)token=upgraded.token;
      const [accounts,pageRows] = await Promise.all([
        rows(token, 'me/adaccounts', {fields: 'id,name'}),
        rows(token, 'me/accounts', {fields: 'id,name,access_token'}),
      ]);
      // SDK expiry is only a conservative UI hint, never an authorization decision:
      // every catalog/report is checked live against Meta with this user's token.
      const seconds=Number(payload.expiresIn),shortExpiry=Number.isFinite(seconds)&&seconds>0?Date.now()+Math.min(seconds,60*86400)*1000:0;
      const pageTokens=Object.fromEntries(pageRows.filter(page=>page.id&&typeof page.access_token==='string').map(page=>[String(page.id),page.access_token]));
      write('connection', user.id, {token, pageTokens, facebookId: me.id, name: me.name, scopes, revision: crypto.randomUUID(), expiresAt:upgraded?upgraded.expiresAt:shortExpiry, longLived:Boolean(upgraded), noFixedExpiry:Boolean(upgraded?.noFixedExpiry), dataExpiresAt:upgraded?.dataExpiresAt||0});
      return send(res, 200, {connected: true, name: me.name, accountCount: accounts.length});
    }
    if (route === '/api/meta/connection' && req.method === 'DELETE') {
      const settings=read('settings', user.id) || {},profile=settings.profile;
      for (const id of flowIds(user)) { const saved = read('lead-flow-project', id); if (saved?.facebook?.formId) remove('lead-flow', saved.facebook.formId); }
      remove('connection', user.id);
      if(profile)write('settings', user.id, {profile});else remove('settings', user.id);
      return send(res, 200, {ok: true});
    }
    if (route === '/api/meta-accounts' && req.method === 'GET') {
      accountAuthorizations.delete(user.id);
      const {accounts} = await catalog(user, true);
      return send(res, 200, {account_count: accounts.length, business_count: new Set(accounts.map(a => a.business?.id).filter(Boolean)).size, accounts: accounts.map(a => ({...a, business_name: a.business?.name || '', business_id: a.business?.id || '', business_profile_picture_uri: a.business?.profile_picture_uri || ''}))});
    }
    if (route === '/api/meta-billing-balances' && req.method === 'GET') {
      const ids = [...new Set((url.searchParams.get('accounts') || '').split(',').filter(Boolean))];
      const {conn} = await authorizeAccounts(user, ids);
      // These are the pre-paid balance fields returned for the connected user
      // by the verified Meta app. `balance` is intentionally absent: it is the
      // amount due, not the amount available in Billing & payments.
      const readBalance=async id=>{
        try{
          const row=await graph(conn.token,id,{fields:'id,currency,is_prepay_account,stored_balance_status,total_prepay_balance,prepay_account_balance,prepay_details,funding_source_details'});
          const value=row.total_prepay_balance??row.prepay_account_balance;
          const amount=value&&typeof value==='object'?(value.amount_with_offset??value.amount):null;
          const offset=value&&typeof value==='object'?(value.offset??value.currency_offset??(value.amount_with_offset!=null?2:null)):null;
          if(!row.is_prepay_account||amount==null||offset==null||!Number.isFinite(Number(amount))||!Number.isFinite(Number(offset)))return [id,{id,audited:false,error:'A Meta não retornou um saldo pré-pago auditável para esta conta.'}];
          return [id,{id,audited:true,balance:Number(amount)/10**Number(offset),currency:value.currency||row.currency||null,collected_at:new Date().toISOString(),source:'Meta Marketing API • total_prepay_balance'}];
        }catch{return [id,{id,audited:false,error:'A Meta não liberou o saldo pré-pago desta conta para o app conectado.'}]}
      };
      const accounts=Object.fromEntries(await Promise.all(ids.map(readBalance)));
      return send(res, 200, {accounts});
    }
    // O construtor Fluxo usa a mesma conexão Meta do usuário; nenhum token vai ao navegador.
    if (route === '/api/flow/meta/catalog' && req.method === 'GET') {
      const conn = await upgradeConnection(user);
      if (!conn) throw fail(409, 'Conecte seu Facebook nas Configurações antes de criar um fluxo.');
      const [accounts, pages] = await Promise.all([
        rows(conn.token, 'me/adaccounts', {fields: 'id,name'}),
        rows(conn.token, 'me/accounts', {fields: 'id,name'}),
      ]);
      return send(res, 200, {connected: true, accounts: accounts.map(({id, name}) => ({id, name: name || id})), pages: pages.map(({id, name}) => ({id, name: name || id}))});
    }
    if (route === '/api/flow/meta/forms' && req.method === 'GET') {
      const pageId = String(url.searchParams.get('pageId') || '');
      if (!/^\d{5,30}$/.test(pageId)) throw fail(400, 'Página inválida.');
      const conn = await upgradeConnection(user);
      if (!conn) throw fail(409, 'Conecte seu Facebook nas Configurações antes de criar um fluxo.');
      const pageToken = conn.pageTokens?.[pageId];
      if (!pageToken) throw fail(403, 'Essa página não faz parte da conexão Facebook atual. Reconecte e autorize a página.');
      const forms = await rows(pageToken, `${pageId}/leadgen_forms`, {fields: 'id,name,status'});
      return send(res, 200, {forms: forms.map(({id, name, status}) => ({id, name: name || id, status}))});
    }
    // Consulta curta e reaproveitável: evita criar uma nova instância/QR quando o
    // WhatsApp já está conectado, que era o principal gargalo deste fluxo.
    const whatsappConnection = async instance => {
      const base = String(process.env.EVOLUTION_API_URL || '').replace(/\/$/, ''), key = String(process.env.EVOLUTION_API_KEY || '');
      if (!base || !key) throw fail(503, 'A Evolution API ainda não está configurada no Traffic Pocket.');
      const response = await fetchImpl(`${base}/instance/connectionState/${encodeURIComponent(instance)}`, {headers: {apikey: key}, signal: AbortSignal.timeout(8000)});
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return {state: 'close', missing: response.status === 404};
      const state = payload?.instance?.state || payload?.instance?.status || payload?.state || 'unknown';
      return {state: String(state).toLowerCase(), missing: false};
    };
    if (route === '/api/flow/whatsapp/instance' && req.method === 'GET') {
      const settings = read('settings', user.id) || {}, instance = String(settings.flow_whatsapp_instance || '');
      if (!instance) return send(res, 200, {configured: false, connected: false, state: 'close'});
      const connection = await whatsappConnection(instance);
      return send(res, 200, {configured: true, instance, state: connection.state, connected: ['open', 'connected'].includes(connection.state)});
    }
    if (route === '/api/flow/whatsapp/groups' && req.method === 'GET') {
      const instance = String(url.searchParams.get('instance') || '').trim();
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(instance)) throw fail(400, 'Conecte ou informe uma instância WhatsApp válida.');
      const settings = read('settings', user.id) || {};
      if (settings.flow_whatsapp_instance !== instance) throw fail(403, 'Essa instância WhatsApp não pertence ao seu fluxo.');
      const base = String(process.env.EVOLUTION_API_URL || '').replace(/\/$/, ''), key = String(process.env.EVOLUTION_API_KEY || '');
      if (!base || !key) throw fail(503, 'A Evolution API ainda não está configurada no Traffic Pocket.');
      const response = await fetchImpl(`${base}/group/fetchAllGroups/${encodeURIComponent(instance)}?getParticipants=false`, {headers: {apikey: key}, signal: AbortSignal.timeout(12000)});
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw fail(502, 'Não foi possível listar os grupos deste WhatsApp.');
      const rows = Array.isArray(payload) ? payload : payload.data || payload.groups || [];
      return send(res, 200, {groups: rows.map(item => ({id: item.id || item.jid, name: item.subject || item.name || item.id})).filter(item => item.id)});
    }
    if (route === '/api/flow/whatsapp/instance' && req.method === 'DELETE') {
      const settings = read('settings', user.id) || {}, instance = String(settings.flow_whatsapp_instance || '');
      if (!instance) return send(res, 200, {ok: true, connected: false});
      const base = String(process.env.EVOLUTION_API_URL || '').replace(/\/$/, ''), key = String(process.env.EVOLUTION_API_KEY || '');
      if (!base || !key) throw fail(503, 'A Evolution API ainda não está configurada no Traffic Pocket.');
      const response = await fetchImpl(`${base}/instance/logout/${encodeURIComponent(instance)}`, {method: 'DELETE', headers: {apikey: key}, signal: AbortSignal.timeout(12000)});
      // Algumas versões da Evolution retornam erro após efetivar o logout. Confirma
      // o estado antes de informar falha para o usuário.
      if (!response.ok) { const connection = await whatsappConnection(instance); if (connection.state !== 'close') throw fail(502, 'Não foi possível desconectar o WhatsApp.'); }
      return send(res, 200, {ok: true, instance, connected: false});
    }
    if (route === '/api/flow/whatsapp/instance' && req.method === 'POST') {
      const base = String(process.env.EVOLUTION_API_URL || '').replace(/\/$/, ''), key = String(process.env.EVOLUTION_API_KEY || '');
      if (!base || !key) throw fail(503, 'A Evolution API ainda não está configurada no Traffic Pocket.');
      const settings = read('settings', user.id) || {}, existing = String(settings.flow_whatsapp_instance || '');
      if (existing) {
        const connection = await whatsappConnection(existing);
        if (['open', 'connected'].includes(connection.state)) return send(res, 200, {instance: existing, connected: true, qr: ''});
        if (!connection.missing) {
          const reconnect = await fetchImpl(`${base}/instance/connect/${encodeURIComponent(existing)}`, {headers: {apikey: key}, signal: AbortSignal.timeout(12000)});
          const payload = await reconnect.json().catch(() => ({}));
          if (reconnect.ok) return send(res, 200, {instance: existing, connected: false, qr: payload?.base64 || payload?.qrcode?.base64 || ''});
        }
      }
      const instance = `flow-${hash(user.id).slice(0,14)}-${crypto.randomBytes(3).toString('hex')}`;
      const response = await fetchImpl(`${base}/instance/create`, {method: 'POST', headers: {apikey: key, 'Content-Type': 'application/json'}, body: JSON.stringify({instanceName: instance, qrcode: true, integration: 'WHATSAPP-BAILEYS'}), signal: AbortSignal.timeout(25000)});
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw fail(502, 'Não foi possível criar a conexão WhatsApp.');
      write('settings', user.id, {...(read('settings', user.id) || {}), flow_whatsapp_instance: instance});
      return send(res, 201, {instance, qr: payload?.qrcode?.base64 || payload?.base64 || ''});
    }
    if ((route === '/api/flow/whatsapp/qr' || route === '/api/flow/whatsapp/status') && req.method === 'GET') {
      const instance = String(url.searchParams.get('instance') || ''), settings = read('settings', user.id) || {};
      if (!instance || settings.flow_whatsapp_instance !== instance) throw fail(403, 'Essa instância WhatsApp não pertence ao seu fluxo.');
      const base = String(process.env.EVOLUTION_API_URL || '').replace(/\/$/, ''), key = String(process.env.EVOLUTION_API_KEY || '');
      if (!base || !key) throw fail(503, 'A Evolution API ainda não está configurada no Traffic Pocket.');
      const path = route.endsWith('/qr') ? `/instance/connect/${encodeURIComponent(instance)}` : `/instance/connectionState/${encodeURIComponent(instance)}`;
      const response = await fetchImpl(`${base}${path}`, {headers: {apikey: key}, signal: AbortSignal.timeout(8000)}), payload = await response.json().catch(() => ({}));
      if (!response.ok) throw fail(502, 'A Evolution API não respondeu à conexão WhatsApp.');
      if (route.endsWith('/qr')) return send(res, 200, {instance, qr: payload?.base64 || payload?.qrcode?.base64 || ''});
      const state = payload?.instance?.state || payload?.instance?.status || payload?.state || 'unknown';
      return send(res, 200, {instance, state, connected: ['open', 'connected'].includes(String(state).toLowerCase())});
    }
    if (route === '/api/flows') {
      if (req.method === 'GET') return send(res, 200, {flows: flowIds(user).map(id => read('lead-flow-project', id)).filter(value => value?.userId === user.id).sort((a, b) => b.updatedAt - a.updatedAt).map(publicFlow)});
      if (req.method !== 'POST') throw fail(405, 'Método não permitido.');
      const name = String((await body(req)).name || '').trim();
      if (name.length < 2 || name.length > 80) throw fail(400, 'Dê ao fluxo um nome entre 2 e 80 caracteres.');
      const id = crypto.randomUUID(), value = {id, userId: user.id, name, enabled: false, facebook: {}, whatsapp: {}, createdAt: Date.now(), updatedAt: Date.now()};
      const settings = read('settings', user.id) || {}, ids = flowIds(user);
      write('lead-flow-project', id, value); write('settings', user.id, {...settings, flow_ids: [...ids, id]});
      return send(res, 201, publicFlow(value));
    }
    const flowMatch = route.match(/^\/api\/flows\/([a-f0-9-]{36})$/i);
    if (flowMatch) {
      const id = flowMatch[1], previous = project(user, id);
      if (req.method === 'GET') return send(res, 200, publicFlow(previous));
      if (req.method !== 'PUT') throw fail(405, 'Método não permitido.');
      const payload = await body(req), settings = read('settings', user.id) || {};
      const flow = {...previous, enabled: Boolean(payload.enabled), facebook: {adAccountId: String(payload.facebook?.adAccountId || ''), pageId: String(payload.facebook?.pageId || ''), formId: String(payload.facebook?.formId || '')}, whatsapp: {instance: String(payload.whatsapp?.instance || ''), groupJid: String(payload.whatsapp?.groupJid || '')}, updatedAt: Date.now()};
      if (flow.enabled && (!flow.facebook.pageId || !flow.facebook.formId || !flow.whatsapp.instance || !flow.whatsapp.groupJid)) throw fail(400, 'Selecione Página, formulário e grupo antes de ativar o fluxo.');
      if (flow.enabled) {
        if (settings.flow_whatsapp_instance !== flow.whatsapp.instance) throw fail(403, 'Conecte o seu WhatsApp pelo QR Code antes de ativar o fluxo.');
        const conflict = read('lead-flow', flow.facebook.formId);
        if (conflict && conflict.id !== id) throw fail(409, 'Este formulário já está conectado a outro fluxo. Escolha outro formulário.');
        const conn = connection(user), pageToken = conn.pageTokens?.[flow.facebook.pageId];
        if (!pageToken) throw fail(403, 'A Página selecionada não pertence à sua conexão Facebook atual.');
        await graph(pageToken, `${flow.facebook.pageId}/subscribed_apps`, {subscribed_fields: 'leadgen'}, VERSION, 'POST');
        write('lead-flow', flow.facebook.formId, flow);
      }
      if (previous.facebook?.formId && previous.facebook.formId !== flow.facebook.formId) remove('lead-flow', previous.facebook.formId);
      if (!flow.enabled && previous.facebook?.formId) remove('lead-flow', previous.facebook.formId);
      write('lead-flow-project', id, flow);
      return send(res, 200, publicFlow(flow));
    }
    if (route === '/api/meta-monitor-config' && req.method === 'GET') {
      accountAuthorizations.delete(user.id);
      const {accounts} = await catalog(user);
      return send(res, 200, {accounts: accounts.map(({id, name}) => ({id, name}))});
    }
    if (route === '/api/meta-monitor-config/sync' && req.method === 'POST') {
      const payload = await body(req), ids = Array.isArray(payload.accounts) ? payload.accounts.map(a => a?.id) : [];
      const {accounts} = await authorizeAccounts(user, ids);
      return send(res, 200, {accounts: accounts.filter(a => ids.includes(a.id)).map(({id, name}) => ({id, name}))});
    }
    if (['/api/meta-spend', '/api/meta-analysis'].includes(route) && req.method === 'GET') {
      try { return send(res, 200, await report(user, route.endsWith('spend') ? 'spend' : 'analysis', url)); }
      catch (error) { if (error.status !== 429) throw error; const retryAfter = error.retryAfter || 120; res.setHeader?.('Retry-After', String(retryAfter)); return send(res, 429, {error: error.message, retry_after: retryAfter}); }
    }
    if (route === '/api/report-product-rules') {
      const settings = read('settings', user.id) || {};
      if (req.method === 'GET') return send(res, 200, {items: Array.isArray(settings.report_product_rules) ? settings.report_product_rules : []});
      if (req.method !== 'PUT') throw fail(405, 'Método não permitido.');
      const payload = await body(req), items = Array.isArray(payload.items) ? payload.items : null;
      if (!items || items.length > 100 || items.some(item => !item || typeof item.label !== 'string' || typeof item.match !== 'string' || item.label.trim().length < 2 || item.label.trim().length > 60 || item.match.trim().length < 2 || item.match.trim().length > 80)) throw fail(400, 'Regras de produto inválidas.');
      const clean = items.map(item => ({id: typeof item.id === 'string' ? item.id.slice(0,80) : crypto.randomUUID(), label: item.label.trim(), match: item.match.trim()}));
      write('settings', user.id, {...settings, report_product_rules: clean});
      return send(res, 200, {items: clean});
    }
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
  return {issueSession, session, handle, read, write, remove, directory, connection, graph, rows, catalog, authorizeAccounts, report, leadFlow};
}
module.exports = {createPersonalMeta};
