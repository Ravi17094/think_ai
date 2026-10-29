-- Additive and safe to re-run; review against staging before applying there.
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "completionThreshold" DOUBLE PRECISION NOT NULL DEFAULT 90;
