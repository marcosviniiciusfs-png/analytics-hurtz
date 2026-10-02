import 'dotenv/config';
import crypto from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import express from 'express';

const app = express(), port = Number(process.env.PORT || 3000), flowFile = join(process.cwd(), 'data', 'flow.json');
const processedLeadIds = new Set(), MAX_PROCESSED_LEADS = 5_000, isTestMode = process.env.TEST_MODE === 'true';
app.use('/api', (_req, res, next) => { res.set('Access-Control-Allow-Origin', process.env.DASHBOARD_ORIGIN || '*'); res.set('Access-Control-Allow-Headers', 'Content-Type'); next(); });
app.options('/api/*', (_req, res) => res.sendStatus(204));
app.use('/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

function required(name) { const value = process.env[name]; if (!value) throw new Error(`Variável ${name} não configurada.`); return value; }
function graphToken() { return process.env.META_USER_ACCESS_TOKEN || required('PAGE_ACCESS_TOKEN'); }
function validSignature(body, signature) { const secret = process.env.META_APP_SECRET; if (!secret || !signature?.startsWith('sha256=')) return false; const expected = Buffer.from(`sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`), received = Buffer.from(signature); return expected.length === received.length && crypto.timingSafeEqual(expected, received); }
function remember(id) { processedLeadIds.add(id); if (processedLeadIds.size > MAX_PROCESSED_LEADS) processedLeadIds.delete(processedLeadIds.values().next().value); }
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function loadFlow() { try { return JSON.parse(await readFile(flowFile, 'utf8')); } catch (error) { if (error.code === 'ENOENT') return { enabled: false, facebook: {}, whatsapp: {} }; throw error; } }
async function saveFlow(flow) { await mkdir(dirname(flowFile), { recursive: true }); await writeFile(flowFile, `${JSON.stringify(flow, null, 2)}\n`); return flow; }
function validateFlow(body) {
  const flow = { enabled: Boolean(body.enabled), facebook: { adAccountId: String(body.facebook?.adAccountId || ''), pageId: String(body.facebook?.pageId || ''), formId: String(body.facebook?.formId || '') }, whatsapp: { instance: String(body.whatsapp?.instance || ''), groupJid: String(body.whatsapp?.groupJid || '') } };
  if (flow.enabled && (!flow.facebook.formId || !flow.whatsapp.instance || !flow.whatsapp.groupJid)) throw new Error('Selecione o formulário, a instância e o grupo antes de ativar o fluxo.');
  return flow;
}
async function graph(path, token = graphToken()) { const response = await fetch(`https://graph.facebook.com/v21.0/${path}${path.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}`); if (!response.ok) throw new Error(`Graph API respondeu ${response.status}.`); return response.json(); }
function message(lead) { const fields = (lead.field_data || []).map(({ name, values }) => `*${name || 'campo'}:* ${Array.isArray(values) ? values.join(', ') : String(values || '')}`); const time = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Belem', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(lead.created_time)); return ['🔔 *Novo lead!*', '', ...fields, '', `📅 Recebido em: ${time}`].join('\n'); }
async function fetchLead(id) { if (isTestMode) return { id, created_time: '2026-10-02T14:30:00+00:00', field_data: [{ name: 'nome', values: ['Lead de teste'] }, { name: 'telefone', values: ['5594999999999'] }] }; return graph(encodeURIComponent(id), required('PAGE_ACCESS_TOKEN')); }
async function sendWhatsApp(text, destination) {
  if (isTestMode) return console.log(`[Fluxo] TEST_MODE: mensagem simulada para ${destination.groupJid}.`);
  const url = `${required('EVO_URL').replace(/\/$/, '')}/message/sendText/${encodeURIComponent(destination.instance)}`, body = { number: destination.groupJid, text }; let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) try { const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: required('EVO_APIKEY') }, body: JSON.stringify(body) }); if (!response.ok) throw new Error(`Evolution API respondeu ${response.status}.`); return; } catch (error) { lastError = error; if (attempt < 3) await wait(500 * 2 ** (attempt - 1)); }
  throw lastError;
}
async function processLead(id, event) {
  if (!id || processedLeadIds.has(id)) return;
  try {
    const flow = await loadFlow();
    if (flow.enabled && flow.facebook.formId !== String(event.form_id || '')) return console.log(`[Fluxo] Lead ${id} ignorado: formulário não pertence ao fluxo ativo.`);
    const destination = flow.enabled ? flow.whatsapp : { instance: process.env.EVO_INSTANCE, groupJid: process.env.GROUP_JID };
    if (!destination.instance || !destination.groupJid) return console.error(`[Fluxo] Lead ${id} ignorado: destino WhatsApp não configurado.`);
    remember(id); await sendWhatsApp(message(await fetchLead(id)), destination); console.log(`[Fluxo] Lead ${id} enviado ao grupo com sucesso.`);
  } catch (error) { processedLeadIds.delete(id); console.error(`[Fluxo] Erro ao processar lead ${id}: ${error.message}`); }
}

app.get('/api/flow', async (_req, res, next) => { try { res.json(await loadFlow()); } catch (error) { next(error); } });
app.put('/api/flow', async (req, res, next) => { try { res.json(await saveFlow(validateFlow(req.body))); } catch (error) { res.status(400); next(error); } });
app.get('/api/meta/ad-accounts', async (_req, res, next) => { try { if (isTestMode) return res.json([{ id: 'act_123', name: 'Conta de teste' }]); const data = await graph('me/adaccounts?fields=id,name,account_id&limit=100'); res.json((data.data || []).map(x => ({ id: x.id, name: x.name || x.account_id || x.id }))); } catch (error) { next(error); } });
app.get('/api/meta/pages', async (_req, res, next) => { try { if (isTestMode) return res.json([{ id: 'page_123', name: 'Página de teste' }]); const data = await graph('me/accounts?fields=id,name&limit=100'); res.json((data.data || []).map(x => ({ id: x.id, name: x.name || x.id }))); } catch (error) { next(error); } });
app.get('/api/meta/lead-forms', async (req, res, next) => { try { const pageId = String(req.query.pageId || ''); if (!pageId) return res.status(400).json({ error: 'pageId é obrigatório.' }); if (isTestMode) return res.json([{ id: 'form_123', name: 'Formulário de teste' }]); const data = await graph(`${encodeURIComponent(pageId)}/leadgen_forms?fields=id,name,status&limit=100`); res.json((data.data || []).map(x => ({ id: x.id, name: x.name || x.id, status: x.status }))); } catch (error) { next(error); } });
app.get('/api/evolution/groups', async (_req, res, next) => { try { if (isTestMode) return res.json({ instance: 'teste', groups: [{ id: '120363000000000@g.us', name: 'Grupo de teste' }] }); const instance = required('EVO_INSTANCE'), url = `${required('EVO_URL').replace(/\/$/, '')}/group/fetchAllGroups/${encodeURIComponent(instance)}?getParticipants=false`, response = await fetch(url, { headers: { apikey: required('EVO_APIKEY') } }); if (!response.ok) throw new Error(`Evolution API respondeu ${response.status}.`); const data = await response.json(), groups = Array.isArray(data) ? data : data.groups || []; res.json({ instance, groups: groups.map(x => ({ id: x.id, name: x.subject || x.name || x.id })) }); } catch (error) { next(error); } });
app.get('/webhook', (req, res) => { const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query; return mode === 'subscribe' && token === process.env.VERIFY_TOKEN ? res.status(200).send(challenge) : res.sendStatus(403); });
app.post('/webhook', (req, res) => { if (!validSignature(req.body, req.get('X-Hub-Signature-256'))) return res.sendStatus(403); res.sendStatus(200); let payload; try { payload = JSON.parse(req.body.toString('utf8')); } catch { return console.error('[Fluxo] Payload JSON inválido.'); } for (const entry of payload.entry || []) for (const change of entry.changes || []) if (change.field === 'leadgen' && change.value?.leadgen_id) void processLead(change.value.leadgen_id, change.value); });
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use((error, _req, res, _next) => { console.error(`[Fluxo] Erro: ${error.message}`); res.status(res.statusCode >= 400 ? res.statusCode : 500).json({ error: error.message || 'Erro interno.' }); });
app.listen(port, () => console.log(`[Fluxo] Webhook ouvindo na porta ${port}.`));
