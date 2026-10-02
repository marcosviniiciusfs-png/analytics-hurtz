import crypto from 'node:crypto';

const url = process.env.TEST_WEBHOOK_URL || 'http://127.0.0.1:3000/webhook';
const secret = process.env.META_APP_SECRET || 'teste-meta-app-secret';
const payload = JSON.stringify({ object: 'page', entry: [{ changes: [{ field: 'leadgen', value: { leadgen_id: 'lead-teste-001', form_id: 'form_123' } }] }] });
const signature = `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': signature }, body: payload });
const body = await response.text();
console.log(`POST ${url} -> ${response.status} ${body || '(sem corpo)'}`);
if (!response.ok) process.exitCode = 1;
