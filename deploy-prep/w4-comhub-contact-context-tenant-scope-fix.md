# Broad-hunt fix — 20:02 order — W4, 2026-07-15

File-only. Continued into fresh surface not covered by the ~90 prior W4
sweeps: the Comhub "contact context panel" endpoints
(`admin/comhub/contacts/[id]/context`, `admin/comhub/contacts/[id]/notes`),
which don't appear in any prior report and weren't part of the earlier
comhub audits (those covered `comhub/email/backfill`,
`comhub/voice/control`, `comhub/threads`, not these two).

## Found and fixed

Both routes resolve a `comhub_contacts` row's `client_id`/`team_member_id`
(already fetched tenant-scoped: `.eq('id', id).eq('tenant_id', tenantId)`),
then use that FK to fetch/update the linked `clients`/`team_members` row —
but the follow-up query only filtered `.eq('id', clientId)` /
`.eq('id', teamMemberId)`, with **no `tenant_id` filter**, in three spots:

- `context/route.ts` GET: `clients` select (returns name/email/phone/
  address/notes/financials to the admin's right-side panel)
- `context/route.ts` GET: `team_members` select (returns name/email/phone/
  hourly_rate)
- `notes/route.ts` PATCH: `clients` update (writes the caller-supplied
  `notes` value)

Traced every current write path for `comhub_contacts.client_id`: the SQL
RPCs `comhub_get_or_create_contact_by_phone`/`_by_email`
(`migrations/2026_05_19_comhub.sql`) always re-verify
`clients.tenant_id = p_tenant_id` before accepting a passed-in
`client_id`, and `context/route.ts`'s own auto-match block (ilike phone/
email) scopes its `clients`/`team_members` lookup by `tenant_id` before
ever writing `client_id` back onto the contact. So today's write paths keep
the FK tenant-consistent — this isn't currently reachable as a live
cross-tenant leak. But it's exactly the belt-and-suspenders class this
session has fixed repeatedly elsewhere (bulk-booking FK injection, channel-
ownership checks): a trusted-looking FK should still be re-verified at the
point of use, since it only takes one future write path (a manual SQL edit,
a new endpoint that links a contact without re-checking tenant, comhub RLS
is service-role-only so nothing else backstops this) to turn a "belongs to
my tenant's contact" reference into a full cross-tenant client/team-member
record disclosure (or, on the PATCH, a cross-tenant notes overwrite).

Fixed by adding `.eq('tenant_id', tenantId)` to all three queries — same
pattern already used for the `bookings` queries lower in the same file.

## Verification

- `npx tsc --noEmit`: clean.
- Added `context/route.test.ts` (new file) + extended the existing
  `notes/route.test.ts`'s mock to a two-`.eq()` chain, with new assertions
  that the `clients`/`team_members` queries include
  `['tenant_id', 'tenant-1']` alongside the id filter.
- Mutation-verified: reverted both fixes locally, reran — all 3 new/updated
  assertions went RED (missing tenant_id eq call), confirmed they'd have
  caught the pre-fix code; restored the fix, reran — all 7 tests in both
  files GREEN.
- Full suite: 352/353 files, 1478/1481 tests pass (1 pre-existing expected
  fail unrelated to these files — `cron/tenant-health/status-coverage-
  divergence.test.ts`, a deliberately-RED tracked gap, same baseline noted
  in prior W4 reports).
- `scripts/audit-tenant-scope.mjs`: pre-existing failure (43 unscoped
  queries), neither of my two edited files appear in its findings —
  confirmed unrelated to this change, not something this pass introduced or
  need fix.

File-only, no push/deploy/DB. Continuing broad-hunt.
