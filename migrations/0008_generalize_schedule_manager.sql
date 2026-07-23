PRAGMA foreign_keys = OFF;

CREATE TABLE app_regions_v2_next (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);
INSERT INTO app_regions_v2_next (id,name,sort_order,active)
SELECT id,name,sort_order,1 FROM app_regions_v2;
DROP TABLE app_regions_v2;
ALTER TABLE app_regions_v2_next RENAME TO app_regions_v2;

CREATE TABLE app_purposes_v2_next (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  enable_travel INTEGER NOT NULL DEFAULT 0,
  require_flight INTEGER NOT NULL DEFAULT 0,
  require_time INTEGER NOT NULL DEFAULT 0,
  require_assignee INTEGER NOT NULL DEFAULT 0,
  require_resource INTEGER NOT NULL DEFAULT 0,
  enable_organization INTEGER NOT NULL DEFAULT 1
);
INSERT INTO app_purposes_v2_next (
  id,name,sort_order,active,enable_travel,require_flight,require_time,require_assignee,require_resource,enable_organization
)
SELECT
  id,name,
  CASE id
    WHEN 'BUS' THEN 80
    WHEN 'PAT' THEN 85
    WHEN 'APT' THEN 90
    WHEN 'OTH' THEN 99
    ELSE sort_order
  END,
  1,
  CASE WHEN id='APT' THEN 1 ELSE 0 END,
  CASE WHEN id='APT' THEN 1 ELSE 0 END,
  0,0,0,1
FROM app_purposes_v2;
DROP TABLE app_purposes_v2;
ALTER TABLE app_purposes_v2_next RENAME TO app_purposes_v2;

INSERT OR IGNORE INTO app_purposes_v2 (
  id,name,sort_order,active,enable_travel,require_flight,require_time,require_assignee,require_resource,enable_organization
) VALUES
  ('MEETING','会議',10,1,0,0,1,1,0,1),
  ('VISIT','訪問',20,1,0,0,1,1,0,1),
  ('TASK','作業',30,1,0,0,0,1,1,1),
  ('TRAVEL','出張・Travel',40,1,1,0,0,1,0,1);

CREATE TABLE app_schedules_v2_next (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  return_date TEXT,
  region_id TEXT NOT NULL,
  purpose_id TEXT NOT NULL,
  departure_time TEXT,
  workflow_status TEXT NOT NULL DEFAULT 'planned'
    CHECK (workflow_status IN ('draft','planned','confirmed','in_progress','done','cancelled')),
  other_content TEXT NOT NULL DEFAULT '',
  other_transport TEXT NOT NULL DEFAULT '',
  memo TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);
INSERT INTO app_schedules_v2_next (
  id,date,return_date,region_id,purpose_id,departure_time,workflow_status,other_content,other_transport,memo,created_at,updated_at,deleted_at
)
SELECT id,date,return_date,region_id,purpose_id,departure_time,'planned',other_content,other_transport,memo,created_at,updated_at,deleted_at
FROM app_schedules_v2;
DROP TABLE app_schedules_v2;
ALTER TABLE app_schedules_v2_next RENAME TO app_schedules_v2;
CREATE INDEX idx_app_schedules_date ON app_schedules_v2(date);

CREATE TABLE app_files_v2_next (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('attachment','face','ticket','itinerary','arrival_itinerary','departure_itinerary')),
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  r2_key TEXT NOT NULL UNIQUE,
  ocr_text TEXT,
  ocr_json TEXT,
  ocr_checked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO app_files_v2_next (
  id,schedule_id,category,filename,mime_type,size_bytes,r2_key,ocr_text,ocr_json,ocr_checked_at,created_at
)
SELECT id,schedule_id,category,filename,mime_type,size_bytes,r2_key,ocr_text,ocr_json,ocr_checked_at,created_at
FROM app_files_v2;
DROP TABLE app_files_v2;
ALTER TABLE app_files_v2_next RENAME TO app_files_v2;
CREATE INDEX idx_app_files_schedule ON app_files_v2(schedule_id);

PRAGMA foreign_keys = ON;
