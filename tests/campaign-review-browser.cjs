const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'../dev/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:850}}),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});
  const root=path.join(__dirname,'../Dashboard Meta Ads');
  await page.route('https://campaign.test/**',route=>{const name=new URL(route.request().url()).pathname.slice(1);if(name)return route.fulfill({body:fs.readFileSync(path.join(root,name)),contentType:name.endsWith('.css')?'text/css':'text/javascript'});return route.fulfill({body:'<link rel="stylesheet" href="brand-overrides.css"><div class="modal-tabs"></div><script type="module">import {initializeCampaignManager} from "./campaign-manager-ui.js";window.writes=[];window.failUpload=false;window.failCreate=false;const draft={name:"Campanha de teste",destination:"form",page:"1",instagram:"2",form:"3",dailyBudget:40,countries:["BR"],ageMin:25,ageMax:45,headline:"Teste",message:"Texto ".repeat(250),location:{name:"Belém",region:"Pará",country:"BR"},rationale:"Teste"};const request=async(url,options={})=>{const action=new URL(url,location.href).pathname.split("/").pop();if(action==="campaigns")return {items:[],currency:"BRL",canManage:true};if(action==="operations")return {items:[]};if(action==="assets")return {pages:[{id:"1",name:"Página"}],instagram:[{id:"2",pageId:"1",username:"Perfil"}]};if(action==="forms"){await new Promise(r=>setTimeout(r,250));return {items:[{id:"3",name:"Formulário",status:"ACTIVE"}]}}if(action==="plan")return {draft};if(action==="upload"){if(window.failUpload)throw new TypeError("Failed to fetch");if(!(options.body instanceof FormData))throw Error("Upload must be multipart");const file=options.body.get("file");window.writes.push({action,size:file.size,type:file.type,name:file.name});return {key:"media-key"}}if(action==="create"){if(window.holdCreate)await new Promise(resolve=>window.finishCreate=resolve);const p=JSON.parse(options.body);window.writes.push({action,p});if(window.failCreate)throw Error("Video sendo processado");return {created:{ad:"123"}}}throw Error(action)};window.manager=initializeCampaignManager({request,getAccount:()=>({id:"act_111",name:"Conta teste"}),escapeHtml:v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(String.fromCharCode(34),"&quot;")});manager.panel.hidden=false;manager.open();</script>',contentType:'text/html'})});
  await page.goto('https://campaign.test/');await page.addStyleTag({content:':root{--line:#ddd}'});await page.locator('[data-cm="new"]').click();await page.locator('#cmChooseQuick').click();
  await page.locator('#cmQuickForm textarea').fill('Quero anunciar em Belém, R$ 40 por dia, 25 a 45 anos, formulário de leads no Facebook e Instagram.');
  await page.evaluate(()=>{window.formFlashed=false;window.checkFrames=true;const check=()=>{const f=document.querySelector('#cmForm');if(f&&!f.hidden&&f.getBoundingClientRect().height)window.formFlashed=true;if(window.checkFrames)requestAnimationFrame(check)};check()});
  await page.locator('#cmQuickForm button[type=submit]').click();await page.locator('#cmReview').waitFor({state:'visible'});await page.evaluate(()=>window.checkFrames=false);
  assert.equal(await page.evaluate(()=>window.formFlashed),false);assert.equal(await page.locator('#cmForm').isHidden(),true);
  assert.ok((await page.locator('#cmReviewMedia').boundingBox()).width<=200);
  const portrait=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=108;canvas.height=192;return canvas.toDataURL().split(',')[1]});
  const chooser=page.waitForEvent('filechooser');await page.locator('#cmReviewMedia').click();await(await chooser).setFiles({name:'creative.png',mimeType:'image/png',buffer:Buffer.from(portrait,'base64')});
  await page.waitForFunction(()=>document.querySelector('#cmReviewMedia img')?.naturalWidth>0);
  const card=await page.locator('#cmReviewMedia').boundingBox(),media=await page.locator('#cmReviewMedia img').boundingBox();assert.ok(Math.abs(card.width-media.width-36)<1,JSON.stringify({card,media}));assert.ok(card.width<200);
  assert.equal(await page.locator('#cmForm').isHidden(),true);assert.match(await page.locator('#cmReviewMedia').innerText(),/creative.png/);
  for(const width of [1200,390]){await page.setViewportSize({width,height:850});const before=await page.locator('#cmSend').boundingBox();await page.locator('.cm-review-body').evaluate(el=>el.scrollTop=el.scrollHeight);const after=await page.locator('#cmSend').boundingBox();assert.ok(Math.abs(before.y-after.y)<1);assert.ok(after.y+after.height<=850);assert.equal(await page.locator('.cm-editor-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth),true)}
  await page.evaluate(()=>window.failUpload=true);await page.locator('#cmSend').click();await page.getByText(/conexão com o servidor foi interrompida/).waitFor();assert.equal(await page.evaluate(()=>writes.length),0);
  assert.equal(await page.locator('#cmForm [name=file]').evaluate(el=>el.files[0].name),'creative.png');
  await page.evaluate(()=>{window.failUpload=false;window.failCreate=true;window.holdCreate=true});await page.locator('#cmSend').click();
  await page.locator('.cm-publish-loader').waitFor();
  assert.equal(await page.locator('#cmEditor').evaluate(el=>el.inert),true);
  assert.equal(await page.locator('.cm-publish-card').count(),4);
  assert.match(await page.locator('.cm-publish-loader').innerText(),/Campanhas/i);
  assert.equal(await page.locator('.cm-publish-loader').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
  await page.keyboard.press('Escape');assert.equal(await page.locator('.cm-editor-dialog').evaluate(el=>el.open),true);
  for(const width of [1200,390]){await page.setViewportSize({width,height:850});const box=await page.locator('.cm-publish-loader').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width);assert.ok(box.y>=0&&box.y+box.height<=850)}
  const shot=path.join(__dirname,'../.codex-tmp/campaign-publish-loader.png');await page.locator('.cm-editor-dialog').screenshot({path:shot});
  await page.evaluate(()=>window.finishCreate());await page.getByText('Video sendo processado',{exact:true}).waitFor();
  assert.equal(await page.locator('.cm-publish-loader').count(),0);assert.equal(await page.locator('#cmEditor').evaluate(el=>el.inert),false);
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{window.failCreate=false;window.finishCreate=null});await page.locator('#cmSend').click();await page.locator('.cm-publish-loader').waitFor();assert.equal(await page.locator('.cm-publish-spin').first().evaluate(el=>getComputedStyle(el).animationName),'none');await page.evaluate(()=>window.finishCreate());await page.getByText(/Criação confirmada pela Meta/).waitFor();
  assert.equal(await page.evaluate(()=>writes.filter(x=>x.action==='upload').length),1);assert.equal(await page.evaluate(()=>writes.filter(x=>x.action==='create').every(x=>x.p.media==='media-key'&&x.p.confirm)),true);
  assert.deepEqual(errors,[]);console.log('Campaign review: no form flash, direct file selection, fixed actions, multipart, preserved file and upload reuse passed.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
