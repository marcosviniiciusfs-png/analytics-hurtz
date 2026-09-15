const { chromium } = require('../dev/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

(async () => {
  const root = path.resolve(__dirname, '..');
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hurtz-task-ui-'));
  const child = spawn(process.execPath, [path.join(root, 'dev/local-server.cjs')], {
    env: { ...process.env, PORT: '8097', LOCAL_DATA_DIR: dataDir },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let browser;
  try {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      try { if ((await fetch('http://127.0.0.1:8097')).ok) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.stack || error.message));
    const workspaceId = '11111111-1111-4111-8111-111111111111';
    await page.route('**/api/task-context', route => route.fulfill({contentType:'application/json', body:JSON.stringify({profile:{user_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',public_id:'HZ-TEST-USER',display_name:'Mateus'},workspaces:[{id:workspaceId,name:'Operação Hurtz',description:'Quadro colaborativo',role:'owner'}],invites:[]})}));
    await page.route('**/api/task-members?workspace=*', route => route.fulfill({contentType:'application/json', body:JSON.stringify({members:[{user_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',public_id:'HZ-TEST-USER',display_name:'Mateus',role:'owner'}]})}));
    // Production already returns these collections. The local legacy endpoint
    // omits them, so isolate the organization UI with an explicit API fixture.
    const structures={projects:[],modules:[],cycles:[]};
    await page.route('**/api/task-projects',route=>{const data=route.request().postDataJSON(),item={id:'11111111-1111-4111-8111-111111111112',...data};structures.projects.push(item);return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify(item)})});
    for(const type of ['modules','cycles'])await page.route('**/api/task-'+type,route=>{const item={id:type==='modules'?'11111111-1111-4111-8111-111111111113':'11111111-1111-4111-8111-111111111114',...route.request().postDataJSON()};structures[type].push(item);return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify(item)})});
    await page.route('**/api/tasks',async route=>{if(route.request().method()!=='GET')return route.continue();const response=await route.fetch(),data=await response.json();return route.fulfill({response,json:{...data,...structures}})});
    await page.goto('http://127.0.0.1:8097/?view=tasks');
    await page.locator('[data-task-column]').first().waitFor();

    await page.locator('#taskStructureButton').click();
    const modal=page.locator('#taskStructureModal');
    assert.equal(await modal.locator('[data-create-structure="column"],.task-structure-columns').count(),0);
    assert.equal(await modal.locator('[data-create-structure="module"]').isDisabled(),true);
    await page.locator('#newTaskProjectTitle').fill('Cliente de teste');
    await modal.locator('[data-create-structure="project"]').click();
    await page.locator('#taskStructureStatus').filter({hasText:'Projeto criado.'}).waitFor();
    assert.equal(await modal.locator('.task-structure-projects>div').count(),1);
    assert.equal(await modal.locator('[data-create-structure="module"]').isEnabled(),true);
    await page.locator('#newTaskModuleProject').selectOption({label:'Cliente de teste'});
    await page.locator('#newTaskModuleTitle').fill('Criativos');
    await modal.locator('[data-create-structure="module"]').click();
    await page.locator('#taskStructureStatus').filter({hasText:'Módulo criado.'}).waitFor();
    await page.locator('#newTaskCycleProject').selectOption({label:'Cliente de teste'});
    await page.locator('#newTaskCycleTitle').fill('Sprint de setembro');
    await page.locator('#newTaskCycleStart').fill('2026-09-20');
    await page.locator('#newTaskCycleEnd').fill('2026-09-10');
    await modal.locator('[data-create-structure="cycle"]').click();
    await page.locator('#taskStructureStatus').filter({hasText:'O fim do ciclo'}).waitFor();
    assert.equal(await modal.locator('.task-structure-cycles>div').count(),0);
    await page.locator('#newTaskCycleEnd').fill('2026-09-25');
    await modal.locator('[data-create-structure="cycle"]').click();
    await page.locator('#taskStructureStatus').filter({hasText:'Ciclo criado.'}).waitFor();
    assert.equal(await modal.locator('.task-structure-cycles>div').count(),1);
    for(const width of [1440,768,390,320]){
      await page.setViewportSize({width,height:1000});
      assert.equal(await modal.locator('.task-structure-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
      assert.equal(await modal.locator('input,select').evaluateAll(els=>els.every(el=>{const r=el.getBoundingClientRect(),p=el.closest('form').getBoundingClientRect();return r.width>50&&r.right<=p.right&&r.left>=p.left})),true);
      if(width===1440||width===390)await page.screenshot({path:path.join(root,'.codex-tmp/task-organization-'+width+'.png')});
    }
    await page.keyboard.press('Escape');
    assert.equal(await modal.isHidden(),true);
    await page.setViewportSize({width:1440,height:1000});
    await page.locator('#taskAddColumn').click();
    assert.equal(await modal.isHidden(),true);
    await page.locator('#taskStageInlineForm input[name="title"]').fill('Em revisão');
    await page.locator('#taskStageInlineForm select[name="role"]').selectOption('review');
    await page.locator('#taskStageInlineForm [type="submit"]').click();
    await page.locator('.task-column-name').filter({hasText:'Em revisão'}).waitFor();
    assert.equal(await page.locator('[data-task-column]').count(),4);
    await page.locator('[data-configure-column]').last().click();
    await page.locator('[data-stage-direction="-1"]').click();
    await page.waitForFunction(()=>document.querySelectorAll('[data-task-column]')[2]?.querySelector('.task-column-name').textContent==='Em revisão');
    await page.locator('#closeTaskColumnSettings').click();
    await page.locator('#taskStructureButton').click();
    assert.equal(await modal.locator('.task-structure-projects>div').count(),1);
    assert.equal(await modal.locator('.task-structure-modules>div').count(),1);
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({passed:true,checks:['no stage management in organization','project creation','module dependencies','cycle dates','stage creation on board','stage ordering in settings','responsive dialog','Escape','no JavaScript errors']}));
  } finally {
    if (browser) await browser.close();
    child.kill();
    if (child.exitCode === null && child.signalCode === null) await new Promise(resolve => child.once('close', resolve));
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
})().catch(error => {
  console.error(error.stack);
  process.exitCode = 1;
});
