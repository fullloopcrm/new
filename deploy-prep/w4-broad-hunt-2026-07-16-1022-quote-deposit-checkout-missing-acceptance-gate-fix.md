# W4 adversarial pass — quote deposit-checkout missing acceptance gate

**Date:** 2026-07-16 10:22 EDT
**Scope:** LEADER order "Continue adversarial/break-things testing across trade lifecycle" (file-only, no push/deploy/DB)
**Status:** Fixed in this worktree (p1-w4), file-only, not deployed.

## Finding

`POST /api/quotes/public/[token]/deposit-checkout` (platform/src/app/api/quotes/public/[token]/deposit-checkout/route.ts)
minted a real Stripe Checkout Session for the deposit on a public quote token
**without checking that the quote had ever been accepted/signed**. It only
rejected `declined`/`expired` statuses — `draft`, `sent`, and `viewed` all
passed through.

The public quote token is emailed to the customer *before* they sign, so the
endpoint was directly reachable pre-signature (the UI only shows the "Pay
Deposit" button after `quote.status === 'accepted'`, but that's a client-side
gate only — nothing stopped a direct POST, a stale/bookmarked link, or a
double-fired request from reaching the route first).

**Confirmed the gap was real, not theoretical:** the route's own test fixture
default (`route.test.ts`) had `status: 'sent'` and the first test asserted a
200 + a minted session against that default — i.e. the test suite was
implicitly locking in the unsigned-quote path as "working as intended."

### Trade-lifecycle impact if a deposit lands on an unsigned quote

Tracing what the Stripe webhook (`app/api/webhooks/stripe/route.ts` lines
257-311) does on `quote_deposit: 'true'`:

1. Deposit is posted to the ledger as an unearned liability (real money moves).
2. If the quote has a linked deal in `new/qualifying/quoted/pending`, the deal
   is force-advanced to `stage: 'sold'`, `closed_at` set, probability 100 —
   **with no signature ever captured.**
3. `convertSaleToJob()` is called to spin up the Job — but `createJobFromQuote`
   throws `"Can only convert accepted quotes (current: sent)"` because the
   quote was never actually accepted. That throw is caught and only
   `console.warn`'d (`catch (e) { console.warn('[stripe] deposit convert-to-job failed', e) }`).

Net effect: the tenant collects real deposit money, the deal shows falsely as
"Sold," and **no job or booking is ever created** — with no surfaced error
except a server log line. The customer has no signed agreement on file either,
which is a chargeback/dispute liability on top of the missed fulfillment.

## Fix

Added a status gate immediately after the existing declined/expired check:
only `accepted` or `converted` quotes may open a deposit checkout session;
everything else (`draft`, `sent`, `viewed`) now returns
`400 { error: 'Proposal must be accepted before paying a deposit' }` before
any Stripe session is created.

```ts
if (!['accepted', 'converted'].includes(quote.status)) {
  return NextResponse.json({ error: 'Proposal must be accepted before paying a deposit' }, { status: 400 })
}
```

## Test changes

- `route.test.ts`: changed the shared fixture default from `status: 'sent'`
  to `status: 'accepted'` (the actually-valid precondition), so the existing
  happy-path/remaining-deposit/fully-paid assertions now exercise a realistic
  state instead of accidentally depending on the bug.
- Added `it.each(['draft','sent','viewed'])` regression test asserting 400 +
  "accepted" error + no Stripe session + no event log for each unsigned
  status.
- Added a test confirming `status: 'converted'` (quote already turned into a
  job, deposit still partially outstanding) is still allowed to collect the
  remainder — the gate is "signed or later," not "only exactly accepted."

## Verification

- `npx vitest run "src/app/api/quotes/public/[token]/deposit-checkout/route.test.ts"` → 8/8 passed.
- `npx tsc --noEmit` → 0 new errors. Pre-existing unrelated errors remain in
  `bookings/broadcast/route.xss.test.ts` (mock typing) and
  `site/sunnyside-clean-nyc/_lib/site-nav.ts` (stale import name) — both
  untouched by this change, confirmed pre-existing.

## Not done / out of scope

- Did not touch `invoices/public/[token]/checkout` (different lifecycle
  stage — invoice already exists post-job, no analogous "pre-signature"
  state applies there).
- Did not add DB-level enforcement (e.g., a CHECK/trigger requiring
  `accepted_at IS NOT NULL` before `deposit_paid_at` can be set) — that would
  be a defense-in-depth migration candidate for the leader to consider
  separately; flagging here, not implementing (file-only DB changes need
  leader/Jeff approval per standing rules).
