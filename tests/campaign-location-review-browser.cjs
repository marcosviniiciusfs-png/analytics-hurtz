const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'../dev/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');

(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:850}}),errors=[];
  page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(error.message));
  const root=path.join(__dirname,'../Dashboard Meta Ads');
  await page.route('https://unpkg.com/**',route=>route.abort());
  await page.route('https://location-review.test/**',route=>{
   const name=new URL(route.request().url()).pathname.slice(1);
   if(name)return route.fulfill({body:fs.readFileSync(path.join(root,name)),contentType:name.endsWith('.css')?'text/css':'text/javascript'});
   return route.fulfill({contentType:'text/html; charset=utf-8',body:`<meta charset="utf-8"><link rel="stylesheet" href="brand-overrides.css"><div class="modal-tabs"></div><script type="module">
    import {initializeCampaignManager} from './campaign-manager-ui.js';
    window.writes=[];window.searches=[];
    const warning='Não foi possível confirmar "ITAJAI - SC" na Meta. Busque e selecione a localização antes de publicar.';
    const draft={name:'Crédito para imóvel',destination:'form',page:'1',instagram:'',form:'3',dailyBudget:6,countries:['BR'],ageMin:18,ageMax:65,headline:'Crédito para imóvel',message:'Conheça as condições.',location:null,locationQuery:'ITAJAI - SC',locationNeedsReview:true,locationWarning:warning,media:'video-key',interests:[]};
    const request=async(url,options={})=>{
     const parsed=new URL(url,location.href),action=parsed.pathname.split('/').pop();
     if(action==='plan')return {draft};
     if(action==='assets')return {pages:[{id:'1',name:'Página'}],instagram:[]};
     if(action==='forms')return {items:[{id:'3',name:'Contato',status:'ACTIVE'}]};
     if(action==='locations'){searches.push(parsed.searchParams.get('q'));return {items:[{key:'itajai-sc',type:'city',name:'Itajaí',country:'BR',region:'Santa Catarina'}]};}
     if(action==='create'){writes.push(JSON.parse(options.body));return {created:{ad:'123'}};}
     if(action==='campaigns')return {items:[],currency:'BRL',canManage:true};
     if(action==='operations')return {items:[]};
     throw Error(action);
    };
    window.manager=initializeCampaignManager({request,getAccount:()=>({id:'act_111',name:'Conta'}),escapeHtml:value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;')});
    manager.panel.hidden=false;
    manager.prepare({id:'act_111',name:'Conta',currency:'BRL'},'Anúncio para Itajaí').then(()=>window.ready=true).catch(error=>window.failure=error.message);
   </script>`});
  });
  await page.goto('https://location-review.test/');
  await page.waitForFunction(()=>window.ready||window.failure);assert.equal(await page.evaluate(()=>window.failure),undefined);
  await page.locator('#cmReview').waitFor({state:'visible'});
  assert.match(await page.locator('#cmReview .cm-location-warning').innerText(),/ITAJAI - SC/);
  await page.locator('#cmSend').click();assert.equal(await page.evaluate(()=>writes.length),0);
  assert.match(await page.locator('#cmSendStatus').innerText(),/localização antes de publicar/);
  await page.locator('#cmBack').click();
  assert.equal(await page.locator('[data-location-search]').inputValue(),'ITAJAI - SC');
  await page.locator('[data-location-search]').fill('Itajaí - SC');
  await page.locator('[data-location-suggestion="0"]').click();
  assert.match(await page.locator('.cm-location-list').innerText(),/Itajaí/);
  await page.locator('#cmReturnReview').click();
  assert.equal(await page.locator('#cmReview .cm-location-warning').count(),0);
  await page.locator('#cmBack').click();await page.locator('[data-location-remove]').click();await page.locator('#cmReturnReview').click();
  await page.locator('#cmSend').click();assert.equal(await page.evaluate(()=>writes.length),0);
  await page.locator('#cmBack').click();await page.locator('[data-location-search]').fill('Itajaí, SC');await page.locator('[data-location-suggestion="0"]').click();await page.locator('#cmReturnReview').click();
  await page.locator('#cmSend').click();
  try{await page.waitForFunction(()=>writes.length===1)}catch(error){console.error(await page.evaluate(()=>({status:document.querySelector('#cmSendStatus')?.textContent,invalid:[...document.querySelector('#cmForm').elements].filter(item=>item.willValidate&&!item.validity.valid).map(item=>item.name)})));throw error;}
  const sent=await page.evaluate(()=>writes[0]);assert.equal(sent.location.key,'itajai-sc');assert.equal(JSON.parse(sent.locations)[0].key,'itajai-sc');
  assert.deepEqual(errors,[]);
  console.log('Location review: unresolved city blocks publishing; selecting Itajai SC succeeds; removing it restores the block.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
