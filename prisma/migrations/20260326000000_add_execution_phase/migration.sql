-- AlterTable: add assignee to checklist_items
ALTER TABLE "checklist_items" ADD COLUMN "assignee" VARCHAR(100);

-- CreateTable: milestones
CREATE TABLE "milestones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "name" VARCHAR(300) NOT NULL,
    "planned_date" DATE NOT NULL,
    "actual_date" DATE,
    "status" VARCHAR(20) NOT NULL DEFAULT 'not_started',
    "notes" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable: change_requests
CREATE TABLE "change_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT NOT NULL,
    "impact_type" VARCHAR(20) NOT NULL,
    "impact_days" INTEGER,
    "impact_cost" DECIMAL(12,0),
    "impact_detail" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "decision_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "decision_date" DATE,
    "decision_notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "milestones_project_id_idx" ON "milestones"("project_id");
CREATE INDEX "change_requests_project_id_idx" ON "change_requests"("project_id");

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
