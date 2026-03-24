-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "location" VARCHAR(300) NOT NULL,
    "capacity_mw" DECIMAL(10,2),
    "capacity_mwh" DECIMAL(10,2),
    "phase" VARCHAR(20) NOT NULL,
    "target_signing_date" DATE,
    "target_start_date" DATE,
    "target_end_date" DATE,
    "notes" TEXT,
    "is_high_risk" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "template_id" UUID,
    "name" VARCHAR(300) NOT NULL,
    "category" VARCHAR(20) NOT NULL,
    "phase" VARCHAR(20) NOT NULL,
    "risk_description" TEXT NOT NULL,
    "deadline" DATE,
    "is_complete" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMPTZ,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" UUID NOT NULL,
    "checklist_item_id" UUID NOT NULL,
    "original_name" VARCHAR(500) NOT NULL,
    "stored_name" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_templates" (
    "id" UUID NOT NULL,
    "name" VARCHAR(300) NOT NULL,
    "category" VARCHAR(20) NOT NULL,
    "phase" VARCHAR(20) NOT NULL,
    "risk_description" TEXT NOT NULL,
    "default_days" INTEGER NOT NULL DEFAULT 30,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "checklist_items_project_id_idx" ON "checklist_items"("project_id");

-- CreateIndex
CREATE INDEX "attachments_checklist_item_id_idx" ON "attachments"("checklist_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_templates_name_phase_key" ON "checklist_templates"("name", "phase");

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "checklist_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_checklist_item_id_fkey" FOREIGN KEY ("checklist_item_id") REFERENCES "checklist_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

┌─────────────────────────────────────────────────────────┐
│  Update available 5.22.0 -> 7.5.0                       │
│                                                         │
│  This is a major update - please follow the guide at    │
│  https://pris.ly/d/major-version-upgrade                │
│                                                         │
│  Run the following to update                            │
│    npm i --save-dev prisma@latest                       │
│    npm i @prisma/client@latest                          │
└─────────────────────────────────────────────────────────┘
