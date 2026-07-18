# Carryover close-out + fresh-ground sweep — W4, 2026-07-17 20:40

## Carryover: 19:58/20:01 campaign-send fix was never actually committed

Picked up this session with `platform/src/app/api/campaigns/[id]/send/route.ts`
and `src/lib/email-templates.ts` sitting as **uncommitted** working-tree
changes, despite the 20:01 LEADER-CHANNEL report and the matching
`w4-broad-hunt-2026-07-17-1958-*.md` doc both describing the fix as done.
Session apparently ended (compaction/handoff) right before the commit step.

Closed it out properly this round:
- Added two new mutation-verified regression test files (neither existed
  despite the 20:01 report referencing "25 test files/75 tests" — that
  count was the pre-existing suite, not new tests for this specific fix):
  `route.html-injection.test.ts` (campaigns/send) and
  `email-templates.tenant-name-xss.test.ts` (shared builders).
- RED-confirmed both against the pre-fix code via `git diff | git apply -R`
  (raw `<img src=x onerror=alert(1)>` present verbatim in the generated
  email HTML), then GREEN after re-applying.
- `npx tsc --noEmit`: no new errors in either touched file.
- Full suite: 605/609 files, 2157/2164 tests pass. 4 pre-existing failing
  files (dashboard revenue/blind-spot tests, tenant-health coverage-
  divergence "RED until fixed" test) confirmed via `git log` to predate
  this diff — zero regressions from this change.
- Committed: `448d4d51`.

## (1) New fresh-ground surface: checked the 20:03 checkpoint's own
recommended next target — dangerouslySetInnerHTML in dashboard/admin React

The prior checkpoint flagged: "dashboard/admin-facing React surfaces that
render client.name/tenant.name via dangerouslySetInnerHTML — same
attacker-reachable field, different rendering context." Checked it:

- `dashboard/ai/page.tsx`'s Selena AI chat renderer
  (`renderAssistantHtml`) escapes `&`/`</>` **before** applying its
  `**bold**`→`<strong>` and `\n`→`<br>` markdown substitutions — so even
  if the AI model were induced (indirect prompt injection from booking/
  lead data it reads) to echo raw HTML in its reply, it renders as inert
  text, not markup. Clean, closes that flagged lead.
- Swept all 524 `dangerouslySetInnerHTML` occurrences repo-wide (`grep -rn
  dangerouslySetInnerHTML src --include=*.tsx --include=*.ts`). The
  overwhelming majority are JSON-LD (`JSON.stringify(...).replace(/</g,
  '\\u003c')` or an escaped `jsonLd()` helper — safe) or static
  per-tenant SEO/marketing config content (FAQ answers, pricing copy,
  career descriptions) imported from local TS config modules, not
  database rows — not attacker-reachable. No new live bug found in this
  angle.

## (2) Continuing the same investigation surfaced dead code, not a live bug

While checking for other dangerouslySetInnerHTML/user-content rendering
paths, re-opened `src/lib/nycmaid/email-templates.ts` (1139 lines, ~24
exported email builders) — this file is inconsistently escaped: 2 of its
functions (`clientBookingReceivedEmail`, `clientConfirmationEmail`)
escape `client.name`/`cleaner.name` via `escapeHtml()`, but ~17 others
(`clientRatingPromptEmail`, `clientReviewRequestEmail`,
`clientReminderEmail`, `clientCancellationEmail`, `clientThankYouEmail`,
`clientPaymentDueEmail`, `cleanerAssignmentEmail`,
`cleanerDailySummaryEmail`, `cleanerCancellationEmail`,
`referralWelcomeEmail`, `referralCommissionEmail`, `cleanerWelcomeEmail`,
`verificationCodeEmail`, `clientRescheduleEmail`, `adminRescheduleEmail`,
`cleanerRescheduleEmail`, `referralSignupNotifyEmail`) interpolate the
identical `booking.clients?.name`/`booking.cleaners?.name`/
`referrer.name`/`booking.clients?.address` fields completely raw — same
bug shape as everything fixed tonight.

Before fixing, traced the full import graph
(`grep -rn "from '@/lib/nycmaid/email-templates'\|from '../nycmaid/email-
templates'\|from './nycmaid/email-templates'"`): only 3 real importers
exist anywhere in the app — `client-email.ts` (namespace-imports it but
only ever calls `.clientBookingReceivedEmail`/`.clientConfirmationEmail`,
both already escaped), `cron/phone-fixup/route.ts`, and
`selena/core.ts` (both of the latter two only use the safe `emailWrapper`
shell). **All ~17 unescaped functions have zero live callers anywhere.**
Same class as the checkpoint's already-known `nycmaid/sms-templates.ts`
34-dead-exports item — this is the email-side twin of that finding, not
a new independent gap. Per scope, not fixing dead code. Same unescaped-
field pattern also exists verbatim in 4 sibling per-tenant clone files
(`nyc-mobile-salon`/`wash-and-fold-hoboken`/`wash-and-fold-nyc`/`the-nyc-
interior-designer`'s own `_lib/email-templates.ts`) — already flagged in
the prior checkpoint as a known dead-clone cleanup candidate, confirmed
still dead (zero importers each), not re-litigating.

## Adjacent discovery while tracing dead imports: nyc-classifieds' backend
is largely unbuilt (Noticed, not a security bug, not fixed)

Following the same "who actually calls this" methodology into
`src/app/site/nyc-classifieds/` (a user-generated-content marketplace —
business listings, "Porch" neighborhood posts, messaging) turned up:
`grep`'d every `fetch('/api/...')` call across its client components (22
distinct paths: `/api/messages`, `/api/messages/:id`, `/api/flag`,
`/api/block`, `/api/auth` + 4 subpaths, `/api/porch` + `:id`,
`/api/listings`, `/api/businesses`, `/api/business/*`,
`/api/account/*` x3, `/api/geocode`, `/api/search`, `/api/upload`,
`/api/ads`, `/api/saved-searches`, `/api/signup-events`, `/api/prelaunch`,
`/api/error-report`). **18 of 22 have zero matching `route.ts` anywhere
in the codebase** — `grep -rln nyc-classifieds`/`thenycclassifieds` across
`src/app/api` returns nothing, and there are zero `route.ts` files
anywhere under `src/app/site/nyc-classifieds/` itself. The remaining 4
(`/api/reviews`, `/api/feedback`, `/api/notifications`,
`/api/push/subscribe`) *do* resolve, but to unrelated CRM-tenant
(`requirePermission('reviews.view'/'reviews.request')`) or platform-admin
(`requireAdmin()`) routes built for a different product — so a
classifieds visitor's calls to them fail closed (401/403), not a data
leak or cross-wiring risk. Net effect: the entire messaging, business-
listing-management, porch-posting, search, and account-management surface
of this product appears non-functional in production today.

**Not fixed** — building a marketplace backend is a feature build, not a
bug fix, well outside this pass's scope. **Caveat on live-reachability**:
domain routing here is DB-driven (`getTenantByDomain(hostname)` in
`middleware.ts`, not the small hardcoded `STATIC_TENANT_MAP`) — I cannot
confirm from this file-only worktree whether `thenycclassifieds.com` (or
another domain) currently resolves to a live `tenants` row pointed at
this `/site/nyc-classifieds` tree. It's referenced as a real client in
two marketing portfolio pages (`the-nyc-marketing-company`/
`consortium-nyc`'s `BeforeAfter.tsx`/portfolio pages), suggesting it's a
real deployed product, but that's inference, not verification. Flagging
for Jeff to confirm reachability; filing as a Noticed item, not a fix.

No push/deploy/DB this pass — file-only. One commit this round: `448d4d51`
(the carryover fix + its missing tests).
