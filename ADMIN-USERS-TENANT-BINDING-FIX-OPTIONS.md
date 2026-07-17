# admin_users no-tenant-binding — fix options (prep doc, no code changed)

Source: JEFF-MORNING-QUEUE.md 23:21 entry (W4 finding). This is W3 prep only —
file-only, no push/deploy/DB, decision is Jeff's per that entry's own text.

## The problem, confirmed by reading the code just now

`isAdminAuthenticated()` / `getAdminUser()` in `platform/src/lib/nycmaid/auth.ts`
(and 4 near-identical per-site copies, see below) validate a signed
`admin_session` cookie and then check `admin_users.status = 'active'` —
**with no `tenant_id` filter anywhere in the query.** The cookie itself carries
no tenant claim either (`userId.token.timestamp.signature`). Net effect: one
valid legacy-admin session, from any tenant, passes `isAdminAuthenticated()`
on every route gated by it, for every tenant.

This is live: `/api/auth/login` is confirmed live and public (its own test file
says so), and is the only way `admin_session` gets minted — this isn't a dead
code path.

### Every call site touching `admin_users` (grep-verified, no filtering elsewhere in repo)

Auth-check sites (the actual bypass — highest priority):
- `platform/src/lib/nycmaid/auth.ts` — shared lib, `isAdminAuthenticated()`, `getAdminUser()`
- `platform/src/app/site/nyc-mobile-salon/_lib/auth.ts` — near-duplicate copy
- `platform/src/app/site/the-nyc-interior-designer/_lib/auth.ts` — near-duplicate copy
- `platform/src/app/site/wash-and-fold-hoboken/_lib/auth.ts` — near-duplicate copy
- `platform/src/app/site/wash-and-fold-nyc/_lib/auth.ts` — near-duplicate copy
- `platform/src/app/api/auth/login/route.ts` — the shared login endpoint (writes/reads `admin_users` directly, not via the lib)

Consumers of the shared lib's `isAdminAuthenticated()` (inherit the bypass):
- `platform/src/app/api/client/properties/route.ts` — lets an admin session from
  any tenant pass `authClient()` and read/write another tenant's client
  properties (this is the same class of leak W1 already patched narrowly for
  `include_history` on this same route, commit fc46188a — that patch didn't
  and couldn't fix the root cause, per the queue entry)

Lower-severity, same missing column, not an auth bypass (ops notification
fan-out, reads across all tenants' `admin_users` rows indiscriminately):
- `platform/src/lib/nycmaid/admin-contacts.ts` + 4 site clones
  (`nyc-mobile-salon`, `the-nyc-interior-designer`, `wash-and-fold-hoboken`,
  `wash-and-fold-nyc`) — `emailAdmins`/`smsAdmins` pull contacts by role only.
  Worth fixing in the same pass but not the CRITICAL item itself.

`the-home-services-company/_lib/admin-auth.ts` does **not** touch `admin_users`
(env-var PIN check only) — not part of this issue.

### Evidence the target architecture already exists

Two routes have already been migrated off `admin_users` entirely, onto the
Clerk-backed `tenant_members` table (which already exists, already has a
`tenant_id` column, and is already referenced by ~10 FKs in
`migrations/2026_05_19_comhub.sql`):
- `platform/src/app/api/admin-auth/me/route.ts` — queries
  `tenant_members` by `clerk_user_id`, returns `tenant_id` in the response
- `platform/src/app/api/client-analytics/route.ts` — uses
  `requirePermission()` (Clerk/`admin_token` + tenant scoping), comment notes
  the old `admin_session`/`admin_users` gate was deliberately removed here

So both directions in this doc are partially built already — this isn't a
choice between "quick patch" and "greenfield project," it's "extend the old
system a little more" vs. "finish extending the new system that already
covers 2 of ~11 sites."

---

## Option A — add `tenant_id` to `admin_users`, filter every call site

**Shape:**
1. Migration (file only, Jeff/leader runs it): `ALTER TABLE admin_users ADD COLUMN tenant_id UUID REFERENCES tenants(id)`, backfill existing rows (each legacy admin needs one row per tenant they should see, or a NULL = "super admin, all tenants" convention if that's actually wanted — needs a decision, see Open Questions).
2. `admin_session` cookie needs a tenant claim added (currently `userId.token.timestamp.signature`) OR the tenant is resolved per-request the same way `client/properties` already does it (`getTenantFromHeaders()`, host-based, signed by middleware) and cross-checked against the admin's `tenant_id` row.
3. Every one of the 5 auth-check call sites above gets a `.eq('tenant_id', tenant.id)` added to its `admin_users` query, using the already-existing `getTenantFromHeaders()` helper (`platform/src/lib/tenant-site.ts`) — no new tenant-resolution mechanism needed, just wiring it into 5 files instead of 1.
4. `admin-contacts.ts` (5 files) gets the same filter for the lower-severity ops-notification issue.
5. `/api/auth/login` needs the tenant resolved at login time too (currently a bare email+password lookup with no tenant scope — two tenants could theoretically have colliding emails today with no error).

**Call sites touched:** 5 auth files + `login/route.ts` + 5 admin-contacts files = 11 files, all narrowly scoped edits (add one filter clause + resolve tenant), no route removed.

**Blast radius:** Contained to files that already exist and already work. Every legacy-admin session gets invalidated by the schema change (cookie format doesn't change, but the DB row it resolves against now requires a tenant match) — every currently-logged-in legacy admin across all ~5 affected tenants has to log in again once this ships. No risk to `tenant_members`-backed tenants (untouched).

**Risk:** This is investment in a table the codebase's own migration comments
(`2026_05_19_comhub.sql`, `2026_05_19_remaining_tables.sql`) already mark for
replacement by `tenant_members`. Doing this now means doing the `tenant_members`
migration again later for these same tenants — genuinely double work, not
just optics.

**Rough size:** small — this is the "fastest safe interim fix" the queue entry's
own recommendation already points at. Half a day of implementation + testing
per my read of the diff size, not counting the login-collision edge case in
item 5 above, which could be its own small design discussion.

---

## Option B — accelerate the Clerk/tenant_members cutover for these routes

**Shape:**
1. Point the 5 affected tenants' admin login at the same `tenant_members` +
   Clerk flow `admin-auth/me` and `client-analytics` already use — no new
   infra, just onboarding these tenants onto the existing rails.
2. Retire `admin_session`/`ADMIN_PASSWORD`-cookie auth for these routes
   entirely once cutover is confirmed (delete, not deprecate — matches this
   repo's CLAUDE.md rule against leaving forked per-tenant code around).
3. This overlaps directly with the **already-tracked, already-known debt**
   in `platform/CLAUDE.md`: `wash-and-fold-nyc` and `wash-and-fold-hoboken`
   are explicitly called out there as full per-tenant operator clones
   ("~22 cloned pages" each) that need to "repoint these tenants' operators
   to the global `/dashboard` + `/admin`" before their clones can be deleted.
   Two of the four affected site clones are already on that list — this
   finding is arguably the auth-layer half of a cutover that was already
   planned, not a new project.
4. `nyc-mobile-salon` and `the-nyc-interior-designer` aren't currently named
   in the CLAUDE.md known-debt list — need to confirm whether they're already
   mid-migration, not started, or a smaller surface than the wash-and-fold
   pair before scoping this.

**Call sites touched:** same 5 auth files, but deleted/rewired rather than
patched, plus whatever page-level work is needed to swap each site's login UI
onto the Clerk flow (front-end auth pages, not just the API layer) — larger
diff than Option A, and touches customer-facing login screens, not just
server-side filters.

**Blast radius:** Larger in file count and includes UI, but ends in a strictly
better state — no double-migration later, and closes out debt already on the
books. Every legacy admin for these 5 tenants needs a Clerk account
provisioned before cutover, which is a one-time operational task per tenant
(who has how many admins today needs a headcount check — I haven't pulled
`admin_users` row counts per tenant from prod, this is file-only prep).

**Risk:** Real scope risk — "accelerate a cutover" tends to uncover adjacent
work once started (session UX during transition, any admin-only feature that
doesn't exist yet in the global dashboard for these tenants, etc.). The queue
entry itself flags this as "not a one-file patch."

**Rough size:** larger, and the size is genuinely uncertain until someone
checks how far each of the 4 site clones already is from parity with the
global `/dashboard` — could be a few days, could be more depending on gaps.

---

## Recommendation (matches the queue entry's own lean)

Option A first as the immediate interim fix — it's small, uses infra that
already exists (`getTenantFromHeaders()`), and stops the live cross-tenant
read/write today. Then treat Option B as the real fix, already partially
scheduled via the CLAUDE.md known-debt cutover for at least 2 of the 4 site
clones. Doing A doesn't block or duplicate B's schema work (different tables),
though it does mean the `admin_session` cookie code gets touched twice across
the two phases.

## Open questions for Jeff (not answered here — need your call)

1. Does any legacy admin need to see **more than one** tenant (a NULL/"super
   admin" `tenant_id` convention), or is every legacy admin single-tenant today?
   Changes the Option A backfill shape.
2. Are `nyc-mobile-salon` and `the-nyc-interior-designer` already
   Clerk-migrated on the operator side and just missed in CLAUDE.md's debt
   list, or genuinely not started? Determines real size of Option B.
3. OK to force-logout all current legacy-admin sessions across the 5 affected
   tenants when Option A ships (unavoidable side effect of adding the filter)?
