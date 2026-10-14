const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process');
const {createPersonalMeta}=require('../Dashboard Meta Ads/personal-meta');

test('HTTP and Google Sheets flow projects persist, list and delete safely',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'traffic-flow-test-')),vault=createPersonalMeta({directory:dir}),token=vault.issueSession({id:'flow-user',email:'flow@example.test'}),port=8196;
 const child=spawn(process.execPath,[path.resolve(__dirname,'../Dashboard Meta Ads/preview-server.js')],{env:{...process.env,ANALYTICS_LOCAL_ONLY:'0',ANALYTICS_PERSONAL_TOOLS:'1',META_PERSONAL_DATA_DIR:dir,PORT:String(port),HOST:'127.0.0.1'},stdio:['ignore','pipe','pipe']});
 t.after(async()=>{child.kill();await new Promise(resolve=>child.once('close',resolve));fs.rmSync(dir,{recursive:true,force:true})});
 await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);child.once('exit',()=>reject(new Error('Servidor encerrou antes de iniciar')))});
 const request=async(route,method='GET',body)=>{const response=await fetch(`http://127.0.0.1:${port}${route}`,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','X-Require-Personal-Meta':'1'},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,body:await response.json()}};
 const created=await request('/api/flows','POST',{name:'Leads do site'});assert.equal(created.status,201);assert.equal(created.body.source,'facebook');assert.match(created.body.http.endpoint,/^\/api\/flow\/inbound\//);
 const saved=await request(`/api/flows/${created.body.id}`,'PUT',{enabled:false,source:'http',destination:'google-sheets',googleSheets:{spreadsheetId:'12345678901234567890',sheetName:'Leads',headers:['Nome','E-mail'],mapping:{Nome:'name','E-mail':'email'}},facebook:{},whatsapp:{}});
 assert.equal(saved.status,200);assert.equal(saved.body.source,'http');assert.equal(saved.body.destination,'google-sheets');assert.match(saved.body.http.endpoint,/^\/api\/flow\/inbound\//);assert.equal(saved.body.googleSheets.mapping.Nome,'name');
 const inbound=await fetch(`http://127.0.0.1:${port}${saved.body.http.endpoint}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nome_completo:'Ana',contato:{telefone:'5511999999999'}})});assert.equal(inbound.status,202);const sample=await request(`/api/flows/${created.body.id}/http-sample`);assert.equal(sample.body.sample.payload.nome_completo,'Ana');assert.equal(sample.body.sample.payload.contato.telefone,'5511999999999');
 assert.equal((await request(`/api/flows/${created.body.id}`,'PUT',{enabled:true,source:'http',destination:'google-sheets',googleSheets:{spreadsheetId:'12345678901234567890',sheetName:'Leads',headers:['Nome'],mapping:{Nome:'name'}},facebook:{},whatsapp:{}})).status,409);
 const listed=await request('/api/flows');assert.equal(listed.body.flows.length,1);assert.equal(listed.body.flows[0].source,'http');
 assert.equal((await request(`/api/flows/${created.body.id}`,'DELETE')).status,200);assert.equal((await request('/api/flows')).body.flows.length,0);
});

test('flow editor exposes source, destination, mapping and deletion controls',()=>{
 const html=fs.readFileSync(path.resolve(__dirname,'../Dashboard Meta Ads/index.html'),'utf8'),script=fs.readFileSync(path.resolve(__dirname,'../Dashboard Meta Ads/flow-builder.js'),'utf8');
 for(const id of ['flowSource','flowDestination','flowHttpEndpoint','flowGoogleNode','flowSpreadsheet','flowSheet','flowMapping','flowDelete'])assert.ok(html.includes(`id="${id}"`));
 assert.match(script,/\/api\/flow\/google\/spreadsheets/);assert.match(script,/method: 'DELETE'/);assert.match(script,/source: \$\('flowSource'\)\.value/);assert.match(script,/canvas\.insertBefore\(http, connector\)/);assert.match(script,/canvas\.insertBefore\(google, whatsapp\)/);assert.match(script,/HURTZ_API_ROUTER_READY/);assert.match(script,/hurtz-api-router-ready/);assert.match(script,/flowCopyHttpEndpoint/);assert.match(script,/flowListenHttpEndpoint/);assert.match(script,/http-sample/);assert.match(script,/flowSpreadsheetManual/);assert.match(script,/HURTZ_API_BASE/);
 assert.ok(html.indexOf('src="app.js') < html.indexOf('src="flow-builder.js'), 'o roteador da API deve iniciar antes da primeira listagem de fluxos');
});

test('Google OAuth stays server-side and sheet rows follow saved column mapping',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'traffic-google-test-')),old={id:process.env.GOOGLE_OAUTH_CLIENT_ID,secret:process.env.GOOGLE_OAUTH_CLIENT_SECRET,redirect:process.env.GOOGLE_OAUTH_REDIRECT_URI};
 process.env.GOOGLE_OAUTH_CLIENT_ID='google-client';process.env.GOOGLE_OAUTH_CLIENT_SECRET='google-secret';process.env.GOOGLE_OAUTH_REDIRECT_URI='https://traffic-api.example.test/api/flow/google/callback';
 const calls=[],vault=createPersonalMeta({directory:dir,fetchImpl:async(url,options={})=>{calls.push({url:String(url),options});return {ok:true,status:200,json:async()=>String(url).includes('oauth2.googleapis.com')?{access_token:'server-only-token',refresh_token:'refresh-token',id_token:`x.${Buffer.from(JSON.stringify({email:'owner@example.test'})).toString('base64url')}.x`,expires_in:3600}:{updates:{updatedRows:1}}}}});
 t.after(()=>{fs.rmSync(dir,{recursive:true,force:true});process.env.GOOGLE_OAUTH_CLIENT_ID=old.id;process.env.GOOGLE_OAUTH_CLIENT_SECRET=old.secret;process.env.GOOGLE_OAUTH_REDIRECT_URI=old.redirect});
 const authorization=new URL(vault.beginGoogleAuth({id:'google-user'}));assert.equal(authorization.searchParams.get('client_id'),'google-client');assert.match(authorization.searchParams.get('scope'),/spreadsheets/);assert.match(authorization.searchParams.get('scope'),/email/);assert.match(authorization.searchParams.get('prompt'),/select_account/);
 await vault.completeGoogleAuth('code',authorization.searchParams.get('state'));
 assert.equal(vault.read('google-sheets','google-user').email,'owner@example.test');
 await vault.appendGoogleLead({userId:'google-user',googleSheets:{spreadsheetId:'12345678901234567890',sheetName:'Leads',headers:['Nome','Email'],mapping:{Nome:'fields.full_name',Email:'email'}}},{fields:{full_name:'Ana'},email:'ana@example.test'});
 const append=calls.find(call=>call.url.includes(':append'));assert.ok(append);assert.deepEqual(JSON.parse(append.options.body).values,[['Ana','ana@example.test']]);assert.ok(!JSON.stringify(append).includes('google-secret'));
});
