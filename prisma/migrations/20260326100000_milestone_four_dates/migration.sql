-- Rename planned_date to planned_start_date
ALTER TABLE "milestones" RENAME COLUMN "planned_date" TO "planned_start_date";

-- Rename actual_date to actual_end_date
ALTER TABLE "milestones" RENAME COLUMN "actual_date" TO "actual_end_date";

-- Add planned_end_date (NOT NULL, default to planned_start_date initially)
ALTER TABLE "milestones" ADD COLUMN "planned_end_date" DATE;
UPDATE "milestones" SET "planned_end_date" = "planned_start_date" WHERE "planned_end_date" IS NULL;
ALTER TABLE "milestones" ALTER COLUMN "planned_end_date" SET NOT NULL;

-- Add actual_start_date
ALTER TABLE "milestones" ADD COLUMN "actual_start_date" DATE;
