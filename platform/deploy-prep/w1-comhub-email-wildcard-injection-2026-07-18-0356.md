# comhub-email / comhub-contacts email LIKE-wildcard injection — 03:50 order item (1)+(2)

**From:** W1, 03:50 order item (1) new fresh-ground surface + (2) continuation
opened by (1), after the durable-state (in-memory Map) sweep closed
session-wide.

## Context

The codebase has an established, actively-enforced pattern for this exact
bug class: `escapeLikeValue()` (`src/lib/postgrest-safe.ts`) neutralizes
`%`/`_`/`\` before a value reaches an **exact-match** `.ilike('column',
value)` lookup (as opposed to an intentional `%term%` substring search,
which is a different, already-safe class). `src/lib/like-wildcard-routes.test.ts`
enforces this as a source invariant across 7 files (client/check,
client/book, referrers/route, referrers/auth/request, referrers/auth/verify,
pin-reset, inbound-email-tenant) — each proven exploitable pre-fix
(anonymous PII lookup by wildcard, OTP misdirection, wrong-account booking
attachment, account-existence oracle).

Grepped every remaining `.ilike(` call site in `src/` against that list.
Found two live, unescaped exact-match instances outside it.

## Fixed (1): `cron/comhub-email/route.ts`

`pollAccount()`'s Yinez-auto-reply gate reads the inbound message's From
address (`fromAddr` — attacker-influenceable, SMTP doesn't authenticate the
From header on mail arriving at this polled inbox) and looks it up against
`clients.email` via `.ilike('email', fromAddr)` with **no escaping**, to
decide whether the sender is `do_not_service` (should never get an
automated reply). `clients(tenant_id, email)` has only a plain, non-unique
index (`006_error_resilience.sql`) — duplicate-email rows are possible. A
crafted From address containing a bare `%`/`_` becomes a real wildcard
instead of matching literally, which can resolve to a **different**
client's `do_not_service` flag than the actual sender's — letting a
blocked/opted-out contact craft a From address that misses their own
`do_not_service` row and still gets an automated Yinez reply (or the
inverse: suppresses a reply that should have gone through). This exact
call site was flagged "unreviewed, not confirmed clean or broken" in a
prior gap doc (`w1-cron-scheduled-jobs-sweep-2026-07-17.md`, "Not yet
swept this round" list didn't even reach it, and comhub-email itself was
noted as "matched the same send+mark grep pattern, not yet read in depth").

Fixed: `escapeLikeValue(fromAddr)`, same idiom as every sibling file. Added
`src/app/api/cron/comhub-email/route.ts` to `like-wildcard-routes.test.ts`'s
enforced `FILES` list. New test
`route.dns-wildcard.test.ts` captures the actual `.ilike()` call args via a
thin wrapper on the fake-supabase `clients` query builder and asserts the
pattern reaching it equals `escapeLikeValue(fromAddr)` (same assertion
style as the precedent Stripe payer-email wildcard fix, since fake-supabase's
own `.ilike()` regex conversion doesn't model backslash-escape semantics
faithfully enough to prove end-to-end DB matching behavior).

## Fixed (2): continuation — `admin/comhub/contacts/[id]/context/route.ts`

Same file already has a **hardened, documented fix for this exact bug
class on phone** in the same function: the code comment directly above the
email lookups explains that a substring `ilike()` with no length floor let
a short/malformed contact phone match an arbitrary unrelated
client/team_member, with the mismatch **persisted** onto
`comhub_contacts.client_id`/`team_member_id` (misattributing every future
message on that contact, plus this endpoint's booking history/spend/PII
response, to the wrong person). The email lookups two lines below —
`.ilike('email', contact.email)` ×2 (client match + team_member match) —
have the identical persist-on-match shape but were never given the same
treatment; `contact.email` traces back to an inbound sender address (e.g.
comhub-email's IMAP poll above), so it's exactly as attacker-influenceable
as the phone field this file already protects.

Fixed both call sites with `escapeLikeValue(contact.email)`. Added the file
to `like-wildcard-routes.test.ts`'s `FILES` list. New test
`route.email-wildcard.test.ts` extends the existing `route.phone-match.test.ts`
mock's `scopedChain` with a real SQL-LIKE-to-regex conversion (the existing
mock's `ilike()` was a no-op, since the phone match is resolved in-code via
`.find()`, not through a DB ilike — the email match needed a mock that
actually filters). RED-confirmed via `git apply -R`: 2/3 tests failed for
the exact predicted reason (bare `%` and a `_`-substituted email both
matched `UNRELATED_CLIENT` and got `client_id` persisted pre-fix); restored
GREEN. Third test is a same-file CONTROL proving the legitimate
case-insensitive exact match still links correctly post-fix.

## Checked, clean — not fixed (out of scope / no live blast radius)

- **`src/lib/selena-legacy-email.ts:96`** (`.ilike('email', from)`, same
  unescaped-exact-match shape, used to find-or-create a client from an
  inbound email) — confirmed **dead code**: `handleInboundEmail` (its sole
  export) has zero callers anywhere in `src/` outside its own file
  (exhaustive grep). Same family as the two already-flagged dead
  per-tenant `_lib/error-tracking.ts` / `_lib/auth.ts` clusters from
  earlier this session — candidate for a future delete-dead-code pass, not
  this one.
- **`src/app/api/test/email-selena/route.ts:45`** (`.ilike('email', email)`)
  — same shape, but gated behind `SELENA_TEST_TOKEN` (must be explicitly
  set per-deployment) + `safeEqual` constant-time compare; a caller who
  already holds that secret has far more direct DB access anyway. Same
  acceptable-risk class as `track/route.ts`'s in-memory Map, confirmed
  clean in a prior round.
- Every other unescaped `.ilike(` call site in `src/` (grepped exhaustively)
  is either an intentional `%term%` substring search (phone/name lookups —
  the `sanitizePostgrestValue()` class, not this one, per this codebase's
  own documented split) or already `escapeLikeValue`-sourced.

## Verification

- Both new test files RED-confirmed via `git apply -R` on the source fix
  alone (comhub-email: 1/1 failed on raw unescaped value; context route:
  2/3 failed for the predicted wrong-client-linked reason), restored GREEN.
- `like-wildcard-routes.test.ts` (now 9 files) passes with both new
  entries.
- tsc clean (same 5 pre-existing baseline errors: admin-auth's
  `verifyAdminToken` route-export shape, outreach + payment-reminder test
  spread-argument errors, and the 2 uncommitted `site-nav.ts` errors in
  this worktree from unrelated in-progress SEO work — none touch these
  files).
- eslint 0 errors/0 warnings on all touched files.
- Full suite run in progress at doc-write time; final count to be reported
  in the LEADER-CHANNEL line.

File-only. No push/deploy/DB. `tenant_domains` schema lane unchanged this
round.
