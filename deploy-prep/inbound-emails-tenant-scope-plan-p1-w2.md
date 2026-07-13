# `inbound_emails` Tenant-Scope Plan (for migration 062) — P1/W2

**Owner:** W2 · **Branch:** `p1-w2` · **Status:** PLAN / docs-only + one guarded,
inert code path. **No DB migration is included here** — this is prep for whoever
lands migration `062` (next free number after `061_unique_journal_entries.sql`
in `platform/src/lib/migrations/`). No prod DDL is run by this worker.

---

## 1. Problem

`inbound_emails` (written by `platform/src/app/api/webhooks/resend/route.ts`,
`email.received` branch) has **no `tenant_id` column today** — confirmed by
grep: no `CREATE TABLE inbound_emails` exists anywhere in
`platform/src/lib/migrations/*.sql` or `supabase/*`, and no other file in the
repo references `inbound_emails` except that one webhook route. It was created
directly against the DB outside the tracked migration history.

Every inbound email Resend delivers — regardless of which tenant's receiving
domain it was sent to — lands in one untenanted bucket. That's tolerable today
only because **nothing reads the table back** (no admin inbox endpoint exists
yet in this codebase). The moment someone builds that reader, it's a
cross-tenant leak by construction: any tenant-facing inbox query without an
explicit filter returns every tenant's mail.

## 2. Proposed migration 062 (NOT included in this branch)

```sql
-- 062_inbound_emails_tenant_scope.sql (DRAFT — leader runs after Jeff approves)
ALTER TABLE inbound_emails
  ADD COLUMN tenant_id uuid REFERENCES tenants(id),
  ADD COLUMN resolved_domain text; -- audit trail: what domain drove the tenant_id match

CREATE INDEX idx_inbound_emails_tenant_id ON inbound_emails(tenant_id);

-- Nullable on purpose: mail to the platform's own domain (sales@, support@,
-- an unmigrated tenant not yet in tenant_domains) has no tenant owner and
-- must stay visible only to platform admins, not silently dropped or forced
-- onto tenant 0.
```

No RLS policy is proposed here — the table is only ever touched via
`supabaseAdmin` (service role) today; add one if/when a client-side reader is
built.

## 3. Tenant resolution strategy (reuses the W2 resolver — no new logic)

W2 owns tenant resolution (`platform/src/lib/tenant-lookup.ts`,
`getTenantByDomain`): **tenant_domains FIRST, `tenants.domain` fallback**,
refuse-on-divergence. The inbound-email case is a new *caller* of that same
resolver, not a new resolution algorithm:

1. Take `data.to` from the Resend payload (the recipient address the mail was
   sent to — this is what identifies WHICH tenant's inbox it belongs to, not
   `data.from`).
2. Extract the domain: first address if `to` is a list, substring after `@`.
3. Call `getTenantByDomain(domain)` — same tenant_domains-first / legacy
   `tenants.domain`-fallback path everything else in P1 uses.
4. Match → stamp `tenant_id` (+ `resolved_domain` for audit). No match
   (platform inbox, unmigrated domain) → leave `tenant_id` NULL.

This is deliberately the **existing** resolver, not a bespoke lookup, so a
future fix to tenant_domains/tenants.domain precedence (or the
`TENANT_DIVERGENCE` refuse-and-throw guard) automatically covers inbound email
too instead of drifting out of sync.

## 4. Read-side scoping (for whoever builds the admin inbox reader)

Once a reader endpoint exists, it MUST follow the same pattern as every other
tenant-scoped API in this codebase:

```ts
const { tenantId } = await getTenantForRequest()
const { data } = await supabaseAdmin
  .from('inbound_emails')
  .select('*')
  .eq('tenant_id', tenantId)   // tenant owner view
  .order('created_at', { ascending: false })
```

Platform admins get the unscoped view (or `.is('tenant_id', null)` for the
"unclaimed / platform inbox" bucket specifically) — that's a platform-admin
route, not `getTenantForRequest`-gated, same convention as `/admin/*` elsewhere
in this repo.

**Do not build this reader yet.** It's out of scope for this plan — the
column doesn't exist. This section only exists so the first person who builds
it doesn't have to re-derive the filter.

## 5. The staged, guarded diff (applied in THIS branch, inert by default)

`platform/src/app/api/webhooks/resend/route.ts` now has a
`resolveInboundTenantId()` helper gated behind
`INBOUND_EMAILS_TENANT_SCOPE_ENABLED`, unset (falsy) everywhere today:

- **Flag off (today, everywhere):** the helper short-circuits to `null` before
  touching `getTenantByDomain`, and the insert spreads in **zero** extra keys
  — the insert payload is byte-for-byte identical to before this change. This
  is asserted by `route.inbound-tenant-scope-guard.test.ts`.
- **Flag on (only valid after 062 lands):** the helper resolves the domain and
  stamps `tenant_id` (+ `resolved_domain`) on insert. Also covered by the same
  test file, with `getTenantByDomain` mocked.

**Turning the flag on before 062 lands will 500 every inbound email** (INSERT
against a column that doesn't exist). The rollout order is:

1. Leader lands migration 062 (§2), verifies the columns exist in prod.
2. Set `INBOUND_EMAILS_TENANT_SCOPE_ENABLED=true` in the target environment.
3. Watch `inbound_emails` inserts for a few deliveries — confirm `tenant_id` /
   `resolved_domain` populate as expected for a known tenant domain and stay
   NULL for the platform's own receiving address.
4. (Optional, deferred) Backfill historical NULL rows by re-running the same
   domain match over `to_address` — safe to skip since nothing reads the
   table back yet.
5. Build the admin inbox reader per §4, tenant-scoped from day one.

## 6. Wrong-tenant probe (once 062 lands and the flag flips on)

When someone builds §4's reader, the required regression test is: seed
`inbound_emails` rows for tenant A (domain `a.example.com`) and tenant B
(domain `b.example.com`); query the reader as tenant A; assert tenant B's row
is never returned. `route.inbound-tenant-scope-guard.test.ts` in this branch
covers the **write-side** half (correct `tenant_id` stamped per recipient
domain) since there's no reader yet to probe.
