const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'../dev/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process');
(async()=>{
 const root=path.resolve(__dirname,'..'),data=fs.mkdtempSync(path.join(os.tmpdir(),'hurtz-overview-'));
 const server=spawn(process.execPath,[path.join(root,'dev/local-server.cjs')],{env:{...process.env,PORT:'8098',LOCAL_DATA_DIR:data},stdio:'ignore'});
 let browser;
 try{
  for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:8098')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],spend=[],plans=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.FB={init(){},login(){}}});
  const json=(route,payload)=>route.fulfill({contentType:'application/json; charset=utf-8',body:JSON.stringify(payload)});
  await page.route('**/api/meta/connection*',r=>json(r,{connected:true,name:'Teste',appId:'test',version:'v23.0'}));
  await page.route('**/api/meta/challenge',r=>json(r,{nonce:'test'}));
  await page.route('**/api/meta-accounts',r=>json(r,{accounts:[{id:'act_111',name:'Conta da loja',account_status:1,business_id:'999',business_name:'Minha empresa',currency:'BRL'}]}));
  await page.route('**/api/meta-spend?*',r=>{spend.push(r.request().url());return json(r,{accounts:{}})});
  await page.route('**/api/meta-analysis?*',r=>json(r,{accounts:{}}));
  await page.route('**/api/ads-manager/plan?*',async r=>{plans.push(r.request().url());await new Promise(resolve=>setTimeout(resolve,250));return json(r,{draft:{name:'Campanha loja',destination:'site',page:'1',url:'https://example.com',dailyBudget:40,countries:['BR'],ageMin:25,ageMax:45,headline:'Conheça a loja',message:'Nossa oferta',rationale:'Teste'}})});
  await page.route('**/api/ads-manager/assets?*',r=>json(r,{pages:[{id:'1',name:'Página da loja'}],instagram:[]}));
  await page.route('**/api/ads-manager/campaigns?*',r=>json(r,{items:[],currency:'BRL',canManage:true}));
  await page.route('**/api/ads-manager/operations?*',r=>json(r,{items:[]}));
  const overviewModule=fs.readFileSync(path.join(root,'Dashboard Meta Ads/overview-campaign.js'));
  await page.route('**/overview-campaign.js?*',async route=>{await new Promise(resolve=>setTimeout(resolve,450));await route.fulfill({contentType:'text/javascript; charset=utf-8',body:overviewModule})});
  await page.goto('http://127.0.0.1:8098/?view=overview',{waitUntil:'domcontentloaded'});
  await page.locator('#accounts').waitFor({state:'attached'});assert.equal(await page.locator('#accounts').isVisible(),false,'Overview must not flash the account catalog while its module is loading');
  await page.locator('#overviewDescription').waitFor();await page.waitForFunction(()=>document.querySelector('#facebookConnectionStatus').textContent.includes('1 contas'));
  await page.waitForTimeout(300);assert.equal(spend.length,0);assert.equal(await page.locator('#summaryCards').isVisible(),false);assert.equal(await page.locator('main>header').isVisible(),false);
  for(const width of [1440,768,390,320]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:path.join(root,'.codex-tmp/overview-live-layout-'+width+'.png')})}
  await page.setViewportSize({width:1440,height:1000});await page.locator('#overviewDescription').fill('Quero anunciar minha loja em Belém, R$ 40 por dia, 25 a 45 anos, site, Facebook e Instagram.');await page.locator('#overviewContinue').click();await page.locator('#overviewLoading').waitFor({state:'visible'});assert.equal(await page.locator('#overviewDescription').isVisible(),false);await page.locator('#cmReview').waitFor({state:'visible'});assert.ok((await page.locator('.cm-editor-dialog').boundingBox()).width<=760);
  assert.match(await page.locator('#cmReview').innerText(),/Minha empresa.*999/s);assert.match(await page.locator('#cmReview').innerText(),/Conta da loja.*act_111/s);assert.equal(plans.length,1);assert.equal(spend.length,0);
  await page.screenshot({path:path.join(root,'.codex-tmp/overview-live-review.png')});await page.keyboard.press('Escape');
  await page.locator('.sidebar nav a').filter({hasText:'Contas'}).click();await page.locator('#accounts').waitFor({state:'visible'});await page.waitForFunction(()=>document.querySelector('#accountsBody').textContent.includes('Conta da loja'));await page.waitForTimeout(300);assert.ok(spend.length>0,'Accounts must still load monitoring');assert.equal(await page.locator('#overviewCampaign').isVisible(),false);
  await page.locator('.sidebar nav a').filter({hasText:'Visão geral'}).click();await page.locator('#overviewCampaign').waitFor({state:'visible'});assert.equal(await page.locator('#accounts').isVisible(),false);
  await page.locator('.sidebar nav a').filter({hasText:'Contas'}).click();await page.locator('[data-open="act_111"]').first().click();await page.locator('#accountModal').waitFor({state:'visible'});
  await page.locator('.sidebar nav a').filter({hasText:'Vis\u00e3o geral'}).click();await page.locator('#overviewCampaign').waitFor({state:'visible'});assert.equal(await page.locator('#accountModal').isVisible(),false);
  assert.deepEqual(errors,[]);console.log('Full app: Overview has zero spend queries, correct BM/account review and responsive layout; Accounts monitoring remains functional.');
 }finally{if(browser)await browser.close();server.kill();await new Promise(r=>server.once('exit',r));fs.rmSync(data,{recursive:true,force:true})}
})().catch(error=>{console.error(error);process.exitCode=1});
