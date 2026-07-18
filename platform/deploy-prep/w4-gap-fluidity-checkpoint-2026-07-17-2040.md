# Gap/fluidity checkpoint — W4, 2026-07-17 20:40

## This pass's net change

- Closed the 19:58/20:01 carryover fix (campaign-send + shared
  email-templates.ts HTML injection) that had been reported done but
  never committed — added the missing regression tests, RED/GREEN
  mutation-verified, committed `448d4d51`.
- Checked the prior checkpoint's own recommended next target
  (dangerouslySetInnerHTML in dashboard/admin React) — clean, closes
  that flagged lead.
- Found the email-side twin of the already-known `nycmaid/sms-
  templates.ts` dead-export item: `nycmaid/email-templates.ts` has ~17
  unescaped functions with the same client.name/cleaner.name/
  referrer.name injection shape as everything fixed tonight, but
  confirmed 100% dead (zero live importers) — not fixed, per scope.
- New Noticed item (not a security bug): `nyc-classifieds` site's
  backend is ~80% unbuilt (18 of 22 called API paths have no route;
  4 that resolve hit unrelated, correctly-gated CRM/admin routes that
  fail closed). Reachability from a live domain not verifiable from
  this file-only worktree — flagged for Jeff.

## HTML-email-injection bug class: now confirmed FULLY closed

Every live surface has been swept and fixed across the last several
passes: `src/lib/` builders, `src/app/api/**` inline HTML routes,
`campaigns/[id]/send`'s merge fields, `email-templates.ts`'s 14 shared
builders, `messaging/shell.ts`'s `emailShell()`. The only remaining
unescaped instances anywhere are in confirmed-dead code (`nycmaid/
email-templates.ts`'s ~17 functions, 4 sibling tenant-clone `_lib/
email-templates.ts` files, `admin/campaigns/preview/route.ts`'s
`wrapEmail()`). **Do not return to this bug class without a new
signal** (e.g., one of those dead functions gaining a live caller).

## Aging items still open (re-confirmed present, not re-litigated this pass)

Unchanged from the 20:03 checkpoint — re-list only, no new status:
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
  email-templates.ts`'s own ~17 dead functions (new this pass, same
  class) — cleanup candidate, not a security fix, pending Jeff's
  clone-deletion green light per `platform/CLAUDE.md`'s known-debt
  section.
- `nycmaid/sms-templates.ts`'s 34 dead exports — low-priority
  single-file cleanup candidate, not security-relevant.
- `post-adjustments.ts`'s `postCommissionPayment` doesn't
  independently verify `status !== 'void'` — inert today, flagged for
  re-check only if a direct caller is ever added.
- `agreement.ts`'s HTML `buildAgreement()` — confirmed dead code,
  low-priority cleanup candidate.
- `admin/campaigns/preview/route.ts`'s `wrapEmail()` — unescaped, but
  no frontend caller anywhere in `src/app`. Not fixing dead code.
- **New this pass:** `nyc-classifieds` marketplace backend — 18/22
  client-called API paths have no route anywhere in the codebase
  (messaging, flag/block, listings, business-account management,
  porch posting, search, upload, geocode, ads, saved-searches,
  signup-events). The 4 that do resolve hit unrelated CRM/admin
  routes that correctly fail closed (401/403) — no security exposure,
  but the product's core UGC/messaging features appear non-functional
  in production. Reachability (is `thenycclassifieds.com` DNS-live
  against this deployment?) not verifiable from this worktree —
  needs Jeff to confirm before deciding whether this is a build
  priority or an already-retired experiment.

## Next-target candidates if continuing fresh-ground hunting

- HTML-email-injection class: fully closed, do not return without a
  new signal (see above).
- dangerouslySetInnerHTML in dashboard/admin React: checked this pass
  (Selena AI chat renderer), clean. The other ~520 occurrences are
  JSON-LD or static config content — not worth a full manual sweep
  without a specific new lead.
- SMS-body injection (structure/smishing-style, not markup rendering)
  — still not swept as its own dedicated pass; lower severity than
  HTML but genuinely unchecked.
- Finance/payroll remains the most exhaustively audited surface this
  session (120+ prior reports) — do not return there without new
  signal.
- If Jeff confirms `nyc-classifieds` is live and a current build
  priority, its messaging/porch/business-listing backend is a
  substantial, well-scoped feature-build opportunity (not a bug fix).

No push/deploy/DB this pass.
