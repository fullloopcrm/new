# W2 — 2026-07-18 09:25 — reason-field cap sweep + mass-SMS caps

## (1) New fresh-ground surface

Last round's carried-forward item ("a broader `*_reason` gap exists
app-wide ... left for a future round") turned out to be mostly already
covered — both public-facing decline routes
(`quotes/public/[token]/decline`, `documents/public/[token]/decline`)
already `.slice(0, 500)` their `reason` before any write. The real gap was
on the **authenticated** side, where `documents/[id]/void` (fixed a prior
round) had a cap but four siblings storing the identical shape did not:

- `invoices/[id]` DELETE (void) — `void_reason` from a `?reason=` query
  param, completely uncapped.
- `admin/comhub/messages/[id]/flag` — `flagged_reason`, uncapped.
- `admin/prospects/[id]` PATCH reject — `reject_reason`, uncapped.
- `deals/[id]/stage` POST (lost) — `lost_reason`, uncapped.

All four fixed with `capString(raw, 2000)` (src/lib/validate.ts, already
unit-tested from a prior round — reused, not reimplemented), matching the
established `reopened_reason` precedent.

## (2) Continuation — same class, different shape

Swept for `_reason` fields more broadly and found nothing else, but
**broadened the sweep to admin ad-hoc/bulk outbound SMS** while touching
`admin/send-apology-batch` (which also writes an apology-credit `reason`).
That route's caller-supplied `message` — the literal SMS body, billed
per-character per recipient by Telnyx — had **zero length cap**, and
unlike its two documented siblings (`find-cleaner/send` caps recipients at
50, `message-applicants/send` caps at 25) it also had **no recipient-count
cap at all** on `client_ids`. A single call could blast an unbounded
client list with an unbounded-length SMS body.

Fixed:
- `send-apology-batch`: added `BROADCAST_CAP = 50` (matching the
  `find-cleaner/send` sibling) on `client_ids.length`, `MESSAGE_MAX_LENGTH
  = 1600` (reject, not truncate — this is business-facing outbound text,
  not a DB scalar) on `message`, and `capString(reason, 2000)` on the
  DB-only `apology_credit_reason`.
- `sms/send` (single ad-hoc admin SMS): same `MESSAGE_MAX_LENGTH = 1600`
  reject-on-oversize check, previously had none.
- `admin/message-applicants/send`: already had a recipient cap
  (`BROADCAST_CAP = 25`) but no message-length cap — added the same 1600
  check.

Deliberately did NOT add a `confirmed`-before-send gate to
`send-apology-batch` even though both siblings require one — that's a
different class of fix (workflow/UX guard, not a size/overflow cap) and
would have silently broken the existing
`route.consent-guard.test.ts` calls that never send `confirmed`. Flagging,
not building, per scope discipline.

Also checked `find-cleaner/send`'s message: it's server-built from a fixed
template (`buildMessage()`), never caller free text — not a gap.

`campaigns/send` (campaign broadcast) was already safe: its `body` comes
from `campaigns` rows validated at creation time
(`validate(body, { body: { type: 'string', max: 10000 } })` in
`campaigns/route.ts`), so no separate fix needed there.

## (3) Gap/fluidity — carried-forward list

- Nothing new carried forward from this round; the `*_reason` item is
  closed.
- Resolver lane: untouched this round, still confirmed dry (4+ consecutive
  rounds).

## Verification

- 7 new test files (invoices void-reason, comhub flag, prospects reject,
  deals lost-reason, send-apology-batch batch-caps, sms/send message-cap,
  message-applicants message-cap), all RED/GREEN confirmed via
  `git diff` + `git apply -R` per-file (stash still blocked by the repo's
  pre-commit hook).
- `npx tsc --noEmit` clean.
- Full suite: 773/773 files, 3346/3383 tests passed, 37 skipped, 0
  failures.
- File-only, no push/deploy/DB write.
