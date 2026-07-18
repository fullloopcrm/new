# client_properties: "set as primary" could leave 0 or 2 primary properties under a race (2026-07-18 08:50)

## Bug
`setPrimaryProperty()` (`src/lib/client-properties.ts`, reachable live via
`PATCH /api/client/properties` `action:'set_primary'` and via Selena/Yinez's
`update_account` address-change tool) demoted every property for a client to
`is_primary:false`, then set the target property `is_primary:true`, as two
separate statements:

```ts
export async function setPrimaryProperty(clientId, propertyId, actor) {
  await supabaseAdmin.from('client_properties').update({ is_primary: false }).eq('client_id', clientId)
  await supabaseAdmin.from('client_properties').update({ is_primary: true }).eq('id', propertyId).eq('client_id', clientId)
  ...
}
```

Two concurrent "set as primary" calls for two DIFFERENT properties on the same
client can interleave into TWO primaries (demote-then-set ordering) or, with a
naive reorder, ZERO primaries (each call's demote step stomps the other's
just-set row) — neither ordering of two separate statements closes it. This is
the exact same race already found and fixed on `client_contacts` (commit
`23ec52a9`, 2026-07-16) and the same "at most one primary" invariant already
DB-backstopped on `tenant_domains` (commit `31ff63c5`, 2026-07-17) — but
`client_properties` had never been touched for it.

A second instance of the same class lived in `resolveProperty()`: a brand-new
client's first-ever address computes `isPrimary = !existing || existing.length
=== 0` from a plain `SELECT` before inserting. Two concurrent bookings
resolving a brand-new client's first-ever property (e.g. a double-submitted
booking form) both read an empty `existing`, both compute `isPrimary:true`,
and both inserted `is_primary:true` rows directly — same 2-primaries failure,
different call site.

No DB constraint backed the invariant either — `052_client_properties.sql`
never added a uniqueness guard, unlike `tenant_domains`.

## Fix (file-only, no push/deploy/DB)
Same fix shape as `set_primary_client_contact`: a new atomic Postgres function,
`set_primary_client_property` (migration
`2026_07_18_set_primary_client_property.sql`, file-only, not applied — needs
Jeff's approval + the leader to run it):

```sql
CREATE OR REPLACE FUNCTION set_primary_client_property(
  p_tenant_id uuid, p_client_id uuid, p_property_id uuid
) RETURNS void AS $$
BEGIN
  UPDATE client_properties
  SET is_primary = (id = p_property_id)
  WHERE tenant_id = p_tenant_id AND client_id = p_client_id;
END;
$$ LANGUAGE plpgsql;
```

A single UPDATE is atomic in Postgres (one snapshot, serialized by row locks)
— no window exists for a second concurrent call to observe or interleave with
a partial state, so every call deterministically leaves exactly one property
primary (whichever call commits last wins, not zero and not two).

`client-properties.ts` changes:
- `setPrimaryProperty()` now resolves the client's `tenant_id` and calls the
  RPC instead of two separate writes. It now **throws** on an RPC error
  (previously both statements' errors were silently discarded and the caller
  always got treated as success) — required so a failed atomic write can't
  be reported as success, same discipline as every other RPC-fronted write
  this session.
- `resolveProperty()` now always inserts `is_primary:false`, then calls the
  same RPC to promote the new row when it should be primary — closes the
  brand-new-client double-insert race the same way.

Callers updated for the new throw:
- `PATCH /api/client/properties` (`action:'set_primary'`) now wraps the call
  in try/catch and returns a styled 500 instead of letting the exception
  surface unstyled.
- `POST /api/client/properties` (`make_primary:true`, via `addProperty()` →
  `setPrimaryProperty()`) got the same try/catch — this path had none before,
  and my change is what introduces the new throw on it.
- Selena/Yinez's `handleUpdateAccount` (`src/lib/selena/core.ts`) already
  wraps its `addProperty(makePrimary:true)` call in try/catch (reports via
  `yinezError`) — no change needed there.

DB-level backstop, same discipline as
`2026_07_17_tenant_domains_one_primary_per_tenant.sql`: migration
`2026_07_18_client_properties_one_primary_per_client.sql` (file-only, not
applied) dedupes any existing double-primary rows (oldest `created_at`, then
lowest `id`, wins — no `type` column to prefer here unlike `tenant_domains`)
then adds `CREATE UNIQUE INDEX ... ON client_properties (client_id) WHERE
is_primary = true`, so the invariant holds even if a future write path
reintroduces the two-step mistake.

## Tests
New `client-properties.race.test.ts` (6 tests), using the shared
`@/test/supabase-fake` fake with a synchronous single-pass `.rpc()` handler
(matching the real function's atomicity — no interleaving window inside one
sync JS function body):
- Two concurrent `setPrimaryProperty()` calls for two different properties →
  exactly one primary, not two.
- Single call still works (no regression).
- RPC error → `setPrimaryProperty()` throws (was previously swallowed).
- Two concurrent `resolveProperty()` calls for a brand-new client's first two
  addresses → exactly one primary, not two.
- Single first-property resolve still marked primary (no regression).
- A second address resolved for a client with an existing primary does not
  get promoted (no regression).

RED-confirmed against the pre-fix code (3 of the 6 new tests failed: 2
primaries created in both race scenarios, RPC error silently swallowed;
verified via `git apply -R` on the diff, not a stash — stash is disabled in
this worktree). GREEN after restoring the fix.

## Swept for siblings
Grepped every `is_primary` write site repo-wide:
- `tenant_domains` (`activate-tenant.ts`, `admin/websites/route.ts`,
  `onboard-tenant-site.ts`) — already fixed in prior rounds this session, and
  DB-backstopped by `tenant_domains_one_primary_per_tenant`.
- `client_contacts` (`clients/[id]/contacts/route.ts` +
  `[contactId]/route.ts`) — already fixed (`23ec52a9`, 2026-07-16), same RPC
  shape, no DB backstop (this session adds one for `client_properties` now,
  closing that gap for the new table but not retroactively for
  `client_contacts` — flagging, not fixing, since that table is out of this
  fix's blast radius).
- `client_properties` — this fix.
No other `is_primary`-bearing table exists in the schema today (grepped
`src/lib/migrations/*.sql` for `is_primary boolean` column definitions:
`tenant_domains`, `client_contacts`, `client_properties` only).

## Verification
- `tsc --noEmit`: clean on all 3 touched files. Pre-existing baseline noise
  only (stale `.next` admin-auth route-typing quirk, 2 unrelated cron
  test-file arg-count errors, 2 from the untracked
  `sunnyside-clean-nyc/site-nav.ts` outside this lane) — none newly
  introduced, none reference `client-properties.ts` or
  `client/properties/route.ts`.
- `eslint`: 0 warnings on all 3 touched files.
- Full suite: 674/674 files, 3486 passed + 1 pre-existing expected-fail
  (3487 total), 0 regressions.

## Not touched
- `client_contacts`'s equivalent missing DB backstop — flagged above, not
  fixed (different table, would need its own dedupe-first migration and is
  outside this bug's blast radius).
- `deactivateProperty()` — already a safe direct field update
  (`is_primary:false`, no cross-row effect, no race).
- Migrations are file-only, not applied — needs Jeff's approval + the leader
  to run them (in order: the RPC function first, or the unique-index
  migration first — the two are independent of each other; the RPC is useless
  without the code deploy, the index is useless without the dedupe it already
  contains).

File-only. No push/deploy/DB.
