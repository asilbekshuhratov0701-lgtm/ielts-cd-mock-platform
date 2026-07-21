-- Manual migration — apply once against production Postgres.
--
-- Prisma schema cannot express a PARTIAL unique index, and this repo uses
-- `prisma db push` for local dev (no migrations history). These two partial
-- unique indexes enforce "at most one in-progress attempt per candidate" at the
-- database level, closing the start-race that the app-level check only narrows.
--
-- The start actions (startBlueprintAttemptAction / startMockAttemptAction)
-- already catch Prisma P2002 and fall through to the existing attempt, so once
-- these indexes exist a concurrent double-start is handled gracefully.
--
-- Apply with:  psql "$DATABASE_URL" -f 001_active_attempt_unique.sql

CREATE UNIQUE INDEX IF NOT EXISTS "one_active_blueprint_attempt"
  ON "BlueprintAttempt" ("blueprintId", "candidateId")
  WHERE "status" = 'in_progress';

CREATE UNIQUE INDEX IF NOT EXISTS "one_active_mock_attempt"
  ON "MockAttempt" ("mockExamId", "candidateId")
  WHERE "status" = 'in_progress';
