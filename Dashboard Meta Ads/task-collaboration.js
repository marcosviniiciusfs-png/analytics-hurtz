'use strict';

const crypto = require('node:crypto');

const fail = (status, message) => Object.assign(new Error(message), { status });
const uuid = value => /^[0-9a-f-]{36}$/i.test(String(value || '')) ? String(value) : '';
const roles = ['owner', 'admin', 'member', 'viewer'];
const roleRank = { viewer: 0, member: 1, admin: 2, owner: 3 };

function createTaskCollaboration({ request, readBody }) {
  const publicId = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const part = () => Array.from(crypto.randomBytes(4), byte => alphabet[byte % alphabet.length]).join('');
    return `HZ-${part()}-${part()}`;
  };

  async function profile(user) {
    let rows = await request(`task_user_profiles?user_id=eq.${user.id}&select=user_id,public_id,display_name`);
    if (rows?.[0]) return rows[0];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        rows = await request('task_user_profiles', { method: 'POST', body: JSON.stringify({ user_id: user.id, public_id: publicId(), display_name: String(user.email || '').split('@')[0].slice(0, 80) }) });
        if (rows?.[0]) return rows[0];
      } catch (error) {
        if (!/duplicate|unique/i.test(error.message) || attempt === 5) throw error;
        const existing = await request(`task_user_profiles?user_id=eq.${user.id}&select=user_id,public_id,display_name`);
        if (existing?.[0]) return existing[0];
      }
    }
    throw fail(500, 'Não foi possível criar sua identidade de colaboração.');
  }

  async function memberships(userId) {
    const links = await request(`task_workspace_members?user_id=eq.${userId}&select=workspace_id,role,joined_at&order=joined_at.asc`);
    if (!links?.length) return [];
    const ids = links.map(item => item.workspace_id);
    const spaces = await request(`task_workspaces?id=in.(${ids.join(',')})&select=id,name,description,owner_id,created_at`);
    return links.map(link => ({ ...spaces.find(space => space.id === link.workspace_id), role: link.role })).filter(item => item.id);
  }

  async function createWorkspace(user, name = 'Meu projeto', description = '') {
    const created = await request('task_workspaces', { method: 'POST', body: JSON.stringify({ name: String(name).trim().slice(0, 80), description: String(description).trim().slice(0, 300), owner_id: user.id }) });
    const workspace = created?.[0];
    if (!workspace) throw fail(502, 'Não foi possível criar o projeto.');
    await request('task_workspace_members', { method: 'POST', body: JSON.stringify({ workspace_id: workspace.id, user_id: user.id, role: 'owner' }) });
    await request('task_columns', { method: 'POST', body: JSON.stringify(['A fazer', 'Em andamento', 'Concluído'].map((title, position) => ({ workspace_id: workspace.id, title, position, role: ['standard', 'in_progress', 'completed'][position] }))) });
    return { ...workspace, role: 'owner' };
  }

  async function ensureWorkspace(user) {
    let items = await memberships(user.id);
    if (items.length) return items;
    const legacy = await request('task_workspaces?is_legacy=eq.true&owner_id=is.null&select=id,name,description,owner_id&limit=1');
    if (legacy?.[0]) {
      const claimed = await request(`task_workspaces?id=eq.${legacy[0].id}&owner_id=is.null`, { method: 'PATCH', body: JSON.stringify({ owner_id: user.id, is_legacy: false }) });
      if (claimed?.[0]) {
        await request('task_workspace_members', { method: 'POST', body: JSON.stringify({ workspace_id: claimed[0].id, user_id: user.id, role: 'owner' }) });
        return [{ ...claimed[0], role: 'owner' }];
      }
    }
    return [await createWorkspace(user)];
  }

  async function authorize(user, workspaceId, minimum = 'viewer') {
    const id = uuid(workspaceId);
    if (!user?.id || !id) throw fail(404, 'Projeto não encontrado.');
    const membership = await request(`task_workspace_members?workspace_id=eq.${id}&user_id=eq.${user.id}&select=workspace_id,user_id,role&limit=1`);
    const member = membership?.[0];
    if (!member || roleRank[member.role] < roleRank[minimum]) throw fail(minimum === 'viewer' ? 404 : 403, minimum === 'viewer' ? 'Projeto não encontrado.' : 'Você não tem permissão para esta ação.');
    return member;
  }

  async function context(user) {
    const identity = await profile(user);
    const workspaces = await ensureWorkspace(user);
    const invites = await request(`task_workspace_invites?invited_user_id=eq.${user.id}&status=eq.pending&select=id,workspace_id,role,created_at&order=created_at.desc`);
    const inviteIds = [...new Set((invites || []).map(item => item.workspace_id))];
    const inviteSpaces = inviteIds.length ? await request(`task_workspaces?id=in.(${inviteIds.join(',')})&select=id,name`) : [];
    return { profile: identity, workspaces, invites: (invites || []).map(invite => ({ ...invite, workspace_name: inviteSpaces.find(space => space.id === invite.workspace_id)?.name || 'Projeto' })) };
  }

  async function body(req) {
    return new Promise((resolve, reject) => readBody(req, (error, payload) => error ? reject(fail(400, 'Dados inválidos.')) : resolve(payload || {})));
  }

  async function handle(req, res, user, url, send) {
    const route = url.pathname;
    if (route === '/api/task-context' && req.method === 'GET') return send(res, 200, await context(user));
    if (route === '/api/task-workspaces' && req.method === 'POST') {
      const payload = await body(req), name = String(payload.name || '').trim();
      if (!name) throw fail(400, 'Informe o nome do projeto.');
      return send(res, 201, await createWorkspace(user, name, payload.description));
    }
    if (route === '/api/task-workspaces' && req.method === 'PUT') {
      const payload = await body(req), id = uuid(payload.id), name = String(payload.name || '').trim();
      await authorize(user, id, 'admin');
      if (!name) throw fail(400, 'Informe o nome do projeto.');
      const updated = await request(`task_workspaces?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ name: name.slice(0, 80), description: String(payload.description || '').trim().slice(0, 300) }) });
      return send(res, 200, updated?.[0]);
    }
    if (route === '/api/task-members' && req.method === 'GET') {
      const workspaceId = url.searchParams.get('workspace');
      await authorize(user, workspaceId);
      const links = await request(`task_workspace_members?workspace_id=eq.${workspaceId}&select=user_id,role,joined_at&order=joined_at.asc`), ids = links.map(item => item.user_id);
      const profiles = ids.length ? await request(`task_user_profiles?user_id=in.(${ids.join(',')})&select=user_id,public_id,display_name`) : [];
      return send(res, 200, { members: links.map(link => ({ ...link, ...profiles.find(item => item.user_id === link.user_id) })) });
    }
    if (route === '/api/task-members' && req.method === 'PUT') {
      const payload = await body(req), workspaceId = uuid(payload.workspace_id), target = uuid(payload.user_id), role = String(payload.role || '');
      const actor = await authorize(user, workspaceId, 'admin');
      if (!target || !['admin', 'member', 'viewer'].includes(role)) throw fail(400, 'Membro ou papel inválido.');
      const current = await request(`task_workspace_members?workspace_id=eq.${workspaceId}&user_id=eq.${target}&select=role&limit=1`);
      if (!current?.[0] || current[0].role === 'owner') throw fail(409, 'O proprietário não pode ser alterado.');
      if (actor.role === 'admin' && current[0].role === 'admin') throw fail(403, 'Somente o proprietário pode alterar outro administrador.');
      await request(`task_workspace_members?workspace_id=eq.${workspaceId}&user_id=eq.${target}`, { method: 'PATCH', body: JSON.stringify({ role }) });
      return send(res, 200, { ok: true });
    }
    if (route === '/api/task-members' && req.method === 'DELETE') {
      const workspaceId = uuid(url.searchParams.get('workspace')), target = uuid(url.searchParams.get('user'));
      const actor = await authorize(user, workspaceId, 'admin');
      const current = await request(`task_workspace_members?workspace_id=eq.${workspaceId}&user_id=eq.${target}&select=role&limit=1`);
      if (!current?.[0] || current[0].role === 'owner') throw fail(409, 'O proprietário não pode ser removido.');
      if (actor.role === 'admin' && current[0].role === 'admin') throw fail(403, 'Somente o proprietário pode remover outro administrador.');
      await request(`task_workspace_members?workspace_id=eq.${workspaceId}&user_id=eq.${target}`, { method: 'DELETE' });
      return send(res, 200, { ok: true });
    }
    if (route === '/api/task-invites' && req.method === 'POST') {
      const payload = await body(req), workspaceId = uuid(payload.workspace_id), requestedRole = ['admin', 'member', 'viewer'].includes(payload.role) ? payload.role : 'member';
      await authorize(user, workspaceId, 'admin');
      const code = String(payload.public_id || '').trim().toUpperCase(), targetProfile = await request(`task_user_profiles?public_id=eq.${encodeURIComponent(code)}&select=user_id,public_id,display_name&limit=1`), target = targetProfile?.[0];
      if (!target) throw fail(404, 'Nenhum usuário foi encontrado com esse ID.');
      if (target.user_id === user.id) throw fail(409, 'Você já participa deste projeto.');
      const existing = await request(`task_workspace_members?workspace_id=eq.${workspaceId}&user_id=eq.${target.user_id}&select=user_id&limit=1`);
      if (existing?.length) throw fail(409, 'Esse usuário já participa do projeto.');
      const pending = await request(`task_workspace_invites?workspace_id=eq.${workspaceId}&invited_user_id=eq.${target.user_id}&status=eq.pending&select=id&limit=1`);
      if (pending?.length) throw fail(409, 'Já existe um convite pendente para esse usuário.');
      const created = await request('task_workspace_invites', { method: 'POST', body: JSON.stringify({ workspace_id: workspaceId, invited_user_id: target.user_id, invited_by: user.id, role: requestedRole }) });
      return send(res, 201, { invite: created?.[0], member: target });
    }
    if (route === '/api/task-invites' && req.method === 'PUT') {
      const payload = await body(req), id = uuid(payload.id), action = payload.action;
      const rows = await request(`task_workspace_invites?id=eq.${id}&invited_user_id=eq.${user.id}&status=eq.pending&select=id,workspace_id,role&limit=1`), invite = rows?.[0];
      if (!invite) throw fail(404, 'Convite não encontrado.');
      if (!['accept', 'decline'].includes(action)) throw fail(400, 'Resposta inválida.');
      if (action === 'accept') await request('task_workspace_members', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify({ workspace_id: invite.workspace_id, user_id: user.id, role: invite.role }) });
      await request(`task_workspace_invites?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ status: action === 'accept' ? 'accepted' : 'declined', responded_at: new Date().toISOString() }) });
      return send(res, 200, { ok: true, workspace_id: invite.workspace_id });
    }
    throw fail(404, 'Recurso colaborativo não encontrado.');
  }

  return { handle, authorize, context, roleRank };
}

module.exports = { createTaskCollaboration };
