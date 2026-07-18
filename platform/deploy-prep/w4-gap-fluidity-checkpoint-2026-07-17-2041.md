# Gap/fluidity checkpoint — W4, 2026-07-17 20:41

## This pass's net change

- Re-swept the "fully closed" tenant.name HTML-injection class with a
  full grep across every `app/api` file (not per-surface) and found 4
  more real, previously-missed instances: `client/reschedule/[id]`
  (client-facing), `cron/phone-fixup` (cleaner-facing), `webhooks/stripe`
  invoice.payment_failed alert (Full-Loop-internal-facing — new blast
  radius, attacks the platform operator's own inbox), `client/send-code`
  (pre-auth client-facing). Fixed all 4, escapeHtml-wrapped, 4 new
  RED/GREEN-verified test files.
- Running the full suite after those fixes surfaced 2 genuinely-failing,
  pre-existing (confirmed via git-stash) dashboard tests — traced to a
  test-fixture bug (UTC `now.toISOString()` fixtures vs. the route's
  already-correct naive-ET boundary logic), not an app bug. Fixed both
  fixtures using the existing `toNaiveET()` helper. Grepped for the same
  fixture pattern elsewhere (7 more hits, all deliberate UTC-edge-case
  tests, all currently passing) — left alone, no evidence of the bug
  there.

## tenant.name/client.name HTML-email-injection bug class: re-confirmed FULLY closed (this time via full grep sweep, not per-surface)

Every `app/api` file with `tenant.name`/`tenant?.name` near an HTML tag
(18 files) has been checked. 14 already escaped correctly (or pass
through already-escaped shared builders); this pass's 4 fixes close the
rest. Do not return to this bug class without a new signal.

## Aging items still open (re-confirmed present, not re-litigated this pass)

Unchanged from the 20:40 checkpoint — re-list only, no new status:
- `create-tenant-from-lead.ts` atomic-claim migration — PROPOSED,
  unapplied, highest real-money blast radius, now well over 24h stale.
- `referrers.total_earned`/`total_paid` atomic-bump migrations —
  PROPOSED 2026-07-16, pending Jeff's DDL approval.
- `clients` dedup unique indexes (2026-07-17) — same pending state.
- `admin/cleanup-test-bookings` name-collision risk — Jeff's
  product-call pending.
- `comhub_get_or_create_contact_by_email` TOCTOU hardening — still
  blocked on pulling its real live body first.
- `post-labor.ts`/`postDepositToLedger` entity_id design decision —
  needs Jeff/leader input.
- `categorization_patterns` recategorization semantics — open product
  question.
- `team-portal/photo-upload/route.ts` — PROPOSED/unwired.
- `comhub-email` cron's `unread_count` bump — not dug into, low
  priority.
- CSRF-on-GET instances (2026-07-17 18:10 pass) — judged not worth
  fixing, severity precedent.
- Dead clone `_lib/email-templates.ts` files (4 tenants) + `nycmaid/
  email-templates.ts`'s own ~17 dead functions — cleanup candidate, not
  a security fix, pending Jeff's clone-deletion green light.
- `nycmaid/sms-templates.ts`'s 34 dead exports — low-priority
  single-file cleanup candidate.
- `post-adjustments.ts`'s `postCommissionPayment` doesn't independently
  verify `status !== 'void'` — inert today, re-check only if a direct
  caller is ever added.
- `agreement.ts`'s HTML `buildAgreement()` — confirmed dead code.
- `admin/campaigns/preview/route.ts`'s `wrapEmail()` — unescaped, dead
  code (no frontend caller). Not fixing dead code.
- `nyc-classifieds` marketplace backend — 18/22 client-called API paths
  have no route; needs Jeff to confirm live-reachability before deciding
  build priority vs. retired experiment.

## New this pass

- **SMS-body injection (smishing-style)** — the 20:40 checkpoint flagged
  this as never swept as its own pass. Spot-checked `sms.ts` (thin
  Telnyx wrapper, body sent verbatim as a JSON field — no header-
  injection surface) and `notify.ts`/`notify-team.ts` (the two central
  SMS dispatch paths). No markup-execution risk exists for SMS (plain
  text, no client-side render context), so the HTML-injection class
  genuinely doesn't transfer — consistent with the ruling already made
  for `nycmaid/sms-templates.ts`. A full 60-call-site sweep of every
  `sendSMS()` caller for a *different* risk (e.g. attacker text crafted
  to impersonate a system message to a third party) was not completed
  this pass — the central dispatch paths are clean, but a dedicated
  per-caller review of the ~60 sites remains open if this is prioritized
  again. Lower value than the HTML class given SMS has no code-execution
  surface, just social-engineering risk.
- **Test-fixture UTC-vs-naive-ET bug** (see above) — fixed in the 2
  dashboard files where it was live; the pattern search found 7 more
  files using `.toISOString()` in fixtures, all of which are deliberate
  UTC-edge-case tests (named `*.naive-et-boundary.test.ts` /
  `*-utc-vs-et.test.ts`) that currently pass — not a live bug there, no
  action taken.

## Next-target candidates if continuing fresh-ground hunting

- tenant.name HTML-injection class: re-confirmed fully closed via full
  grep sweep this pass — do not return without a new signal.
- SMS-body injection: central dispatch paths clean; a full per-caller
  sweep of all ~60 `sendSMS()` call sites for smishing-style content
  (not markup) remains a lower-priority, not-yet-exhaustive lead.
- Finance/payroll remains the most exhaustively audited surface this
  session (120+ prior reports) — do not return without new signal.
- If Jeff confirms `nyc-classifieds` is live, its messaging/porch/
  business-listing backend is a substantial feature-build opportunity
  (not a bug fix).

No push/deploy/DB this pass.
