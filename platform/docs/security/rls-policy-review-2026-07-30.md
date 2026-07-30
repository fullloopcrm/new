# RLS Policy Review — 2026-07-30 (sec-06)

## The real current count: 20 tables, not 13

The ledger's prior sec-06 evidence named 13 tables with RLS enabled and
zero policies. A fresh live query against prod
(`pg_tables`/`pg_policies`, 2026-07-30) found **20**: the original 13
(`booking_assignees`, `contacts`, `crew_members`, `crm_notes`,
`geo_nearby_places_cache`, `inbound_emails`, `inquiries`, `leads`,
`partner_requests`, `tenant_locations`, `tenant_notes`, `tenant_projects`,
`user_preferences`) plus 7 not previously listed: `jefe_acks`,
`jefe_messages`, `jefe_snapshots`, `platform_announcements`,
`platform_settings`, `rate_limit_events`, `tenants`.

## This is not a live vulnerability

Three things, each independently verified, not assumed:

1. **"RLS enabled + zero policies" already means default-deny.** In
   Postgres, a table with row-level security enabled and no policies denies
   ALL access to every role except one with the `BYPASSRLS` attribute.
   Supabase's `service_role` has `BYPASSRLS`. This platform runs every real
   application query through `service_role` — documented in
   `src/lib/tenant-db.ts`'s own header comment ("The platform runs every
   query through the service_role key, which BYPASSES Row-Level Security").
2. **No browser/anon-key code touches any of these 20 tables.** Full repo
   sweep for every place `NEXT_PUBLIC_SUPABASE_ANON_KEY` is used
   client-side (5 files, all per-tenant job-application forms) found every
   single one only calls `.storage.from('uploads')` — a Storage bucket
   reference, governed by a completely separate policy system, never a
   Postgres table query. Grep: `grep -rln
   "NEXT_PUBLIC_SUPABASE_ANON_KEY" src/app/site --include="*.tsx"`.
3. **This app never uses Supabase Auth.** `grep -rln "auth\.uid()\|supabase\.auth\.\|@supabase/auth-helpers\|@supabase/ssr"` across
   the whole `src/` tree returns zero results. Tenant/client/team-member
   authentication is entirely custom (signed cookies, HMAC tokens),
   verified in Next.js server code — never Supabase's JWT/`auth.uid()`
   system.

Point 3 has a real consequence for what "fixing" this checkpoint can even
mean: a genuinely tenant-scoped RLS policy (`using (tenant_id =
current_setting('request.jwt.claims')::json->>'tenant_id')` or similar)
requires a Supabase-recognized identity to filter by. This app has none —
there is no signed-in Supabase Auth session for any tenant-facing user, so
there is no JWT claim a real per-tenant policy could reference. Writing one
anyway would be theater: a policy with no way to ever evaluate true for a
legitimate caller, since no legitimate caller reaches these tables through
anything but `service_role` in the first place.

## What was actually done

`supabase/migrations/20260730190000_explicit_deny_all_rls_policies.sql`
adds an explicit `deny_all_anon_authenticated` policy (`using (false)` for
`anon`/`authenticated`) to all 20 tables. This is **zero functional
change** — it formalizes the exact protection that already existed
implicitly. The value is audit-trail and robustness: explicit intent
survives a future engineer's assumption check better than "we're relying
on Postgres's default-deny behavior," and it's a guard against a future
misconfiguration (e.g., someone granting a role BYPASSRLS by mistake, or a
future Supabase Auth adoption accidentally inheriting these tables'
current silence as "nobody thought about it").

**Not applied to prod as part of this session** — a schema migration
against live prod is a production write, held for explicit sign-off
separately from the rest of this triage, same boundary already used for
the PIN-encryption backfill earlier this session.

## What this does not establish

- Does not cover tenant-owned tables that already HAVE some policies but
  might have gaps in coverage (e.g., missing an UPDATE or DELETE policy
  while SELECT is covered) — this review was scoped to the "zero policies
  at all" set only, matching the prior checkpoint's own framing.
- Does not evaluate whether `service_role` itself is over-scoped (i.e.,
  whether the app should eventually move some read paths to `authenticated`
  + real per-tenant policies as a defense-in-depth upgrade, which would
  first require adopting Supabase Auth or an equivalent JWT-claim bridge).
  That is a real, separate, much larger architectural question, not
  something this pass could responsibly resolve.
