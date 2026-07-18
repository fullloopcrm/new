# entities.is_default could be archived, silently misrouting new financial writes to a dead entity (2026-07-18 09:25)

## Bug
Same failure class as this morning's is_primary races (client_contacts,
client_properties, tenant_domains), one layer deeper: `entities.is_default`
already had a real DB backstop (`idx_entities_tenant_default`, unique
partial index, migration 034), so a two-step "demote, then set" race there
could only throw an ugly collision, never silently create two defaults.
The actual live bug is the sibling invariant nobody enforced: an entity that
is `is_default = TRUE` must also stay `active = TRUE`, and nothing prevented
the two from diverging.

`DELETE /api/finance/entities/[id]`'s "block archiving the default entity"
guard was check-then-act:
```ts
const { data: ent } = await supabaseAdmin.from('entities').select('is_default')...single()
if (ent.is_default) return 400   // <-- checked here...
await supabaseAdmin.from('entities').update({ active: false })...  // <-- ...but written here
```
A concurrent `PATCH .../[id] {make_default:true}` on the SAME entity landing
in that window flips `is_default` to `true` right before the archive fires
— the tenant's default entity ends up `is_default:TRUE, active:FALSE`.

That state is invisible in the UI (`listEntities()` filters `active:true`,
so the archived default vanishes from the entity switcher and settings
page) but NOT invisible to the 8 places that resolve "the tenant's default
entity" when no `entity_id` is given — every one of them selected by
`is_default` alone, no `active` filter:

1. `getDefaultEntityId()` (`src/lib/entity.ts`) — 4 live callers: `POST
   /api/invoices`, `POST /api/finance/expenses`, `POST
   /api/finance/bank-accounts`, `cron/generate-monthly-invoices`. Every new
   expense/invoice/bank-account/monthly-statement created without an
   explicit `entity_id` would silently attach to the dead entity forever.
2. `post_journal_entry`'s own SQL-side fallback (migrations 039 + the
   still-unapplied 064 draft) — every automatic ledger post (revenue, labor,
   adjustments, recurring expenses) with no explicit entity resolves the
   same way at the DB level.
3. `ensureDefaultEntity()` (`src/lib/entity-provision.ts`) — the
   **documented self-healing guarantee** ("every tenant must own exactly
   one default entity"). Without the filter it reads the archived row back
   as "already exists" and permanently no-ops instead of healing — this is
   the one function whose entire job is to prevent exactly this outcome,
   and it had the same gap.
4. `getTenantProfile()` (`src/lib/tenant-profile.ts`) — read-only prefill,
   would silently show/hide stale archived-entity data.
5–8. Two more inline `is_default` lookups apiece in
   `src/app/api/admin/businesses/[id]/profile/route.ts` (PATCH update) and
   `src/app/api/dashboard/onboarding/profile/route.ts` (GET prefill + the
   wizard's own existing-entity check on submit) — profile edits would
   silently land on the archived entity instead of ever creating/promoting
   a new active one.

Net effect: once the archive race fires once for a tenant, every future
financial write with no explicit entity, every profile edit, and the
platform's own self-healing mechanism all quietly keep operating on a dead
entity, with zero observable symptom until someone manually audits
`entity_id` values against `active` — a real risk of misattributed P&L /
tax-export data that's hard to even notice, let alone diagnose.

## Fix (file-only, no push/deploy/DB)

**Root cause — DELETE's TOCTOU race:**
The `is_default` check now lives in the archive UPDATE's own WHERE clause
(`.eq('is_default', false)`), not a preceding SELECT — atomic against a
concurrent make_default on the same row, no RPC needed (a single UPDATE
statement is already atomic under Postgres row locking).

**Collision hardening — POST/PATCH make_default:**
Both routes now promote through a new `set_default_entity(tenant_id,
entity_id)` RPC instead of a racy two-step demote-then-write — same
single-UPDATE idiom as `set_primary_client_contact` /
`set_primary_client_property` (`SET is_default = (id = target)` covers
demote-everyone-else + promote-target in one statement). The RPC also
`SELECT ... FOR UPDATE`-locks the target row before checking `active`,
which serializes it against DELETE's archive UPDATE on the same row from
either direction. `POST /api/finance/entities` now always inserts
`is_default:false` first, then promotes via the RPC if `make_default` was
requested.

**Defense in depth — active filter on every fallback:**
All 8 call sites above now filter `active = true` alongside `is_default =
true`. `post_journal_entry`'s live (migration 039) shape was patched
directly with the filter added and nothing else changed — deliberately
NOT rewritten to 064's idempotent `ON CONFLICT` shape, since 064 is still
file-only/unapplied and referencing `idx_journal_entries_source_unique`
before it exists would break every journal post at runtime. 064's own
draft got the same filter added so whichever of the two migrations the
leader applies last still carries the fix.

**Backfill:** a one-time `UPDATE entities SET is_default = FALSE WHERE
is_default = TRUE AND active = FALSE` ships in the same migration file, so
if this race already fired in prod before today, the self-healing paths
above can actually recover (the DB's unique partial index would otherwise
keep blocking a fresh INSERT/promote, since the archived row still holds
the one `is_default:true` slot).

All new DB objects (`set_default_entity` RPC, the `post_journal_entry`
patch, the backfill) are in
`src/lib/migrations/2026_07_18_entity_default_must_be_active.sql` —
file-only, not applied. Pre-flight SELECT included so the leader can check
today's live blast radius (expected 0 rows; unconfirmed either way without
DB access from this worktree).

## Tests
- `src/lib/entity.test.ts` (new, 4 tests): `getDefaultEntityId` resolves an
  active default, returns null when the only default is archived, does not
  fall back to a non-default active entity, returns null with no entities.
  RED-confirmed via `git apply -R` — 2/4 failed for the exact predicted
  reason (resolved the archived entity) pre-fix.
- `src/lib/entity-provision.test.ts` (new, 3 tests): `ensureDefaultEntity`
  no-ops with an active default, creates one when none exists, **heals**
  instead of no-op-ing when the only default is archived. RED-confirmed —
  the heal case failed pre-fix (`created` was `false`).
- `src/app/api/finance/entities/route.race.test.ts` (new, 3 tests): normal
  create, make_default promotes + demotes the old default, two concurrent
  make_default creates land exactly one default (not a collision 500).
- `src/app/api/finance/entities/[id]/route.race.test.ts` (new, 8 tests):
  DELETE blocks archiving the default / archives a non-default normally /
  404s on unknown id / never leaves an is_default+archived row under a
  simulated PATCH-vs-DELETE race; PATCH promotes+demotes / refuses to
  promote an archived entity / leaves is_default untouched when
  make_default is absent / two concurrent make_default calls for different
  entities land exactly one default. RED-confirmed against the pre-fix
  route file via `git apply -R` — 2/8 failed for the exact predicted reason
  (archived-entity promotion succeeded, concurrent race produced 2
  defaults).
- 6 pre-existing test files had `entities` fixtures updated with an
  explicit `active: true` (invoices/route.booking-link,
  finance/expenses/route, finance/bank-accounts/route.fk-injection,
  cron/generate-monthly-invoices/route, admin/businesses/.../route.isolation,
  dashboard/onboarding/profile/route.isolation +
  route.permission) — these fixtures never modeled `active` at all
  (schema is `NOT NULL DEFAULT TRUE`, so a real row can never have it
  undefined), and the new `.eq('active', true)` filters correctly stopped
  matching them until fixed. All 9 files re-verified green after the
  fixture fix.
- `getTenantProfile()`'s fix (read-only) and the 2 inline profile-route
  lookups got the same 1-line filter but no dedicated new test beyond the
  existing isolation suites re-passing — lower-risk/read-adjacent paths,
  consistent with this session's discipline of not padding coverage past
  what a fix's actual risk warrants.
- Full suite: 680/680 files, 3508 passed + 1 pre-existing expected-fail, 0
  regressions (676 files at this morning's last report → 680 here, the +4
  new test files from this pass: `entity.test.ts`,
  `entity-provision.test.ts`, and the 2 `route.race.test.ts` files).
- `tsc --noEmit`: clean on all 19 touched files (5 pre-existing baseline
  errors elsewhere, none new, none referencing touched files).
- `eslint`: 0 errors on all touched files (4 pre-existing warnings — 2
  unused imports already present before this pass, 1 unused test var, 1
  unused `soc` var in tenant-profile.ts — none newly introduced).

## Swept for more siblings
Grepped every `is_default` reference repo-wide (migrations + app code).
Confirmed all 8 live resolution sites above are accounted for. The
migration-034 one-time backfill UPDATEs (`WHERE tenant_id = ... AND
is_default LIMIT 1`, run once at entity-system rollout when every entity
was freshly seeded active) are not live runtime code — not touched, not a
bug.

## Not touched
- `entities.status`-equivalent lifecycle beyond `active`/`is_default`
  doesn't exist for this table (unlike `tenant_domains.status`, flagged
  dead in an earlier pass) — nothing else to reconcile here.
- Whether to also add a DB-level trigger/constraint enforcing "is_default
  implies active" (belt-and-suspenders beyond the app-level fixes above) —
  flagged as a possible future hardening, not built this pass; the atomic
  RPC + atomic DELETE guard already close the reachable race from the
  application side, and a CHECK constraint can't reference another row so
  this would need a trigger, which is more machinery than the confirmed
  risk currently justifies (YAGNI, same discipline as the
  `tenant_domains.status` dead-column call from an earlier round).
