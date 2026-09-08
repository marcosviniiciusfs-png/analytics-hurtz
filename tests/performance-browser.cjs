const {chromium}=require('../dev/node_modules/playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn,execFileSync}=require('node:child_process');
(async()=>{
 const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'hurtz-perf-'));
 const child=spawn(process.execPath,[path.join(root,'dev/local-server.cjs')],{env:{...process.env,PORT:'8097',LOCAL_DATA_DIR:dir},stdio:['ignore','pipe','pipe']});let browser;
 try{
 await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject)});
 const base='http://localhost:8097',token=(await (await fetch(base+'/api/local/session',{method:'POST',headers:{'X-Local-Client':'1'}})).json()).token;
 const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
 let data=await (await fetch(base+'/api/tasks',{headers})).json();
 await fetch(base+'/api/tasks',{method:'POST',headers,body:JSON.stringify({title:'Quadro persistente',column_id:data.columns[0].id})});
 data=await (await fetch(base+'/api/tasks',{headers})).json();
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const results=[];
 for(const variant of (process.argv.includes('--compare')?['baseline','optimized']:['optimized'])){
  const page=await browser.newPage(),cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});let taskRequests=0,optionalScripts=0,offline=false;const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({token,data})=>{localStorage.setItem('hurtz-monitor-session-v2',token);localStorage.setItem('hurtz-user:local-owner:hurtz-native-tasks-cache-v1',JSON.stringify({data,savedAt:Date.now()-86400000}))},{token,data});
  await page.route('**/api/tasks',async route=>{if(route.request().method()==='GET'){taskRequests++;await new Promise(r=>setTimeout(r,1500));if(offline)return route.abort()}return route.continue()});
  await page.route('https://connect.facebook.net/**',async route=>{await new Promise(r=>setTimeout(r,2500));await route.fulfill({contentType:'text/javascript',body:'window.FB={init(){},login(){}};window.fbAsyncInit?.();'})});
  await page.route(/https:\/\/(cdnjs.cloudflare.com|cdn.jsdelivr.net|fonts.googleapis.com|fonts.gstatic.com)\//,route=>{if(route.request().resourceType()==='script')optionalScripts++;return route.fulfill({body:'',contentType:route.request().resourceType()==='script'?'text/javascript':'text/css'})});
  if(variant==='baseline')for(const file of ['app.js','index.html']){
    const body=execFileSync('git',['show','9388944:Dashboard Meta Ads/'+file],{cwd:path.join(root,'.codex-tmp/personal-meta/publish'),maxBuffer:2*1024*1024}).toString();
    await page.route(file==='app.js'?'**/app.js*':base+'/',route=>route.fulfill({body: file==='index.html'?body.replace('<head>','<head><script>window.HURTZ_LOCAL=true;</script>'):body,contentType:file==='app.js'?'text/javascript':'text/html'}));
  }
  const start=Date.now();await page.goto(base,{waitUntil:'domcontentloaded'});await page.locator('#settingsNav').waitFor();const shellMs=Date.now()-start;
  const nav=Date.now();await page.locator('#tasksNav').click();await page.getByText('Quadro persistente',{exact:true}).waitFor();const taskVisibleMs=Date.now()-nav;
  await page.waitForTimeout(1800);const before=taskRequests;await page.locator('#creativeSearchNav').click();await page.locator('#tasksNav').click();await page.waitForTimeout(200);assert.equal(taskRequests,before);
  if(variant==='optimized'){assert.ok(taskVisibleMs<1200,'Cached task board must render before the 1500ms response');assert.equal(optionalScripts,0);offline=true;await page.locator('#refreshTasks').click();await page.waitForTimeout(1800);assert.equal(await page.getByText('Quadro persistente',{exact:true}).isVisible(),true)}
  assert.deepEqual(errors,[]);results.push({variant,shellMs,taskVisibleMs,optionalScripts,duplicateRequestsOnReturn:taskRequests-before-(offline?1:0)});await page.close();
 }
 console.log(JSON.stringify({cpuThrottle:4,taskResponseDelayMs:1500,facebookDelayMs:2500,results}));
 }finally{await browser?.close();child.kill();await new Promise(r=>child.once('close',r));fs.rmSync(dir,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
