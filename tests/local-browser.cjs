const {chromium}=require('../dev/node_modules/playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process');
(async()=>{const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'hurtz-ui-test-'));
const child=spawn(process.execPath,['--require',path.join(__dirname,'local-providers.cjs'),path.join(root,'dev/local-server.cjs')],{env:{...process.env,PORT:'8094',LOCAL_DATA_DIR:dir},stdio:['ignore','ignore','pipe']});let serverErrors='';child.stderr.on('data',c=>serverErrors+=c);let browser;
try{
 for(let i=0;i<50;i++){try{if((await fetch('http://localhost:8094')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://connect.facebook.net/**',r=>r.fulfill({contentType:'text/javascript',body:'window.FB={init(){},login(){}};window.fbAsyncInit();'}));
 await page.goto('http://localhost:8094');await page.locator('#settingsNav').waitFor();
 for(const id of ['tasksNav','creativeSearchNav','commentsNav','alertsNav','creativeLibraryNav'])assert.equal(await page.locator('#'+id).isVisible(),true,id);
 await page.locator('#settingsNav').click();await page.locator('#localSettings').waitFor({state:'visible'});
 await page.locator('#localApifyToken').fill('fake-test-apify');await page.locator('#localApifyForm button').click();await page.waitForFunction(()=>document.querySelector('#localApifyStatus').textContent.includes('salva'));
 assert.equal(await page.locator('#localApifyToken').inputValue(),'');
 await page.locator('#creativeSearchNav').click();await page.locator('#creativeSearchTerms').fill('HB20 seminovo');await page.locator('#creativeSearchPlatform').selectOption('tiktok');await page.locator('#creativeSearchForm button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#creativeLibraryStatus').textContent.includes('encontrados'),{},{timeout:15000});
 await page.locator('#tasksNav').click();await page.locator('[data-task-column]').first().waitFor();await page.locator('#newTaskButton').click();await page.locator('[data-inline-task-form=""] input[name="title"]').fill('Tarefa local automatizada');await page.locator('[data-inline-task-form=""] button[type=submit]').click();await page.getByText('Tarefa local automatizada',{exact:true}).waitFor({state:'visible'});
 await page.reload();await page.locator('#settingsNav').waitFor();await page.locator('#tasksNav').click();await page.getByText('Tarefa local automatizada',{exact:true}).waitFor({state:'visible'});
 await page.locator('#creativeLibraryNav').click();await page.locator('#localVideoUrl').fill('https://www.instagram.com/reel/ABCtest/');await page.locator('#localVideoTitle').fill('Referência local');await page.locator('#localLibraryForm button[type=submit], #localLibraryForm button:not([type])').first().click();await page.locator('#localLibraryItems h3').filter({hasText:'Referência local'}).waitFor();
 await page.locator('#settingsNav').click();await page.locator('#localExtensionConnection').click();await page.waitForFunction(()=>document.querySelector('#localAccessOutput').value.includes('la_'));assert.match(await page.locator('#localAccessOutput').inputValue(),/localhost:8094/);
 assert.equal(await page.locator('#localAgentConnection').isHidden(),true);
 await page.locator('#localDiagnostics').click();await page.waitForFunction(()=>document.querySelector('#localDiagnosticsStatus').textContent.includes('Armazenamento'));
 await page.locator('#alertsNav').click();await page.locator('#sendAlertTest').click();assert.match(await page.locator('#alertFormStatus').innerText(),/Verifique o WhatsApp/);
 await page.evaluate(async()=>{const headers={Authorization:'Bearer '+localStorage.getItem('hurtz-monitor-session-v2'),'Content-Type':'application/json'};const {nonce}=await(await fetch('/api/meta/challenge',{method:'POST',headers,body:'{}'})).json();await fetch('/api/meta/connection',{method:'POST',headers,body:JSON.stringify({nonce,accessToken:'facebook-a-token-0000000000'})})});
 await page.locator('#commentsNav').click();await page.locator('#commentsPageSelect option[value="100"]').waitFor({state:'attached'});await page.locator('#commentsPageSelect').selectOption('100');
 await page.waitForFunction(()=>document.querySelector('#commentsRequestStatus').textContent.includes('Consulta concluída'));
 assert.equal(await page.locator('#commentsPageSelect').inputValue(),'100');assert.equal(await page.locator('[data-comment-row]').count(),1);assert.equal(await page.locator('#commentsPageModal').count(),0);
 await page.reload();await page.waitForFunction(()=>document.querySelector('#commentsPageSelect')?.value==='100');await page.waitForFunction(()=>document.querySelector('#commentsRequestStatus').textContent.includes('Consulta concluída'));assert.equal(await page.locator('[data-comment-row]').count(),1);
 const signup=await page.request.post('http://localhost:8094/api/auth/signup',{data:{email:'second@example.test',password:'browser-test-password'}});const user=await signup.json();assert.ok(user.token);
 await page.evaluate(token=>localStorage.setItem('hurtz-monitor-session-v2',token),user.token);await page.reload();await page.locator('#settingsNav').waitFor();
 await page.locator('#creativeLibraryNav').click();await page.waitForFunction(()=>document.querySelector('#localLibraryStatus').textContent.includes('0 referência'));
 await page.locator('#tasksNav').click();assert.equal(await page.getByText('Tarefa local automatizada',{exact:true}).count(),0);
 await page.locator('#settingsNav').click();await page.waitForFunction(()=>document.querySelector('#localApifyStatus').textContent.includes('ainda não'));
 await page.screenshot({path:path.join(root,'.codex-tmp/local-implementation.png'),fullPage:false});
 assert.deepEqual(errors,[]);assert.equal(serverErrors.includes('TypeError'),false,serverErrors);
 console.log(JSON.stringify({passed:true,checks:['menus restored','settings save','creative search','task create and persistence','Instagram library','extension credential','no local analyzer dependency','diagnostics','WhatsApp guard','page selector and filtered comments','two users in browser'],javascriptErrors:0}));
}finally{if(browser)await browser.close();child.kill();await new Promise(r=>child.once('close',r));fs.rmSync(dir,{recursive:true,force:true})}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
