PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS app_users_v2_new (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  iterations INTEGER NOT NULL DEFAULT 100000,
  role TEXT NOT NULL CHECK (role IN ('time_editor','manager','admin')),
  active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR REPLACE INTO app_users_v2_new(username,password_hash,salt,iterations,role,active,updated_at)
SELECT username,password_hash,salt,iterations,
       CASE WHEN role IN ('manager','admin','time_editor') THEN role ELSE 'manager' END,
       active,updated_at
FROM app_users_v2;

DROP TABLE app_users_v2;
ALTER TABLE app_users_v2_new RENAME TO app_users_v2;

PRAGMA foreign_keys = ON;
