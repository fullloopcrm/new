# Prod change audit trail — spec (analysis/design only, no DDL run)

**Author:** W4 · file-only, no push/deploy/DB · 2026-07-12
**Ask:** define a general who-changed-what-in-prod trail. `impersonation_events`
already covers one narrow case (admin session touching tenant data); this
proposes the general one.

## 1. What already exists, and why it isn't enough

| Existing table | Covers | Why it can't be the general prod-change trail |
|---|---|---|
| `audit_logs` (`005_audit_logs.sql`) | Per-tenant **business** actions — `booking.created`, `client.updated`, `payment.received`, etc., written by `src/lib/audit.ts` | `tenant_id UUID NOT NULL` — structurally cannot record a change that isn't scoped to one tenant. A schema migration, an env var rotation, an RPC grant change, or a cross-tenant admin config edit has no single tenant to attach it to. |
| `impersonation_events` (`041_impersonation_audit.sql`) | Every API request made while an admin's `fl_impersonate` cookie is active — actor, tenant, path, method, ip, UA | Scoped specifically to **impersonation sessions reading/writing tenant data as that tenant**. Says nothing about migrations, deploys, config, secrets, or platform-level admin actions taken *without* impersonating a tenant. |

Neither table can answer "who ran migration 060 against prod, and when" or
"who flipped `IMPERSONATION_ALLOW_UNSIGNED` in Vercel env, and when" or "who
changed tenant X's plan from trial to paid." That's the gap.

## 2. Proposed table: `prod_change_events`

Append-only, platform-scoped (not tenant-scoped), service-role-write-only.

```sql
CREATE TABLE prod_change_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- WHO
  actor_kind     TEXT NOT NULL CHECK (actor_kind IN
                    ('human', 'leader_agent', 'worker_agent', 'ci_pipeline')),
  actor_id       TEXT NOT NULL,   -- e.g. 'jeff', 'leader', 'W1', 'github-actions[run-id]'

  -- WHAT
  change_type    TEXT NOT NULL CHECK (change_type IN (
                    'schema_migration', 'rpc_grant_change', 'env_var_change',
                    'feature_flag_toggle', 'tenant_config_change',
                    'manual_db_write', 'deploy', 'rollback', 'secret_rotation'
                  )),
  target         TEXT NOT NULL,   -- e.g. migration filename, function name, env var
                                    -- name, tenant id, deploy target
  tenant_id      UUID REFERENCES tenants(id) ON DELETE SET NULL,  -- NULLABLE:
                    -- populated when the change targets one tenant
                    -- (e.g. tenant_config_change); NULL for platform-wide
                    -- changes (a migration, an env var, a full deploy).

  -- DETAIL
  before_value   JSONB,           -- redact secrets before writing (see §4)
  after_value    JSONB,
  summary        TEXT,            -- one-line human summary for fast scanning

  -- PROVENANCE
  source_ref     TEXT,            -- git commit sha / branch / PR URL / migration path
  approved_by    TEXT,            -- e.g. 'jeff' — who authorized the action
                                    -- (matches this repo's existing convention:
                                    -- "file only — leader runs this after Jeff's
                                    -- approval", see 060_lockdown_secdef_rpcs.sql)
  approval_ref   TEXT,            -- link/id to the approval (Slack msg, chat line, PR review)

  -- CONTEXT
  environment    TEXT NOT NULL DEFAULT 'production'
                    CHECK (environment IN ('production', 'staging')),
  ip             INET,
  session_ref    TEXT,            -- e.g. worker session id, so a row can be
                                    -- traced back to the exact agent conversation

  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prod_change_events_time        ON prod_change_events (created_at DESC);
CREATE INDEX idx_prod_change_events_actor_time   ON prod_change_events (actor_id, created_at DESC);
CREATE INDEX idx_prod_change_events_tenant_time  ON prod_change_events (tenant_id, created_at DESC)
  WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_prod_change_events_type_time    ON prod_change_events (change_type, created_at DESC);

COMMENT ON TABLE prod_change_events IS
  'Append-only audit log: every prod-affecting change (schema, grants, env, '
  'config, deploy) with who/what/when/approved-by. Platform-scoped sibling to '
  'impersonation_events (session-scoped) and audit_logs (tenant-scoped).';

-- Append-only: no UPDATE/DELETE grants to any role, ever. service_role INSERT
-- only. No authenticated/anon access at all — this is an ops table, not
-- tenant-visible data.
REVOKE ALL ON prod_change_events FROM PUBLIC, authenticated, anon;
GRANT INSERT, SELECT ON prod_change_events TO service_role;
ALTER TABLE prod_change_events ENABLE ROW LEVEL SECURITY;
-- No policies created = default-deny for every role except service_role
-- (service_role bypasses RLS by design, same as every other table in this repo).
```

Design choices, and why:

- **`tenant_id` nullable**, unlike `audit_logs`. Most prod changes (a
  migration, an env var, a full deploy) aren't about one tenant. When a change
  *is* tenant-scoped (e.g. flipping one tenant's plan or domain), fill it in —
  that gives per-tenant queryability without forcing every row through a fake
  tenant.
- **`actor_kind` distinguishes human vs. agent vs. CI**, because this repo's
  actual change-execution model is multi-agent (LEADER + workers W1–W6
  preparing files, a human approving, the leader executing) — a real audit
  trail has to represent "worker prepared this, leader ran it, Jeff approved
  it" as three distinct facts, not collapse them into one `user_id` string the
  way `audit_logs` does.
- **`approved_by` / `approval_ref` are separate from `actor_id`** on purpose —
  the actor who runs the DDL (leader) is very often not the approver (Jeff).
  Every migration header I found in this repo already states this two-party
  pattern in a comment (`-- File only — the leader runs this against prod
  after Jeff's approval`); this table makes that a queryable fact instead of a
  comment.
- **`source_ref`** ties the row back to the actual file/commit, so "who
  changed what" always resolves to a diffable artifact, not just a
  free-text description.
- **Append-only, service-role-only, no RLS policies** — same posture as
  `impersonation_events`: this is the log admins can't quietly edit,
  including a compromised admin account.

## 3. Where rows get written from

Prod changes in this repo don't happen through a normal app request — they
happen through a human/agent running a migration file, changing a Vercel env
var, or toggling a setting via `/admin`. Three write paths, in order of
priority:

1. **Migration self-logging (highest value, lowest effort).** Every new
   prod-facing migration file gets a final statement:
   ```sql
   INSERT INTO prod_change_events
     (actor_kind, actor_id, change_type, target, source_ref, approved_by, summary)
   VALUES ('leader_agent', 'leader', 'schema_migration',
           '060_lockdown_secdef_rpcs.sql', 'p1-w1@<commit-sha>', 'jeff',
           'Revoke authenticated EXECUTE + pin search_path on 2 SECURITY DEFINER fns');
   ```
   This requires zero new tooling — just a convention added to the migration
   template/checklist. It's the single highest-leverage step since **every**
   prod DDL in this codebase already goes through a reviewed file first.

2. **`/admin` platform-config writes** (tenant plan/domain/feature changes
   made through the admin UI, not raw SQL): add one `prod_change_events`
   insert alongside the existing update, the same way `src/lib/audit.ts`'s
   `audit()` helper is already called alongside business-data writes. A thin
   `logProdChange({...})` helper mirroring `audit()`'s shape covers this with
   one new ~20-line file.

3. **Env var / secret rotation and deploys** — these happen outside the app
   entirely (Vercel dashboard, CLI). These can't self-log from inside the
   app. Two options, not mutually exclusive:
   - A small `scripts/log-prod-change.ts` CLI the leader runs immediately
     before/after an env var change or deploy (`npm run log-prod-change --
     env_var_change TELNYX_API_KEY --approved-by jeff`), OR
   - A Vercel deploy-hook / GitHub Actions step that inserts a `deploy` row
     automatically on every production deploy (actor_kind='ci_pipeline',
     source_ref=commit sha) — this one should be automated rather than
     manual, since deploys are frequent and manual logging will be skipped
     under time pressure.

## 4. Secret handling in `before_value`/`after_value`

Never store raw secret values. For `env_var_change` / `secret_rotation` rows,
`before_value`/`after_value` must hold only a fingerprint (e.g. last 4 chars +
SHA-256 prefix), never the plaintext — mirroring how `decryptSecret`/
`secret-crypto.ts` already treat tenant-level secrets in this repo. This is a
hard constraint on the write helper, not left to whoever calls it.

## 5. Relationship diagram

```
                     WHO changed something in prod?
                                  │
              ┌───────────────────┼────────────────────┐
              │                   │                     │
      admin impersonating   admin/agent making a    normal tenant-user
      a tenant's account    platform-level change    business action
              │                   │                     │
   impersonation_events   prod_change_events (NEW)    audit_logs
   (session + tenant-     (schema/env/config/         (tenant_id NOT NULL,
    scoped, per-request)   deploy, tenant_id NULLABLE)  per-tenant actions)
```

`prod_change_events` is the missing middle layer: platform-scoped instead of
tenant-scoped, change-of-infrastructure instead of change-of-business-data,
and explicitly modeling the actor/approver split this repo's whole
prepare-then-leader-executes-then-Jeff-approves workflow already relies on.

## 6. Not in scope for this file

No DDL was run. No table was created. This is the proposal only — the leader
should review, and if approved, prepare the actual `CREATE TABLE` migration
(likely numbered after the current highest migration on whichever branch
ships) and wire up the three write paths in §3 as separate, reviewable work.
