const assert = require('node:assert/strict');
const {createTaskCollaboration} = require('../Dashboard Meta Ads/task-collaboration');

const workspace = '11111111-1111-4111-8111-111111111111';
const users = {
  owner: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  admin: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  member: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  viewer: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  outsider: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
};

const request = async resource => {
  if (!resource.startsWith('task_workspace_members?')) return [];
  const workspaceId = resource.match(/workspace_id=eq\.([^&]+)/)?.[1];
  const userId = resource.match(/user_id=eq\.([^&]+)/)?.[1];
  const role = Object.entries(users).find(([, id]) => id === userId)?.[0];
  return workspaceId === workspace && role && role !== 'outsider' ? [{workspace_id: workspace, user_id: userId, role}] : [];
};

(async () => {
  const collaboration = createTaskCollaboration({request, readBody() {}});
  for (const role of ['owner', 'admin', 'member', 'viewer']) {
    const result = await collaboration.authorize({id: users[role]}, workspace, 'viewer');
    assert.equal(result.role, role);
  }
  await collaboration.authorize({id: users.owner}, workspace, 'owner');
  await collaboration.authorize({id: users.admin}, workspace, 'admin');
  await collaboration.authorize({id: users.member}, workspace, 'member');
  await assert.rejects(collaboration.authorize({id: users.viewer}, workspace, 'member'), error => error.status === 403);
  await assert.rejects(collaboration.authorize({id: users.member}, workspace, 'admin'), error => error.status === 403);
  await assert.rejects(collaboration.authorize({id: users.outsider}, workspace, 'viewer'), error => error.status === 404);
  await assert.rejects(collaboration.authorize({id: users.owner}, '22222222-2222-4222-8222-222222222222', 'viewer'), error => error.status === 404);
  console.log(JSON.stringify({passed:true, checks:['role matrix','outsider isolation','private workspace response']}));
})().catch(error => { console.error(error); process.exitCode = 1; });
