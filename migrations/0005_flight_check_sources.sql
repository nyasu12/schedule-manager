-- v0.3.8: store where the latest flight verification came from.
ALTER TABLE app_flights_v2 ADD COLUMN check_source TEXT NOT NULL DEFAULT '';
ALTER TABLE app_flights_v2 ADD COLUMN check_url TEXT NOT NULL DEFAULT '';
ALTER TABLE app_flights_v2 ADD COLUMN check_note TEXT NOT NULL DEFAULT '';
