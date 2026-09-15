const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'../dev/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../Dashboard Meta Ads');
const brief='Quero divulgar uma loja em Belém, R$ 40 por dia, 25 a 45 anos, site, Facebook e Instagram.';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://overview.test/**',route=>{
   const file=new URL(route.request().url()).pathname.slice(1);
   if(file)return route.fulfill({body:fs.readFileSync(path.join(root,file)),contentType:file.endsWith('.css')?'text/css':'text/javascript'});
   return route.fulfill({contentType:'text/html; charset=utf-8',body:`<link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="brand-overrides.css"><main><section id="entry"></section></main><div class="modal-tabs"></div><script type="module">
    import {initializeOverviewCampaign} from './overview-campaign.js';
    import {initializeCampaignManager} from './campaign-manager-ui.js';
    window.catalog=[];window.ready=true;window.connected=true;window.calls=[];window.fail=false;window.hold=false;
    const request=async(url,options={})=>{const action=new URL(url,location.href).pathname.split('/').pop();calls.push({action,url,body:options.body});
     if(action==='plan'){if(hold)await new Promise(resolve=>window.release=resolve);if(fail)throw Error('Falha temporária. Tente novamente.');return {draft:{name:'Campanha teste',destination:'site',page:'1',url:'https://example.com',dailyBudget:40,countries:['BR'],ageMin:25,ageMax:45,headline:'Teste',message:'Oferta',rationale:'Plano'}}}
     if(action==='assets')return {pages:[{id:'1',name:'Página teste'}],instagram:[]};
     throw Error('Unexpected request: '+action);
    };
    const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll(String.fromCharCode(34),'&quot;');
    window.manager=initializeCampaignManager({request,getAccount:()=>null,escapeHtml:esc});
    window.composer=initializeOverviewCampaign({mount:document.querySelector('#entry'),getAccounts:()=>catalog,isReady:()=>ready,isConnected:()=>connected,connect:()=>window.connectRequested=true,prepare:(...args)=>manager.prepare(...args)});
    composer.setVisible(true);
   </script>`});
  });
  const reset=async catalog=>{await page.goto('https://overview.test/');await page.waitForFunction(()=>window.composer);await page.evaluate(rows=>{catalog=rows;composer.refresh()},catalog)};
  const one={id:'act_1',name:'Conta A',businessId:'bm_1',businessName:'Empresa A',currency:'BRL'};
  await reset([one]);
  await page.locator('#overviewContinue').click();assert.equal(await page.evaluate(()=>calls.length),0);
  await page.locator('#overviewDescription').fill(brief);
  assert.equal(await page.locator('#overviewDestination').isHidden(),true);
  await page.locator('#overviewContinue').click();await page.locator('#cmReview').waitFor({state:'visible'});
  assert.match(await page.locator('#cmReview').innerText(),/Empresa A.*bm_1/s);assert.match(await page.locator('#cmReview').innerText(),/Conta A.*act_1/s);
  assert.deepEqual(await page.evaluate(()=>calls.map(x=>x.action)),['plan','assets']);
  await page.locator('#cmBack').click();await page.locator('#cmForm button[type=submit]').click();
  // Missing media keeps the form editable and cannot publish.
  assert.equal(await page.evaluate(()=>calls.some(x=>x.action==='create')),false);
  for(const rows of [[one,{...one,id:'act_2',name:'Conta B'}],[one,{...one,id:'act_2',name:'Conta B',businessId:'bm_2',businessName:'Empresa B'}]]){
   await reset(rows);await page.locator('#overviewDescription').fill(brief);await page.locator('#overviewContinue').click();
   assert.equal(await page.locator('#overviewAccount').inputValue(),'');assert.equal(await page.evaluate(()=>calls.length),0);
   await page.locator('#overviewMemberStrip [data-overview-account="act_2"]').click();await page.locator('#overviewContinue').click();await page.locator('#cmReview').waitFor({state:'visible'});
   assert.match(await page.locator('#cmReview').innerText(),/Conta B.*act_2/s);
   assert.ok((await page.evaluate(()=>calls[0].url)).endsWith('account=act_2'));
  }
  await reset([one,one]);await page.locator('#overviewDescription').fill(brief);await page.locator('#overviewContinue').click();await page.locator('#cmReview').waitFor({state:'visible'});
  await reset([{...one,businessId:'',businessName:''}]);await page.locator('#overviewDescription').fill(brief);await page.locator('#overviewContinue').click();assert.equal(await page.locator('#overviewAccount').inputValue(),'');
  await page.locator('#overviewMemberStrip [data-overview-account="act_1"]').click();await page.locator('#overviewContinue').click();await page.locator('#cmReview').waitFor({state:'visible'});assert.match(await page.locator('#cmReview').innerText(),/BM não informada/);
  await reset([]);await page.locator('#overviewDescription').fill(brief);await page.locator('#overviewContinue').click();assert.match(await page.locator('#overviewStatus').innerText(),/conta/);assert.equal(await page.locator('#overviewDescription').inputValue(),brief);
  await reset([one]);await page.evaluate(()=>ready=false);await page.locator('#overviewDescription').fill(brief);await page.locator('#overviewContinue').click();assert.equal(await page.evaluate(()=>calls.length),0);await page.evaluate(()=>{ready=true;composer.refresh()});
  await page.evaluate(()=>fail=true);await page.locator('#overviewContinue').click();await page.getByText('Falha temporária. Tente novamente.',{exact:true}).waitFor();assert.equal(await page.locator('#overviewDescription').inputValue(),brief);
  await page.evaluate(()=>fail=false);await page.locator('#overviewContinue').click();await page.locator('#cmReview').waitFor({state:'visible'});
  await reset([one]);await page.evaluate(()=>hold=true);await page.locator('#overviewDescription').fill(brief);await page.locator('#overviewContinue').click();await page.waitForFunction(()=>window.release);await page.evaluate(()=>{composer.setVisible(false);manager.close();release()});await page.waitForTimeout(100);assert.equal(await page.locator('.cm-editor-dialog').evaluate(el=>el.open),false);
  await reset([one,{...one,id:'act_2',name:'<img src=x onerror=alert(1)>',businessName:'Empresa '.repeat(30)}]);await page.locator('#overviewDescription').fill(brief);await page.locator('#overviewContinue').click();assert.equal(await page.locator('#overviewDestination img').count(),0);
  for(const width of [1440,768,390,320]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.locator('#overviewDescription').focus();await page.keyboard.press('Tab');}
  await reset(Array.from({length:62},(_,i)=>({...one,id:'act_'+(i+1),name:'Conta '+(i+1),businessId:'bm_'+i,businessName:'Empresa '+i})));
  await page.locator('#overviewDescription').fill(brief);await page.locator('#overviewContinue').click();
  assert.equal(await page.locator('#overviewDestination select').count(),0);
  assert.equal(await page.locator('#overviewMemberStrip [data-overview-account]').count(),5);
  await page.locator('#overviewMemberAdd').click();await page.locator('#overviewMemberSearch').fill('bm_61');
  assert.equal(await page.locator('#overviewMemberList button').count(),1);await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
  assert.equal(await page.locator('#overviewAccount').inputValue(),'act_62');assert.equal(await page.locator('#overviewMemberDropdown').isHidden(),true);
  assert.equal(await page.locator('#overviewMemberStrip [aria-pressed=true]').count(),1);
  await page.locator('#overviewMemberAdd').click();await page.locator('#overviewMemberSearch').fill('no match');assert.match(await page.locator('#overviewMemberList').innerText(),/Nenhuma conta/);await page.keyboard.press('Escape');assert.equal(await page.locator('#overviewMemberDropdown').isHidden(),true);
  await page.locator('#overviewMemberAdd').click();await page.locator('#overviewDescription').click();assert.equal(await page.locator('#overviewMemberDropdown').isHidden(),true);
  await page.locator('#overviewMemberAdd').click();
  for(const width of [1440,768,390,320]){await page.setViewportSize({width,height:900});const box=await page.locator('#overviewMemberDropdown').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)}
  fs.mkdirSync(path.join(__dirname,'../.codex-tmp'),{recursive:true});await page.screenshot({path:path.join(__dirname,'../.codex-tmp/overview-campaign-mobile.png')});
  assert.deepEqual(errors,[]);console.log('Overview campaign: single/multiple/missing destinations, review, retry, cancellation and responsive checks passed.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
