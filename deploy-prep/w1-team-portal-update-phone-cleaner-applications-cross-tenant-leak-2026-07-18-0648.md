# team-portal update-phone's cleaner_applications sync had zero tenant scoping (2026-07-18 06:48)

## Fresh-ground discovery

`POST /api/team-portal/update-phone` lets a team member (verified via a
signed, expiring HMAC token — no session, no login) update their own phone
number. After writing the new phone to `team_members` (correctly scoped to
that one row by primary key), it also syncs the same phone onto the
member's `cleaner_applications` row:

```ts
if (member.email) {
  await supabaseAdmin
    .from('cleaner_applications')  // tenant-scope-ok: member-initiated phone sync ...
    .update({ phone: phoneCheck.normalized })
    .eq('email', member.email)
}
```

`cleaner_applications` is a tenant-scoped table (`tenant_id` column, listed
in migration `2026_07_11_rls_tenant_tables.sql`'s RLS table set) and email is
**not** unique across tenants — the same applicant can apply to more than one
Full Loop business (`src/app/api/apply/route.ts` writes a fresh
per-tenant row on every application, no cross-tenant email uniqueness
constraint). This call uses `supabaseAdmin` (service-role key), which
**bypasses RLS** per `src/lib/tenant-db.ts`'s own header comment: "cross-tenant
isolation currently depends on each route remembering to add
`.eq('tenant_id', …)` — one forgotten filter is a data leak." The inline
comment on this line (`tenant-scope-ok: ...`) asserted the opposite of what
the code actually did — it reasoned about *authorization* (the member proved
ownership of the phone via the signed token) but the query had no tenant
*isolation* at all.

**Concrete failure**: an applicant applies to Tenant A's business (rejected
or hired, doesn't matter) with `jane@example.com`, then separately applies to
Tenant B's business with the same email. A verified Tenant-A team member
(possibly Jane herself, or anyone Jane later becomes at Tenant A) updates
their phone through this flow. The `.eq('email', ...)`-only update silently
overwrites Tenant B's `cleaner_applications.phone` for a row Tenant A has no
relationship to and no authorization over — corrupting another tenant's
applicant data with zero indication to either tenant that it happened.

## Fix (file-only, no push/deploy/DB)

`src/app/api/team-portal/update-phone/route.ts` — fetch `tenant_id` alongside
`email` on the initial `team_members` lookup, and filter the
`cleaner_applications` update by both `email` **and** `tenant_id`:

```ts
const { data: member } = await supabaseAdmin
  .from('team_members')
  .select('id, email, tenant_id')
  .eq('id', parsed.teamMemberId!)
  .single()
...
await supabaseAdmin
  .from('cleaner_applications')
  .update({ phone: phoneCheck.normalized })
  .eq('email', member.email)
  .eq('tenant_id', member.tenant_id)
```

Replaced the stale, incorrect inline comment with one documenting the actual
constraint (tenant-scoped table + non-unique email + service-role bypasses
RLS → the query itself must filter tenant_id).

## Verification sweep (item 2)

- Grepped every `supabaseAdmin...eq('email', ...)` write/read across
  `src/app/api` (10 sites) and `src/lib` (4 sites): every other instance
  already chains `.eq('tenant_id', ...)` on a tenant-scoped table, or targets
  a legitimately cross-tenant/platform-wide table by design
  (`partner_requests`, `contacts` — Full Loop's own sales-pipeline tables,
  same category `tenant-db.ts` calls out alongside `tenants`/`inquiries`/`leads`).
  This was the sole instance of the shape.
- Grepped every `supabaseAdmin...eq('phone', ...)` site — none exist; phone
  lookups all go through `.ilike('phone', ...)` (already `escapeLikeValue`'d,
  swept in an earlier session).

## Verification

- New test file `route.cross-tenant.test.ts` (4 tests): a shared-email
  applicant row in a *different* tenant is untouched by the update; the
  calling tenant's own `cleaner_applications` row and `team_members` row both
  update correctly; malformed token and invalid phone are still rejected.
- RED-confirmed: `git diff` of the fix saved to a patch, `git apply -R` to
  revert (not `git stash` — shared `.git` dir across workers, per this
  session's established convention), re-ran the new test file — the
  cross-tenant isolation test failed with the exact leak (Tenant B's row
  got Tenant A's new phone number), the other 3 tests stayed green (they
  don't exercise the missing filter). `git apply` to restore, re-ran — all 4
  green.
- `tsc --noEmit --pretty false`: 0 new errors (same 5 pre-existing baseline
  errors — admin-auth route typing, two cron test files' spread-argument
  typing, sunnyside-clean-nyc's site-nav.ts import names — unchanged).
- `eslint` on both touched files: 0 errors, 0 warnings.
- Full `vitest run`: 665/665 files, 3459 passed + 1 expected-fail (3460),
  0 regressions (was 664/664, 3455+1/3456 — net +1 file/+4 tests).

tenant_domains schema lane reconfirmed intact, no drift. No new SQL — no
schema change needed, this was an application-layer query-scoping fix only.

File-only. No push/deploy/DB.
