-- Manual migration — apply once against production Postgres.
--
-- Moves password reset from an emailed magic link to an emailed six-digit code.
-- The row now holds the code's hash plus the guard rails that make a six-digit
-- secret safe: an attempt counter, a verified marker, and the last-sent stamp
-- behind the resend cooldown. tokenHash stops being the emailed secret and
-- becomes the one-time ticket minted only after the code is entered correctly,
-- so it must now be nullable.
--
-- In-flight reset links are dropped: they carry no code and could never be
-- completed under the new flow. Anyone mid-reset simply requests a new code.
--
-- Apply with:  psql "$DATABASE_URL" -f 003_password_reset_codes.sql

DELETE FROM "PasswordResetToken";

ALTER TABLE "PasswordResetToken" ALTER COLUMN "tokenHash" DROP NOT NULL;
ALTER TABLE "PasswordResetToken" ADD COLUMN IF NOT EXISTS "codeHash" TEXT NOT NULL;
ALTER TABLE "PasswordResetToken" ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PasswordResetToken" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);
ALTER TABLE "PasswordResetToken"
  ADD COLUMN IF NOT EXISTS "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
