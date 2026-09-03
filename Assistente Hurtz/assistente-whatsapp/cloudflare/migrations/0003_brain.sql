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
  nucleus_id TEXT NOT NULL REFERENCES brain_nuclei(id) ON DELETE CASCADE,
  parent_id TEXT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  origin TEXT NOT NULL DEFAULT 'ai',
  review_status TEXT NOT NULL DEFAULT 'pending',
  usable INTEGER NOT NULL DEFAULT 1,
  confidence REAL NOT NULL DEFAULT 0.5,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS brain_nodes_nucleus_idx
  ON brain_nodes(nucleus_id, parent_id);
