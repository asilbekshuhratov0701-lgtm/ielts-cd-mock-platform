-- Manual migration — apply once against production Postgres.
--
-- Adds Media.durationSec, the playable length of an audio file in whole
-- seconds. Listening attempts build their deadline from it so the exam clock
-- runs for exactly as long as the recording; a null falls back to the module's
-- fixed time limit, which is the behaviour every existing row keeps until its
-- audio is re-uploaded (or the column is backfilled).
--
-- Apply with:  psql "$DATABASE_URL" -f 002_media_duration.sql

ALTER TABLE "Media" ADD COLUMN IF NOT EXISTS "durationSec" INTEGER;
