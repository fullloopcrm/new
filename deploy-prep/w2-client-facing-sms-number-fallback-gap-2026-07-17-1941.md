# W2 gap/fluidity refresh — 2026-07-17 19:41

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-bookings-sms-number-fallback-gap-2026-07-17-1929.md`.

Leader's fresh 3-deep queue this round (19:33 LEADER->W2): (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) + (2) this round — client-facing cluster off the sms_number carry-forward list

Same ~27-file carry-forward list flagged in the last two docs: every API route reading `tenant.telnyx_api_key`/`.telnyx_phone` directly (bypassing `resolveTenantSmsCredentials()`), missing the non-gated `telnyx_phone || sms_number` legacy-column precedence fix. Picked the **Client-facing** cluster this round (the 15:23 doc's own recommended next slice, "these are the other primary customer-facing SMS paths, same shape as this round's fix" per the 19:29 doc) — all 5 files/6 call sites the 15:23 doc named under that heading:

- `api/client/book/route.ts` — booking-received client confirmation SMS
- `api/client/reschedule/[id]/route.ts` — reschedule confirmation SMS
- `api/client/send-code/route.ts` — OTP send (2 branches: SMS-alongside-email, SMS-primary)
- `api/portal/collect/route.ts` — Selena-handoff recap SMS
- `api/portal/auth/route.ts` — client portal login OTP send

Each: replaced the inline `tenant.telnyx_api_key && tenant.telnyx_phone` gate + raw field reads with `resolveTenantSmsCredentials(tenant)`. 4 of 5 (`book`, `reschedule/[id]`, `send-code`, `portal/collect`) get their tenant row from `getTenantFromHeaders()`, which already `select('*')`s — no SELECT change needed, `sms_number` was already on the object, just unread. `portal/auth`'s `send_code` action does its own scoped `.select('id, name, telnyx_api_key, telnyx_phone, resend_api_key')` — added `sms_number` to that list. `platformFallback` left at its default `false`, same as every round — the compliance-gated question (JEFF-MORNING-QUEUE.md, 15:17 2026-07-17) is untouched either direction.

**Sharpest instance this round — `portal/auth`'s send_code action:** unlike the other 4 (which just silently skip the SMS send on a sms_number-only tenant), this route has its own SMS-unavailable fallback: `channel = 'email'` when the Telnyx gate fails, then sends the OTP by email instead. A tenant with only the legacy `sms_number` column set was silently downgrading every client-portal login attempt to email delivery, not just dropping a notification — a real UX difference (email OTP has different deliverability/latency than SMS) tied to which column happened to be populated, invisible to the tenant. Now resolves through `sms_number` like every other caller, so those tenants get the SMS path they should always have had.

**Net effect:** no behavior change for any tenant with `telnyx_phone` already populated. A tenant with only the legacy `sms_number` column set — previously silently skipped (4 routes) or silently downgraded to email (portal/auth) — now sends SMS on all 6 call sites. Same bug class as the 4 cron jobs and the bookings cluster fixed in prior rounds.

## Verification

- `npx tsc --noEmit` clean.
- `npx eslint` on all 5 touched files: 0 new warnings.
- Full repo suite: 650/650 files, 2797/2834 tests passed (37 pre-existing skips), 0 regressions — identical pass/skip counts to the 19:29 bookings-cluster round, confirming no new breakage.
- No new per-caller test file, same precedent as the cron and bookings rounds: `lib/sms-credentials.test.ts` already carries the resolver's own precedence + wrong-tenant-probe coverage, and these 5 files are pure call-site conversions with no new logic of their own. Existing suites (`route.sms-consent-guard.test.ts` for reschedule, `route.tenant-scope.test.ts` for portal/collect, `route.send-code-isolation.test.ts` / `route.send-code-rate-limit-scope.witness.test.ts` for portal/auth, plus book's own witness/race/consent suites) all exercise these routes with `telnyx_api_key`/`telnyx_phone` fully populated and pass unaffected by the resolver swap.
- 1 commit this round: `84020c39`. File-only, no push/deploy/DB.

## NOTICED — not fixed, flagging for the leader/Jeff

1. The compliance-gated `platformFallback` question (JEFF-MORNING-QUEUE.md, 15:17 2026-07-17) is still open. Nothing this round touches it either direction.
2. `bookings/batch/route.ts`'s pre-existing platform-fallback anomaly — still untouched, still needs Jeff's call.
3. Carry-forward list narrows: **Client-facing cluster now closed** (5/5 files — all fixed this round). ~22 files remain across send/document flows, admin, remaining crons, and other — full list preserved in `w2-telnyx-sms-credential-fallback-gap-2026-07-17-1523.md` item under "(1)".

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward unchanged from prior rounds. Nothing new this round.

## Remaining candidates, not yet fixed (fresh ground for a future round)

Same carry-forward list, now ~22 files (Client-facing cluster closed this round). Next natural slice by traffic/risk: **Send/document flows** (`api/sms/route.ts`, `api/sms/send/route.ts`, `api/invoices/[id]/send/route.ts`, `api/quotes/[id]/send/route.ts`, `api/documents/[id]/send/route.ts`, `api/documents/public/[token]/sign/route.ts`, `api/routes/[id]/publish/route.ts`) — 7 files, all revenue/document-adjacent customer notifications, same shape as the last 3 rounds' fixes. Recommend continuing at the same incremental cadence (a handful of related files per round, full verification each time).
