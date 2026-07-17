# Broad hunt — W4, 2026-07-17 18:45

Per 18:30 order items 1+2 (fresh-ground surface, then continue whichever
surface it opens up). File-only, no push/deploy/DB.

## Item 1: fresh ground — `src/lib/nycmaid/sms-templates.ts`

Unread this session (flagged as a candidate in the 18:35 checkpoint). Same
directory as the email-templates.ts fixed last pass, same "nycmaid's own
richer copy" pattern — worth checking for the same unescaped-user-input
class.

**Reachability first, matching last pass's bar:** of 35 exported functions,
only **one** has a live caller anywhere in the app —
`smsReviewRequest(cleanerName)`, imported by
`src/lib/nycmaid/review-engine.ts`. The other 34 (booking-received,
confirmations, reminders, job-assignment, daily-summary, payment-due, etc.)
have zero importers outside the file's own test — dead code, not fixed,
consistent with the session's standing rule against padding busywork onto
unreachable code.

**The one live path — checked for the email bug's class and found clean:**
- SMS bodies are plain text, not HTML — the "unescaped stored-HTML-
  injection" class from the email fix doesn't transfer; there's no render
  context where `<script>`/`<img onerror>` etc. would execute.
- `cleanerName` passed to `smsReviewRequest` comes from
  `booking.team_members.name` (DB, admin/onboarding-set), not from the
  inbound SMS text — not attacker-controlled in this call.
- The one genuinely user-controlled value in the whole flow —
  `reviewLink`, regex-extracted from the client's raw inbound SMS reply
  (`rawText.match(/https?:\/\/\S+/)`, scheme-restricted to http/https) and
  stored as `client_reviews.proof_url` — is **never rendered anywhere**.
  Grepped `proof_url` project-wide: the only hit is the INSERT in
  review-engine.ts itself. No admin UI reads or displays it, so there's no
  open-redirect or injection surface to close.
- `sms_logs` lookups in `handleNycMaidReview` (`ilike('recipient',
  '%...%')`, no `tenant_id` filter) carry a pre-existing, already-commented
  accepted-risk note ("tenant-scope-ok: nycmaid-legacy helper; retires with
  the standalone cutover") — re-confirmed the actual `bookings` fetch
  immediately after IS tenant-scoped, so a cross-tenant phone-number
  collision would at worst silently miss a match, not leak data. Not
  re-litigating an already-reviewed, already-flagged tradeoff.

## Item 2: continuation — the shared, actually-high-traffic sibling files

`nycmaid/sms-templates.ts` being mostly dead code meant the fresh-ground
surface didn't open a live bug to chase — so continuing meant checking the
files that ARE live for the same brand-injection class: `src/lib/sms-
templates.ts` (23 non-cleaning tenants, via `messaging/client-sms.ts`) and
`src/lib/messaging/sms-cleaning.ts` (nycmaid + the-florida-maid, the actual
live path for nycmaid client SMS — NOT `nycmaid/sms-templates.ts`).

Read both in full:
- All interpolated values (`brand.name`, `brand.phone`, `brand.site`,
  `brand.bookUrl`, `cleanerName` from `team_members`/`cleaners` relations)
  are DB/admin-sourced, not end-user input, and land in plain-text SMS —
  same "no HTML render context" conclusion as item 1.
- `portalUrl` params exist on several exported functions but every live
  call site (`bookings/route.ts`, `bookings/batch/route.ts`,
  `bookings/[id]/route.ts`, `client/book/route.ts`, `client/recurring/
  route.ts`, the 3 reminder/rating crons) omits it — dead parameter, no
  live injection path through it either.

**Conclusion: SMS surface (nycmaid-specific + shared) is clean.** The
email-XSS bug class found last pass genuinely doesn't reproduce here — SMS
has no render context for injected markup to execute in, and the one
truly-attacker-controlled string in the whole SMS pipeline is stored but
unreachable from any UI.

## No code changes this pass

Clean sweep — nothing to fix. Gap/fluidity checkpoint follows separately.
