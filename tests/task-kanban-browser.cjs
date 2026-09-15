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
    await page.goto('http://127.0.0.1:8097/?view=tasks');
    await page.locator('[data-task-column]').first().waitFor();

    assert.equal(await page.locator('[data-task-column]').count(), 3);
    await page.locator('.task-add-card').first().click();
    await page.locator('[data-inline-task-form=""] input[name="title"]').fill('Validar nova experiência');
    await page.locator('[data-inline-task-form=""] textarea[name="description"]').fill('Conferir cartões, filtros e visualização responsiva.');
    await page.locator('[data-inline-task-form=""] button[type="submit"]').click();
    await page.getByText('Validar nova experiência', { exact: true }).waitFor();
    assert.equal(await page.locator('.task-card').count(), 1);

    await page.getByText('Validar nova experiência', { exact: true }).click();
    assert.equal(await page.locator('#taskModal').isVisible(), true);
    assert.ok((await page.locator('#taskModal .task-dialog').boundingBox()).width > 0);
    await page.locator('#closeTaskModal').click();

    const taskId = await page.locator('.task-card[data-task-id]').first().getAttribute('data-task-id');
    const taskCard = () => page.locator(`.task-card[data-task-id="${taskId}"]`);
    const columnId = () => taskCard().evaluate(element => element.closest('[data-task-column]').dataset.taskColumn);
    const originalColumn = await columnId();
    const targetColumn = await page.locator('[data-task-column]').nth(1).getAttribute('data-task-column');
    const handle = () => taskCard().locator('.task-kanban-handle');
    assert.equal(await taskCard().locator('.task-kanban-priority').textContent(), 'Normal');
    await handle().focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowRight');
    assert.equal(await columnId(), targetColumn);
    await page.keyboard.press('Escape');
    assert.equal(await columnId(), originalColumn);
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowRight');
    const savedMove = page.waitForResponse(response => response.url().includes('/api/task-order') && response.request().method() === 'PUT');
    await page.keyboard.press('Space');
    assert.equal((await savedMove).ok(), true);
    await page.locator('#taskKanbanAnnouncement').filter({ hasText: 'Tarefa movida' }).waitFor();
    assert.equal(await columnId(), targetColumn);

    await page.route('**/api/task-order*', route => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Falha simulada' }) }));
    await handle().focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Space');
    await page.locator('#taskKanbanAnnouncement').filter({ hasText: 'Falha simulada' }).waitFor();
    assert.equal(await columnId(), targetColumn);
    await page.unroute('**/api/task-order*');

    const grip = await handle().boundingBox();
    const destination = await page.locator('[data-task-column]').first().boundingBox();
    await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
    await page.mouse.down();
    await page.mouse.move(grip.x + grip.width / 2 - 10, grip.y + grip.height / 2, { steps: 3 });
    await page.mouse.move(destination.x + destination.width / 2, destination.y + 85, { steps: 15 });
    await page.locator('[data-task-column]').first().locator('.task-kanban-placeholder').waitFor();
    const pointerSave = page.waitForResponse(response => response.url().includes('/api/task-order') && response.request().method() === 'PUT');
    await page.mouse.up();
    assert.equal((await pointerSave).ok(), true);
    assert.equal(await columnId(), originalColumn);
    assert.equal(await page.locator('.task-kanban-floating').count(), 0);

    await page.locator('[data-task-view="list"]').click();
    assert.equal(await page.locator('#tasksBoard').getAttribute('class'), 'tasks-board task-list-view');
    await page.locator('[data-task-view="board"]').click();
    for (const width of [1920, 1573, 1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      const toolbar = page.locator('.tasks-toolbar');
      for (const expanded of [false, true]) {
        await page.locator('.task-extra-filters').evaluate((element, open) => { element.open = open; }, expanded);
        const violations = await toolbar.evaluate(element => {
          const bounds = element.getBoundingClientRect();
          return [...element.querySelectorAll('input,select,button,summary')].filter(control => control.checkVisibility()).filter(control => {
            const rect = control.getBoundingClientRect();
            return rect.width < 24 || rect.left < bounds.left || rect.right > bounds.right;
          }).map(control => control.id || control.textContent);
        });
        assert.deepEqual(violations, [], `Toolbar overflow at ${width}px, expanded=${expanded}`);
      }
    }
    await page.locator('.task-extra-filters').evaluate(element => { element.open = false; });
    await page.locator('.task-extra-filters summary').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#taskProjectFilter').isVisible(), true);
    await page.keyboard.press('Enter');
    await page.locator('#taskSearch').fill('nenhuma tarefa encontrada');
    assert.equal(await page.locator('.task-card[data-task-id]').count(), 0);
    await page.locator('#taskSearch').fill('');
    assert.equal(await page.locator('.task-card[data-task-id]').count(), 1);
    await page.setViewportSize({ width: 390, height: 844 });
    const section = page.locator('#tasks');
    assert.equal(await section.evaluate(element => element.scrollWidth <= element.clientWidth), true);
    assert.ok((await page.locator('[data-task-column]').first().boundingBox()).width <= 330);

    await page.screenshot({ path: path.join(root, '.codex-tmp/task-workspace-mobile.png'), fullPage: false });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: path.join(root, '.codex-tmp/task-workspace-desktop.png'), fullPage: false });
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, checks: ['board', 'create task', 'task details', 'priority', 'keyboard move', 'Escape cancellation', 'API persistence', 'rollback on failure', 'pointer drag', 'views', 'mobile overflow'], javascriptErrors: 0 }));
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
