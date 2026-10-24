const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'../dev/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');

const watchdog=setTimeout(()=>{console.error('Website browser test exceeded 150 seconds');process.exit(1)},150000);
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows'],timeout:15000,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:900}}),errors=[];
  page.setDefaultTimeout(20000);page.on('pageerror',error=>{errors.push(error.message);console.error(error.message)});await page.bringToFront();
  const root=path.join(__dirname,'../Dashboard Meta Ads');
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='website-campaign.test'?route.fallback():route.abort());
  await page.route('https://website-campaign.test/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1);
   if(name)return route.fulfill({body:fs.readFileSync(path.join(root,name)),contentType:name.endsWith('.css')?'text/css':'text/javascript'});
   return route.fulfill({contentType:'text/html; charset=utf-8',body:`<meta charset="utf-8"><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="brand-overrides.css"><div class="modal-tabs"></div><script type="module">
    import {initializeCampaignManager} from './campaign-manager-ui.js';
    window.writes=[];window.pixelMode='ready';window.pixelCalls=[];window.scanMode='matched';window.scanCalls=[];
    const draft={name:'Loja',destination:'site',url:'https://store.test',page:'1',instagram:'',dailyBudget:20,countries:['BR'],ageMin:18,ageMax:65,headline:'Conheça a loja',message:'Veja os produtos.',media:'video-key',mediaName:'anuncio.mp4',mediaPreviewVideo:true,mediaPreview:'https://website-campaign.test/gear.svg',interests:[]};
    const request=async(url,options={})=>{
     const parsed=new URL(url,location.href),action=parsed.pathname.split('/').pop();
     if(action==='plan')return {draft};
     if(action==='assets')return {pages:[{id:'1',name:'Página'}],instagram:[]};
     if(action==='pixels'){pixelCalls.push(parsed.searchParams.get('account'));if(pixelMode==='error')throw Error('Sem permissão');return {items:pixelMode==='empty'?[]:[{id:'456',name:'Pixel da loja',available:true},{id:'789',name:'Pixel alternativo',available:true},{id:'999',name:'Pixel indisponivel',available:false}]};}
     if(action==='website-pixel'){
      const address=JSON.parse(options.body).url,mode=scanMode;scanCalls.push(address);
      if(mode==='slow')await new Promise(resolve=>window.releaseOldScan=resolve);
      if(mode==='error')throw Error('Site indisponivel');
      if(mode==='foreign')return {state:'not_in_account',pixelIds:['111222'],matches:[]};
      if(mode==='multiple')return {state:'multiple',matches:[{id:'456',name:'Pixel da loja'},{id:'789',name:'Pixel alternativo'}]};
      if(mode==='not_detected')return {state:'not_detected',pixelIds:[],matches:[]};
      const id=address.includes('/new')?'789':'456';return {state:'matched',matches:[{id,name:id==='456'?'Pixel da loja':'Pixel alternativo'}],suggestedPixelId:id};
     }
     if(action==='create'){writes.push(JSON.parse(options.body));return {created:{ad:'123'}};}
     if(action==='campaigns')return {items:[],currency:'BRL',canManage:true};
     if(action==='operations')return {items:[]};
     throw Error(action);
    };
    window.manager=initializeCampaignManager({request,getAccount:()=>({id:'act_111',name:'Conta'}),escapeHtml:value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;')});
    manager.panel.hidden=false;
    window.prepare=()=>manager.prepare({id:'act_111',name:'Conta',currency:'BRL'},'Vender produtos no site');
    prepare().then(()=>window.ready=true).catch(error=>window.failure=error.message);
   </script>`});
  });
  console.log('Website browser: loading editor');
  await page.goto('https://website-campaign.test/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ready||window.failure,{},{timeout:30000});assert.equal(await page.evaluate(()=>window.failure),undefined);
  const form=page.locator('#cmForm'),goal=form.locator('[name="siteGoal"]'),pixel=form.locator('[name="pixelId"]'),event=form.locator('[name="conversionEvent"]'),confirmed=form.locator('[name="eventSetupConfirmed"]');
  assert.equal(await goal.inputValue(),'traffic');
  assert.equal(await pixel.isDisabled(),false);
  // File metadata and replacement are below the existing creative preview.
  assert.equal(await page.locator('#cmPreview').evaluate(node=>node.nextElementSibling.classList.contains('cm-creative-controls')),true);
  console.log('Website browser: automatic pixel identification');
  await page.waitForFunction(()=>document.querySelector('[data-review-field="pixelId"]')?.value==='456');
  assert.equal(await page.locator('[data-review-field="pixelId"] option').count(),4);
  await page.waitForFunction(()=>!document.querySelector('[data-website-analysis] progress'));assert.match(await page.locator('[data-website-analysis]').innerText(),/encontrado no c\u00f3digo/);
  assert.equal(await page.locator('[data-review-field="pixelId"] option[value="999"]').evaluate(node=>node.disabled),true);
  assert.equal(await confirmed.isChecked(),false);
  fs.mkdirSync(path.join(__dirname,'../.codex-tmp'),{recursive:true});await page.locator('#cmReviewControls').screenshot({path:path.join(__dirname,'../.codex-tmp/website-review-analysis-result.png')});
  await page.locator('[data-review-field="pixelId"]').selectOption('789');
  await page.locator('#cmBack').click();await form.locator('[name="url"]').fill('https://store.test/manual');
  await page.locator('[data-pixel-detection]').filter({hasText:'Sua escolha manual'}).waitFor();assert.equal(await pixel.inputValue(),'789');
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.ready);
  await page.waitForFunction(()=>document.querySelector('[data-review-field="pixelId"]')?.value==='456');
  await page.locator('#cmBack').click();await page.evaluate(()=>window.scanMode='slow');
  await form.locator('[name="url"]').fill('https://store.test/old');await page.waitForFunction(()=>typeof window.releaseOldScan==='function');
  await form.locator('[type="submit"]').click();
  const card=page.locator('[data-website-analysis]');await card.locator('progress').waitFor();
  const urlBox=await page.locator('[data-review-field="url"]').boundingBox(),cardBox=await card.boundingBox();assert.ok(cardBox.x>urlBox.x,'analysis card should occupy the space beside the URL');
  fs.mkdirSync(path.join(__dirname,'../.codex-tmp'),{recursive:true});
  await page.locator('#cmReviewControls').screenshot({path:path.join(__dirname,'../.codex-tmp/website-review-analysis-progress.png')});
  await page.locator('#cmSend').click();assert.equal(await page.evaluate(()=>writes.length),0);await page.locator('#cmBack').click();
  await page.evaluate(()=>window.scanMode='matched');await form.locator('[name="url"]').fill('https://store.test/new');
  await page.waitForFunction(()=>document.querySelector('[name="pixelId"]').value==='789');await page.evaluate(()=>releaseOldScan());
  await page.locator('[data-pixel-detection]').filter({hasText:'Pixel alternativo'}).waitFor();assert.equal(await pixel.inputValue(),'789');
  for(const [mode,address,expected] of [['foreign','foreign','111222'],['multiple','multiple','mais de um Pixel'],['not_detected','consent','c\u00f3digo p\u00fablico'],['error','offline','sele\u00e7\u00e3o manual']]){
   await page.evaluate(value=>window.scanMode=value,mode);await form.locator('[name="url"]').fill('https://store.test/'+address);
   await page.locator('[data-pixel-detection]').filter({hasText:expected}).waitFor();assert.equal(await pixel.inputValue(),'');
  }
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.ready);
  await page.waitForFunction(()=>document.querySelector('[data-review-field="pixelId"]')?.value==='456');
  console.log('Website browser: selecting leads');
  await page.locator('[data-review-field="siteGoal"]').selectOption('leads');
  await pixel.locator('option[value="456"]').waitFor({state:'attached'});
  await pixel.selectOption('456');assert.equal(await event.inputValue(),'LEAD');
  await form.locator('[type="submit"]').click();
  assert.equal(await page.locator('#cmReview').isHidden(),true);
  await confirmed.check();await event.selectOption('COMPLETE_REGISTRATION');assert.equal(await confirmed.isChecked(),false);
  await confirmed.check();await form.locator('[type="submit"]').click();
  assert.match(await page.locator('#cmReview').innerText(),/Leads no site.*Pixel da loja.*Cadastro concluído/s);
  await page.locator('[data-review-field="url"]').fill('https://store.test/leads');await page.locator('[data-review-field="url"]').press('Tab');
  assert.equal(await confirmed.isChecked(),false);await page.locator('#cmSend').click();assert.equal(await page.evaluate(()=>writes.length),0);
  await page.locator('#cmBack').click();await goal.selectOption('sales');
  assert.equal(await event.inputValue(),'PURCHASE');assert.equal(await confirmed.isChecked(),false);
  await confirmed.check();await form.locator('[name="url"]').fill('https://store.test/checkout');assert.equal(await confirmed.isChecked(),false);
  await confirmed.check();
  await page.setViewportSize({width:390,height:844});
  assert.equal(await form.locator('.cm-website-campaign').evaluate(node=>node.scrollWidth<=node.clientWidth),true);
  fs.mkdirSync(path.join(__dirname,'../.codex-tmp'),{recursive:true});
  await form.locator('.cm-website-campaign').screenshot({path:path.join(__dirname,'../.codex-tmp/website-sales-mobile.png')});
  await page.setViewportSize({width:1200,height:900});
  await form.locator('.cm-website-campaign').screenshot({path:path.join(__dirname,'../.codex-tmp/website-sales-desktop.png')});
  await form.locator('[type="submit"]').click();
  assert.match(await page.locator('#cmReview').innerText(),/Vendas no site.*Pixel da loja.*Compra concluída/s);
  console.log('Website browser: publishing mock sales');
  await page.locator('#cmSend').click();await page.waitForFunction(()=>writes.length===1);
  const sent=await page.evaluate(()=>writes[0]);assert.equal(sent.siteGoal,'sales');assert.equal(sent.pixelId,'456');assert.equal(sent.conversionEvent,'PURCHASE');assert.equal(sent.eventSetupConfirmed,'on');
  assert.deepEqual(await page.evaluate(()=>pixelCalls),['act_111']);
  // Empty and failed pixel lists must remain actionable, with no automatic loop.
  console.log('Website browser: starting empty/retry checks');
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.ready);
  await page.evaluate(()=>window.pixelMode='empty');
  await page.locator('#cmBack').click();await goal.selectOption('leads');await page.locator('[data-refresh-pixels]').click();
  await page.locator('[data-pixel-status]').filter({hasText:'Nenhum Pixel disponível'}).waitFor();
  assert.equal(await pixel.inputValue(),'');
  await page.evaluate(()=>window.pixelMode='error');await page.locator('[data-refresh-pixels]').click();
  await page.locator('[data-pixel-status]').filter({hasText:'Sem permissão'}).waitFor();
  assert.equal(await page.locator('[data-refresh-pixels]').isEnabled(),true);
  await page.evaluate(()=>window.pixelMode='ready');await page.locator('[data-refresh-pixels]').click();
  await pixel.locator('option[value="456"]').waitFor({state:'attached'});await pixel.selectOption('456');await confirmed.check();
  await form.locator('[name="destination"]').selectOption('whatsapp');
  assert.equal(await goal.isDisabled(),true);assert.equal(await pixel.isDisabled(),true);assert.equal(await confirmed.isDisabled(),true);
  assert.deepEqual(errors,[]);
  console.log('Website campaigns: leads/sales, review payload, account pixel scope, required setup, objective/event/URL changes, mobile layout, empty/error/retry and destination changes passed.');
 }finally{await browser.close();clearTimeout(watchdog)}
})().catch(error=>{console.error(error);process.exitCode=1});
