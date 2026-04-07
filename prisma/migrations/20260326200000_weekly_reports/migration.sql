CREATE TABLE "weekly_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "content" TEXT NOT NULL,
    "report_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "weekly_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "weekly_reports_project_id_idx" ON "weekly_reports"("project_id");

ALTER TABLE "weekly_reports" ADD CONSTRAINT "weekly_reports_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
