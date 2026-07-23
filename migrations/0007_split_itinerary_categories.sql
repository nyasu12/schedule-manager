PRAGMA foreign_keys = OFF;

CREATE TABLE app_files_v2_new (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('face','ticket','itinerary','arrival_itinerary','departure_itinerary')),
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  r2_key TEXT NOT NULL UNIQUE,
  ocr_text TEXT,
  ocr_json TEXT,
  ocr_checked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO app_files_v2_new
(id,schedule_id,category,filename,mime_type,size_bytes,r2_key,ocr_text,ocr_json,ocr_checked_at,created_at)
SELECT id,schedule_id,category,filename,mime_type,size_bytes,r2_key,ocr_text,ocr_json,ocr_checked_at,created_at
FROM app_files_v2;

DROP TABLE app_files_v2;
ALTER TABLE app_files_v2_new RENAME TO app_files_v2;
CREATE INDEX IF NOT EXISTS idx_app_files_schedule ON app_files_v2(schedule_id);

PRAGMA foreign_keys = ON;
