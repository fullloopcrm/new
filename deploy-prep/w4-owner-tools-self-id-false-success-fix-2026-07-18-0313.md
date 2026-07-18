# W4 — owner-tools self-id false-success fix — 2026-07-18 03:13

Per the 03:12 LEADER order's 3-deep queue. File-only, no push/deploy/DB.

## (1) New fresh-ground surface

Full read of `src/lib/selena/tools.ts` (1520 lines, the current Yinez
owner-tool dispatcher — flagged as under-covered by the 0303 checkpoint's
next-target list, distinct from the already-fully-read
`selena-legacy-handlers.ts`).

`owner-fk-authz.test.ts` already locks down one bug class in this file: a
tool that writes a **referenced** id (`client_id`/`cleaner_id`) verbatim
into another row without checking that id resolves inside the caller's
tenant. Its own test comments (and `assign_cleaner_to_booking`'s
`booking_id` check) explicitly name a sibling class: a tool that mutates a
row **by its own id** (`payout_id`, `client_id` on block, `cleaner_id` on
update/deactivate, `schedule_id`, `deal_id`, `notification_id`,
`application_id`) where `.update(...).eq('id', x).eq('tenant_id', tid)`
silently matches zero rows for a foreign-tenant id — Supabase returns no
error, so the handler reports `ok:true` while mutating nothing. This class
was fixed for `booking_id` in `assign_cleaner_to_booking`/`update_booking`
but never extended to the rest of the file.

Read every handler in the file end-to-end (not grep-and-assume) and found
this self-id gap present in 10 handlers:

- `mark_payout_paid` (`payout_id` → `cleaner_payouts`)
- `block_client` (`client_id` → `clients`) — the `select` happened but its
  result was never checked before the unconditional `update`
- `update_cleaner`, `deactivate_cleaner` (`cleaner_id` → `cleaners`)
- `pause_recurring`, `resume_recurring`, `cancel_recurring`
  (`schedule_id` → `recurring_schedules`)
- `update_deal` (`deal_id` → `deals`)
- `mark_notification_read` (`notification_id` → `notifications`)
- `reject_cleaner_application` (`application_id` → `cleaner_applications`;
  its sibling `approve_cleaner_application` already selected the row first
  and was unaffected)

## Severity call

**Not a cross-tenant escalation** — the `.eq('tenant_id', tid)` filter on
every update means a foreign-tenant id can never actually mutate another
tenant's row. The real defect is an **honesty/reliability** one: Yinez is
an LLM tool-caller, and an owner asking her to "pause schedule X" or "mark
payout Y paid" with a stale, mistyped, or hallucinated id gets back
`ok:true` and believes the action succeeded when nothing happened. That's
the same "silent failure" class this session has fixed elsewhere (e.g. the
voice-hangup false-success fix, the notify() dispatcher gaps). Treated as
a real bug and fixed, not logged as a policy question — unlike the
`leads/block`/`leads/verify` RBAC-granularity items from the 0303
checkpoint, there's no product judgment call here, just a missing
existence check with an obvious, uncontroversial fix mirroring the
established pattern already in this exact file.

## Fix

Extended `idInTenant()`'s table union to include `recurring_schedules`,
`cleaner_payouts`, `notifications`, `cleaner_applications`, and added an
existence check (or, for `block_client`, checked the existing `select`'s
result) before each of the 10 handlers' `update` call, returning a
`"<noun> not found"` error consistent with the rest of the file's
convention.

## (2) Continued the surface

Checked whether the same self-id false-success class exists anywhere else
in the Yinez tool surface:

- `src/lib/selena/core.ts` (client-facing tools: `reschedule_booking`,
  `cancel_booking`, `manage_recurring`, `update_account`, etc.) — already
  fully hardened. These derive the caller's `client_id`/`tenant_id` from
  the **conversation row**, never from caller input, and explicitly check
  row-ownership (`booking.client_id !== callerClientId`) before every
  mutation, with comments naming this exact trust boundary. No gap.
- `src/lib/selena-legacy-handlers.ts` — same pattern already present at
  every `.update()` call site (select-and-check before mutate, e.g. lines
  425/442, 461/474, 504/517-530). Already covered by this session's earlier
  `cross-client-idor-fix` commit. No gap.

So `tools.ts`'s 10 handlers were the last unmined instance of this class
across the whole Yinez surface (owner + client-facing + legacy).

## (3) Gap/fluidity

See `w4-gap-fluidity-checkpoint-2026-07-18-0313.md`.

## Verification

- New test file `src/lib/selena/owner-fk-authz-self-id.test.ts` (18 tests,
  reject-foreign / allow-own pairs for all 10 handlers).
- RED confirmed: stashed the `tools.ts` fix and reran the new test file —
  10 of 18 failed (the un-fixed handlers), 8 passed (the already-correct
  behavior, e.g. `approve_cleaner_application`-adjacent scaffolding).
- GREEN confirmed: restored the fix, reran — 18/18 pass.
- No regressions: `npx vitest run src/lib/selena` — 17 files, 107 tests,
  all pass.
- `npx tsc --noEmit` — same 2 pre-existing unrelated errors as the
  unmodified baseline (`sunnyside-clean-nyc/_lib/site-nav.ts` import-name
  mismatches, confirmed present on `git stash` before this change too); no
  new errors from this diff.

No push/deploy/DB this pass.
