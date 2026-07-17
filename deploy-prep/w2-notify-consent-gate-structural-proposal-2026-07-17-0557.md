# Proposal — move the `sms_consent`/`do_not_service` gate into `notify()` itself

**Status: design only. No code changed in `src/lib/notify.ts` this round, per Jeff/leader's explicit instruction not to touch the shared helper unilaterally.**

## Why this doc exists

This session has fixed 13 separate call sites this bug class (missing `sms_consent`/`do_not_service` check on a client-facing send), each time by adding the check *at the call site*, immediately before the send. That pattern works, but it is fragile against regression: every future engineer who adds a new `notify({ recipientType: 'client', channel: 'email' | 'sms', ... })` call site has to remember, unprompted, to pre-fetch `sms_consent`/`do_not_service` and gate on it themselves — with no compiler, lint rule, or runtime assertion to catch the omission. The 13-site sweep proves the omission is not hypothetical; it is what already happened, 13 times, in one codebase, before this session started fixing them.

This doc does two things: (1) gives a complete, verified census of every client-facing call site that goes through the shared `notify()` helper — confirming call-site gating has now reached 100% coverage of that census — and (2) proposes the structural fix that would make the next call site safe *by construction* instead of by convention.

## Complete census — every `recipientType: 'client'` call site through `src/lib/notify.ts`

Method: `grep -rn "recipientType:" --include="*.ts"` across `src/`, filtered to the shared `@/lib/notify` importers (49 files import it; per-tenant clones like `nycmaid/notify.ts` and the `site/<tenant>/_lib/notify.ts` forks are separate implementations, out of scope — see Known debt note below). Cross-checked against every `notify({ type: '...' })` call site for the template types that read like they *could* be client-facing (`payment_received`, `daily_summary`, `booking_received`) to confirm none of them silently pass `recipientType: 'client'` via a variable. None do — every `recipientType` value in every `notify()` call site in the codebase is a literal (`'client'`, `'admin'`, `'team_member'`, or the per-tenant-clone-only `'cleaner'`), confirmed by grepping for `recipientType:` with the literal values excluded and finding zero shared-notify() hits.

| # | File | Channel(s) | Status |
|---|------|-----------|--------|
| 1 | `api/bookings/route.ts` (create) | email + sms | **Gated** — fixed this session, round 9 (`c204754c`) |
| 2 | `api/bookings/[id]/route.ts` (update + cancel) | email + sms | **Gated** — fixed this session, round 9 (`c204754c`) |
| 3 | `api/send-booking-emails/route.ts` (admin resend) | email or sms | **Gated** — fixed this round |
| 4 | `api/campaigns/send/route.ts` (marketing send, 3 sites) | email + sms | **Gated** for `do_not_service` (fixed earlier this session); `sms_marketing_opt_out` half stays open per Jeff's call (unchanged) |
| 5 | `api/notifications/route.ts` (15-min heads-up) | sms | **Gated** — fixed this round |
| 6 | `api/cron/reminders/route.ts` (day-based, hour-based, thank-you — 3 sub-sites) | email + sms | **Gated** — fixed this round |
| 7 | `api/cron/follow-up/route.ts` (3-day thank-you, separate cron file from #6) | email | **Gated** — fixed this round |

**Result: 7 files, every one now gated.** This round's 4 fresh-ground fixes (#3, #5, #6, #7) close what appears to be the *last* unaudited client-facing `notify()` call sites — the census above is exhaustive as of this commit, not a sample.

Non-findings worth recording so this census doesn't need re-deriving:
- `payment_received` (3 real send sites: `payment-processor.ts`, plus 2 in-app-only inserts in `webhooks/stripe.ts` and `admin/payments/confirm-match/route.ts`) always defaults to `recipientType: 'admin'` — no call site sends a payment receipt to the client through this helper today. If that ever changes, it lands as call site #8 and needs its own judgment call (see Alternatives below).
- `daily_summary` (`cron/daily-summary/route.ts`) is an operator digest, `recipientType: 'admin'`/`'team_member'` only.
- `lib/nycmaid/client-contacts.ts:sendClientSMS()` and `lib/selena/tools.ts`'s manual-send tool both call the *raw* `sendSMS()` from `@/lib/sms`, not `notify()` — out of scope for this proposal. The former already gates internally (confirmed safe in an earlier round's gap doc); the latter is an explicit admin/AI-initiated manual send with `skipConsent: true` documented as intentional.

## The structural gap itself (unchanged, for reference)

`notify()` (`src/lib/notify.ts:150-165`) resolves `email`/`phone` for the recipient directly from `clients`/`team_members` by `recipientId`, independent of anything the caller passed in, and sends on presence alone. Its only gate is `NOTIFY_COMM_MAP` + `isCommEnabled()` (`notify.ts:268-276`) — a **tenant-level** feature toggle ("does this tenant want `booking_reminder` SMS on at all"), not a **per-client** consent check ("did *this* client text STOP, or get flagged do-not-service"). The two are orthogonal and both need to pass.

## Proposed design

Add the consent check inside `notify()`, at the same place email/phone are already resolved for `recipientType === 'client'` (`notify.ts:154-157`):

```ts
if (recipientId && recipientType === 'client') {
  const { data } = await supabaseAdmin
    .from('clients')
    .select('email, phone, sms_consent, do_not_service')   // +2 columns, same round-trip
    .eq('id', recipientId)
    .single()
  email = data?.email || null
  phone = data?.phone || null
  if (data?.do_not_service) email = null                                        // blocks the email leg
  if (data?.do_not_service || data?.sms_consent === false) phone = null         // blocks the sms leg
}
```

Nulling `email`/`phone` (rather than early-returning) is deliberate: it reuses the existing `lastError` branches (`'No email address for recipient'` / `'No phone number for recipient'`) so a gated send is classified `'skipped'` by the existing `UNROUTABLE` set (`notify.ts:355-361`) with **zero new status-handling code** — it falls into the same bucket the tenant-level comm gate already uses, and the same bucket a genuinely-missing address already uses. No new `notification` status value, no new metadata shape to add downstream consumers for.

## Alternatives considered

1. **Gate everything uniformly, no per-type carve-out (recommended).** Every `recipientType: 'client'` send is gated the same way, including a hypothetical future `payment_received` client receipt. Consistent with every one of the 13 call-site fixes this session already made — none of them carved out an exception for "but the money already moved." If Jeff later decides a specific type (e.g. a payment receipt, which arguably isn't marketing/proactive contact and might have its own legal basis to send regardless of an SMS opt-out) needs to bypass the gate, that's a **product/legal call, not an engineering default** — add it as an explicit named exception (e.g. a small `ALWAYS_SEND_TYPES: Set<NotificationType>` checked before the gate) rather than leaving the gate off by default. Opt-in exception, not opt-out gate.
2. **Leave it at the call-site level, just document the convention better.** Rejected — this is what's been happening for 13 rounds and is exactly the fragility this doc exists to fix. A comment/README doesn't stop a distracted engineer from copy-pasting an ungated `notify()` call from an old file.
3. **Add a lint rule or type-level enforcement instead of a runtime check.** Interesting but out of scope — `recipientType`/`channel` are runtime string params on a single function, not a place TypeScript's type system can meaningfully narrow without a much bigger API redesign (e.g. splitting `notify()` into `notifyClient()`/`notifyAdmin()`/`notifyTeamMember()` with different required fields). Worth a separate, larger proposal if Jeff wants it; not a quick add.

## Why this is safe to ship whenever Jeff greenlights it (not a reason to have done it unilaterally)

Every one of the 7 real call sites above **already** gates before calling `notify()`. Adding the same check inside `notify()` is provably redundant-safe for all current call sites — a blocked client's email/sms leg already never reaches this code path today, so nulling `email`/`phone` a second time changes nothing observable for existing behavior. The entire value of this change is forward-looking: it protects call site #8, whatever it turns out to be, from needing its own manual gate. That's exactly why it's a good candidate for a small, single-file, well-isolated PR — but it's still a shared helper with fan-out into billing-adjacent code (`payment_received`), which is why this round scoped it to a proposal rather than shipping it.

## Recommended shape of the eventual PR (not done this round)

- Single file: `src/lib/notify.ts`. Do **not** touch or remove the now-redundant call-site checks in the 7 files above in the same PR — pulling those out is a separate, purely-cosmetic cleanup that adds diff size without adding safety, and is easy to get wrong by accident (e.g. deleting a check that's also doing something the notify()-level check doesn't, like the `send-booking-emails` per-channel `sms_consent` distinction). Leave them; they become fully redundant but harmless.
- Add a dedicated `notify.consent-gate.test.ts` unit-testing `notify()` directly (mocking `supabaseAdmin`/`sendEmail`/`sendSMS`) with the same BLOCKED/CONTROL/mutation-verify shape as this session's other consent-gate tests — this is the test that actually protects call site #8, since none of the call-site tests exercise `notify()`'s own logic.
- Get an explicit answer from Jeff on the `payment_received`-carve-out question in Alternative #1 before merging, even though no current call site is affected — better to decide it once, deliberately, than have it decided by accident the first time someone adds a client-facing payment notification.

No DB migration needed — `sms_consent`/`do_not_service` both already exist on `clients` (confirmed every prior round this session).
