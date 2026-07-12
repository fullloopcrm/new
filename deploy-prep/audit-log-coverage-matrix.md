# Audit-Log Coverage Matrix — tenant-write actions vs P9 `tenant_write_events`

_Author: worker W5, branch `p1-w5`, 2026-07-12. **Docs only.** Maps every tenant-write
surface to its coverage under the P9 audit-logging expansion._

Companion to:
- `platform/docs/design/audit-logging-expansion.md` (P9 design + action taxonomy)
- `platform/src/lib/audit-log.ts` (`logTenantWrite` / `logTenantWriteFromContext`)
- `platform/src/lib/migrations/2026_07_12_tenant_write_audit.sql` (backing table DDL)

## The finding that dwarfs everything below

**`logTenantWrite` is called by ZERO routes.** P9 shipped the table DDL, the library, and
the design — but the rollout (threading the logger into write routes) is explicitly
out-of-scope and **not done**. Verified 2026-07-12:

```
grep -rl "logTenantWrite" platform/src
  → platform/src/lib/audit-log.ts                          (the definition)
  → platform/src/lib/migrations/2026_07_12_tenant_write_audit.sql  (its DDL)
  (no route.ts, no handler, no data helper)
```

So **current runtime write-audit coverage is 0%.** The only live tenant-scoped audit trail
is `impersonation_events` (written by `logImpersonationEvent` in `tenant-query.ts`), which
records **request-level** events **only while an `fl_impersonate` cookie is active** — it
does not record owner/member/jefe/system writes at all.

Everything below therefore measures **designed** coverage — "if the rollout wires
`logTenantWrite` at every write site, which actions does the P9 action taxonomy already
name, and which are gaps in the taxonomy?" — not anything currently recording.

## Method & limitation — read first

- **Write surface** counted from `platform/src/app/api/**/route.ts`: 498 route files, of
  which **338** export at least one write verb (`POST`/`PUT`/`PATCH`/`DELETE`). Grouped by
  top-level resource dir. This counts *route files*, not distinct actions — one file may
  host several verbs/actions.
- **Coverage** is judged against the P9 **action taxonomy** in the design doc (the
  `<resource>.<verb>` starter set), not against runtime — because runtime coverage is
  uniformly zero (see above).
- **Not authoritative per-action.** A route file can perform multiple logical writes; this
  matrix maps at the resource-domain grain, which is the grain the taxonomy is written at.
  Treat per-domain "covered/uncovered" as "does the taxonomy name this resource at all."
- The two audit trails are complementary by design: a write made while impersonating should
  produce **both** an `impersonation_events` row (already live) **and**, post-rollout, a
  `tenant_write_events` row with `via_impersonation = true`.

## Actor-axis coverage (complete by design)

The `actor_kind` CHECK in the migration covers every actor that can write tenant data:

| Actor | `actor_kind` | In current live audit (`impersonation_events`)? | In P9 design? |
|---|---|---|---|
| Tenant owner (Clerk) | `owner` | ❌ never logged | ✅ |
| Per-tenant member (PIN) | `member` | ❌ never logged | ✅ |
| Global PIN super-admin | `pin_admin` | ✅ only under impersonation | ✅ |
| Clerk super-admin | `clerk_super_admin` | ✅ only under impersonation | ✅ |
| Jefe agent | `jefe` | ❌ never logged | ✅ |
| Background job / webhook / cron | `system` | ❌ never logged | ✅ |

**Actor axis: fully modeled.** The gaps are on the **action axis** (taxonomy too small) and
the **wiring axis** (0 routes call the logger), not here.

## Action-axis coverage — write domains vs taxonomy

Legend:
- **TAXO** — resource is named in the P9 starter taxonomy → covered-by-design, wiring pending.
- **GAP** — write domain exists in the app but the taxonomy is silent on it → uncovered even
  by design; the taxonomy must be extended before rollout can cover it.
- **wired** — always `0 / N` today (nothing calls `logTenantWrite`).

| Write domain (`api/…`) | Write route files | Taxonomy status | Notes |
|---|---:|---|---|
| `jobs/` | 4 | **TAXO** (`job.*`) | Directly in starter set. |
| `clients/` | 5 | **TAXO** (as `customer.*`) | ⚠️ Naming mismatch: taxonomy says `customer`, table/route say `client`. Pick one before wiring. |
| `invoices/` | 5 | **TAXO** (`invoice.*`) | |
| `payments/` | 2 | **TAXO** (`payment.*`) | |
| `settings/` | 9 | **TAXO** (`settings.update`) | Taxonomy has one verb; settings routes span more (integrations, branding, etc.). |
| `team-members/`, `team/` | 4 | **TAXO** (as `member.*`) | invite / role_change / remove named. |
| `tenants/` | 1 | **TAXO** (`tenant.update`) | |
| `bookings/`, `booking-notes/` | 12 | **GAP** | High-volume core write; taxonomy has no `booking.*`. |
| `quotes/`, `quote-templates/` | 9 | **GAP** | No `quote.*` verbs. |
| `documents/` (e-sign) | 11 | **GAP** | Sensitive: signers/fields/activity; no `document.*` verbs. |
| `finance/` | 24 | **GAP** | Journal, bank, ledger writes; taxonomy has no `journal.*`/`bank.*`. Highest-sensitivity gap. |
| `deals/` | 6 | **GAP** | CRM pipeline writes; no `deal.*`. |
| `campaigns/` | 4 | **GAP** | No `campaign.*`. |
| `reviews/` | 5 | **GAP** | No `review.*`. |
| `routes/`, `schedules/` | 8 | **GAP** | Dispatch/route/schedule writes; no verbs. |
| `cleaners/` | 5 | **GAP** | Worker records; no `cleaner.*`. |
| `sms/`, `connect/` | 4 | **GAP** | Messaging writes (PII); no `sms.*`/`message.*`. |
| `referrers/`, `referrals/`, `referral-commissions/` | 7 | **GAP** | No verbs. |
| `management-applications/`, `team-applications/`, `sales-applications/`, `apply/` | 10 | **GAP** | Application intake writes; no verbs. |
| `leads/`, `waitlist/`, `attribution/`, `track/` | 8 | **GAP** | Lead/marketing writes; no verbs. |
| `recurring-expenses/` | 2 | **GAP** | Finance; no verbs. |
| `client/`, `team-portal/`, `portal/` | 36 | **GAP** | Customer/cleaner **portal** writes (any-actor, incl. unauthenticated portal flows). Large uncovered surface. |
| `webhooks/`, `ingest/`, `cron/` | 13 | **GAP** | `system`-actor writes (Stripe/Twilio/etc. + jobs). Taxonomy has the actor but no action names. |
| `admin/` | 85 | **PARTIAL / mixed** | Largest surface. Many are platform-admin (some non-tenant); tenant-affecting admin writes belong under the relevant resource verb (+ `via_impersonation` where applicable). Needs per-route triage, not a blanket rule. |
| `google/`, `social/`, `reviews`-sync, `seo` | ~5 | **GAP** | Third-party sync writes; `system` actor, no verbs. |

### Roll-up

| Bucket | Domains | Approx. write-route files |
|---|---|---|
| **TAXO** — named in P9 taxonomy | jobs, clients(=customer), invoices, payments, settings, members, tenant | ~30 |
| **GAP** — write surface, taxonomy silent | bookings, quotes, documents, finance, deals, campaigns, reviews, routes/schedules, cleaners, sms/connect, referrers, applications, leads/marketing, recurring-expenses, portals, webhooks/ingest/cron, third-party sync | ~220 |
| **PARTIAL/mixed** — needs per-route triage | admin | ~85 |
| **Wired (calls `logTenantWrite`) today** | — | **0 / 338** |

## Cross-check against the RLS gap set

The high-sensitivity tables flagged in `deploy-prep/rls-coverage-audit.md` (bolded 58-table
gap list) map almost entirely to **GAP** write domains here — `bookings`, `invoices`,
`quotes`, `journal_entries`/`journal_lines`, `bank_accounts`/`bank_transactions`,
`documents`/`document_signers`, `sms_conversations`/`sms_conversation_messages`. So the two
backstops have the **same blind spots**: the most sensitive resources are the least covered
by both DB-level isolation *and* the write-audit taxonomy. Close them together.

## Gaps to close before the P9 rollout can claim coverage

1. **Wire the logger (the whole point).** 0/338 write routes call `logTenantWrite`. Until
   the rollout lands, coverage is 0% regardless of taxonomy. Sequence per the design doc:
   route-layer call after each successful mutation, highest-value resources first.
2. **Extend the action taxonomy** to name the GAP domains — at minimum `booking.*`,
   `quote.*`, `document.*`, `journal.*`/`bank.*`, `deal.*`, `campaign.*`, `review.*`,
   `route.*`, `schedule.*`, `cleaner.*`, `sms.*`, `application.*`, `lead.*`. The current
   7-resource starter set covers ~30 of ~338 write files.
3. **Resolve the `customer` vs `client` naming** — the taxonomy says `customer.*`; the app
   uses `clients`. Standardize before writing verbs into routes, or queries fork.
4. **Triage `admin/` per-route** — split platform-admin (non-tenant, out of scope) from
   tenant-affecting admin writes; the latter log under their resource verb with
   `via_impersonation`/`pin_admin`/`clerk_super_admin` as appropriate.
5. **Portal + webhook writes** are the biggest uncovered any-actor surface (~49 files);
   they need explicit `actorKind: 'system'` (or a portal actor) since no request context
   role resolves for them.

## What "covered" will mean after rollout

For a domain to count as **covered**, all three must hold:
- taxonomy names its `<resource>.<verb>` (action axis),
- every write route for it calls `logTenantWrite`/`logTenantWriteFromContext` after the
  mutation commits (wiring axis),
- the actor is passed correctly, incl. `via_impersonation` under an active impersonation
  cookie (actor axis).

Today: axis 1 holds for ~30 files, axis 3 is modeled but unused, axis 2 holds for **none**.
This matrix is the punch-list for getting axes 1–2 to parity with axis 3.
