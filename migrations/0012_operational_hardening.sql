-- v0.6 operational hardening: generic per-user capabilities, session invalidation,
-- auditable mutations, and recoverable R2/D1 file lifecycle state.

ALTER TABLE app_users_v2 ADD COLUMN session_nonce TEXT NOT NULL DEFAULT '';
UPDATE app_users_v2 SET session_nonce=lower(hex(randomblob(16))) WHERE session_nonce='';

CREATE TABLE IF NOT EXISTS app_user_capabilities_v1 (
  username TEXT NOT NULL,
  capability TEXT NOT NULL,
  allowed INTEGER NOT NULL CHECK (allowed IN (0,1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (username, capability)
);
CREATE INDEX IF NOT EXISTS idx_user_capabilities_username ON app_user_capabilities_v1(username);

CREATE TABLE IF NOT EXISTS app_audit_logs_v1 (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actor_username TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT '',
  target_id TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL,
  details_json TEXT,
  ip_address TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON app_audit_logs_v1(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created ON app_audit_logs_v1(actor_username,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category_created ON app_audit_logs_v1(category,created_at DESC);

ALTER TABLE app_files_v2 ADD COLUMN storage_state TEXT NOT NULL DEFAULT 'ready'
  CHECK (storage_state IN ('pending','ready','deleting'));
CREATE INDEX IF NOT EXISTS idx_files_storage_state ON app_files_v2(storage_state);
