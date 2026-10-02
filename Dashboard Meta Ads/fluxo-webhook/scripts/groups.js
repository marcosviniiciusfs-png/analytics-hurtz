import 'dotenv/config';

const baseUrl = process.env.EVO_URL?.replace(/\/$/, '');
if (!baseUrl || !process.env.EVO_INSTANCE || !process.env.EVO_APIKEY) {
  console.error('Configure EVO_URL, EVO_INSTANCE e EVO_APIKEY no .env.');
  process.exit(1);
}
const response = await fetch(`${baseUrl}/group/fetchAllGroups/${encodeURIComponent(process.env.EVO_INSTANCE)}?getParticipants=false`, { headers: { apikey: process.env.EVO_APIKEY } });
if (!response.ok) throw new Error(`Evolution API respondeu ${response.status}.`);
const groups = await response.json();
for (const group of Array.isArray(groups) ? groups : groups.groups || []) console.log(`${group.subject || group.name || 'Sem nome'}: ${group.id}`);
