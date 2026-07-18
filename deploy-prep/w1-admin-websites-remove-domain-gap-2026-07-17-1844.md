# admin/websites: no way to remove a single domain (2026-07-17 18:44)

## Bug

`POST /api/admin/websites` (the admin "Add domain" action) is the only
tenant_domains write path an admin can trigger directly — `activate-tenant.ts`'s
`domain_routing` step only runs during tenant activation. This session already
fixed two dead-on-arrival bugs on that POST path (missing domain normalization,
missing Vercel registration). Auditing the rest of the route for a fresh gap
turned up something more basic: **there was no way to remove a domain once
added.**

- No `DELETE` handler existed in `src/app/api/admin/websites/route.ts` (file
  only had `GET`/`POST`).
- The admin page (`src/app/admin/websites/page.tsx`) had zero remove/delete UI
  — no button, no confirm dialog, nothing.
- `grep`-confirmed no other write path ever touches a single `tenant_domains`
  row for removal either: `.delete()` only ever runs on `tenant_domains` as a
  side effect of `tenants.delete()`'s cascade (`admin/businesses/[id]`'s
  tenant-DELETE), and nothing anywhere sets `active: false` on a row.
- The table's own `active` boolean column (migration 043) and the newer 3-state
  `status` column (migration 055, this session's own P1-SCHEMA-SPEC work) are
  both read by 5 consumers (`domains.ts` x2, `seo/health.ts`,
  `seo/auto-verify.ts`, `seo/onboarding.ts`, `tenant-lookup.ts`'s resolver) as
  if a domain could be deactivated — but nothing in the entire app ever writes
  a false/inactive value. The lifecycle columns exist and are read; there was
  no write path to ever use them for their intended purpose.

Impact: a mistyped domain (now normalization-guarded, but pre-existing bad rows
and future admin typos in the *tenant* dropdown are still possible), a stale
alias domain, or a tenant that switches off a custom domain has no fix short of
manual DB surgery — or deleting the entire tenant, which cascades and destroys
every other table's data (bookings, clients, invoices, everything), not just
the one bad domain row. This is the same "half-built lifecycle" shape as W3's
`bank_transactions.status='duplicate'` finding earlier tonight (declared,
reachable state that nothing ever wrote) — here it's "removable domain," a
capability the schema clearly anticipated (`active` boolean, `status` enum)
but that was never wired to any write path.

## Fix (file-only, no push/deploy/DB)

- `src/app/api/admin/websites/route.ts` — added `DELETE`. Accepts `?id=<tenant_domains.id>`
  (matches the sibling `admin/businesses/[id]/users` DELETE's `?user_id=`
  query-param convention for a flat, non-`[id]`-segment route). 400 if `id`
  missing, 404 if the row doesn't exist. Deletes the row (hard delete, not a
  soft `active: false` flip — matches how every other tenant_domains removal in
  the codebase already works via the tenant-delete cascade, and avoids
  introducing a second, inconsistent deactivation convention alongside the
  unused `active`/`status` columns). After the DB delete, best-effort detaches
  both apex and `www.` from Vercel via `removeDomain()` (already used by
  `admin/businesses/[id]`'s tenant-DELETE, never throws) — mirrors
  `registerCustomDomain()` adding both on POST. Without this half, a removed
  row would still leave the domain live-attached to the Vercel project: it
  keeps its TLS cert and keeps routing traffic to this app, which now resolves
  to nothing (`getTenantByDomain` returns null) instead of actually being freed
  for reuse.
- `src/app/admin/websites/page.tsx` — added a per-row "Remove" action (confirm
  dialog naming the domain + tenant, disabled+"Removing..." while in flight,
  refetches the list on success, surfaces the API error on failure).

## Not fixed / flagged, not touched

- The `active` boolean and `status` text columns are STILL never written by
  anything (including this fix — it hard-deletes, doesn't flip either flag).
  They remain read-only dead weight in 5 call sites. Whether to wire `status`
  into the resolver at all is explicitly W2's lane per P1-SCHEMA-SPEC.md
  ("Resolver rules (W2): ... Treat routing_mode/vercel_project/status as plain
  text values") — did not touch `tenant-lookup.ts` or any resolver code this
  pass to avoid conflicting with in-progress cross-worktree resolver work.
- `middleware.ts`'s `BESPOKE_SITE_TENANTS` hardcoded set is still the actual
  routing decision at request time — `tenant_domains.routing_mode` (this
  session's own schema addition) is written correctly everywhere but never
  read by the real Edge middleware. This is a known, deliberate, large cutover
  (the set is build-time-verified by `scripts/verify-protected-tenants.mjs`
  and explicitly commented as the locked single source of truth pending that
  cutover) — not a silent bug, and out of scope for a file-only pass; flagging
  it here since it's directly adjacent to this session's schema work.
- Did not add a guard against removing a tenant's last/primary domain — the
  resolver already falls back to `tenants.domain` first (per spec, that column
  is intentionally not dropped this phase), so a tenant left with zero
  `tenant_domains` rows still resolves correctly via that fallback if
  `tenants.domain` is set. No new invariant is violated by allowing it.

## Verification

- 7 new tests in `route.test.ts` covering: admin-gate passthrough, missing
  `id` (400), unknown `id` (404), successful delete + apex/www Vercel detach,
  double-`www.` guard against an already-`www.`-prefixed stored domain,
  best-effort behavior when Vercel detach errors (still 200, row still gone),
  and isolation (deleting one row doesn't touch a sibling row).
- RED-confirmed: reverted `route.ts` only via a saved `git diff`/`git apply -R`
  patch (not `git stash` — flagged as a shared cross-worktree resource this
  session), re-ran the new tests — all 7 failed with `TypeError: DELETE is not
  a function` (import-time failure, the strongest possible RED). Re-applied
  the patch, all 26 tests in the file pass (19 pre-existing + 7 new).
- `tsc --noEmit --pretty false`: 0 errors in any touched file (5 pre-existing,
  unrelated baseline errors elsewhere — admin-auth route types, two cron test
  files' spread-argument typing, sunnyside-clean-nyc's site-nav.ts import
  names — none touch `admin/websites` or this fix).
- `eslint` on the 3 touched files: 0 errors, 1 pre-existing warning
  (`page.tsx`'s `fetchData`-used-before-declared in a `useEffect`, present
  before this change, unrelated to the new code added).
- Full suite: pending at time of writing (background run still in progress);
  will confirm zero regressions before the commit lands.
