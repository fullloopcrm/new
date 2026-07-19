# P1 SHARED CONTRACT — tenant_domains schema additions (2026-07-11)
# Both W1 (author migration/backfill) and W2 (resolver) build against THIS spec. Do not diverge.

Columns to ADD to tenant_domains (Postgres, using text + CHECK, NOT a native enum type):

- routing_mode  text  CHECK (routing_mode IN ('bespoke','template'))  NOT NULL DEFAULT 'template'
- vercel_project text NOT NULL
- status        text  CHECK (status IN ('active','pending','archived')) NOT NULL DEFAULT 'active'
- created_at    timestamptz NOT NULL DEFAULT now()
- updated_at    timestamptz NOT NULL DEFAULT now()

Migration rules:
- Add columns NULLABLE first, backfill every existing tenant_domains row, THEN apply NOT NULL/defaults where safe.
- Backfill routing_mode + vercel_project from the current source of truth (tenants.domain + middleware config / BESPOKE_SITE_TENANTS).
- Do NOT drop tenants.domain in this phase — it stays as the resolver fallback.

Resolver rules (W2):
- Read tenant_domains FIRST (match request host -> tenant_id), fall back to tenants.domain when no row.
- Treat routing_mode/vercel_project/status as plain text values with the CHECK-constrained domain above.
