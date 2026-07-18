# Gap/fluidity checkpoint — W4, 2026-07-17 21:57

Per the 21:37 order item 3. File-only, no push/deploy/DB.

## This pass

Full details: `w4-emailshell-primary-color-css-injection-fix-2026-07-17-2150.md`.

1. Fresh ground (order item 1): picked up the 21:13 checkpoint's carried-over
   candidate (client-side-Supabase-bypassing-API-layer surface). Confirmed
   clean under `admin/**` as expected; found two client-side-Supabase forms
   under `nyc-mobile-salon` using the *intended* signed-upload pattern
   (confirmed clean, backing routes already validate upload URLs).
2. Real bug found while confirming that surface (order item 2, continued):
   `apply-ceo/route.ts`'s applicant-confirmation email spliced
   `tenant.primary_color` raw into a `style="color:..."` CSS-declaration
   context. Traced to zero format enforcement on the self-serve write path.
   Swept every other raw-`${color}`-in-`style=` instance and found 3 more:
   `lib/messaging/shell.ts` (`emailShell()` — the ONE shared template used by
   quote sends/comhub sends/leads/cron comhub-email; also had a latent
   quote-escaping gap in its own `esc()` helper, unrelated to color, fixed in
   the same pass), `bookings/broadcast/route.ts`, `referrers/auth/request/
   route.ts`. Kept pulling the thread (order item 2 continued further): grepped
   every ad-hoc HTML-email builder across the codebase for the broader
   raw-tenant-field class and found 2 more live instances —
   `selena-legacy-handlers.ts` (client.name/service_type/tenant.name/
   payment.method, unescaped, sent to real clients) and `cron/rating-prompt/
   route.ts` (tenant.name unescaped, sent to the **platform's own admin
   inbox** — confirmed via `admin_users` having no `tenant_id` filter).
3. Gap/fluidity checkpoint: this file.

## Verification

Two RED/GREEN mutation-verified passes (`git diff > patch && git apply -R
patch`, rerun, reapply, rerun — both showed the exploit payloads live in the
generated HTML pre-fix). New/extended test files: `safe-color.test.ts`,
`messaging/shell.test.ts`, `bookings/broadcast/route.xss.test.ts` (extended),
`apply-ceo/route.color-injection.test.ts`, `referrers/auth/request/
route.html-injection.test.ts`, `selena-legacy-handlers.html-injection.test.ts`,
`cron/rating-prompt/route.html-injection.test.ts`. Full affected-surface run:
18 files, 50/50 passing. `tsc --noEmit`: clean except 2 pre-existing baseline
errors in `sunnyside-clean-nyc/_lib/site-nav.ts` (down from the 3 previously
noted — not investigated, may have been fixed since; not touched this pass).

## Aging items still open (re-confirmed present, not re-litigated this pass)

Unchanged from the 19:49/20:03/21:03/21:13 checkpoints — re-list only, no new
status:
- `create-tenant-from-lead.ts` atomic-claim migration — PROPOSED, unapplied,
  highest real-money blast radius, now well over 24h stale.
- `referrers.total_earned`/`total_paid` atomic-bump migrations — PROPOSED
  2026-07-16, pending Jeff's DDL approval.
- `clients` dedup unique indexes (2026-07-17) — same pending state.
- `admin/cleanup-test-bookings` name-collision risk — Jeff's product-call
  pending.
- `comhub_get_or_create_contact_by_email` TOCTOU hardening + retry-on-
  unique_violation — PROPOSED, pending DDL.
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
- `rate_limit_check_and_record` atomic RPC — PROPOSED, pending DDL.
- `inbound_emails.html_body`/`raw` — dead storage, zero readers today.
- `src/lib/nycmaid/notify-cleaner.ts`'s `notifyCleaner()` — dead code,
  missing tenant_id filter, flag for whoever wires it up.

## New this pass

- `admin/campaigns/preview/route.ts`'s `wrapEmail()` — same raw-color-in-
  style pattern, but self-XSS only (tenant previewing their own campaign to
  themselves) — cheap-hardening candidate, not a live bug.
- `agreement.ts`'s `buildAgreement()` (HTML version) — confirmed dead code,
  zero live importers, fully superseded by `agreement-pdf.ts`'s pdf-lib
  renderer. Cleanup candidate.

## Next-target candidates if continuing fresh-ground hunting

- Raw-tenant/client-field-in-ad-hoc-HTML class now swept across every file
  matching `html = \`...\``/`html: \`...\`` in `src/app/api` + `src/lib` —
  do not return to this exact grep without a new specific signal.
- SMS-body builders (as opposed to HTML-email builders) — not checked this
  pass for the analogous "raw tenant/client field breaks a downstream reply
  parser" shape. Different injection surface, not yet swept.
- `src/app/admin/**` page-level direct-client-side-Supabase-call surface —
  now fully closed out (checked this pass, zero hits, two false leads in
  `nyc-mobile-salon` confirmed to be the intended signed-upload pattern).

No push/deploy/DB this pass.
