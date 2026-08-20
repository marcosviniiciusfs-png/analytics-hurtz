CREATE TABLE IF NOT EXISTS response_feedback (
  id TEXT PRIMARY KEY,
  contact TEXT NOT NULL,
  message_id TEXT NOT NULL,
  rating TEXT NOT NULL CHECK(rating IN ('good','bad')),
  reason TEXT NOT NULL DEFAULT 'other',
  note TEXT NOT NULL DEFAULT '',
  ideal_response TEXT NOT NULL DEFAULT '',
  context_snapshot TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS response_feedback_contact_idx
  ON response_feedback(contact, updated_at DESC);
