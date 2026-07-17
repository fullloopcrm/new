# W4 broad hunt — 19:23 2026-07-17 — email/monitor identity-free amount-fallback payment fraud fix

Per the 19:14 LEADER->W4 queue: (1) new fresh-ground surface, (2) continue
whichever surface (1) opens up, (3) keep gap/fluidity current.

## (1) Fresh ground: `src/lib/` file-by-file walk (flagged as open in the
17:55 report — "still no full file-by-file walk")

Diffed all 258 non-test `src/lib/**/*.ts` files against every filename
mentioned anywhere across 400+ prior `deploy-prep/*.md` reports this
session; 111 files had zero prior mention. Most of that list is static
marketing/SEO content data (`marketing/*`, `seo/data/*`, `seo/tenants/*`)
with no injection surface. `payment-email-parser.ts` +
`lib/email-monitor.ts` stood out — genuinely never touched, and "inbound
email content determines a financial state change" is exactly the kind of
trust-boundary shape that's produced this session's most severe findings
(Stripe webhook cross-tenant forgery, do_not_service bypass).

**Confirmed live, not dead code**: `cron/email-monitor` (every-minute
cron, `email_monitor_enabled` precheck) → `POST /api/email/monitor`, and
the feature has a real tenant-facing settings-page toggle
(`dashboard/settings` IMAP connect fields) — this is opt-in per-tenant,
not experimental.

## Bug: `matchPaymentToBooking()`'s step-3 fallback required zero identity
signal — full write-up

**File:** `src/app/api/email/monitor/route.ts`

The route polls each tenant's IMAP inbox, and for any email
`detectPaymentEmail()`/`parsePaymentEmail()` (in
`lib/payment-email-parser.ts`) classify as a Zelle/Venmo payment
confirmation, it auto-inserts a `payments` row and sets
`bookings.payment_status = 'paid'` — **fully automated, no human review**
(only genuinely *unmatched* payments get a review task).

**Detection is trivially satisfiable by anyone, no spoofing required.**
`detectPaymentEmail()` checks the raw `From` header against a bare
substring allowlist (`fromLower.includes('zelle')`, `.includes('venmo.com')`,
etc.) — an attacker doesn't need to spoof a bank's domain; they can just
register/use any mailbox whose address contains the substring (e.g.
`x@evilzelle.com`) and combine it with a subject/body they fully control
("You received a Zelle payment of $500 ... Zelle ..."). Two of three
signals (`zelleSender`, `zelleSubject`/`bodyHasZelle&&bodyHasAmount`) is
enough — `zelleSignals >= 2`. There is no DKIM/SPF/`Authentication-Results`
check anywhere in this pass; the parser trusts the IMAP message verbatim.

**The actual bug — `matchPaymentToBooking()` step 3** (now removed):
after failing to match the (attacker-controlled) sender name against
`bookings.payment_sender_name` or any `clients.name`, the function fell
back to "the most recent unpaid booking in the tenant whose price is
within $1 of the claimed amount" — **no name, no client relationship, no
identity signal of any kind.** An attacker needed zero knowledge of any
real client — just the tenant's monitored inbox address (often published)
and a guess at a standard service price (frequently published on the
tenant's own marketing site) — to get a real, unrelated client's booking
auto-marked `payment_status: 'paid'` with zero real money moved: free
service / silent revenue loss for the tenant, and the real client's
outstanding balance would never get chased because the system believes
it's settled.

**Fix:** removed the amount-only fallback entirely. A payment can now only
auto-apply when the sender name genuinely matches a known
`payment_sender_name` or `clients.name` (steps 1–2, unchanged — still
theoretically spoofable if an attacker specifically knows a real client's
name, but that's a materially narrower, targeted attack vs. the prior
blind, no-knowledge-required exploit). Every payment without a name match
now falls through to the pre-existing, already-safe manual path:
`unmatched_payments` + `admin_tasks`, reviewed by an authenticated staff
member via `POST /api/admin/payments/confirm-match`
(`requirePermission('finance.payroll')`-gated, tenant-scoped, requires the
admin to actively pick the specific booking — verified this pass, no
changes needed there).

**Verification:** RED-confirmed first — new
`route.payment-spoofing.test.ts` crafts exactly this attack (email from
`payout@evilzelle.com`, sender name "Totally Unrelated Sender" matching no
real client, amount `$500.00` equal to a real unrelated client's booking
price) and asserts the booking must NOT end up `paid`. This failed against
the pre-fix code (booking landed `paid`, 0 `unmatched_payments` rows) —
proving the exploit — then passed after the fix (booking stays
`pending`, 1 `unmatched_payments` row opened for human review). Existing
`route.test.ts` (auth-gate coverage, 7 tests) unaffected. Full
`api/email/monitor` suite: 2 files, 8 tests green. Full repo suite:
603/604 files, 2149/2152 tests (1 pre-existing unrelated failure —
`cron/tenant-health/status-coverage-divergence.test.ts`, confirmed via
`git log` not touched by this diff — same baseline as every prior report
today). `tsc --noEmit`: same 3 pre-existing unrelated errors
(`bookings/broadcast/route.xss.test.ts`,
`sunnyside-clean-nyc/_lib/site-nav.ts` ×2), zero new errors.

## (2) Continued on the same surface

- Traced the sibling write path (`payment_sender_name`, the canonical
  "apply a confirmed payment" primitive in `lib/payment-processor.ts`,
  called by Selena's `confirm_payment` tool, `invoices/[id]/record-payment`,
  and `admin/payments/finalize-match`) — this function is only ever
  reached from an already-authenticated/authorized caller (admin action,
  gated agent tool call), a fundamentally different trust boundary from
  raw unauthenticated email content. No issue found; confirms the fix
  applied above was the correct place to draw the line, not this shared
  primitive.
- Confirmed `admin/payments/confirm-match/route.ts` (the human-review
  completion step, now handling more traffic since the fallback is
  closed) is itself properly gated
  (`requirePermission('finance.payroll')`) and tenant-scoped on every
  read/write. Clean.
- Grepped for the same bug shape (amount-only / no-identity matching)
  elsewhere in the codebase (`gte('price'`, similar comment patterns) —
  zero other hits. This was an isolated instance of the pattern, not a
  repeated bug class needing a broader sweep.

## Residual risk (not fixed — flagging, not a silent gap)

Steps 1–2 (name-based matching) remain spoofable by an attacker who
specifically knows a real client's full name (a narrower, targeted attack
vs. the blind exploit just closed) — closing that fully would require
DKIM/SPF/`Authentication-Results` verification on the inbound IMAP
message, which is new infrastructure, not a file-only fix, and a genuine
product/cost decision (does the tenant's mail provider reliably surface
those headers post-forwarding?). Not escalating to
`JEFF-MORNING-QUEUE.md` — the severity delta closed today (blind,
zero-knowledge exploit → targeted, name-required exploit) is the
meaningful security boundary; full email-authenticity verification is a
reasonable future-hardening item, not an open incident.

## (3) Gap/fluidity

- `src/lib/` file-by-file walk: 111 previously-unmentioned files
  triaged this pass; `payment-email-parser.ts`/`email-monitor.ts` fixed,
  `payment-processor.ts`/`admin/payments/confirm-match` re-verified clean.
  Remaining unmentioned files are overwhelmingly static marketing/SEO
  content data (`marketing/*`, `seo/data/*`, `seo/tenants/*`) — no
  injection surface, not worth a dedicated pass. A short worthwhile
  residual list for a future pass: `agreement.ts`/`agreement-pdf.ts`
  (e-signature), `csv-parse.ts`, `login-alert.ts`, `deal-delete-guard.ts`,
  `unsubscribe-token.ts` — none read yet this pass.
- No change to the aging-items list from the 18:51 checkpoint (atomic-bump
  migrations, clone dead-code, etc.) — all still pending Jeff/DDL as
  previously reported, not re-litigated here.

Commit pending. File-only, no push/deploy/DB.
