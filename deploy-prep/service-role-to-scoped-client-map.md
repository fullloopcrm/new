# service_role → scoped-client conversion map — the real blocker to RLS being non-vacuous

_Author: worker W5, branch `p1-w5`, 2026-07-12. **Inventory only — no code changed, no DDL/DML run.** Derived from a static grep of `platform/src`, not a live trace._

## Why this file exists

Per ADR 0005 / `rls-enablement-rollout-plan.md`: **RLS is provably inert until a table's
call sites stop using the `service_role` client.** `service_role` bypasses RLS entirely, so a
`tenant_isolation` policy has **zero** runtime effect for any query that runs through
`supabaseAdmin`. Enabling RLS (the W5 trilogy) is safe to stage *ahead* of the app — but RLS
only ever **starts enforcing** for a table once that table's reads/writes move onto a scoped
(JWT `tenant_id` claim, `role=authenticated`) client.

This document is the enumeration of that cutover surface: **what still runs on `service_role`,
what must convert, and what legitimately must not.** It is the dependency that decides when RLS
becomes load-bearing, table by table (rollout-plan Stage 3).

## The central fact: one sink, 623 call sites

Every server-side query in the app routes through a single exported admin client:

```
platform/src/lib/supabase.ts:11
  export const supabaseAdmin = createClient(url, serviceKey)   // serviceKey = SUPABASE_SERVICE_ROLE_KEY → bypasses RLS
```

**623 files** under `platform/src` import/use `supabaseAdmin` (or otherwise reference
`service_role` / `SERVICE_ROLE`). Regenerate the authoritative list any time:

```bash
grep -rln "supabaseAdmin\|SERVICE_ROLE\|service_role\|createAdminClient" \
  --include="*.ts" --include="*.tsx" platform/src | grep -v node_modules
```

Two prerequisites for **any** conversion do not exist in the repo yet (both confirmed by grep
returning zero wiring in `platform/src`):

- **No scoped-client factory.** There is no `tenantClient` / `createTenantClient` helper. The
  conversion cannot begin until one is added to `platform/src/lib/supabase.ts` (or a sibling).
- **`SUPABASE_JWT_SECRET` is unreferenced** in `platform/src` → no code path mints the
  `tenant_id` claim. Until it is wired and present in prod env, authenticated requests carry no
  claim and RLS default-denies them — which is exactly why staging RLS ahead of this is safe.

**So conversion is blocked on building the scoped-client path first.** This map is what to
convert *once that path exists*; it is not actionable line-by-line before then.

## Surface inventory — disposition per bucket

Counts from the grep above, bucketed by directory. **Disposition** is the key column: not every
`service_role` use is a "convert" — some surfaces are legitimately cross-tenant/global and must
**keep** `service_role` (with explicit app-level `tenant_id` scoping retained).

| Bucket | Path | Count | Disposition |
|---|---|---:|---|
| API routes (all) | `src/app/api/**` | 437 | mostly **CONVERT** — see sub-rows |
| — cron | `src/app/api/cron/**` | 32 | **KEEP** service_role — each iterates **all** tenants in one run; cannot carry a single `tenant_id` claim. Must retain explicit `.eq('tenant_id', tenant.id)` per loop. |
| — admin | `src/app/api/admin/**` | 100 | **KEEP** (platform-admin, cross-tenant by design) **except** any route already scoped to one tenant — audit individually. |
| — webhooks | `src/app/api/webhooks/**` | 7 | **KEEP** service_role — tenant is resolved from the inbound payload, not a session JWT; but must set scope explicitly after resolving. |
| — tenant-scoped API (rest) | `src/app/api/**` (remainder ≈ 298) | ≈298 | **CONVERT** — these resolve one tenant via `getTenantForRequest()` and should run as that tenant. |
| Site `_lib` helpers | `src/app/site/*/_lib/**` | 60 | **CONVERT** (customer/cleaner portal data paths, single-tenant per site). |
| Operator/admin pages | `src/app/admin/**`, `src/app/dashboard/**` (`.tsx`) | 7 | **CONVERT** (single-tenant operator surface via session). |
| Shared libs | `src/lib/**` | 113 | **MIXED** — the sink itself (`lib/supabase.ts`) plus helpers. Convert per-caller; some helpers (e.g. `tenant-lookup.ts`) are inherently cross-tenant → KEEP. |
| Scripts | `platform/scripts/**` | 16 | **OUT OF SCOPE** — offline tooling/seeders/migrations, not the request path. Legitimately service_role. |

> The three sub-rows (cron/admin/webhooks) are carved out of the 437 API total; the ≈298
> "remainder" is the arithmetic difference and is an estimate until enumerated with the command
> below. It is the largest CONVERT population and the bulk of Stage 3 work.

## The disposition rule (the part that prevents a security regression)

For every call site, exactly one of:

1. **CONVERT** — request handles exactly one tenant (resolved from session via
   `getTenantForRequest()` / membership). Replace `supabaseAdmin` with
   `tenantClient(tenantId)`. After conversion, RLS is the enforcement; the app-level
   `.eq('tenant_id', …)` becomes a redundant backstop (keep it — defense in depth).

2. **KEEP service_role** — request legitimately spans multiple tenants (cron sweeps, platform
   admin, webhook dispatch before tenant is known). **These must retain explicit
   `.eq('tenant_id', …)` on every query** — for them there is no RLS backstop, so app-level
   scoping remains the *only* tenant gate. A KEEP site that drops its `.eq('tenant_id')` is an
   IDOR the same day RLS makes everyone else safe.

**Danger:** the moment a Tier-1 table (`clients`, `bookings`, `invoices`, `bank_*`,
`documents`, `sms_*`) is enabled *and* one of its readers converts, **every KEEP reader of that
same table still bypasses RLS** — so KEEP readers are the residual attack surface after
cutover. They do not get safer; they must be audited by hand. (The 2026-06-29 IDOR sweep came
back clean; re-run it against every KEEP site before declaring a table done.)

## Conversion ordering — mirror the RLS tier order

Convert the readers/writers of the highest-risk tables first, matching
`rls-enablement-rollout-plan.md` Stage 2 tiers so the most sensitive tables become load-bearing
first. To get the exact call sites for a given table, per tier:

```bash
# every service_role call site touching a specific table (example: clients)
grep -rln "from('clients')" --include="*.ts" --include="*.tsx" platform/src | grep -v node_modules \
  | xargs grep -l "supabaseAdmin\|service_role"
```

Recommended order (Tier 1 tables first): `clients` → `bookings` → `invoices` → `bank_accounts`
/ `bank_transactions` → `documents` → `sms_conversations` / `sms_conversation_messages`, then
Tiers 2–5 as listed in the rollout plan.

## The finite high-leverage sets (enumerated in full)

### The sink (convert once — unblocks everything)
- `platform/src/lib/supabase.ts` — add `tenantClient(tenantId)` alongside `supabaseAdmin`;
  do **not** remove `supabaseAdmin` (KEEP sites still need it).

### Cron routes — all 32 are KEEP (retain explicit tenant scoping)
`schedule-monitor`, `tenant-health`, `payment-followup-daily`, `system-check`, `retention`,
`sync-google-reviews`, `finance-post`, `release-due-payments`, `auto-reply-reviews`,
`email-monitor`, `lifecycle`, `cleanup-videos`, `payment-reminder`, `no-show-check`,
`comms-monitor`, `phone-fixup`, `daily-summary`, `confirmation-reminder`, `health-check`,
`generate-recurring`, `post-job-followup`, `late-check-in`, `backup`, `confirmations`,
`sales-follow-ups`, `outreach`, `reminders`, `comhub-email`, `health-monitor`, `rating-prompt`,
`recurring-expenses`, `follow-up` (all under `src/app/api/cron/*/route.ts`).

> Cross-check dependency: `cron/retention` queries `clients.active` and `clients.sms_consent` —
> see `schema-drift-register.md`. Any KEEP site that queries a drifted column is a latent break
> independent of RLS.

## Method & limitation

Counts and buckets are from a **static grep of `platform/src`**, not a runtime trace or a live
DB read. A file that imports `supabaseAdmin` but only uses it on a global table is
over-counted; a call site that reaches `service_role` indirectly (through a helper that isn't
matched) is under-counted. The ≈298 "tenant-scoped API remainder" is an arithmetic estimate.
Every CONVERT/KEEP disposition must be confirmed per call site at cutover time — this map is the
starting inventory and the ordering, not a verified per-line worklist. Treat it as the input to
Stage 3, gated exactly as the rollout plan requires (per-table verify: authenticated read
returns only that tenant's rows, cross-tenant returns zero, counts match the pre-cutover
`service_role` baseline).
