PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS knowledge_documents (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  title TEXT NOT NULL,
  pages INTEGER NOT NULL DEFAULT 0,
  characters INTEGER NOT NULL DEFAULT 0,
  storage_key TEXT,
  status TEXT NOT NULL DEFAULT 'ready',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(document_id, position)
);

CREATE INDEX IF NOT EXISTS knowledge_chunks_document_idx
  ON knowledge_chunks(document_id, position);

CREATE TABLE IF NOT EXISTS whatsapp_instances (
  id TEXT PRIMARY KEY,
  evolution_name TEXT UNIQUE NOT NULL CHECK(evolution_name LIKE 'hurtz-%'),
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  instance_name TEXT NOT NULL,
  whatsapp_id TEXT NOT NULL,
  push_name TEXT,
  mode TEXT NOT NULL DEFAULT 'bot' CHECK(mode IN ('bot', 'human', 'paused')),
  summary TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(instance_name, whatsapp_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  instance_name TEXT NOT NULL,
  whatsapp_id TEXT NOT NULL,
  external_id TEXT,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system', 'human')),
  format TEXT NOT NULL DEFAULT 'text',
  content TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(instance_name, external_id)
);

CREATE INDEX IF NOT EXISTS messages_conversation_idx
  ON messages(instance_name, whatsapp_id, created_at DESC);

CREATE TABLE IF NOT EXISTS memory_cache (
  cache_key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  expires_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS memory_cache_expiry_idx ON memory_cache(expires_at);
