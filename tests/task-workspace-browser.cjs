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
    env: { ...process.env, PORT: '8095', LOCAL_DATA_DIR: dataDir },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let browser;
  try {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      try { if ((await fetch('http://127.0.0.1:8095')).ok) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.stack || error.message));
    const workspaceId = '11111111-1111-4111-8111-111111111111';
    await page.route('**/api/task-context', route => route.fulfill({contentType:'application/json', body:JSON.stringify({profile:{user_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',public_id:'HZ-TEST-USER',display_name:'Mateus'},workspaces:[{id:workspaceId,name:'Operação Hurtz',description:'Quadro colaborativo',role:'owner'}],invites:[]})}));
    await page.route('**/api/task-members?workspace=*', route => route.fulfill({contentType:'application/json', body:JSON.stringify({members:[{user_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',public_id:'HZ-TEST-USER',display_name:'Mateus',role:'owner'}]})}));
    await page.goto('http://127.0.0.1:8095/?view=tasks');
    await page.locator('[data-task-column]').first().waitFor();

    assert.equal(await page.locator('[data-task-column]').count(), 3);
    assert.equal(await page.locator('#taskFilterPanel').isHidden(), true);
    await page.locator('#taskFilterToggle').click();
    assert.equal(await page.locator('#taskFilterPanel').isVisible(), true);

    assert.equal(await page.locator('#newTaskButton').count(), 0);
    assert.equal(await page.locator('#taskNotificationsButton i').count(), 1);
    assert.equal(await page.locator('#taskNotificationsButton span').count(), 0);
    assert.equal(await page.locator('#taskWorkspaceTitle').textContent(), 'Operação Hurtz');
    assert.equal(await page.locator('#taskPublicId').textContent(), 'HZ-TEST-USER');
    await page.locator('#taskProjectsButton').click();
    assert.equal(await page.locator('#taskProjectsModal').isVisible(), true);
    assert.equal(await page.locator('#taskProjectCurrentName').textContent(), 'Operação Hurtz');
    await page.locator('#closeTaskProjects').click();
    await page.locator('.task-add-card').first().click();
    await page.locator('[data-inline-task-form=""] input[name="title"]').fill('Validar nova experiência');
    await page.locator('[data-inline-task-form=""] textarea[name="description"]').fill('Conferir cartões, filtros e visualização responsiva.');
    await page.locator('[data-inline-task-form=""] button[type="submit"]').click();
    await page.getByText('Validar nova experiência', { exact: true }).waitFor();
    assert.equal(await page.locator('.task-card').count(), 1);

    await page.getByText('Validar nova experiência', { exact: true }).click();
    assert.equal(await page.locator('#taskModal').isVisible(), true);
    assert.ok((await page.locator('#taskModal .task-dialog').boundingBox()).width <= 850);
    await page.locator('#closeTaskModal').click();

    assert.equal(await page.locator('#taskStructureButton').count(), 0);
    assert.equal(await page.locator('#taskProjectFilter,#taskModuleFilter,#taskCycleFilter,#taskProject,#taskModule,#taskCycle').count(), 0);
    await page.locator('#taskAddColumn').click();
    await page.locator('#taskStageInlineForm input[name="title"]').fill('Em revisão');
    await page.locator('#taskStageInlineForm select[name="role"]').selectOption('review');
    await page.locator('#taskStageInlineForm button[type="submit"]').click();
    await page.locator('.task-column-name').filter({ hasText: 'Em revisão' }).waitFor();
    assert.equal(await page.locator('[data-task-column]').count(), 4);
    await page.locator('[data-configure-column]').first().click();
    assert.equal(await page.locator('#taskColumnSettingsModal').isVisible(), true);
    await page.locator('#closeTaskColumnSettings').click();

    await page.locator('[data-task-view="list"]').click();
    assert.equal(await page.locator('#tasksBoard').getAttribute('class'), 'tasks-board task-list-view');
    await page.locator('[data-task-view="board"]').click();
    await page.setViewportSize({ width: 390, height: 844 });
    const section = page.locator('#tasks');
    assert.equal(await section.evaluate(element => element.scrollWidth <= element.clientWidth), true);
    assert.ok((await page.locator('[data-task-column]').first().boundingBox()).width <= 330);

    await page.screenshot({ path: path.join(root, '.codex-tmp/task-workspace-mobile.png'), fullPage: false });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: path.join(root, '.codex-tmp/task-workspace-desktop.png'), fullPage: false });
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, checks: ['board', 'workspace identity', 'projects dialog', 'filters', 'contextual task creation', 'single mention count', 'inline stage creation', 'column settings', 'removed unused hierarchy', 'task dialog', 'views', 'mobile overflow'], javascriptErrors: 0 }));
  } finally {
    if (browser) await browser.close();
    child.kill();
    await new Promise(resolve => child.once('close', resolve));
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
})().catch(error => {
  console.error(error.stack);
  process.exitCode = 1;
});
