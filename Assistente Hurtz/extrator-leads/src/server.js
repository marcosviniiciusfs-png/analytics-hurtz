import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Store } from "./store.js";
import { classifyIntent, normalizeApifyItem } from "./classifier.js";
import { runActor } from "./apify.js";
import { lexicalValidation, validateWithOllama, validatePostsWithOllama } from "./validator.js";

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, "..");
const publicDir = path.join(root, "public");
const dataDir = path.join(root, "data");
const store = new Store(path.join(dataDir, "leads.json"));
const envFile = path.join(root, ".env");

function envValues() {
  const values = {};
  if (fs.existsSync(envFile)) for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const at = line.indexOf("="); values[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return { ...process.env, ...values };
}

function json(response, status, value) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(value));
}
async function body(request) {
  const chunks = []; let size = 0;
  for await (const chunk of request) { size += chunk.length; if (size > 1_000_000) throw new Error("Requisição muito grande."); chunks.push(chunk); }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}
function csvCell(value) { const text = Array.isArray(value) ? value.join("; ") : String(value ?? ""); return `"${text.replaceAll('"', '""')}"`; }
function toCsv(leads) {
  const columns = ["nome", "perfil", "plataforma", "email", "telefone", "comentario", "intencao", "score", "evidencias", "data"];
  const rows = leads.map((lead) => [lead.name, lead.profileUrl, lead.platform, lead.emails, lead.phones, lead.comment, lead.intention, lead.score, lead.evidence, lead.commentedAt || lead.collectedAt]);
  return `\uFEFF${columns.map(csvCell).join(",")}\r\n${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
function platform(url) { return /instagram\.com/i.test(url) ? "instagram" : /facebook\.com/i.test(url) ? "facebook" : /reddit\.com/i.test(url) ? "reddit" : "forum"; }
function actorFor(kind, settings, env) {
  return settings.actors?.[kind] || (kind === "instagram"
    ? (env.APIFY_INSTAGRAM_ACTOR || "apify/instagram-comment-scraper")
    : kind === "facebook"
      ? (env.APIFY_FACEBOOK_ACTOR || "apify/facebook-comments-scraper")
      : kind === "reddit"
        ? (env.APIFY_REDDIT_ACTOR || "scrapium/reddit-comment-scraper")
        : "");
}
function publicSettings(data, env) {
  return { retentionDays: data.settings.retentionDays || 30, hasApifyToken: Boolean(data.settings.apifyToken || env.APIFY_TOKEN), actors: data.settings.actors || {}, validationPrompt: data.settings.validationPrompt || "", lastSearchTerms: data.settings.lastSearchTerms || [] };
}

function socialNetwork(url = "") {
  return /instagram\.com/i.test(url) ? "Instagram" : /facebook\.com/i.test(url) ? "Facebook" : /reddit\.com/i.test(url) ? "Reddit" : "Outro";
}
function validPostUrl(url = "") {
  return /instagram\.com\/(?:p|reel)\//i.test(url) || /facebook\.com\/(?:.+\/posts\/|reel\/|watch\/|photo)/i.test(url) || /reddit\.com\/r\/[^/]+\/comments\//i.test(url);
}
function discoveryQueries(terms, networks, after) {
  const queries = [];
  for (const term of terms) {
    const safe = term.replace(/["\r\n]/g, " ").trim();
    if (networks.includes("instagram")) queries.push(`site:instagram.com "${safe}" (inurl:/p/ OR inurl:/reel/)${after ? ` after:${after}` : ""}`);
    if (networks.includes("facebook")) queries.push(`site:facebook.com "${safe}" (inurl:posts OR inurl:reel)${after ? ` after:${after}` : ""}`);
    if (networks.includes("reddit")) queries.push(`site:reddit.com/r/ "${safe}" inurl:comments${after ? ` after:${after}` : ""}`);
  }
  return queries;
}
function organicRows(items) {
  const rows = [];
  for (const item of items || []) {
    if (Array.isArray(item.organicResults)) rows.push(...item.organicResults);
    else if (item.type === "organic" || item.url) rows.push(item);
  }
  return rows;
}
function dateFromSearch(row) {
  const value = row.date || row.publishedAt || row.timestamp || null;
  if (value) return value;
  const match = String(row.description || "").match(/(?:\d{1,2}\s+de\s+[a-zç]+\s+de\s+\d{4}|\d{1,2}\s+[A-Z][a-z]{2}\s+\d{4})/i);
  return match?.[0] || null;
}
function comparableUrl(value = "") { return value.replace(/[?#].*$/, "").replace(/\/$/, "").toLowerCase(); }
async function enrichDiscoveries(discoveries, token, settings, env) {
  const byUrl = new Map(discoveries.map((item) => [comparableUrl(item.url), item]));
  const instagram = discoveries.filter((item) => item.network === "Instagram");
  const facebook = discoveries.filter((item) => item.network === "Facebook");
  const reddit = discoveries.filter((item) => item.network === "Reddit");
  const warnings = [];
  if (instagram.length) {
    try {
      const rows = await runActor({ token, actorId: settings.actors?.instagramPosts || env.APIFY_INSTAGRAM_POST_ACTOR || "apify/instagram-scraper", input: {
        directUrls: instagram.map((item) => item.url), resultsType: "details", resultsLimit: 1,
      }});
      for (const row of rows || []) {
        const target = byUrl.get(comparableUrl(row.inputUrl || row.url)); if (!target) continue;
        target.summary = String(row.caption || target.summary).trim();
        target.title = String(row.ownerFullName || row.ownerUsername || target.title).trim();
        target.publishedAt = row.timestamp || row.takenAt || target.publishedAt;
        target.commentCount = Number(row.commentsCount ?? row.commentCount ?? target.commentCount) || null;
        target.imageUrl = row.displayUrl || row.imageUrl || row.thumbnailUrl || "";
        target.metadataStatus = "complete";
      }
    } catch (error) { warnings.push(`Instagram: ${error.message}`); }
  }
  if (facebook.length) {
    try {
      const rows = await runActor({ token, actorId: settings.actors?.facebookPosts || env.APIFY_FACEBOOK_POST_ACTOR || "scrapyspider/facebook-post-scraper", input: {
        urls: facebook.map((item) => item.url), includeCommentText: false, proxy: { useApifyProxy: true },
      }});
      for (const row of rows || []) {
        const target = byUrl.get(comparableUrl(row.inputUrl || row.url || row.permalink)); if (!target) continue;
        target.summary = String(row.text || target.summary).trim();
        target.title = String(row.pageName || target.title).trim();
        target.publishedAt = row.date || (row.timestamp ? new Date(Number(row.timestamp) * 1000).toISOString() : target.publishedAt);
        target.commentCount = Number(row.comments ?? row.commentsCount ?? target.commentCount) || null;
        target.imageUrl = row.image || "";
        target.metadataStatus = "complete";
      }
    } catch (error) { warnings.push(`Facebook: ${error.message}`); }
  }
  for (const target of reddit) {
    try {
      const response = await fetch(`${target.url.replace(/\/$/, "")}.json?raw_json=1`, { headers: { "user-agent": "HurtzLeadResearch/1.2" }, signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`Reddit respondeu ${response.status}`);
      const payload = await response.json(); const post = payload?.[0]?.data?.children?.[0]?.data;
      if (!post) throw new Error("Post não encontrado");
      target.title = post.title || target.title; target.summary = post.selftext || target.summary;
      target.publishedAt = post.created_utc ? new Date(post.created_utc * 1000).toISOString() : target.publishedAt;
      target.commentCount = Number(post.num_comments) || null; target.metadataStatus = "complete";
    } catch (error) { warnings.push(`Reddit: ${error.message}`); }
  }
  for (const item of discoveries) item.metadataStatus ||= "partial";
  return warnings;
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://127.0.0.1");
    const env = envValues();
    if (url.pathname === "/health") return json(response, 200, { ok: true, app: "hurtz-extrator-leads", version: "1.2.2" });
    if (url.pathname === "/api/dashboard" && request.method === "GET") {
      store.purgeExpired(); const data = store.read();
      return json(response, 200, { discoveries: data.discoveries || [], leads: data.leads, jobs: data.jobs.slice(0, 30), audit: data.audit.slice(0, 50), settings: publicSettings(data, env) });
    }
    if (url.pathname === "/api/settings" && request.method === "PUT") {
      const input = await body(request);
      const data = store.update((state) => {
        state.settings.retentionDays = Math.max(1, Math.min(365, Number(input.retentionDays || 30)));
        if (typeof input.apifyToken === "string" && input.apifyToken.trim()) state.settings.apifyToken = input.apifyToken.trim();
        state.settings.actors = { ...state.settings.actors, ...(input.actors || {}) };
      }); store.audit("settings.updated", { retentionDays: data.settings.retentionDays });
      return json(response, 200, { ok: true, settings: publicSettings(data, env) });
    }
    if (url.pathname === "/api/classify" && request.method === "POST") return json(response, 200, classifyIntent((await body(request)).text));
    if (url.pathname === "/api/discover" && request.method === "POST") {
      const input = await body(request);
      const terms = [...new Set((input.terms || []).map((value) => String(value).trim()).filter(Boolean))].slice(0, 5);
      const networks = (input.networks || []).filter((value) => ["instagram", "facebook", "reddit"].includes(value));
      const validationPrompt = String(input.validationPrompt || "").trim().slice(0, 3000);
      const maxResults = Math.max(5, Math.min(50, Number(input.maxResults || 10)));
      const after = /^\d{4}-\d{2}-\d{2}$/.test(input.after || "") ? input.after : "";
      if (!terms.length) return json(response, 400, { error: "Informe pelo menos um termo de pesquisa." });
      if (!networks.length) return json(response, 400, { error: "Selecione pelo menos uma rede social." });
      const state = store.read(); const token = state.settings.apifyToken || env.APIFY_TOKEN;
      const queries = discoveryQueries(terms, networks, after);
      const actorId = state.settings.actors?.search || env.APIFY_SEARCH_ACTOR || "apify/google-search-scraper";
      store.audit("discovery.started", { terms, networks, maxResults });
      try {
        const items = await runActor({ token, actorId, input: {
          queries: queries.join("\n"), maxPagesPerQuery: Math.max(1, Math.ceil(maxResults / 10)),
          resultsPerPage: Math.min(100, Math.max(10, maxResults * 2)), countryCode: "br", languageCode: "pt-BR", searchLanguage: "pt",
          mobileResults: false, includeUnfilteredResults: false, saveHtml: false,
        }});
        const seen = new Set();
        const candidates = organicRows(items).filter((row) => validPostUrl(row.url)).map((row) => ({
          id: crypto.randomUUID(), url: row.url, network: socialNetwork(row.url),
          title: String(row.title || "Publicação encontrada").trim(),
          summary: String(row.description || "Sem descrição disponível na pesquisa.").trim(),
          publishedAt: dateFromSearch(row), commentCount: Number(row.commentCount || row.commentsCount || row.comments || 0) || null,
          term: row.searchQuery?.term || terms.find((term) => `${row.title} ${row.description}`.toLowerCase().includes(term.toLowerCase())) || terms[0],
          discoveredAt: new Date().toISOString(), selected: false, searchTerms: terms, validationPrompt,
        })).filter((item) => !seen.has(item.url) && seen.add(item.url)).slice(0, maxResults * 4);
        const warnings = await enrichDiscoveries(candidates, token, state.settings, env);
        const postValidations = await validatePostsWithOllama(candidates, { terms, criteria: validationPrompt, url: env.OLLAMA_URL || "http://127.0.0.1:11434", model: env.OLLAMA_MODEL || "llama3.2:3b", timeoutMs: Number(env.OLLAMA_TIMEOUT_MS || 20000) });
        candidates.forEach((post, index) => { post.validation = postValidations[index]; });
        const perNetwork = Math.max(1, Math.ceil(maxResults / networks.length)); const networkCounts = {};
        const balance = (posts) => posts.filter((post) => { const key = post.network.toLowerCase(); if ((networkCounts[key] || 0) >= perNetwork) return false; networkCounts[key] = (networkCounts[key] || 0) + 1; return true; }).slice(0, maxResults);
        let discoveries = balance(candidates.filter((post) => post.validation?.eligible).sort((a, b) => (b.validation?.relevanceScore || 0) - (a.validation?.relevanceScore || 0)));
        let approximate = false;
        if (!discoveries.length) {
          approximate = true;
          const alternatives = candidates
            .filter((post) => post.validation?.languageOk && post.validation?.commentsOk)
            .sort((a, b) => (b.validation?.relevanceScore || 0) - (a.validation?.relevanceScore || 0))
            .map((post) => ({ ...post, approximate: true, validation: { ...post.validation, eligible: false, reason: `Sugestão aproximada: ${post.validation?.reason || "relação parcial com a pesquisa"}` } }));
          Object.keys(networkCounts).forEach((key) => delete networkCounts[key]);
          discoveries = balance(alternatives);
        }
        store.update((data) => { data.discoveries = discoveries; data.settings.validationPrompt = validationPrompt; data.settings.lastSearchTerms = terms; });
        const rejected = candidates.length - discoveries.length;
        store.audit("discovery.completed", { found: discoveries.length, rejected, warnings, approximate });
        return json(response, 200, { discoveries, found: approximate ? 0 : discoveries.length, suggested: approximate ? discoveries.length : 0, rejected, warnings, approximate });
      } catch (error) {
        store.audit("discovery.failed", { error: error.message }); return json(response, 502, { error: error.message });
      }
    }
    if (url.pathname === "/api/jobs" && request.method === "POST") {
      const input = await body(request);
      const urls = [...new Set((input.urls || []).map((value) => String(value).trim()).filter((value) => /^https:\/\//i.test(value)))];
      const commentLimit = Math.max(10, Math.min(500, Number(input.commentLimit || 25)));
      if (!urls.length) return json(response, 400, { error: "Adicione pelo menos uma URL pública válida." });
      const kinds = [...new Set(urls.map(platform))];
      if (kinds.includes("forum")) return json(response, 400, { error: "Use URLs públicas do Facebook, Instagram ou Reddit." });
      const state = store.read(); const token = state.settings.apifyToken || env.APIFY_TOKEN;
      const job = { id: crypto.randomUUID(), urls, status: "running", createdAt: new Date().toISOString(), total: 0 };
      store.update((data) => data.jobs.unshift(job)); store.audit("collection.started", { jobId: job.id, urls: urls.length });
      let imported = [];
      try {
        for (const kind of kinds) {
          const selected = urls.filter((value) => platform(value) === kind);
          const actorInput = kind === "reddit"
            ? { startUrls: selected, proxyConfiguration: { useApifyProxy: false }, maxItems: commentLimit }
            : { startUrls: selected.map((url) => ({ url })), directUrls: selected, resultsLimit: commentLimit };
          const items = await runActor({ token, actorId: actorFor(kind, state.settings, env), input: actorInput });
          imported.push(...items.map((item) => normalizeApifyItem(item, selected.find((candidate) => (item.url || item.postUrl || item.permalink || "").includes(candidate)) || selected[0])));
        }
        const currentState = store.read(); const selectedDiscoveries = (currentState.discoveries || []).filter((post) => urls.includes(post.url));
        const terms = [...new Set(selectedDiscoveries.flatMap((post) => post.searchTerms || []))];
        const criteria = selectedDiscoveries.find((post) => post.validationPrompt)?.validationPrompt || currentState.settings.validationPrompt || "";
        const candidates = imported.filter((lead) => lead.comment).map((lead) => ({ ...lead, validation: lexicalValidation(lead.comment, terms, criteria) }));
        const validations = await validateWithOllama(candidates, { terms, criteria, url: env.OLLAMA_URL || "http://127.0.0.1:11434", model: env.OLLAMA_MODEL || "llama3.2:3b", timeoutMs: Number(env.OLLAMA_TIMEOUT_MS || 20000) });
        candidates.forEach((lead, index) => { lead.validation = validations[index] || lead.validation; lead.score = Math.round((lead.score * 0.4) + (lead.validation.relevanceScore * 0.6)); lead.searchTerms = terms; });
        const rejected = candidates.filter((lead) => !lead.validation.eligible); imported = candidates.filter((lead) => lead.validation.eligible);
        store.update((data) => {
          const current = data.jobs.find((value) => value.id === job.id); Object.assign(current, { status: "completed", total: imported.length, rejected: rejected.length, analyzed: candidates.length, finishedAt: new Date().toISOString() });
          const keys = new Set(data.leads.map((lead) => `${lead.profileUrl}|${lead.comment}`));
          data.leads.unshift(...imported.filter((lead) => !keys.has(`${lead.profileUrl}|${lead.comment}`)));
        }); store.audit("collection.completed", { jobId: job.id, leads: imported.length, rejected: rejected.length });
        return json(response, 201, { ok: true, jobId: job.id, imported: imported.length, rejected: rejected.length, analyzed: candidates.length });
      } catch (error) {
        store.update((data) => { const current = data.jobs.find((value) => value.id === job.id); Object.assign(current, { status: "failed", error: error.message, finishedAt: new Date().toISOString() }); });
        store.audit("collection.failed", { jobId: job.id, error: error.message }); return json(response, 502, { error: error.message });
      }
    }
    const reviewMatch = url.pathname.match(/^\/api\/leads\/([^/]+)\/review$/);
    if (reviewMatch && request.method === "PUT") {
      const input = await body(request); const allowed = ["approved", "rejected", "pending"];
      if (!allowed.includes(input.review)) return json(response, 400, { error: "Revisão inválida." });
      store.update((data) => { const lead = data.leads.find((value) => value.id === reviewMatch[1]); if (lead) lead.review = input.review; });
      store.audit("lead.reviewed", { leadId: reviewMatch[1], review: input.review }); return json(response, 200, { ok: true });
    }
    if (url.pathname === "/api/export.csv" && request.method === "GET") {
      const minScore = Number(url.searchParams.get("minScore") || 0); const leads = store.read().leads.filter((lead) => lead.score >= minScore);
      response.writeHead(200, { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=leads_qualificados.csv" }); return response.end(toCsv(leads));
    }
    if (url.pathname.startsWith("/api/")) return json(response, 404, { error: "Rota não encontrada." });
    const requested = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    const file = path.resolve(publicDir, requested); if (!file.startsWith(publicDir) || !fs.existsSync(file)) return json(response, 404, { error: "Não encontrado." });
    const contentType = file.endsWith(".css") ? "text/css" : file.endsWith(".js") ? "text/javascript" : "text/html";
    response.writeHead(200, { "content-type": `${contentType}; charset=utf-8` }); fs.createReadStream(file).pipe(response);
  } catch (error) { json(response, 500, { error: error.message || "Erro interno." }); }
});

const port = Number(envValues().LEADS_PORT || 3340);
server.listen(port, "127.0.0.1", () => console.log(`Extrator de Leads: http://127.0.0.1:${port}`));
export { server };
