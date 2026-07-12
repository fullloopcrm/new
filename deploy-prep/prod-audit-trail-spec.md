# Prod Audit Trail — Spec (DOCS ONLY — no DB writes)

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12
**Status:** design spec. No migration was written or run, no table was created. This defines the
shape for a leader-reviewed migration file; the leader runs it against prod after Jeff approves.

**Verification anchors read this pass:** `platform/src/lib/migrations/041_impersonation_audit.sql`
(existing `impersonation_events` table + comment), `platform/src/lib/migrations/046_rls_deny_on_new_tables.sql`
(deny-all RLS pattern applied to it), `platform/src/lib/tenant.ts` (`SUPER_ADMIN_IDS`, PIN-admin vs
Clerk-super-admin actor kinds), `platform/src/app/api/admin/tenants/route.ts` +
`platform/src/app/api/admin/tenants/[id]/route.ts` (tenant CRUD), `platform/src/app/api/admin/businesses/[id]/users/route.ts`
(role/member changes), `platform/src/app/api/admin/settings` + `platform/src/app/api/settings` (config/pricing edits),
`platform/CLAUDE.md` (global-operator-dashboard rule — one codebase, so audit needs to be tenant-scoped by data, not by deploy).

---

## 1. Why this is a separate table from `impersonation_events`

`impersonation_events` (migration 041) answers one narrow question: *"what did an admin do while wearing
a tenant's identity?"* It fires on every request while the `fl_impersonate` cookie is active, regardless
of whether that request actually changed anything.

This spec answers a broader, complementary question: *"what changed in prod, who changed it, and can we
reconstruct the before/after?"* It fires only on **mutations to sensitive resources**, whether or not
impersonation was active, and whether the actor is a PIN-admin, a Clerk super-admin, a tenant owner, or
an automated deploy/cron process. The two tables should co-exist and cross-reference by `request_id`
where both fire in the same request (impersonated admin editing tenant settings → one row in each table,
joinable).

---

## 2. Event categories to capture

| Category | Trigger examples (current routes) | Why it matters |
|---|---|---|
| **Tenant CRUD** | `POST/PATCH/DELETE /api/admin/tenants`, `/api/admin/tenants/[id]` | Tenant creation, domain freeze/unfreeze, deletion/deactivation directly affects a customer's live business. |
| **Config / pricing edits** | `/api/admin/settings/*`, `/api/settings/*`, per-unit pricing fields (flagged in `deploy-prep/per-unit-pricing-audit.md`) | Wrong price or config change is a revenue-impacting incident, not just a bug — needs a paper trail for "who changed the price and when." |
| **Role / membership changes** | `/api/admin/businesses/[id]/users`, any grant/revoke of `tenant_members.role`, `SUPER_ADMIN_IDS` env changes | Privilege escalation is the highest-value target for an attacker or a mistaken admin; must be independently reconstructable, not just inferred from current state. |
| **Deploys** | Vercel deploy webhook (not yet wired in-repo — see gap below), migration runs | "What code was live when this bug happened" is unanswerable today without cross-referencing git history and Vercel's own dashboard by hand. |
| **Impersonation** | Already covered by `impersonation_events` (041) | Kept as-is; joined via `request_id`, not duplicated. |
| **Auth/session events** | Clerk super-admin sign-in, PIN-admin unlock (`/api/admin-auth`) | Establishes the actor identity that later mutation rows reference; needed to detect a compromised PIN being used from an unfamiliar IP. |

**Deploy-event gap, flagged explicitly:** this repo has no Vercel deploy webhook receiver today (`find`
confirmed no route under `platform/src/app/api` matching `vercel` deploy hooks). Recording deploys
requires either (a) a new `/api/webhooks/vercel-deploy` route Jeff configures in the Vercel dashboard to
POST on each deploy, or (b) a lightweight `deploy_events` row inserted by the CI/CD step that runs
migrations. Out of scope to build here — noted as a prerequisite for the "deploys" row type to ever be
populated; the schema below reserves the `event_type` value so it isn't a later migration.

---

## 3. Schema shape

```sql
-- 0XX_prod_audit_trail.sql  (NOT RUN — file only, leader applies after review)

create table if not exists prod_audit_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid,                          -- correlates with impersonation_events row, if any
  event_type text not null check (event_type in (
    'tenant_create', 'tenant_update', 'tenant_delete', 'tenant_freeze', 'tenant_unfreeze',
    'config_update', 'pricing_update',
    'role_grant', 'role_revoke', 'member_add', 'member_remove',
    'deploy', 'migration_run',
    'auth_login', 'auth_login_failed'
  )),
  actor_kind text not null check (actor_kind in ('pin_admin', 'clerk_super_admin', 'tenant_owner', 'system')),
  actor_id text not null,                   -- Clerk user id, PIN-admin label, or 'cron'/'ci' for system
  tenant_id uuid references tenants(id) on delete set null,  -- null for platform-wide events (e.g. deploys)
  resource_type text,                        -- e.g. 'tenant', 'tenant_members', 'settings', 'pricing_config'
  resource_id text,
  before_value jsonb,                        -- snapshot of changed fields only, not full row (avoid PII bloat)
  after_value jsonb,
  path text,
  method text,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_prod_audit_events_tenant_time
  on prod_audit_events (tenant_id, created_at desc);

create index if not exists idx_prod_audit_events_actor_time
  on prod_audit_events (actor_id, created_at desc);

create index if not exists idx_prod_audit_events_type_time
  on prod_audit_events (event_type, created_at desc);

comment on table prod_audit_events is
  'Append-only audit log: who changed what in prod (tenant CRUD, config/pricing, role changes, deploys), '
  'independent of impersonation_events which covers request-level activity during admin impersonation.';
```

**Design choices, and why:**
- **Field-level diff (`before_value`/`after_value` on changed fields only), not full-row snapshots.**
  Full-row snapshots of `tenants` or `tenant_members` would duplicate PII (owner email, phone, address)
  into an audit table with different retention/access rules than the source table. Storing only the
  changed keys keeps the audit row small and avoids becoming a second, harder-to-govern copy of tenant PII.
- **`tenant_id` nullable.** Deploys and platform-wide config changes aren't tenant-scoped; forcing a
  tenant_id would mean either picking an arbitrary tenant or skipping the event. Null + a separate
  `resource_type = 'platform'` convention keeps the schema honest.
- **No foreign key to a `users` table for `actor_id`.** This codebase has no single `users` table — actors
  are Clerk user ids (super admin), a PIN-admin string label, or tenant owners resolved via `tenant_members`.
  `actor_id` stays a free-text column with `actor_kind` as the discriminator, mirroring the existing
  `impersonation_events.actor_kind` pattern (migration 041) rather than inventing a new convention.
- **Append-only, no update/delete path.** Same invariant as `impersonation_events` — an audit trail that
  can be edited by the thing it's auditing is worthless. No route in this codebase should ever `UPDATE`
  or `DELETE` a `prod_audit_events` row.

---

## 4. Retention

- **Default retention: 2 years**, matching the longest retention already implied by
  `deploy-prep/compliance-readiness-checklist.md` / `deploy-prep/secrets-inventory-and-rotation-plan.md`
  for financial and access records (align with whatever CPA/tax retention window Jeff confirms — this
  spec assumes 2 years pending that confirmation, flagged as unverified).
- **No hard delete via app code.** If retention trimming is needed, it should be a scheduled job that
  moves rows older than the retention window to cold storage (Storage bucket export, same pattern as
  the existing nightly per-tenant backup in `app/api/cron/backup/route.ts`), not a `DELETE ... WHERE
  created_at < ...` run ad hoc. Deleting audit rows without an export step destroys the evidence the
  table exists to preserve.
- **`role_grant`/`role_revoke` and `tenant_delete` rows are retained indefinitely**, exempted from the
  general trim job — these are the rows most likely to matter in a "who had access when" dispute long
  after 2 years, and they are low-volume enough that indefinite retention isn't a storage concern.

---

## 5. Who can read

- **RLS: deny-all by default**, identical pattern to `impersonation_events` (migration 046 —
  `alter table ... enable row level security; create policy "deny_all_..." on ... using (false)`). No
  anon/authenticated Postgres role should ever read this table directly.
- **Reads happen only through `supabaseAdmin` (service_role)**, gated by a new admin-only route
  (e.g. `/api/admin/audit-log`) that itself requires `SUPER_ADMIN_IDS` membership — the same gate already
  used for `/api/admin/tenants` and other platform-admin routes in `platform/src/lib/tenant.ts`.
- **No tenant owner read access in v1.** Tenant owners can already see admin activity that concerns them
  via `/dashboard/messages` (platform messaging) if an admin needs to explain a change. Exposing raw audit
  rows to tenant owners is a v2 consideration once PII scoping in `before_value`/`after_value` is reviewed
  — flagged, not built here, to avoid scope creep beyond what was asked.
- **PIN-admins see only rows where `actor_kind = 'pin_admin'` and `actor_id` matches their own label**,
  if PIN-admins are ever given any audit visibility at all — Clerk super-admins see everything. This
  mirrors the existing trust asymmetry between the two actor kinds already encoded in `tenant.ts`
  (`SUPER_ADMIN_IDS` gates the highest-privilege actions).

---

## 6. What this spec does NOT cover (explicitly out of scope)

- Building the Vercel deploy webhook receiver (§2 gap) — a prerequisite, not part of this spec.
- Wiring the actual `INSERT` calls into each of the ~6 route families listed in §2 — that's an
  implementation task for whichever worker/lane owns tenant CRUD, settings, and role-change routes.
  This spec defines the target table and event taxonomy so that implementation doesn't invent its own.
- Building the `/api/admin/audit-log` read UI — noted as the consumer in §5, not designed here.
