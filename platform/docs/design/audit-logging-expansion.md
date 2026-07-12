# Audit-Logging Expansion (P9)

**Status:** Design + library only. Not wired into any route. Table DDL prepared, not executed.
**Date:** 2026-07-12
**Owner:** W5 (deploy-prep lane)

## Problem

Today the only tenant-scoped audit trail is `impersonation_events`
(`src/lib/migrations/041_impersonation_audit.sql`, written by `logImpersonationEvent`
in `src/lib/tenant-query.ts`). It answers exactly one question:

> Which tenants did an admin touch while an `fl_impersonate` cookie was active?

It does **not** answer:

- What did a tenant **owner** or **member** change? (No log at all — the common case is invisible.)
- What did the **Jefe** agent write on a tenant's behalf?
- What did a background job / webhook mutate?
- For a given resource, **who** changed it and **when** — the field-level "who set this to that."

For incident response, dispute resolution, and "a compromised account left evidence"
guarantees, we need a write-audit that covers **every** actor, not just impersonation.

## Approach

Generalize the impersonation pattern rather than invent a new one:

| | `impersonation_events` (existing) | `tenant_write_events` (new) |
|---|---|---|
| Trigger | Every request under an active impersonation cookie | Every tenant-**write** action |
| Actors | pin_admin, clerk_super_admin | owner, member, pin_admin, clerk_super_admin, jefe, system |
| Granularity | Per request (path/method) | Per action (resource + verb + diff) |
| Write path | `logImpersonationEvent` (best-effort insert) | `logTenantWrite` (best-effort insert) |
| Access | Service-role only | Service-role only (RLS deny-by-default) |

The two are complementary and overlap deliberately: a write made while impersonating
produces **both** an `impersonation_events` row (request-level) and a
`tenant_write_events` row with `via_impersonation = true` (action-level).

## Deliverables in this change (new files only)

1. `src/lib/migrations/2026_07_12_tenant_write_audit.sql` — the `tenant_write_events` table (prepared DDL, **not executed**).
2. `src/lib/audit-log.ts` — `logTenantWrite()` + `logTenantWriteFromContext()`, best-effort, never throws.
3. This document.

Nothing existing was modified. No route calls the logger yet — see **Rollout** below.

## Schema

See the migration for authoritative DDL. Shape:

```
tenant_write_events(
  id                uuid pk,
  tenant_id         uuid not null → tenants(id) on delete cascade,
  actor_kind        text not null check in (owner|member|pin_admin|clerk_super_admin|jefe|system),
  actor_id          text not null,
  action            text not null,        -- '<resource>.<verb>'
  resource_type     text,
  resource_id       text,                 -- text: some resources keyed by slug/composite
  via_impersonation boolean not null default false,
  path, method, ip, user_agent,           -- request provenance, mirrors impersonation_events
  meta              jsonb not null default '{}',
  created_at        timestamptz not null default now()
)
```

Indexes: `(tenant_id, created_at desc)`, `(actor_id, created_at desc)`, `(action, created_at desc)`.

## Action taxonomy

`action` is a dot-namespaced verb: `<resource>.<verb>`. Keep verbs consistent so
queries and dashboards stay predictable. Starter set (extend as routes adopt it):

| Resource | Verbs |
|---|---|
| `job` | `create`, `update`, `reschedule`, `cancel`, `complete`, `delete` |
| `customer` | `create`, `update`, `merge`, `delete` |
| `invoice` | `create`, `send`, `void`, `refund` |
| `payment` | `capture`, `refund` |
| `settings` | `update` |
| `member` | `invite`, `role_change`, `remove` |
| `tenant` | `update` |

Reads are intentionally out of scope — this is a **write** audit. High-volume read
logging belongs to a different (sampled/aggregated) mechanism if ever needed.

## Library usage

```ts
import { logTenantWrite, logTenantWriteFromContext } from '@/lib/audit-log'

// Explicit — any actor kind:
await logTenantWrite({
  tenantId, actorKind: 'jefe', actorId: 'jefe',
  action: 'job.reschedule', resourceType: 'job', resourceId: job.id,
  meta: { from: oldStart, to: newStart },
})

// Convenience — actor derived from the resolved request context's role:
const ctx = await getTenantForRequest()
// ... perform the write ...
await logTenantWriteFromContext(ctx, 'customer.update', {
  resourceType: 'customer', resourceId: customer.id, meta: { fields: ['phone'] },
})
```

Rules baked into the library:

- **Call after the write succeeds**, so the log reflects committed state.
- **Never awaited for correctness** — a failed insert logs to console and returns; it
  cannot throw into the request path.
- `logTenantWriteFromContext` derives `owner` vs `member` from `ctx.role`. For
  impersonation, agent, or system writes, call `logTenantWrite` directly and pass
  `actorKind` (and `viaImpersonation: true`) explicitly.

## Rollout (gated — NOT part of this change)

This is the integration work that touches existing files and changes runtime
behavior. It is **out of scope** for P9 (new-files-only) and must be done as a
separate, reviewed change after Jeff approves:

1. Apply `2026_07_12_tenant_write_audit.sql` to each environment (leader-run DDL).
2. Thread `logTenantWrite` into the write API routes under `src/app/api/*`, starting
   with the highest-value mutations (jobs, customers, invoices, settings, member roles).
3. Set `via_impersonation` from the resolved context (the `fl_impersonate` cookie is
   already verified in `tenant-query.ts`).
4. Add an admin read surface (e.g. `/admin/audit`) backed by the service-role client.

Suggested sequencing: wrap writes at the route layer (one call after each successful
mutation) rather than deep in data helpers, so the actor/context is unambiguous.

## Retention & privacy

- Append-only; no update/delete path in the app. Purge/retention (e.g. keep N months)
  is a scheduled DB job to be defined with the retention policy — not implemented here.
- `meta` may contain field values. Do **not** put secrets, full card numbers, or raw
  credentials in `meta`; log field **names** and coarse values, not sensitive payloads.
- Service-role-only access keeps the log out of tenant-browser reach.

## Open questions

- **Retention window** — how long do we keep write-audit rows? (Coordinate with the
  compliance security policy, P10.)
- **Partitioning** — at scale, `tenant_write_events` will be the highest-volume audit
  table. Monthly range partitioning on `created_at` may be warranted before GA.
- **Async offload** — best-effort inline insert is fine at current volume; revisit a
  queue/outbox if audit inserts ever measurably tax write latency.
