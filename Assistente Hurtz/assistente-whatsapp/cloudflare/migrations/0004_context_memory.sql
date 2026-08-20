ALTER TABLE brain_nodes ADD COLUMN risk_level TEXT NOT NULL DEFAULT 'normal';

CREATE INDEX IF NOT EXISTS brain_nodes_active_search_idx
  ON brain_nodes(nucleus_id, usable, review_status);
