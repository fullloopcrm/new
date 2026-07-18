# Gap/fluidity checkpoint — W4, 2026-07-17 21:03

Per the 20:44 order item 3. File-only, no push/deploy/DB.

## This pass

1. Fresh ground: broad multi-class hunt before landing on a real bug.
   Checked (all clean, no fix needed): all 9 webhook signature-verification
   handlers including the two never-audited-this-session ones (`clerk`,
   `resend` — both svix-verified, fail-closed); the CPA year-end-zip token
   route (192-bit token, no injection surface, parameterized queries); the
   `entity_id`/caller-supplied-FK "leak register" class extended across
   `finance/chart-of-accounts` (`parent_id`) and `bookings/[id]/team`
   (`lead_id`/`extra_team_member_ids`) — both already had the ownership
   check; a ~40-site mass-assignment sweep of every `.update(fields|
   updates|patch|payload)` call site in `app/api` — every one already
   field-allowlisted, no raw body spread found; a mechanical 150+-site sweep
   for `.update()`/`.delete()` calls missing a `tenant_id` scope — all
   false positives once `tenantDb()`'s implicit scoping and
   pre-verified-then-reused IDs are accounted for.
2. Found and fixed the real bug: `POST /api/webhooks/stripe`'s
   `invoice.paid`/`invoice.payment_failed`/`customer.subscription.deleted`
   handlers matched the target tenant by `owner_email` — non-unique and, via
   the public `/api/prospects` intake → admin-approval → Stripe Checkout
   chain, attacker-influenceable — instead of the `stripe_subscription_id`
   already stored on the tenant at signup. Full writeup:
   `w4-stripe-subscription-lifecycle-owner-email-spoofing-fix-2026-07-17-2103.md`.
   `billing_status` doesn't gate anything live today (grepped all
   consumers), so this was a data-integrity/dashboard-accuracy bug, not an
   active auth bypass — fixed anyway since it's cheap and is exactly the
   kind of loose binding that becomes a real incident the day someone wires
   `billing_status` into an access gate.
3. Continued the surface: swept for the same "identify a tenant by
   attacker-influenced email instead of a stable ID" shape elsewhere in the
   platform-billing code. Checked the sibling `webhooks/stripe-platform`
   route (separate lead→tenant checkout flow) and `create-tenant-from-lead.ts`
   — both already key off `lead_id`/subscription id, never email. No
   `.eq('owner_email'` or `.eq('email'` matches remain anywhere in
   `src/app/api` after the fix. Class closed.

## Verification

RED/GREEN mutation-verified (`git diff > patch && git apply -R patch`,
reran tests, reapplied). New file
`route.subscription-id-tenant-match.test.ts` (4 tests), updated
`route.payment-failed-html-injection.test.ts`'s mock to the new lookup key.
`tsc --noEmit` clean (same 3 pre-existing baseline errors). Full suite:
612/614 files, 2168/2172 tests — 2 failures, both pre-existing and
unrelated (`cron/generate-recurring`'s known-flaky race test, reproduced
failing in isolation on this exact commit; `cron/tenant-health`'s
self-documented "INVARIANT RED until fixed" test).

## Aging items still open (re-confirmed present, not re-litigated this pass)

Unchanged from the 19:49/20:03 checkpoints — re-list only, no new status:
- `create-tenant-from-lead.ts` atomic-claim migration — PROPOSED, unapplied,
  highest real-money blast radius, now well over 24h stale.
- `referrers.total_earned`/`total_paid` atomic-bump migrations — PROPOSED
  2026-07-16, pending Jeff's DDL approval.
- `clients` dedup unique indexes (2026-07-17) — same pending state.
- `admin/cleanup-test-bookings` name-collision risk — Jeff's product-call
  pending.
- `comhub_get_or_create_contact_by_email` TOCTOU hardening — still blocked
  on pulling its real live body first.
- `post-labor.ts`/`postDepositToLedger` entity_id design decision — needs
  Jeff/leader input.
- `categorization_patterns` recategorization semantics — open product
  question.
- `team-portal/photo-upload/route.ts` — PROPOSED/unwired.
- `comhub-email` cron's `unread_count` bump — not dug into, low priority.
- CSRF-on-GET instances — judged not worth fixing, severity precedent.
- Four dead clone `_lib/email-templates.ts` files (~3500 lines) — cleanup
  candidate, pending Jeff's clone-deletion green light.
- `nycmaid/sms-templates.ts`'s 34 dead exports — low-priority cleanup.
- `post-adjustments.ts`'s `postCommissionPayment` `status !== 'void'` check
  — inert today, re-check only if a direct caller is added.
- `rate_limit_check_and_record` atomic RPC — PROPOSED 17:10, pending DDL,
  code already self-upgrades once applied.
- `comhub_get_or_create_contact_by_email` fn + retry-on-unique_violation —
  PROPOSED 17:24 (trimmed 17:35), pending DDL.

## New this pass

- `inbound_emails.html_body`/`raw` (Resend inbound-email webhook) is
  written but has zero readers anywhere in the app (no route selects it, no
  UI renders it) — confirmed dead storage, not a live XSS vector today.
  Flagged for whoever eventually builds the admin inbox reader: sanitize
  `html_body` before rendering, since it's fully unauthenticated inbound
  content today.

## Next-target candidates if continuing fresh-ground hunting

- The webhook-signature, entity_id-leak-register, mass-assignment, and
  tenant-scope-on-update/delete classes are now all swept clean — do not
  return to any of them without a new specific signal.
- Untouched so far this session: `src/app/admin/**` page-level (not API)
  components for any direct client-side Supabase calls bypassing the API
  layer entirely (none expected given the architecture, but not yet
  explicitly verified).
- `src/lib/jefe/` and `src/lib/selena/` tool-definition files beyond what's
  already been prompt-injection-audited — specifically whether any Jefe/
  Selena tool accepts a raw tenant_id/entity_id parameter from LLM output
  without a matching ownership check (the same class just fixed, but from
  the agent-tool-call surface instead of the HTTP-route surface).

No push/deploy/DB this pass.
