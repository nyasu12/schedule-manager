-- Optional domain extensions are installed as templates but stay disabled on untouched fresh installs.
-- Existing deployments with users or live schedules keep their current extension state.

UPDATE app_purposes_v2
SET active = 0
WHERE enable_travel = 1
  AND NOT EXISTS (SELECT 1 FROM app_users_v2)
  AND NOT EXISTS (SELECT 1 FROM app_schedules_v2 WHERE deleted_at IS NULL);
