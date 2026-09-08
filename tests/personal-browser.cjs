const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const app=path.join(__dirname,'../Dashboard Meta Ads');
const server=http.createServer((req,res)=>{const name=decodeURIComponent(req.url.split('?')[0]).replace(/^\//,'')||'index.html';const target=path.join(app,name);if(!fs.existsSync(target)){res.writeHead(404);return res.end()}res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.svg')?'image/svg+xml':'text/html');res.end(fs.readFileSync(target))});
const metric={spend:42,results:2,impressions:1000,reach:800,clicks:20,ctr:2,cpm:42,cpc:2.1,cost_per_result:21};
const account=id=>({id,name:'Conta '+id,account_status:1});
const spend=id=>({id,name:'Conta '+id,spend:42,campaign_sum:42,reconciled:true,result_reconciled:true,account_action_totals_match:true,active_campaign_count:1,daily:[],campaigns:[{campaign_id:id+'1',campaign_name:'Campanha formulário',spend:42,results:2,cost_per_result:21,objective:'OUTCOME_LEADS',objective_label:'Formulário',effective_status:'ACTIVE'}]});
const analysis=id=>({id,reconciled:true,account:metric,age:{reconciled:true,rows:[]},geography:{reconciled:true,rows:[]},placement:{reconciled:true,rows:[]},format:{reconciled:true,rows:[]},ads:[]});
(async()=>{
 await new Promise(resolve=>server.listen(8098,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:process.platform==='win32'?{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{})});
 try{
  const page=await browser.newPage();const errors=[],requests=[];
  let connected=true,catalogError=false,ids=Array.from({length:9},(_,i)=>'act_'+(111+i)),profile={items:[],activeId:null};
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error'&&message.text().includes('Falha ao iniciar'))errors.push(message.text())});
  await page.route('**/api/**',async route=>{
   const req=route.request(),url=new URL(req.url()),who=req.headers().authorization?.includes('session-b')?'b':'a';
   const allowed=who==='b'?['act_222']:ids;let payload={},status=200;
   requests.push({path:url.pathname,user:who,ids:(url.searchParams.get('accounts')||'').split(',').filter(Boolean)});
   if(url.pathname==='/api/session')payload={ok:true,personal:true,user:{id:who,email:who+'@example.test'}};
   else if(url.pathname==='/api/meta/challenge')payload={nonce:'nonce'};
   else if(url.pathname==='/api/meta/connection'){
    if(req.method()==='POST'){connected=true;assert.equal(req.postDataJSON().expiresIn,3600)}
    if(req.method()==='DELETE')connected=false;
    payload={connected,appId:'2093320124537661',version:'v25.0',name:'Pessoa '+who};
   }else if(url.pathname==='/api/meta-accounts'||url.pathname.startsWith('/api/meta-monitor-config')){
    if(catalogError){status=403;payload={error:'Permissão não concedida. Reconecte o Facebook.'}}
    else payload={accounts:connected?allowed.map(account):[],account_count:allowed.length,business_count:0};
   }else if(url.pathname==='/api/alert-plans')payload={plans:{}};
   else if(url.pathname==='/api/account-profiles'){
    if(req.method()==='PUT')profile=req.postDataJSON();
    payload=who==='a'?profile:{items:[],activeId:null};
   }else if(['/api/meta-spend','/api/meta-analysis'].includes(url.pathname)){
    const selected=url.searchParams.get('accounts').split(',');
    assert.ok(selected.length<=4,'report batches must stay small');
    assert.ok(selected.every(id=>allowed.includes(id)),'report used an account from another user');
    payload={accounts:Object.fromEntries(selected.map(id=>[id,url.pathname.endsWith('spend')?spend(id):analysis(id)]))};
   }else{status=403;payload={error:'Acesso administrativo'}}
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(payload)});
  });
  await page.route('https://connect.facebook.net/**',route=>route.fulfill({contentType:'text/javascript',body:"window.FB={init(){},login(callback){callback({authResponse:{accessToken:'test-token-never-a-secret',expiresIn:3600}})}};window.fbAsyncInit();"}));
  await page.addInitScript(()=>{if(!localStorage.getItem('hurtz-monitor-session-v2'))localStorage.setItem('hurtz-monitor-session-v2','session-a')});
  await page.goto('http://127.0.0.1:8098/',{waitUntil:'domcontentloaded'});
  await page.locator('#connectPersonalFacebook:not([disabled])').waitFor();
  await page.waitForFunction(()=>document.querySelectorAll('#accounts .account-link').length===9);
  await page.waitForFunction(()=>!document.querySelector('#refreshButton').disabled);
  ids.push('act_999');await page.locator('#refreshButton').click();
  await page.waitForFunction(()=>document.querySelectorAll('#accounts .account-link').length===10);
  assert.match(await page.locator('#tableDateFilter').innerText(),/10/);
  await page.waitForFunction(()=>!document.querySelector('#refreshButton').disabled);
  ids=ids.filter(id=>id!=='act_111');await page.locator('#refreshButton').click();
  await page.waitForFunction(()=>document.querySelectorAll('#accounts .account-link').length===9);
  assert.equal(await page.locator('#accounts .account-link').filter({hasText:'Conta act_111'}).count(),0);
  await page.waitForFunction(()=>!document.querySelector('#refreshButton').disabled);
  await page.locator('#analysisNav').click();await page.waitForFunction(()=>document.querySelector('#analysisAuditChip').textContent.includes('reconciliado'));
  assert.equal(await page.locator('#analysisAccountSelect option').count(),10);
  await page.locator('#reportsNav').click();await page.waitForFunction(()=>document.querySelectorAll('#reportAccountOptions input').length===9);
  await page.locator('#createReportButton').click();await page.waitForFunction(()=>!document.querySelector('#createReportButton').disabled,{},{timeout:30000});
  assert.equal(await page.locator('#reportOutput').isVisible(),true,(await page.locator('#reportStatus').innerText())+' '+(await page.locator('#reportRunSummary').textContent()));
  assert.match(await page.locator('#reportRunSummary').innerText(),/Não passaram\s+0/);
  // Restore an active profile on a fresh load: profile fetch precedes account discovery.
  profile={items:[{id:'profile-one',name:'Só minha conta',accountIds:['act_112']}],activeId:'profile-one'};
  await page.reload();await page.locator('#connectPersonalFacebook:not([disabled])').waitFor();
  await page.waitForFunction(()=>document.querySelector('#tableDateFilter').textContent==='Filtros (1)');
  // Account errors must leave reconnect usable and show the actual error.
  catalogError=true;await page.reload();await page.locator('#connectPersonalFacebook:not([disabled])').waitFor();
  assert.match(await page.locator('#facebookConnectionStatus').innerText(),/Permissão não concedida/);
  catalogError=false;await page.locator('#connectPersonalFacebook').click();
  await page.locator('#connectPersonalFacebook:not([disabled])').waitFor();
  await page.waitForFunction(()=>document.querySelector('#tableDateFilter').textContent==='Filtros (1)');
  // Same browser, another Analytics user: no previous account or profile survives.
  await page.evaluate(()=>localStorage.setItem('hurtz-monitor-session-v2','session-b'));await page.reload();
  await page.locator('#connectPersonalFacebook:not([disabled])').waitFor();
  await page.locator('#accounts .account-link').filter({hasText:'Conta act_222'}).waitFor({state:'attached'});
  assert.equal(await page.locator('#accounts .account-link').count(),1);
  assert.equal(await page.locator('#accountProfileSelect option').filter({hasText:'Só minha conta'}).count(),0);
  await page.screenshot({path:path.join(require('node:os').tmpdir(),'individual-auth-tested.png'),fullPage:false});
  await Promise.all([page.waitForEvent('domcontentloaded'),page.locator('#disconnectPersonalFacebook').click()]);
  await page.locator('#connectPersonalFacebook:not([disabled])').waitFor();
  assert.equal(await page.locator('#accounts .account-link').count(),0);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,checks:['discovery','new accounts on refresh','revoked accounts removed','small report batches','analysis','reports','saved profile after reload','permission error and reconnect','SDK expiry','two user isolation','disconnect'],reportRequests:requests.filter(r=>r.ids.length).length}));
 }finally{await browser.close();server.close()}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
