#!/bin/sh
set -e

echo "Waiting for database..."
until pg_isready -h db -p 5432 -U bess -q 2>/dev/null; do
  sleep 1
done
echo "Database ready."

# Apply migrations using raw SQL
echo "Applying database migrations..."
PGPASSWORD=bess_password_tokyo_2026 psql -h db -U bess -d bess_risk -f /app/prisma/migrations/20260324000000_init/migration.sql 2>/dev/null || echo "Migration 1 (init) already applied."
PGPASSWORD=bess_password_tokyo_2026 psql -h db -U bess -d bess_risk -f /app/prisma/migrations/20260326000000_add_execution_phase/migration.sql 2>/dev/null || echo "Migration 2 (execution phase) already applied."
PGPASSWORD=bess_password_tokyo_2026 psql -h db -U bess -d bess_risk -f /app/prisma/migrations/20260326100000_milestone_four_dates/migration.sql 2>/dev/null || echo "Migration 3 (milestone four dates) already applied."

# Migration 4: v3 features — payments, contracts, documents, photos, milestone enhancements
echo "Applying migration 4 (v3 features)..."
PGPASSWORD=bess_password_tokyo_2026 psql -h db -U bess -d bess_risk <<'EOSQL' 2>/dev/null || true
CREATE TABLE IF NOT EXISTS payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description VARCHAR(500) NOT NULL,
  planned_amount DECIMAL(14,2) NOT NULL,
  planned_date DATE NOT NULL,
  actual_amount DECIMAL(14,2),
  actual_date DATE,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_records_project_id ON payment_records(project_id);

CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category VARCHAR(20) DEFAULT 'incoming',
  name VARCHAR(300) NOT NULL,
  original_name VARCHAR(500) NOT NULL,
  stored_name VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INTEGER NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contracts_project_id ON contracts(project_id);

CREATE TABLE IF NOT EXISTS project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category VARCHAR(30) NOT NULL,
  name VARCHAR(300) NOT NULL,
  original_name VARCHAR(500) NOT NULL,
  stored_name VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INTEGER NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_documents_project_id ON project_documents(project_id);

CREATE TABLE IF NOT EXISTS site_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description VARCHAR(500),
  original_name VARCHAR(500) NOT NULL,
  stored_name VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INTEGER NOT NULL,
  taken_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_site_photos_project_id ON site_photos(project_id);

ALTER TABLE milestones ALTER COLUMN planned_start_date DROP NOT NULL;
ALTER TABLE milestones ALTER COLUMN planned_end_date DROP NOT NULL;
ALTER TABLE milestones ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS is_hard_gate BOOLEAN DEFAULT false;
EOSQL

# Create _prisma_migrations table if needed (so Prisma client doesn't complain)
PGPASSWORD=bess_password_tokyo_2026 psql -h db -U bess -d bess_risk -c "
CREATE TABLE IF NOT EXISTS _prisma_migrations (
  id VARCHAR(36) PRIMARY KEY,
  checksum VARCHAR(64) NOT NULL,
  finished_at TIMESTAMPTZ,
  migration_name VARCHAR(255) NOT NULL,
  logs TEXT,
  rolled_back_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_steps_count INTEGER NOT NULL DEFAULT 0
);
INSERT INTO _prisma_migrations (id, checksum, migration_name, applied_steps_count, finished_at)
VALUES ('init', 'manual', '20260324000000_init', 1, now())
ON CONFLICT DO NOTHING;
" 2>/dev/null || true

echo "Starting application..."
exec node server.js
