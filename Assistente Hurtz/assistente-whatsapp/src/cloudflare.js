import { env } from "./config.js";
import {
  completeSyncItem,
  delaySyncItem,
  dueSyncItems,
  enqueueSync,
} from "./memory.js";

export function cloudflareConfigured() {
  return (
    !env.disableCloudSync &&
    Boolean(env.cloudflareSyncUrl && env.cloudflareSyncToken)
  );
}

async function request(path, options = {}) {
  if (!cloudflareConfigured()) return null;
  const { skipQueue = false, ...fetchOptions } = options;
  try {
    const response = await fetch(`${env.cloudflareSyncUrl}${path}`, {
      ...fetchOptions,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.cloudflareSyncToken}`,
        ...(fetchOptions.headers || {}),
      },
    });
    if (!response.ok)
      throw new Error(
        `Cloudflare ${response.status}: ${await response.text()}`,
      );
    return response.json();
  } catch (error) {
    const method = String(fetchOptions.method || "GET").toUpperCase();
    if (!skipQueue && !["GET", "HEAD"].includes(method))
      enqueueSync(path, method, fetchOptions.body || null, error.message);
    throw error;
  }
}

export async function flushSyncQueue() {
  if (!cloudflareConfigured()) return { processed: 0 };
  let processed = 0;
  for (const item of dueSyncItems(20)) {
    try {
      await request(item.path, {
        method: item.method,
        body: item.body,
        skipQueue: true,
      });
      completeSyncItem(item.id);
      processed += 1;
    } catch (error) {
      delaySyncItem(item.id, item.attempts + 1, error.message);
    }
  }
  return { processed };
}

export async function syncKnowledgeToCloudflare(document, chunks) {
  if (!cloudflareConfigured())
    return { synced: false, reason: "not_configured" };
  return request("/knowledge", {
    method: "POST",
    body: JSON.stringify({
      document,
      chunks: chunks.map((content, position) => ({ position, content })),
    }),
  });
}

export async function searchCloudflare(query, topK = 5) {
  if (!cloudflareConfigured()) return [];
  const result = await request("/search", {
    method: "POST",
    body: JSON.stringify({ query, topK }),
  });
  return result.results || [];
}

export async function searchBrainCloudflare(query, nucleusId, topK = 8) {
  if (!cloudflareConfigured() || !nucleusId) return [];
  const result = await request("/brain/search", {
    method: "POST",
    body: JSON.stringify({ query, nucleusId, topK }),
  });
  return result.results || [];
}

export async function testCloudflare() {
  if (!env.cloudflareSyncUrl) return { configured: false };
  const response = await fetch(`${env.cloudflareSyncUrl}/health`);
  if (!response.ok) throw new Error(`Cloudflare ${response.status}`);
  return { configured: cloudflareConfigured(), ...(await response.json()) };
}

export function syncBrainNucleus(nucleus) {
  if (!cloudflareConfigured()) return null;
  return request("/brain/nuclei", {
    method: "POST",
    body: JSON.stringify(nucleus),
  });
}

export function syncBrainNodes(nodes) {
  if (!cloudflareConfigured()) return null;
  return request("/brain/nodes", {
    method: "POST",
    body: JSON.stringify({ nodes }),
  });
}

export function deleteBrainNucleusFromCloudflare(id) {
  if (!cloudflareConfigured()) return null;
  return request(`/brain/nuclei/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

function splitContact(value) {
  const separator = String(value).indexOf(":");
  return separator > 0
    ? {
        instanceName: value.slice(0, separator),
        whatsappId: value.slice(separator + 1),
      }
    : { instanceName: "local", whatsappId: String(value) };
}

export function syncInstance(item) {
  return request("/instances", { method: "POST", body: JSON.stringify(item) });
}

export function syncContact(contact, item = {}) {
  return request("/contacts", {
    method: "POST",
    body: JSON.stringify({ ...splitContact(contact), ...item }),
  });
}

export function syncMessage(contact, item) {
  return request("/messages", {
    method: "POST",
    body: JSON.stringify({ ...splitContact(contact), ...item }),
  });
}

export function syncMemory(key, value, expiresAt = null) {
  return request("/memory", {
    method: "POST",
    body: JSON.stringify({ key, value, expiresAt }),
  });
}

export function syncFeedback(item) {
  return request("/feedback", {
    method: "POST",
    body: JSON.stringify(item),
  });
}

export function cloudDashboard() {
  return request("/dashboard");
}
