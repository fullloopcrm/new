# W2 gap/fluidity refresh — 2026-07-17 19:29

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-sms-platform-fallback-correction-2026-07-17-1918.md`.

Leader's fresh 3-deep queue this round (19:23 LEADER->W2): (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) + (2) this round — bookings cluster off the sms_number carry-forward list

The 15:23 and 19:18 docs both flag the same ~31-file carry-forward list as the recommended next fresh-ground surface: every API route that reads `tenant.telnyx_api_key`/`.telnyx_phone` directly (bypassing `resolveTenantSmsCredentials()`), each missing the non-gated `telnyx_phone || sms_number` legacy-column precedence fix. Picked the highest-traffic, highest-risk-of-silent-skip cluster off that list — **Bookings** (all 4 files the 15:23 doc named under that heading):

- `api/bookings/route.ts` — POST: client confirmation SMS + team assignment SMS
- `api/bookings/[id]/route.ts` — PATCH: confirm/reassign/reschedule SMS (2 branches, both fixed); DELETE: cancellation SMS
- `api/bookings/broadcast/route.ts` — urgent job broadcast SMS to active crew

Each: added `sms_number` to the tenant SELECT, replaced the inline `tenantData.telnyx_api_key && tenantData.telnyx_phone` gate + raw field reads with `resolveTenantSmsCredentials(tenantData)`. `platformFallback` left at its default `false` — the compliance-gated question (JEFF-MORNING-QUEUE.md, still unanswered) is untouched either direction, exactly as the 19:18 correction's carry-forward note specified.

**Net effect:** no behavior change for any tenant with `telnyx_phone` already populated (it still wins). A tenant with only the legacy `sms_number` column set — previously silently skipped on all 5 send paths across these 3 files — now sends. Same bug class as the 4 cron jobs fixed 2 rounds ago, same non-gated half of the fix.

`api/bookings/batch/route.ts` (the one file in this cluster with its own platform-fallback anomaly) was correctly left untouched, per both prior docs' explicit recommendation to wait for Jeff's compliance call before touching it either direction.

## Verification

- `npx tsc --noEmit` clean.
- `npx eslint` on all 3 touched files: 0 new warnings. One pre-existing `bizName` unused-var warning in `bookings/[id]/route.ts` confirmed via `git stash` to predate this change (present on both branches, unrelated to the SMS resolver swap — `bizName` is unused in the DELETE handler's cancellation-notification block, not touched here).
- Full repo suite: 650/650 files, 2797/2834 tests passed (37 pre-existing skips), 0 regressions. Existing `route.sms-consent-guard.test.ts` / `route.team-sms-consent-guard.test.ts` for all 3 routes already exercise `telnyx_api_key`/`telnyx_phone` fully populated and pass unaffected by the resolver swap.
- No new per-caller test file, following the precedent set by the 4-cron continuation (`05b55d00`): `lib/sms-credentials.test.ts` already carries the resolver's own precedence + wrong-tenant-probe coverage (grep-verified this round, `sms-credentials.test.ts:77,166`), and these 3 files are pure call-site conversions with no new logic of their own to test independently.
- 1 commit this round: `bcb7d7c6`. File-only, no push/deploy/DB.

## NOTICED — not fixed, flagging for the leader/Jeff

1. The compliance-gated `platformFallback` question (JEFF-MORNING-QUEUE.md, 15:17 2026-07-17) is still open. Nothing this round touches it either direction.
2. `bookings/batch/route.ts`'s pre-existing platform-fallback anomaly — still untouched, still needs Jeff's call, per both prior docs.
3. Carry-forward list narrows: **Bookings cluster now closed** (4/4 files — 3 fixed this round, `batch` correctly held pending the compliance call). ~27 files remain across client-facing, send/document flows, admin, remaining crons, and other — full list preserved in `w2-telnyx-sms-credential-fallback-gap-2026-07-17-1523.md` item under "(1)".

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward unchanged from prior rounds. Nothing new this round.

## Remaining candidates, not yet fixed (fresh ground for a future round)

Same carry-forward list, now ~27 files (Bookings cluster closed this round). Next natural slice by traffic/risk: client-facing (`client/book`, `client/reschedule/[id]`, `client/send-code` ×2, `portal/collect`, `portal/auth`) — these are the other primary customer-facing SMS paths, same shape as this round's fix. Recommend continuing at the same incremental cadence (a handful of related files per round, full verification each time).
