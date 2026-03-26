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
