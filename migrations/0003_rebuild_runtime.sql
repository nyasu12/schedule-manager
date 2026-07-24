PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_users_v2 (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  iterations INTEGER NOT NULL DEFAULT 100000,
  role TEXT NOT NULL CHECK (role IN ('manager','admin')),
  active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_regions_v2 (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS app_purposes_v2 (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS app_holidays_v2 (
  date TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_companies_v2 (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#1769df',
  active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_stores_v2 (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT '',
  code TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_employees_v2 (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  region_id TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_cars_v2 (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  region_id TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_schedules_v2 (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  return_date TEXT,
  region_id TEXT NOT NULL,
  purpose_id TEXT NOT NULL,
  departure_time TEXT,
  other_content TEXT NOT NULL DEFAULT '',
  other_transport TEXT NOT NULL DEFAULT '',
  memo TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS app_schedule_stores_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_id TEXT NOT NULL,
  company_id TEXT NOT NULL DEFAULT '',
  store_id TEXT NOT NULL DEFAULT '',
  arrival_count INTEGER NOT NULL DEFAULT 0,
  departure_count INTEGER NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS app_schedule_employees_v2 (
  schedule_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  PRIMARY KEY (schedule_id, employee_id)
);

CREATE TABLE IF NOT EXISTS app_schedule_cars_v2 (
  schedule_id TEXT NOT NULL,
  car_id TEXT NOT NULL,
  PRIMARY KEY (schedule_id, car_id)
);

CREATE TABLE IF NOT EXISTS app_flights_v2 (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  airline_code TEXT NOT NULL DEFAULT '',
  flight_number TEXT NOT NULL DEFAULT '',
  flight_date TEXT NOT NULL DEFAULT '',
  origin TEXT NOT NULL DEFAULT '',
  destination TEXT NOT NULL DEFAULT '',
  scheduled_departure TEXT NOT NULL DEFAULT '',
  changed_departure TEXT NOT NULL DEFAULT '',
  scheduled_arrival TEXT NOT NULL DEFAULT '',
  changed_arrival TEXT NOT NULL DEFAULT '',
  terminal TEXT NOT NULL DEFAULT '',
  gate TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT '未確認',
  reservation_number TEXT NOT NULL DEFAULT '',
  last_checked_at TEXT
);

CREATE TABLE IF NOT EXISTS app_files_v2 (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('face','ticket','itinerary')),
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  r2_key TEXT NOT NULL UNIQUE,
  ocr_text TEXT,
  ocr_json TEXT,
  ocr_checked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_usage_v2 (
  kind TEXT NOT NULL,
  month TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (kind, month)
);

CREATE INDEX IF NOT EXISTS idx_app_schedules_date ON app_schedules_v2(date);
CREATE INDEX IF NOT EXISTS idx_app_schedule_stores_schedule ON app_schedule_stores_v2(schedule_id);
CREATE INDEX IF NOT EXISTS idx_app_flights_schedule ON app_flights_v2(schedule_id);
CREATE INDEX IF NOT EXISTS idx_app_files_schedule ON app_files_v2(schedule_id);

INSERT OR IGNORE INTO app_regions_v2 (id,name,sort_order) VALUES
  ('AREA_EAST','東エリア',10),
  ('AREA_WEST','西エリア',20);

INSERT OR IGNORE INTO app_purposes_v2 (id,name,sort_order) VALUES
  ('APT','空港送迎',10),
  ('BUS','出張',20),
  ('PAT','巡回',30),
  ('OTH','その他',40);

INSERT OR IGNORE INTO app_holidays_v2 (date,name) VALUES
  ('2026-01-01','元日'),
  ('2026-01-12','成人の日'),
  ('2026-02-11','建国記念の日'),
  ('2026-02-23','天皇誕生日'),
  ('2026-03-20','春分の日'),
  ('2026-04-29','昭和の日'),
  ('2026-05-03','憲法記念の日'),
  ('2026-05-04','みどりの日'),
  ('2026-05-05','こどもの日'),
  ('2026-05-06','休日'),
  ('2026-07-20','海の日'),
  ('2026-08-11','山の日'),
  ('2026-09-21','敬老の日'),
  ('2026-09-22','休日'),
  ('2026-09-23','秋分の日'),
  ('2026-10-12','スポーツの日'),
  ('2026-11-03','文化の日'),
  ('2026-11-23','勤労感謝の日');
