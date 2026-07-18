# W4 gap/fluidity checkpoint — 07:56

## This pass

Fresh-ground surface (LEADER item 1): picked up the 07:47 checkpoint's own
next-target candidate — checked the AI cost-abuse class (rate-limit call
volume capped, message payload size not) against the two fully
unauthenticated public web-chat-widget siblings, `/api/chat` and
`/api/yinez`. Both had the exact gap just closed on `ai/chat`/`ai/assistant`,
and arguably worse exposure since neither requires authentication. Fixed
both with the same `MAX_MESSAGE_LENGTH=4000` convention. Also checked
`admin/selena`, `selena/route.ts`, `selena/metrics` (mentioned as related in
the 07:47 checkpoint) — none call Anthropic directly, so they're not in this
class; no action needed there.

Full writeup: `w4-public-chat-yinez-message-length-cap-2026-07-18-0756.md`.

- `npx tsc --noEmit --pretty false`: 0 new errors (same 2 pre-existing
  unrelated `sunnyside-clean-nyc` errors carried forward every pass).
- 4 new tests (`route.message-length-cap.test.ts` × 2 files), all pass.
- Directory-scoped `api/chat/` + `api/yinez/`: 21/21 tests pass.
- Full suite (`npx vitest run`, from `platform/`): 702/703 files, 2462/2465
  tests pass — 1 pre-existing expected fail
  (`cron/tenant-health/status-coverage-divergence.test.ts`, documented aging
  item, untouched this pass), 0 regressions.
- 1 commit this pass: `153af166`. `git status` confirmed clean scope (only
  the 2 route files + 2 new test files) before committing. No push/deploy/DB.

## Aging items still open (carried forward, not re-litigated this pass)

Unchanged from the 07:47 checkpoint's list (create-tenant-from-lead
atomic-claim migration, referrers atomic-bump migrations, clients dedup
unique indexes, admin/cleanup-test-bookings name-collision,
comhub_get_or_create_contact_by_email TOCTOU, and the rest — see that
checkpoint for the full list).

## New aging items opened this pass

None.

## Next-target candidates if continuing fresh-ground hunting

- The AI cost-abuse class (rate-limit-without-size-cap) now looks fully
  closed across `admin/translate`, `ai/chat`, `ai/assistant`, `/api/chat`,
  `/api/yinez`.
- The `team-portal/*` staff-facing cap-asymmetry read carried from the
  07:22/07:47 checkpoints is still open — worth a dedicated pass rather
  than folding it into a broader sweep.
- Checked `route-auth-matrix.md` for other explicitly-flagged
  `needs-check` gaps: `/api/tenants` (authenticated tenant-creation POST,
  looks correctly gated via `getOwnerUserId()`, no live issue found) and
  `/api/test/email-selena` + its `/cleanup` sibling (both gated behind a
  `SELENA_TEST_TOKEN` env-var + `safeEqual` check, 404 if unset — already
  safe). All three `needs-check` markers in the matrix are now resolved;
  worth updating that doc's markers to reflect this the next time it's
  touched.

No push/deploy/DB this pass.
