-- Keep new public installs domain-neutral without rewriting existing deployments.
-- A truly fresh install has no users and no live schedules when migrations run
-- (the documented setup creates the first admin after applying migrations).

UPDATE app_purposes_v2
SET active = 0
WHERE id IN ('APT','BUS','PAT','OTH')
  AND NOT EXISTS (SELECT 1 FROM app_users_v2)
  AND NOT EXISTS (SELECT 1 FROM app_schedules_v2 WHERE deleted_at IS NULL);

-- Remove the locale-specific 2026 Japan holiday sample only from untouched fresh installs.
-- Existing deployments keep their holiday data exactly as-is.
DELETE FROM app_holidays_v2
WHERE NOT EXISTS (SELECT 1 FROM app_users_v2)
  AND NOT EXISTS (SELECT 1 FROM app_schedules_v2 WHERE deleted_at IS NULL)
  AND (date, name) IN (
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
    ('2026-11-23','勤労感謝の日')
  );
