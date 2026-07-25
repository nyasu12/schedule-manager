-- v0.5 platform architecture: canonical core views, generic extension registry,
-- custom fields, deployment settings, and Travel-owned participant counts.

CREATE TABLE IF NOT EXISTS app_extensions_v1 (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1',
  installed INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  config_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_purpose_extensions_v1 (
  purpose_id TEXT NOT NULL,
  extension_id TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0,
  config_json TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY (purpose_id, extension_id)
);

INSERT OR IGNORE INTO app_extensions_v1(id,name,version,installed,sort_order,config_json)
VALUES ('travel','Travel','1',1,100,'{}');

INSERT OR IGNORE INTO app_purpose_extensions_v1(purpose_id,extension_id,enabled,config_json)
SELECT id,'travel',CASE WHEN enable_travel=1 THEN 1 ELSE 0 END,
       CASE WHEN require_flight=1 THEN '{"requireFlight":true}' ELSE '{"requireFlight":false}' END
FROM app_purposes_v2;

CREATE TABLE IF NOT EXISTS app_custom_fields_v1 (
  id TEXT PRIMARY KEY,
  purpose_id TEXT NOT NULL DEFAULT '',
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text'
    CHECK (field_type IN ('text','number','date','time','boolean','url','select')),
  required INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  options_json TEXT NOT NULL DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (purpose_id, field_key)
);

CREATE TABLE IF NOT EXISTS app_schedule_custom_values_v1 (
  schedule_id TEXT NOT NULL,
  field_id TEXT NOT NULL,
  value_text TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (schedule_id, field_id)
);
CREATE INDEX IF NOT EXISTS idx_custom_values_schedule ON app_schedule_custom_values_v1(schedule_id);

CREATE TABLE IF NOT EXISTS app_settings_v1 (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO app_settings_v1(key,value) VALUES
  ('locale','auto'),
  ('timezone','UTC');

CREATE TABLE IF NOT EXISTS travel_schedule_location_counts_v1 (
  schedule_id TEXT NOT NULL,
  organization_id TEXT NOT NULL DEFAULT '',
  location_id TEXT NOT NULL DEFAULT '',
  arrival_count INTEGER NOT NULL DEFAULT 0,
  departure_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (schedule_id, organization_id, location_id)
);

INSERT OR IGNORE INTO travel_schedule_location_counts_v1(
  schedule_id,organization_id,location_id,arrival_count,departure_count
)
SELECT schedule_id,company_id,store_id,arrival_count,departure_count
FROM app_schedule_stores_v2
WHERE arrival_count <> 0 OR departure_count <> 0;

-- Canonical domain-neutral read model. Existing physical tables stay intact so
-- populated deployments can migrate incrementally without destructive renames.
CREATE VIEW IF NOT EXISTS core_areas_v1 AS
SELECT id,name,sort_order,active FROM app_regions_v2;

CREATE VIEW IF NOT EXISTS core_schedule_types_v1 AS
SELECT id,name,sort_order,active,require_time,require_assignee,require_resource,enable_organization
FROM app_purposes_v2;

CREATE VIEW IF NOT EXISTS core_organizations_v1 AS
SELECT id,code,name,color,active,updated_at FROM app_companies_v2;

CREATE VIEW IF NOT EXISTS core_locations_v1 AS
SELECT id,company_id AS organization_id,code,name,active,updated_at FROM app_stores_v2;

CREATE VIEW IF NOT EXISTS core_assignees_v1 AS
SELECT id,name,region_id AS area_id,active,updated_at FROM app_employees_v2;

CREATE VIEW IF NOT EXISTS core_resources_v1 AS
SELECT id,name,region_id AS area_id,active,updated_at FROM app_cars_v2;

CREATE VIEW IF NOT EXISTS core_schedules_v1 AS
SELECT id,date,return_date,region_id AS area_id,purpose_id AS schedule_type_id,
       departure_time AS start_time,workflow_status,other_content,other_transport,memo,
       created_at,updated_at,deleted_at
FROM app_schedules_v2;

CREATE VIEW IF NOT EXISTS core_schedule_locations_v1 AS
SELECT id,schedule_id,company_id AS organization_id,store_id AS location_id,note
FROM app_schedule_stores_v2;

CREATE VIEW IF NOT EXISTS core_schedule_assignees_v1 AS
SELECT schedule_id,employee_id AS assignee_id FROM app_schedule_employees_v2;

CREATE VIEW IF NOT EXISTS core_schedule_resources_v1 AS
SELECT schedule_id,car_id AS resource_id FROM app_schedule_cars_v2;
