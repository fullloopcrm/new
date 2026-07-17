# W4 broad-hunt — 2026-07-17 17:30 — comhub get-or-create: missing by-email RPC + race hardening

Queue (17:11 LEADER order, 3-deep, file-only, no push/deploy/DB):
(1) new fresh-ground surface. (2) continue whichever surface (1) opens up.
(3) keep gap/fluidity current.

## (1) Fresh ground: audit the platform's Postgres RPC "get-or-create" functions as a group for the TOCTOU class

Per the 17:15 checkpoint's untouched-target note: "Other Postgres RPC
functions already in prod (`comhub_get_or_create_*`, `seo_*`,
`cpa_token_bump_usage`) — not reviewed for the same race-condition class as
a set." Walked the `comhub_get_or_create_*` family
(`migrations/2026_05_19_comhub.sql`), the shared contact/thread lookup used
by every comhub ingestion path (SMS mirror trigger, telnyx-voice webhook,
admin send, portal messages, email backfill/cron).

## (2) Two real findings on the same function family

**Finding A (higher severity, not a race — a 100%-reproducible missing
function).** `comhub_get_or_create_contact_by_email` is called live via
`supabaseAdmin.rpc(...)` from 5 call sites — `portal/messages/route.ts`,
`admin/comhub/send/route.ts`, `admin/comhub/email/backfill/route.ts`,
`cron/comhub-email/route.ts` — but **no `CREATE FUNCTION
comhub_get_or_create_contact_by_email` exists anywhere in this repo's
tracked migrations.** `migrations/2026_05_19_comhub.sql` (the commit that
introduced all 5 call sites, per `git log -S`) defines only
`comhub_get_or_create_contact_by_phone` and `comhub_get_or_create_thread` —
the by-email sibling was referenced by calling code the same commit but its
own `CREATE FUNCTION` was never written. Confirmed by direct read of every
call site's error handling:
- `portal/messages/route.ts`: destructures only `data` from the RPC call
  (error silently discarded) — an email-only client (no phone on file) gets
  a silently empty message thread instead of their real history.
- `admin/comhub/send/route.ts`: returns HTTP 500 on every attempt to email
  a not-yet-known contact — directly reproducible, user-visible.
- `admin/comhub/email/backfill/route.ts` + `cron/comhub-email/route.ts`:
  both do `if (cErr || !contactId) { skipped++; continue }` — every inbound
  email from an unknown sender is silently dropped. The comhub "email
  channel" has effectively never ingested a new-sender message in
  production if this function has in fact never existed there (this worker
  has no DB access to confirm against `pg_proc`/prod directly — flagging
  for Jeff to check `SELECT proname FROM pg_proc WHERE proname =
  'comhub_get_or_create_contact_by_email'` before applying, in case it was
  created ad hoc outside tracked migrations).

**Finding B (the race this pass was actually looking for).** Same TOCTOU
shape as `rate_limit_check_and_record` (0acc0d3f, same session) and
`trg_block_booking_overlap`: `comhub_get_or_create_contact_by_phone` and
`comhub_get_or_create_thread` both do a plain SELECT-then-INSERT with no
locking. `comhub_contacts` has real unique indexes
(`uniq_comhub_contacts_tenant_phone`, `uniq_comhub_contacts_tenant_email`)
and `comhub_threads` has one too
(`uniq_comhub_threads_open_contact_channel`), so the race doesn't silently
duplicate rows — it makes the losing concurrent call's INSERT raise
`unique_violation`, which every calling route treats as **total failure**
(500 or silent skip) instead of "the row already exists, go fetch it."
Concretely: `telnyx-voice/route.ts:560`'s `comhub_get_or_create_contact_by_phone`
call runs *before* this session's existing `customer_call_id` claim-guard
(aba41390), so a genuine inbound call racing a concurrent SMS/email touch
for the same phone number can lose and get dropped with `{ ok: true, note:
'contact create failed' }` — no thread, no admin ring — and Telnyx never
retries because the response was 200.

## The fix

`src/lib/migrations/2026_07_17_comhub_contact_by_email_missing_fn_plus_race_safety_PROPOSED.sql`
(file-only, not applied):
1. Adds `comhub_get_or_create_contact_by_email`, mirroring
   `comhub_get_or_create_contact_by_phone`'s shape (same param names/order
   the 5 call sites already use), so no TypeScript changes are needed —
   once applied, all 5 existing call sites start working.
2. Hardens all three functions in the family
   (`_by_phone`, `_by_email`, `_thread`) with a bounded (3-attempt)
   retry-on-`unique_violation` loop around the terminal INSERT — the
   standard Postgres idiom for a get-or-create where the lookup key can't
   collapse to a single `INSERT ... ON CONFLICT` target (phone-or-email-or-
   client_id branching logic). On conflict, loop back and re-SELECT instead
   of letting the exception propagate.

Pure `CREATE OR REPLACE FUNCTION`, same signatures — zero TypeScript diff,
zero rollout risk beyond the DDL itself.

**Verification — what I could and couldn't check from this worktree.**
- Attempted to verify the SQL against a real (local, throwaway) Postgres
  instance — this machine has `postgresql@16` running locally and `psql` on
  PATH — but the harness's Bash permission layer denied the `psql`
  invocation outright (denied before even specifying a target database), so
  I could not spin up a scratch DB to prove the retry loop empirically. Not
  re-attempted per standing "don't retry a denied call" guidance.
- Fell back to the same verification class as this session's other
  `_PROPOSED.sql` migrations: careful static review, and reuse — the
  `_by_phone` and `_thread` bodies are byte-for-byte the existing
  proven-in-prod logic with only the terminal INSERT wrapped in a
  BEGIN/EXCEPTION block added; `_by_email` is a structural mirror of
  `_by_phone` with phone/email swapped throughout (confirmed `team_members`
  has both `phone` and `email` columns via `supabase/schema.sql`, so the
  mirrored lookups are valid).
- `npx tsc --noEmit --pretty false`: same 2 pre-existing unrelated errors as
  every prior report this session (`bookings/broadcast/route.xss.test.ts`,
  `sunnyside-clean-nyc/_lib/site-nav.ts`) — confirmed no new TS diff since
  this fix touches only a new `.sql` file, no `.ts` changes.
- **Not yet run: full `npx vitest run`.** Skipping is safe here specifically
  because zero `.ts`/`.tsx` files changed (unlike the rate-limit-db fix,
  which touched a widely-mocked shared module and needed the full-suite
  check to catch the 14-file `.rpc` stub gap) — there is no code path for a
  test to regress.
- Jeff should smoke-test post-apply:
  `SELECT comhub_get_or_create_contact_by_email('<tenant_id>',
  'smoke-test@example.com', 'Smoke Test');` — expect a UUID, not a 42883
  "does not exist" error — plus the concurrent-session manual race repro
  documented at the bottom of the migration file.

No commit made yet pending this write-up review — will commit
`2026_07_17_comhub_contact_by_email_missing_fn_plus_race_safety_PROPOSED.sql`
next as `fix(comhub/rpc): add missing by-email get-or-create fn + close
TOCTOU race across the get-or-create family`.

## (3) Gap/fluidity

**Surfaces exhausted or near-exhausted this session** (unchanged from
17:15 checkpoint, plus this pass): `comhub_get_or_create_*` family — now
closed (both the missing-function gap and the race).

**Untouched, plausible next targets (carried forward):**
- `src/lib/` broadly (259 files) — still no file-by-file walk; other
  shared helpers (`notify.ts`, `tenant-site.ts`, session/cookie helpers) are
  plausible siblings to both bug classes found this session
  (rate-limit-db's race, comhub's missing-function gap).
- The remaining Postgres RPC functions as a group: `seo_*` (money_keywords,
  refresh_rollup, run_detection), `cpa_token_bump_usage`,
  `post_journal_entry` — not yet reviewed for the same
  missing-function-vs-caller or TOCTOU shapes. `cpa_token_bump_usage` in
  particular (a counter bump) is a plausible race-class candidate by name
  alone.
No push/deploy/DB. File-only.

## Addendum — systematic dead-RPC sweep (same pass, cheap follow-up)

Since Finding A above was found by accident, ran the deliberate version:
extracted every distinct `.rpc('name')` string called from non-test `.ts`
under `src/` (9 distinct names) and every `create (or replace) function
<name>` across all tracked `.sql` files (case-insensitive — the `seo_*`
functions are defined with lowercase `create or replace function`, which a
naive case-sensitive grep misses and initially produced 3 false positives
here), then diffed. Result: **`comhub_get_or_create_contact_by_email` was
the only genuinely undefined RPC in the entire codebase** — all other 8
(`comhub_get_or_create_contact_by_phone`, `comhub_get_or_create_thread`,
`cpa_token_bump_usage`, `post_journal_entry`, `rate_limit_check_and_record`,
`seo_money_keywords`, `seo_refresh_rollup`, `seo_run_detection`) have a
matching definition somewhere in tracked migrations. This rules out a
broader "silently-dead RPC" class beyond the one fixed above — not
re-flagging as an open next-target.
