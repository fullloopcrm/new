# `/api/email/monitor`: Zelle/Venmo auto-payment-matching trusts unauthenticated email content — real fraud gap, NOT fixed this round

**Author:** W1 (broad-hunt, 2026-07-15 ~22:40)
**Status:** documented, NOT patched — behavior-changing product decision, needs a call before
touching a live financial auto-completion path relied on by real paying tenants.

## What's wrong

`POST /api/email/monitor` (`src/app/api/email/monitor/route.ts`, cron/Bearer or
`ELCHAPO_MONITOR_KEY`-triggered) polls each tenant's own IMAP inbox and auto-marks bookings
`payment_status: 'paid'` — with a real `payments` row insert, a "thank you" SMS to the client,
and (per `team-portal/15min-alert/route.ts:64`) suppression of the pre-arrival
payment-collection alert to the team member — based **entirely on unauthenticated email
content**. There is no SPF/DKIM/DMARC check anywhere in this pipeline; `email-monitor.ts`'s
`fetchUnreadEmails()` (via `mailparser`) exposes only `parsed.from.value[0].address` — the raw
`From:` header, which the sender of any email fully controls with no verification the
receiving code performs.

### The detection logic doesn't even require a plausible sender

`lib/payment-email-parser.ts::detectPaymentEmail()`:

```ts
const venmoSignals = [venmoSender, venmoSubject, bodyHasVenmo && bodyHasAmount].filter(Boolean).length
if (venmoSignals >= 2) return 'venmo'
...
const zelleSignals = [zelleSender, zelleSubject, bodyHasZelle && bodyHasAmount].filter(Boolean).length
if (zelleSignals >= 2) return 'zelle'
```

Any 2-of-3 signals qualify — `zelleSender`/`venmoSender` (a case-insensitive **substring**
match against the fully attacker-controlled `From:` address, e.g. `fromLower.includes('zelle')`)
is not required. An email with subject `"John Smith sent you $150.00"` (matches
`ZELLE_SUBJECT_PATTERNS`/`ZELLE_BANK_SUBJECT_PATTERNS`) and a body containing the word "zelle"
and a dollar amount satisfies 2 signals **without the sender needing to look like Zelle/Venmo/a
bank at all**. Even where a sender check does fire, it's a raw substring match on a field the
sender fully controls (`attacker@zelle-notify-fake.com` passes `.includes('zelle')`) — since
there's no SPF/DKIM/DMARC verification anywhere in this code, the "sender" signal provides zero
real authentication regardless of how it's matched.

### The matching step compounds it — the client can pre-stage the exact match key

`matchPaymentToBooking()` tier 1 matches an incoming (spoofed) email's parsed sender name
against `bookings.payment_sender_name` via `ilike`. That column is set by the **client's own
chat message** to the AI assistant — `handleConfirmPayment()` in `src/lib/selena/core.ts:1376`
(tool `confirm_payment`, triggered whenever "Client says they paid", available in every normal
SMS/web-chat conversation, no special auth) writes `sender_name` verbatim from what the client
typed, with an explicit code comment: *"Mark the booking as 'client-claimed' ... Do NOT fire
cleaner SMS here ... only after the actual money is verified (email match in
payment-processor.ts) ... cleaner NOT released yet."* The two-step "claim, then verify via
email" design is clearly intended as a real anti-fraud control — but the "verification" leg has
no real authentication, so the whole two-step process is bypassable by anyone who can get one
crafted email delivered to the tenant's monitored inbox.

## Full attack chain (verified via code read, not run against a live inbox)

1. A client (or anyone) texts/chats the tenant's AI assistant: *"I paid via Zelle, it's from my
   friend John Smith."* → `confirm_payment` sets
   `bookings.payment_sender_name = 'John Smith'` on their own (unpaid) booking. No money moves.
2. The same person sends **one email** to the tenant's monitored inbox (whatever address is
   configured in `tenants.imap_*` — for many small-business tenants this is their general
   contact/business inbox, not a dedicated payments-only address) with:
   - From: any address containing "zelle" (or matching `ZELLE_SENDERS`'s bank-name substrings)
   - Subject: `"John Smith sent you $150.00"`
   - Body: mentions "zelle" and `$150.00`
3. `detectPaymentEmail` → `'zelle'` (both the dedicated `zelleSender && zelleBankSubject &&
   bodyHasAmount` branch and the generic 2-signal branch fire).
4. `parsePaymentEmail` extracts `amount=150.00` and `senderName='John Smith'` via
   `SENDER_PATTERNS` (`/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+sent/` matches the crafted subject
   directly).
5. `matchPaymentToBooking` tier 1: `ilike payment_sender_name` against `'john smith'` — matches
   the exact booking pre-staged in step 1 with high confidence, **no amount cross-check needed
   for this tier**.
6. Route auto-inserts a `payments` row (`status: 'completed'`), sets
   `bookings.payment_status = 'paid'`, sends the client a "Got your zelle payment ... thank
   you!" SMS, and creates an in-app `payment_received` notification for staff.
7. `team-portal/15min-alert` now skips the payment-collection reminder to the assigned team
   member (`if (booking.payment_status === 'paid') return { skipped: 'already paid' }`) —
   real-world consequence: the client can receive the booked service without ever paying, and
   the team member isn't prompted to collect on-site because the system believes it's settled.

No compromise of Zelle/Venmo/any bank's real infrastructure is needed — this only requires the
ability to send one email with an arbitrary `From:` header to the tenant's own inbox, which is
true of any SMTP sender by default absent the *receiving* mail provider's own spoofing
protections (this code doesn't check those either).

## Why I didn't just patch it inline

- **No real authentication signal exists to substitute in.** The obvious "harden the pattern
  matching" fix (require `zelleSender`/`venmoSender` as a hard precondition, not an optional
  signal) doesn't actually close the gap — `from` is the raw, attacker-controlled `From:`
  header with zero SPF/DKIM/DMARC verification anywhere in this pipeline, so any string check
  against it is still fully spoofable by design. Tightening the regex is security theater here.
- **The real fix requires either DKIM/SPF verification or a design change to auto-completion,
  and both carry real regression risk I can't verify file-only:**
  - *Option A — verify `Authentication-Results` (SPF/DKIM/DMARC pass, domain-aligned to
    zelle.com/venmo.com/the claimed bank).* This header is stamped by the tenant's own
    *receiving* mail provider (Gmail/Outlook/etc.) before this code ever sees the message, so
    it's not attacker-forgeable in the way `From:` is. But the header's exact format varies by
    provider, and I have no live IMAP samples from real tenant inboxes to validate a parser
    against — shipping this blind risks false-negatives that silently break the auto-payment
    feature for tenants who genuinely rely on it today, which is a support-load regression I
    can't verify without live testing.
  - *Option B — stop auto-completing on a match; route every detected candidate through the
    existing `unmatched_payments` + `POST /api/admin/payments/confirm-match` human-review flow
    instead (i.e., always create the reconciliation task, never directly flip
    `payment_status`/send the client SMS from this route).* This is a real, low-regression-risk
    fix (adds one staff click, doesn't touch detection logic, reuses an existing endpoint) — but
    it's still a genuine behavior change to a feature tenants use precisely for hands-off
    payment reconciliation, and every other similarly-scoped "changes live tenant-facing
    behavior" finding this session (CSP enforcement, referral-portal auth model, HR PIN
    visibility) has been left for an explicit call rather than blind-shipped by a single
    unattended worker.
- Given the severity (this is direct revenue fraud enabling free service, not a data leak) I
  considered fixing anyway, but concluded a wrong-in-either-direction blind fix (silently
  breaking real reconciliation vs. shipping a fix that still isn't real authentication) is worse
  than a clear, evidenced flag for Jeff/leader to pick a direction on.

## Severity / exploitability

- **Confirmed live end-to-end via code trace** across `email-monitor.ts` →
  `payment-email-parser.ts` → `email/monitor/route.ts` → `selena/core.ts`'s `confirm_payment`
  handler → `team-portal/15min-alert/route.ts`. Not run against a live inbox (file-only round,
  no IMAP creds available to me).
- Applies to every tenant with `email_monitor_enabled=true` + IMAP creds configured (an opt-in
  feature, so blast radius is bounded to tenants who've turned it on — but for those tenants
  this is a direct, repeatable revenue-fraud vector, not a one-off).
- Requires no authentication, no account, and no infrastructure compromise — only the ability
  to email the tenant's own monitored inbox and, optionally, a prior chat/SMS message to
  pre-stage the sender-name match (tier 1) or nothing at all beyond a plausible amount match
  (tier 3, "most recent unpaid booking within $1" — no sender corroboration required if the
  attacker can guess/observe the booking price).

## Recommendation

Leader/Jeff: pick a direction —
1. **Minimum-viable, low-regression fix**: change `email/monitor/route.ts` to always insert
   into `unmatched_payments`/`admin_tasks` for staff confirmation (reusing
   `admin/payments/confirm-match`) instead of auto-flipping `payment_status` and auto-texting
   the client, regardless of match tier. I can implement + test this file-only in a follow-up
   round if that's the wanted direction.
2. **Real fix**: add `Authentication-Results` SPF/DKIM domain-alignment verification as a
   precondition, but this needs live email samples from real tenant inboxes to build/test the
   parser against safely — not something I can respons­ibly ship blind this session.
3. Do both — (1) now as the safety net, (2) as a follow-up hardening pass.

Not filed as a new P-number pending direction; happy to open one once a fix path is confirmed.
