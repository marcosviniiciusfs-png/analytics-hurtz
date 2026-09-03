import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { env } from "./config.js";

const dataDir = path.dirname(env.databasePath);
fs.mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(env.databasePath);
db.exec(`
  PRAGMA journal_mode=WAL;
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    format TEXT NOT NULL DEFAULT 'text',
    external_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE UNIQUE INDEX IF NOT EXISTS messages_external_id
    ON messages(external_id) WHERE external_id IS NOT NULL;
  CREATE TABLE IF NOT EXISTS contacts (
    contact TEXT PRIMARY KEY,
    push_name TEXT,
    profile_url TEXT,
    status TEXT NOT NULL DEFAULT 'bot',
    ai_activated INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    detail TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS processed_webhooks (
    external_id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS managed_instances (
    name TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'created',
    webhook_status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS knowledge_documents (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    title TEXT NOT NULL,
    pages INTEGER NOT NULL DEFAULT 0,
    characters INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ready',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    content TEXT NOT NULL,
    FOREIGN KEY(document_id) REFERENCES knowledge_documents(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS knowledge_chunks_document_idx ON knowledge_chunks(document_id);
  CREATE TABLE IF NOT EXISTS brain_nuclei (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    instructions TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS brain_nodes (
    id TEXT PRIMARY KEY,
    nucleus_id TEXT NOT NULL,
    parent_id TEXT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    origin TEXT NOT NULL DEFAULT 'ai',
    review_status TEXT NOT NULL DEFAULT 'pending',
    usable INTEGER NOT NULL DEFAULT 1,
    confidence REAL NOT NULL DEFAULT 0.5,
    risk_level TEXT NOT NULL DEFAULT 'normal',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(nucleus_id) REFERENCES brain_nuclei(id) ON DELETE CASCADE,
    FOREIGN KEY(parent_id) REFERENCES brain_nodes(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS brain_nodes_nucleus_idx ON brain_nodes(nucleus_id,parent_id);
  CREATE TABLE IF NOT EXISTS conversation_context (
    contact TEXT PRIMARY KEY,
    summary TEXT NOT NULL DEFAULT '',
    profile TEXT NOT NULL DEFAULT '{}',
    next_steps TEXT NOT NULL DEFAULT '[]',
    source_message_id INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS context_cache (
    cache_key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL,
    method TEXT NOT NULL,
    body TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    next_attempt INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS response_feedback (
    id TEXT PRIMARY KEY,
    contact TEXT NOT NULL,
    message_id INTEGER NOT NULL,
    rating TEXT NOT NULL CHECK(rating IN ('good','bad')),
    reason TEXT NOT NULL DEFAULT 'other',
    note TEXT NOT NULL DEFAULT '',
    ideal_response TEXT NOT NULL DEFAULT '',
    context_snapshot TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(contact,message_id)
  );
  CREATE INDEX IF NOT EXISTS response_feedback_contact_idx
    ON response_feedback(contact,updated_at DESC);
  CREATE TABLE IF NOT EXISTS performance_metrics (
    id TEXT PRIMARY KEY,
    contact TEXT NOT NULL,
    request_id TEXT NOT NULL,
    input_format TEXT NOT NULL DEFAULT 'text',
    output_format TEXT NOT NULL DEFAULT 'text',
    transcription_ms INTEGER NOT NULL DEFAULT 0,
    rag_ms INTEGER NOT NULL DEFAULT 0,
    generation_ms INTEGER NOT NULL DEFAULT 0,
    tts_ms INTEGER NOT NULL DEFAULT 0,
    send_ms INTEGER NOT NULL DEFAULT 0,
    first_response_ms INTEGER NOT NULL DEFAULT 0,
    total_ms INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ok',
    error TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS performance_metrics_created_idx
    ON performance_metrics(created_at DESC);
`);
if (
  !db
    .prepare("PRAGMA table_info(contacts)")
    .all()
    .some((column) => column.name === "ai_activated")
)
  db.exec(
    "ALTER TABLE contacts ADD COLUMN ai_activated INTEGER NOT NULL DEFAULT 0",
  );
if (
  !db
    .prepare("PRAGMA table_info(brain_nodes)")
    .all()
    .some((column) => column.name === "risk_level")
)
  db.exec(
    "ALTER TABLE brain_nodes ADD COLUMN risk_level TEXT NOT NULL DEFAULT 'normal'",
  );
if (
  !db
    .prepare("PRAGMA table_info(contacts)")
    .all()
    .some((column) => column.name === "profile_url")
)
  db.exec("ALTER TABLE contacts ADD COLUMN profile_url TEXT");
if (
  !db
    .prepare("PRAGMA table_info(managed_instances)")
    .all()
    .some((column) => column.name === "webhook_status")
)
  db.exec(
    "ALTER TABLE managed_instances ADD COLUMN webhook_status TEXT NOT NULL DEFAULT 'pending'",
  );

const activeBrainNuclei = db
  .prepare(
    "SELECT id FROM brain_nuclei WHERE status='active' ORDER BY updated_at DESC,created_at DESC",
  )
  .all();
if (activeBrainNuclei.length > 1) {
  db.prepare("UPDATE brain_nuclei SET status='inactive' WHERE id<>?").run(
    activeBrainNuclei[0].id,
  );
}

export function seen(externalId) {
  if (!externalId) return false;
  return Boolean(
    db
      .prepare("SELECT 1 FROM processed_webhooks WHERE external_id=?")
      .get(externalId),
  );
}

export function markSeen(externalId) {
  if (!externalId) return;
  db.prepare(
    "INSERT OR IGNORE INTO processed_webhooks(external_id) VALUES(?)",
  ).run(externalId);
}

export function addMessage(
  contact,
  role,
  content,
  format = "text",
  externalId = null,
) {
  const result = db
    .prepare(
      `INSERT OR IGNORE INTO messages(contact,role,content,format,external_id)
              VALUES(?,?,?,?,?)`,
    )
    .run(contact, role, content, format, externalId);
  if (!result.changes) return null;
  return db
    .prepare("SELECT * FROM messages WHERE id=?")
    .get(result.lastInsertRowid);
}

export function history(contact, limit = 16) {
  return db
    .prepare(
      `SELECT role,content,format,created_at FROM messages
    WHERE contact=? ORDER BY id DESC LIMIT ?`,
    )
    .all(contact, limit)
    .reverse();
}

export function contextHistory(contact, limit = 16, maxCharacters = 9000) {
  const rows = db
    .prepare(
      `SELECT id,role,content,format,created_at FROM messages
       WHERE contact=? ORDER BY id DESC LIMIT ?`,
    )
    .all(contact, Math.max(limit * 2, limit));
  const selected = [];
  let used = 0;
  for (const row of rows) {
    const size = String(row.content || "").length;
    if (selected.length && used + size > maxCharacters) break;
    selected.push(row);
    used += size;
    if (selected.length >= limit) break;
  }
  return selected.reverse();
}

export function conversationContext(contact) {
  const row = db
    .prepare("SELECT * FROM conversation_context WHERE contact=?")
    .get(contact);
  if (!row)
    return {
      contact,
      summary: "",
      profile: {},
      nextSteps: [],
      sourceMessageId: 0,
    };
  const parse = (value, fallback) => {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  };
  return {
    contact,
    summary: row.summary || "",
    profile: parse(row.profile, {}),
    nextSteps: parse(row.next_steps, []),
    sourceMessageId: row.source_message_id || 0,
    updatedAt: row.updated_at,
  };
}

export function saveConversationContext(contact, value = {}) {
  const current = conversationContext(contact);
  const summary = String(value.summary ?? current.summary)
    .trim()
    .slice(0, 5000);
  const profile = value.profile ?? current.profile;
  const nextSteps = Array.isArray(value.nextSteps)
    ? value.nextSteps.map(String).filter(Boolean).slice(0, 8)
    : current.nextSteps;
  db.prepare(
    `INSERT INTO conversation_context(contact,summary,profile,next_steps,source_message_id,updated_at)
     VALUES(?,?,?,?,?,CURRENT_TIMESTAMP)
     ON CONFLICT(contact) DO UPDATE SET summary=excluded.summary,
       profile=excluded.profile,next_steps=excluded.next_steps,
       source_message_id=excluded.source_message_id,updated_at=CURRENT_TIMESTAMP`,
  ).run(
    contact,
    summary,
    JSON.stringify(profile || {}),
    JSON.stringify(nextSteps),
    Number(value.sourceMessageId ?? current.sourceMessageId) || 0,
  );
  return conversationContext(contact);
}

export function getContextCache(key) {
  const row = db
    .prepare("SELECT value,expires_at FROM context_cache WHERE cache_key=?")
    .get(key);
  if (!row || row.expires_at <= Date.now()) {
    if (row) db.prepare("DELETE FROM context_cache WHERE cache_key=?").run(key);
    return null;
  }
  try {
    return JSON.parse(row.value);
  } catch {
    return null;
  }
}

export function setContextCache(key, value, ttlMs = 300000) {
  db.prepare(
    `INSERT INTO context_cache(cache_key,value,expires_at,updated_at)
     VALUES(?,?,?,CURRENT_TIMESTAMP)
     ON CONFLICT(cache_key) DO UPDATE SET value=excluded.value,
       expires_at=excluded.expires_at,updated_at=CURRENT_TIMESTAMP`,
  ).run(key, JSON.stringify(value), Date.now() + ttlMs);
}

export function clearContextCache(prefix = "") {
  if (!prefix) return db.prepare("DELETE FROM context_cache").run().changes;
  return db
    .prepare("DELETE FROM context_cache WHERE cache_key LIKE ?")
    .run(`${prefix}%`).changes;
}

export function enqueueSync(pathname, method, payload, error = "") {
  db.prepare(
    "INSERT INTO sync_queue(path,method,body,next_attempt,last_error) VALUES(?,?,?,?,?)",
  ).run(
    pathname,
    method,
    payload || null,
    Date.now() + 15000,
    String(error).slice(0, 500),
  );
}

export function dueSyncItems(limit = 20) {
  return db
    .prepare(
      "SELECT * FROM sync_queue WHERE next_attempt<=? ORDER BY id LIMIT ?",
    )
    .all(Date.now(), limit);
}

export function completeSyncItem(id) {
  db.prepare("DELETE FROM sync_queue WHERE id=?").run(id);
}

export function delaySyncItem(id, attempts, error) {
  const delay = Math.min(15 * 60_000, 15_000 * 2 ** Math.min(attempts, 6));
  db.prepare(
    "UPDATE sync_queue SET attempts=?,next_attempt=?,last_error=? WHERE id=?",
  ).run(attempts, Date.now() + delay, String(error).slice(0, 500), id);
}

export function upsertContact(contact, pushName = "", profileUrl = "") {
  db.prepare(
    `INSERT INTO contacts(contact,push_name,profile_url) VALUES(?,?,?)
    ON CONFLICT(contact) DO UPDATE SET
      push_name=COALESCE(NULLIF(excluded.push_name,''),contacts.push_name),
      profile_url=COALESCE(NULLIF(excluded.profile_url,''),contacts.profile_url),
      updated_at=CURRENT_TIMESTAMP`,
  ).run(contact, pushName, profileUrl);
}

export function setContactStatus(contact, status) {
  db.prepare(
    `INSERT INTO contacts(contact,status) VALUES(?,?)
    ON CONFLICT(contact) DO UPDATE SET status=excluded.status,updated_at=CURRENT_TIMESTAMP`,
  ).run(contact, status);
}

export function getContactStatus(contact) {
  return (
    db.prepare("SELECT status FROM contacts WHERE contact=?").get(contact)
      ?.status || "bot"
  );
}

export function setContactActivated(contact, activated = true) {
  db.prepare(
    `INSERT INTO contacts(contact,ai_activated) VALUES(?,?)
    ON CONFLICT(contact) DO UPDATE SET ai_activated=excluded.ai_activated,updated_at=CURRENT_TIMESTAMP`,
  ).run(contact, activated ? 1 : 0);
}

export function isContactActivated(contact) {
  return Boolean(
    db.prepare("SELECT ai_activated FROM contacts WHERE contact=?").get(contact)
      ?.ai_activated,
  );
}

export function resetContactActivations() {
  return db
    .prepare(
      "UPDATE contacts SET ai_activated=0,updated_at=CURRENT_TIMESTAMP WHERE ai_activated<>0",
    )
    .run().changes;
}

export function logEvent(type, detail = {}) {
  db.prepare("INSERT INTO events(type,detail) VALUES(?,?)").run(
    type,
    JSON.stringify(detail),
  );
}

export function contactAudit(contact, limit = 40) {
  return db
    .prepare(
      `SELECT id,type,detail,created_at FROM events
       WHERE detail LIKE ? ORDER BY id DESC LIMIT ?`,
    )
    .all(`%${contact.replace(/[%_]/g, "")}%`, limit)
    .map((row) => {
      try {
        return { ...row, detail: JSON.parse(row.detail || "{}") };
      } catch {
        return { ...row, detail: {} };
      }
    });
}

export function recentAudit(limit = 80) {
  return db
    .prepare(
      "SELECT id,type,detail,created_at FROM events ORDER BY id DESC LIMIT ?",
    )
    .all(limit)
    .map((row) => {
      try {
        return { ...row, detail: JSON.parse(row.detail || "{}") };
      } catch {
        return { ...row, detail: {} };
      }
    });
}

export function dashboard() {
  return {
    contacts: db.prepare("SELECT COUNT(*) total FROM contacts").get().total,
    messages: db.prepare("SELECT COUNT(*) total FROM messages").get().total,
    human: db
      .prepare("SELECT COUNT(*) total FROM contacts WHERE status='human'")
      .get().total,
    recent: db
      .prepare(
        `SELECT contact,role,content,format,created_at
      FROM messages ORDER BY id DESC LIMIT 20`,
      )
      .all(),
  };
}

export function conversations() {
  return db
    .prepare(
      `
    SELECT c.contact, c.push_name, c.profile_url, c.status, c.ai_activated, c.updated_at,
      (SELECT content FROM messages m WHERE m.contact=c.contact ORDER BY m.id DESC LIMIT 1) last_message,
      (SELECT created_at FROM messages m WHERE m.contact=c.contact ORDER BY m.id DESC LIMIT 1) last_message_at,
      (SELECT COUNT(*) FROM messages m WHERE m.contact=c.contact) message_count
    FROM contacts c
    ORDER BY COALESCE(last_message_at,c.updated_at) DESC
  `,
    )
    .all();
}

export function conversationMessages(contact, limit = 100) {
  return db
    .prepare(
      `
    SELECT id,contact,role,content,format,created_at
    FROM messages WHERE contact=? ORDER BY id DESC LIMIT ?
  `,
    )
    .all(contact, limit)
    .reverse();
}

export function conversationFeedback(contact) {
  return db
    .prepare(
      `SELECT id,contact,message_id,rating,reason,note,ideal_response,
        created_at,updated_at FROM response_feedback
       WHERE contact=? ORDER BY updated_at DESC`,
    )
    .all(contact);
}

export function saveResponseFeedback(item) {
  const message = db
    .prepare(
      "SELECT id,contact,role,content,format,created_at FROM messages WHERE id=? AND contact=?",
    )
    .get(item.messageId, item.contact);
  if (!message || message.role !== "assistant") return null;
  const context = db
    .prepare(
      `SELECT role,content,format,created_at FROM messages
       WHERE contact=? AND id<? ORDER BY id DESC LIMIT 8`,
    )
    .all(item.contact, item.messageId)
    .reverse();
  const id = item.id || crypto.randomUUID();
  db.prepare(
    `INSERT INTO response_feedback
      (id,contact,message_id,rating,reason,note,ideal_response,context_snapshot,updated_at)
     VALUES(?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
     ON CONFLICT(contact,message_id) DO UPDATE SET rating=excluded.rating,
       reason=excluded.reason,note=excluded.note,
       ideal_response=excluded.ideal_response,
       context_snapshot=excluded.context_snapshot,updated_at=CURRENT_TIMESTAMP`,
  ).run(
    id,
    item.contact,
    item.messageId,
    item.rating === "good" ? "good" : "bad",
    String(item.reason || "other").slice(0, 40),
    String(item.note || "")
      .trim()
      .slice(0, 2000),
    String(item.idealResponse || "")
      .trim()
      .slice(0, 4000),
    JSON.stringify(context),
  );
  return db
    .prepare("SELECT * FROM response_feedback WHERE contact=? AND message_id=?")
    .get(item.contact, item.messageId);
}

export function feedbackDashboard() {
  const totals = db
    .prepare(
      `SELECT COUNT(*) total,
        SUM(CASE WHEN rating='good' THEN 1 ELSE 0 END) good,
        SUM(CASE WHEN rating='bad' THEN 1 ELSE 0 END) bad
       FROM response_feedback`,
    )
    .get();
  return {
    total: Number(totals.total || 0),
    good: Number(totals.good || 0),
    bad: Number(totals.bad || 0),
  };
}

export function trainingExamples() {
  return db
    .prepare(
      `SELECT f.id,f.contact,f.rating,f.reason,f.note,f.ideal_response,
        f.context_snapshot,m.content assistant_response,m.created_at
       FROM response_feedback f JOIN messages m ON m.id=f.message_id
       ORDER BY f.updated_at ASC`,
    )
    .all()
    .map((row) => {
      let context = [];
      try {
        context = JSON.parse(row.context_snapshot || "[]");
      } catch {}
      return {
        id: row.id,
        contact: row.contact,
        rating: row.rating,
        reason: row.reason,
        note: row.note,
        messages: [
          ...context.map((item) => ({
            role: item.role === "assistant" ? "assistant" : "user",
            content: item.content,
          })),
          {
            role: "assistant",
            content:
              row.rating === "bad" && row.ideal_response
                ? row.ideal_response
                : row.assistant_response,
          },
        ],
        rejectedResponse:
          row.rating === "bad" ? row.assistant_response : undefined,
        createdAt: row.created_at,
      };
    });
}

export function savePerformanceMetric(metric) {
  db.prepare(
    `INSERT INTO performance_metrics
      (id,contact,request_id,input_format,output_format,transcription_ms,
       rag_ms,generation_ms,tts_ms,send_ms,first_response_ms,total_ms,status,error)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    metric.id || crypto.randomUUID(),
    metric.contact,
    metric.requestId,
    metric.inputFormat || "text",
    metric.outputFormat || "text",
    Math.round(metric.transcriptionMs || 0),
    Math.round(metric.ragMs || 0),
    Math.round(metric.generationMs || 0),
    Math.round(metric.ttsMs || 0),
    Math.round(metric.sendMs || 0),
    Math.round(metric.firstResponseMs || 0),
    Math.round(metric.totalMs || 0),
    metric.status || "ok",
    String(metric.error || "").slice(0, 500),
  );
}

export function performanceSummary(limit = 200) {
  const rows = db
    .prepare(
      `SELECT * FROM performance_metrics ORDER BY created_at DESC LIMIT ?`,
    )
    .all(limit);
  if (!rows.length) return { samples: 0, averages: {}, p95: {} };
  const fields = [
    "transcription_ms",
    "rag_ms",
    "generation_ms",
    "tts_ms",
    "send_ms",
    "first_response_ms",
    "total_ms",
  ];
  const averages = {},
    p95 = {};
  for (const field of fields) {
    const values = rows
      .map((row) => Number(row[field] || 0))
      .sort((a, b) => a - b);
    averages[field] = Math.round(
      values.reduce((sum, value) => sum + value, 0) / values.length,
    );
    p95[field] =
      values[Math.min(values.length - 1, Math.ceil(values.length * 0.95) - 1)];
  }
  return {
    samples: rows.length,
    successful: rows.filter((row) => row.status === "ok").length,
    failed: rows.filter((row) => row.status !== "ok").length,
    averages,
    p95,
    recent: rows.slice(0, 20),
  };
}

export function addManagedInstance(name, label, status = "created") {
  db.prepare(
    `INSERT INTO managed_instances(name,label,status) VALUES(?,?,?)
    ON CONFLICT(name) DO UPDATE SET label=excluded.label,status=excluded.status,updated_at=CURRENT_TIMESTAMP`,
  ).run(name, label, status);
}

export function updateManagedInstance(name, status) {
  db.prepare(
    "UPDATE managed_instances SET status=?,updated_at=CURRENT_TIMESTAMP WHERE name=?",
  ).run(status, name);
}

export function updateManagedInstanceWebhook(name, status) {
  db.prepare(
    "UPDATE managed_instances SET webhook_status=?,updated_at=CURRENT_TIMESTAMP WHERE name=?",
  ).run(status, name);
}

export function isManagedInstance(name) {
  return Boolean(
    name &&
    db.prepare("SELECT 1 FROM managed_instances WHERE name=?").get(name),
  );
}

export function managedInstances() {
  return db
    .prepare(
      "SELECT name,label,status,webhook_status,created_at,updated_at FROM managed_instances ORDER BY created_at DESC",
    )
    .all();
}

export function removeManagedInstanceRecord(name) {
  db.prepare("DELETE FROM managed_instances WHERE name=?").run(name);
}

export function saveKnowledgeDocument(document, chunks) {
  db.exec("BEGIN");
  try {
    db.prepare(
      `INSERT INTO knowledge_documents(id,filename,title,pages,characters,status)
      VALUES(?,?,?,?,?,'ready')
      ON CONFLICT(id) DO UPDATE SET filename=excluded.filename,title=excluded.title,
      pages=excluded.pages,characters=excluded.characters,status='ready'`,
    ).run(
      document.id,
      document.filename,
      document.title,
      document.pages,
      document.characters,
    );
    db.prepare("DELETE FROM knowledge_chunks WHERE document_id=?").run(
      document.id,
    );
    const insert = db.prepare(
      "INSERT INTO knowledge_chunks(document_id,position,content) VALUES(?,?,?)",
    );
    chunks.forEach((content, position) =>
      insert.run(document.id, position, content),
    );
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function knowledgeDocuments() {
  return db
    .prepare(
      `SELECT d.*,COUNT(c.id) chunks FROM knowledge_documents d
    LEFT JOIN knowledge_chunks c ON c.document_id=d.id
    GROUP BY d.id ORDER BY d.created_at DESC`,
    )
    .all();
}

export function allKnowledgeChunks() {
  return db
    .prepare(
      `SELECT c.content text,d.filename source,c.position
    FROM knowledge_chunks c JOIN knowledge_documents d ON d.id=c.document_id`,
    )
    .all();
}

export function removeKnowledgeDocumentRecord(id) {
  db.prepare("DELETE FROM knowledge_chunks WHERE document_id=?").run(id);
  db.prepare("DELETE FROM knowledge_documents WHERE id=?").run(id);
}

export function createBrainNucleus(nucleus) {
  const hasActive = Boolean(
    db
      .prepare("SELECT 1 FROM brain_nuclei WHERE status='active' LIMIT 1")
      .get(),
  );
  db.prepare(
    `INSERT INTO brain_nuclei(id,name,instructions,status) VALUES(?,?,?,?)`,
  ).run(
    nucleus.id,
    nucleus.name,
    nucleus.instructions,
    hasActive ? "inactive" : "active",
  );
  return brainNucleus(nucleus.id);
}

export function updateBrainNucleus(id, changes = {}) {
  const current = db.prepare("SELECT * FROM brain_nuclei WHERE id=?").get(id);
  if (!current) return null;
  db.prepare(
    `UPDATE brain_nuclei
     SET name=?,instructions=?,updated_at=CURRENT_TIMESTAMP
     WHERE id=?`,
  ).run(
    String(changes.name ?? current.name)
      .trim()
      .slice(0, 80),
    String(changes.instructions ?? current.instructions).trim(),
    id,
  );
  return db.prepare("SELECT * FROM brain_nuclei WHERE id=?").get(id);
}

export function brainNucleus(id) {
  return db.prepare("SELECT * FROM brain_nuclei WHERE id=?").get(id) || null;
}

export function activeBrainNucleus() {
  return (
    db
      .prepare(
        "SELECT * FROM brain_nuclei WHERE status='active' ORDER BY updated_at DESC LIMIT 1",
      )
      .get() || null
  );
}

export function setBrainNucleusActive(id, enabled) {
  const nucleus = brainNucleus(id);
  if (!nucleus) return null;
  db.exec("BEGIN IMMEDIATE");
  try {
    if (enabled)
      db.prepare(
        "UPDATE brain_nuclei SET status='inactive',updated_at=CURRENT_TIMESTAMP WHERE status='active'",
      ).run();
    db.prepare(
      "UPDATE brain_nuclei SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
    ).run(enabled ? "active" : "inactive", id);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  clearContextCache();
  return brainNucleus(id);
}

export function deleteBrainNucleus(id) {
  const nucleus = brainNucleus(id);
  if (!nucleus) return null;
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("DELETE FROM brain_nodes WHERE nucleus_id=?").run(id);
    db.prepare("DELETE FROM brain_nuclei WHERE id=?").run(id);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return nucleus;
}

export function brainNuclei() {
  const nuclei = db
    .prepare("SELECT * FROM brain_nuclei ORDER BY created_at DESC")
    .all();
  const nodes = db
    .prepare("SELECT * FROM brain_nodes ORDER BY created_at ASC")
    .all();
  return nuclei.map((nucleus) => ({
    ...nucleus,
    nodes: nodes.filter((node) => node.nucleus_id === nucleus.id),
  }));
}

export function addBrainNode(node) {
  db.prepare(
    `INSERT INTO brain_nodes
      (id,nucleus_id,parent_id,name,category,content,origin,review_status,usable,confidence,risk_level)
     VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    node.id,
    node.nucleusId,
    node.parentId || null,
    node.name,
    node.category,
    node.content,
    node.origin || "ai",
    node.reviewStatus || "pending",
    node.usable === false ? 0 : 1,
    Number(node.confidence || 0.5),
    node.riskLevel === "critical" ? "critical" : "normal",
  );
  clearContextCache(`brain:${node.nucleusId}:`);
  return db.prepare("SELECT * FROM brain_nodes WHERE id=?").get(node.id);
}

export function reviewBrainNode(id, status) {
  db.prepare(
    "UPDATE brain_nodes SET review_status=?,usable=CASE WHEN ?='approved' THEN 1 ELSE usable END,updated_at=CURRENT_TIMESTAMP WHERE id=?",
  ).run(status, status, id);
  const node =
    db.prepare("SELECT * FROM brain_nodes WHERE id=?").get(id) || null;
  if (node) clearContextCache(`brain:${node.nucleus_id}:`);
  return node;
}

export function usableBrainMemory() {
  return db
    .prepare(
      `SELECT n.id,n.name,n.instructions,b.id node_id,b.name node_name,
        b.category,b.content,b.origin,b.review_status,b.confidence
       FROM brain_nodes b JOIN brain_nuclei n ON n.id=b.nucleus_id
       WHERE n.status='active' AND b.usable=1`,
    )
    .all();
}
