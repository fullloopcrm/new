# NYC Maid → FullLoop Parity Report

Aggregate doc — each worker appends its own lane section. Source of truth for
gaps closed / flagged ahead of nycmaid cutover. **No cutover actions taken by
any worker; this is prep only.**

---

## W5 — ADMIN/COMHUB + MARKETING/SEO (2026-07-13)

Scope: admin dashboard (`/dashboard`, `/admin`) for the nycmaid tenant, comhub
SMS/voice inbox, audit logs, finance ledger; `site/nycmaid/` public marketing
pages (about/careers/contact/reviews/blog/`[slug]` microsites) vs nycmaid's
live marketing site. Source read-only: `~/Desktop/nycmaid` @ `15837e3`.
Target: FL `platform/`, nycmaid tenant `...001`. No cutover/DNS/webhook/deploy/
prod-DB actions taken.

### Method

Diffed nycmaid's `src/app/(app)/admin/*` + `src/app/(marketing)/*` against
FL's `platform/src/app/dashboard/*`, `platform/src/app/admin/*`, and
`platform/src/app/site/nycmaid/*`, file-by-file where a clear counterpart
exists, plus a full read of `middleware.ts` for the domain→tenant routing
that the checklist's SEO item depends on.

### ✅ MATCH

- **Audit logs (operator activity), overall.** FL's `platform/src/lib/audit.ts`
  is a superset port of nycmaid's `src/lib/audit.ts` (14 resource types vs
  nycmaid's 4), wired into 35 FL route files vs nycmaid's 4. `/api/audit`
  (`platform/src/app/api/audit/route.ts`) correctly tenant-scopes with
  `.eq('tenant_id', tenant.tenantId)`; nycmaid's `/api/admin/activity/route.ts`
  has no tenant filter (didn't need one, single-tenant). Consumed by
  `dashboard/activity/page.tsx` : `admin/activity/page.tsx` (nycmaid).
  **Note:** the separate P9 `tenant_write_events` system
  (`platform/src/lib/audit-log.ts`, see `deploy-prep/audit-log-coverage-matrix.md`)
  is a different, newer, currently-unwired system — not the nycmaid-parity
  audit trail. Don't conflate the two; this report only concerns the
  nycmaid-parity trail (`audit_logs` table).
- **Finance ledger, all 11 `finance/*` subpages** (receipts, reconcile, close,
  transactions, cpa-access, audit, accounts, import, entities, recurring,
  reports) — line-count-identical or near-identical to nycmaid
  `admin/finance/*:page.tsx` both sides; `reports/page.tsx` diff is
  `/admin/*`→`/dashboard/*` link-prefix rewrites only. All FL `api/finance/*`
  routes tenant-scope via `tenant_id`/`getTenantForRequest`.
- **`books` (ledger tab).** nycmaid `admin/books/ledger/page.tsx` is itself a
  `ComingSoon` stub (never built). FL's `dashboard/books/page.tsx` has a full
  tabbed ledger (Overview/Ledger/Payroll/Expenses/Reconcile/Tax/
  Statements/Cleaners) computing ledger rows from `/api/bookings` live — FL
  **exceeds** nycmaid here, nothing to port.
- **Comhub (SMS/voice inbox).** `platform/src/app/admin/comhub/page.tsx` is a
  byte-for-byte behavioral port of nycmaid `admin/comhub/page.tsx` (1576
  lines both sides) — full `diff` shows **zero** non-cosmetic lines; every
  diff hunk is dark→light theme color-token substitution (FL's global design
  system). All 4 top-level + 5 template-literal API endpoints referenced by
  the page match exactly (`channels`, `send`, `voice/dial`, `yinez/send`,
  `contacts/:id/notes`, `contacts/:id/context`, `messages/:id/flag`,
  `threads/:id`). All routes exist under `platform/src/app/api/admin/comhub/*`
  and are tenant-scoped. `dashboard/comhub/page.tsx` reuses the same
  component (`import ComHub from '@/app/admin/comhub/page'`) so the tenant
  owner and platform staff get one shared UI, per the global-code rule in
  `platform/CLAUDE.md`. Data-volume verification (2,110 contacts / 11k
  messages synced) is a DATA-lane concern, not code — out of scope here.
- **Admin dashboard structure, broadly.** Every nycmaid `admin/*` page that
  looked missing from FL turned out, on inspection, to be one of: (a) a
  faithful port under a renamed/refactored path (e.g. `calendar` 483→8 lines
  because FL extracted `CalendarShell`; `bookings` 2917→537 because FL
  extracted `BookingsAdmin`; `docs` 1541→252 because FL genericized nycmaid's
  hardcoded content into the shared multi-tenant docs page — correct per the
  "GLOBAL: one shared codebase" rule in `platform/CLAUDE.md`), or (b) a
  nycmaid page that was **itself** a `ComingSoon` stub with nothing built to
  port: `security`, `billing`, `announcements`, `status`, `requests`,
  `prospects`, `social`, `email`, `map`, `changelog`, `selena` (10 lines,
  `ComingSoon=2`, each). `monitoring` (142 lines, real) is faithfully ported
  1:1 (`yinez`→`selena` rebrand, `any`→typed catch — a strict improvement).
  `sales`, `settings`, `clients`, `referrals`, `users`, `feedback`,
  `find-cleaner`, `team` (nycmaid's `cleaners`), `google`, `reviews` all
  present with comparable-or-larger line counts; not diffed line-by-line
  beyond spot checks (see Not Verified below).
- **Marketing pages: `about`, `careers/commission-sales-partner`, `reviews`,
  `blog` (listing).** Diffed against nycmaid's live source; zero non-import-
  path-rewrite differences (aside from one 1-line copy reword on `about`,
  noted below).
- **Domain-flip SEO readiness (`M` checklist item), verified in code, not
  just asserted:**
  - `middleware.ts`'s `BESPOKE_SITE_TENANTS` set includes `'nycmaid'` →
    custom-domain requests route to `/site/nycmaid/*`, **not** the generic
    `/site/template` fallback. If this entry were missing, the domain flip
    would silently serve the wrong (template) site — verified present.
  - `middleware.ts`'s `TENANTS_WITH_RICH_SITEMAP` set includes `'nycmaid'` →
    `/sitemap.xml` on the custom domain rewrites to
    `/site/nycmaid/sitemap.xml` (the real, ~1000+-URL sitemap enumerating
    areas/services/neighborhoods/blog/jobs), not the generic 7-URL
    `/api/tenant-sitemap` fallback.
  - `platform/src/app/site/nycmaid/sitemap.xml/route.ts` hardcodes
    `BASE_URL = 'https://www.thenycmaid.com'` — correct, absolute URLs
    already point at the post-cutover domain, not `fullloopcrm.com`.
  - `platform/src/app/robots.ts` derives `origin` from the request `Host`
    header dynamically, so `thenycmaid.com/robots.txt` will emit
    `sitemap: https://thenycmaid.com/sitemap.xml` correctly (no hardcoded
    wrong domain).
  - **Conclusion: domain-flip will NOT dark SEO, code-side.** The remaining
    checklist item — registering `thenycmaid.com` in `tenant_domains` — is a
    DNS/data action explicitly owned by Jeff/ME at cut, not code.
- **`[slug]` microsite pages.** `site/nycmaid/[slug]/page.tsx` diffs
  identically to nycmaid's `(marketing)/[slug]/page.tsx` except import paths
  and `generateStaticParams`: nycmaid pre-builds all area/neighborhood slugs
  statically (`dynamicParams = false`); FL renders on-demand
  (`dynamicParams = true`, empty `generateStaticParams`). Same content for
  valid slugs either way — a reasonable multi-tenant build-scale adaptation,
  not a regression. **Not verified**: live rendering (no `.env.local` in this
  worktree to boot `next dev`; would need Supabase creds I don't have).

### ⚠️ DRIFT — closed

1. **`/api/cleaners/[id]` (legacy nycmaid-compat shim over `team_members`)
   was silently skipping the audit trail.** nycmaid's
   `src/app/api/cleaners/[id]/route.ts` calls `audit({action:'cleaner.updated'})`
   / `audit({action:'cleaner.deleted'})` on `PUT`/`DELETE`. FL's shim
   (`platform/src/app/api/cleaners/[id]/route.ts`, explicitly commented
   "Legacy nycmaid path") had no `audit()` calls at all — every cleaner
   edit/delete made through this path (which nycmaid clients hit) left zero
   trail on `dashboard/activity`, even though the FL-native `/api/team/[id]`
   equivalent already logged correctly.
   **Fix:** added `audit({tenantId, action:'team.updated'|'team.deleted', entityType:'team_member', entityId})`
   calls matching the exact style/action-names already used by
   `/api/team/[id]/route.ts` (used FL's existing `team.*` taxonomy, not
   nycmaid's `cleaner.*`, since FL's audit.ts action union doesn't have a
   `cleaner.*` variant and the resource is literally `team_members`).
   **Test:** `platform/src/app/api/cleaners/[id]/route.audit.test.ts` — 2
   cases, mocks `supabaseAdmin`/`requirePermission`/`audit`, asserts the
   exact `{tenantId, action, entityType, entityId}` shape on both verbs.
   **Commit:** `f6657ff1` — `fix(audit): log team.updated/deleted on legacy /api/cleaners/[id] shim`

2. **nycmaid's `admin/errors` (working operator error-log viewer) had no FL
   page**, even though the backend was already fully built and *more*
   correctly scoped than nycmaid's version: `/api/admin/errors`
   (`requireAdmin`-gated, cross-tenant by design, backed by
   `lib/error-tracking.ts` + `lib/nycmaid/error-logger.ts`) existed but was
   referenced from nowhere except `admin/docs/page.tsx`'s internal API
   listing — an orphaned endpoint. nycmaid's tenant-facing version doesn't
   port 1:1 architecturally: FL correctly locked this to platform staff
   (`requireAdmin`) rather than exposing raw stack traces/payloads to a
   tenant owner, which nycmaid could get away with only because it was
   single-tenant (Jeff was both "customer" and "staff"). Porting nycmaid's
   *exact* page (tenant-facing) would have regressed that security boundary,
   so this ports the **behavior** (a working error viewer) at the
   **architecturally-correct location** (`admin/*`, staff-only, matching the
   API's existing gate), adapted to FL's actual `error_logs` schema
   (`severity`/`resolved` vs nycmaid's `suppressed`/`dismissed_at`).
   **Fix:** new `platform/src/app/admin/errors/page.tsx`, wired into
   `admin/layout.tsx`'s `navPlatform` nav list.
   **Test:** `platform/src/app/admin/errors/page.test.tsx` — React Testing
   Library, 2 cases: renders an unresolved error row from a mocked
   `/api/admin/errors` GET, and asserts the "Resolve" button PATCHes the
   correct `errorId`.
   **Commit:** `90b919f9` — `feat(admin): add error-log viewer page, port of nycmaid admin/errors`

### ⚠️ DRIFT — flagged for Jeff, NOT auto-fixed

3. **🔴 Unexplained second phone number `(646) 490-0130` baked into the
   entire nycmaid site + transactional emails — does not exist anywhere in
   nycmaid's live source.** Grepped nycmaid's full `src/` tree: zero hits for
   `6464900130` / `490-0130`. In FL, it appears as a "Support" line
   alongside the real Sales number `(212) 202-8400` in **`site/nycmaid`'s**:
   `contact-the-nyc-maid-service-today`, `_components/MarketingNav.tsx`,
   `_components/MarketingFooter.tsx` (site-wide, every page), `privacy-policy`,
   `refund-policy`, `terms-conditions`, `legal`, `do-not-share-policy`,
   `nyc-cleaning-service-frequently-asked-questions-in-2025`, and the
   `service/nyc-emergency-cleaning-service` JSON-LD **schema.org
   `ContactPoint`** (i.e. it's in structured data Google indexes). It's also
   hardcoded into **live transactional email templates**
   (`platform/src/lib/nycmaid/email-templates.ts`, 13+ occurrences —
   booking confirmations, day-of reminders, Zelle payment flow).
   The checklist (`nycmaid-cutover-CHECKLIST.md` §B/§I) confirms nycmaid's
   **only** configured number is `+12122028400`, and "Telnyx voice:
   intentionally skipped." Nothing documents `6464900130` as provisioned for
   nycmaid. It also appears (with a **different** "Sales" number,
   `(212) 202-9030` — a third, also-unexplained number) in the shared root
   template (`platform/src/components/marketing/MarketingFooter.tsx`, used
   by `wash-and-fold-hoboken` and the generic `/site/*` template pages) —
   suggesting this is boilerplate from a shared template that leaked into
   nycmaid's bespoke copy rather than a real nycmaid number.
   **Risk:** if `6464900130` isn't wired to anything post-cutover, every
   customer who texts it for support — including the FAQ page's explicit
   "text this number" hand-off, and anyone completing a booking via the
   confirmation email — gets silence. This is worse than a cosmetic drift.
   **Not auto-fixed** — per the pattern set by the 3 named intentional
   drifts, this needs Jeff's call: is `6464900130` a real, monitored line
   (then it's fine, just undocumented), or is it copy-paste boilerplate that
   should be stripped back to the single confirmed number `(212) 202-8400`
   everywhere it appears on `site/nycmaid/*` and in
   `lib/nycmaid/email-templates.ts`?

### Noticed, not fixed (out of lane / low severity)

- **`about-the-nyc-maid-service-company`**: one bullet reworded — nycmaid
  "Reminder texts before each scheduled visit" → FL "We text when the
  cleaner is on the way." Cosmetic, not a feature/pricing change; not
  flagging as a decision item.
- **`platform/src/app/robots.ts`'s local `MAIN_HOSTS` set is out of sync
  with `middleware.ts`'s** — missing `fullloopcrm.com`/
  `www.fullloopcrm.com`, so `fullloopcrm.com/robots.txt` would emit
  `sitemap: https://fullloopcrm.com/sitemap.xml` instead of the canonical
  `homeservicesbusinesscrm.com` one. The file even has a comment "keep in
  sync if that list changes." Affects FL's own main host only — unrelated to
  the nycmaid domain flip, out of this lane's scope, not fixed.
- **`careers/operations-coordinator`**: FL version (742 lines) is
  substantially larger than nycmaid's (507 lines) but posts to the same
  `/api/management-applications*` endpoints — spot-checked, not diffed
  line-by-line. Low risk, not treated as a gap.

### Not verified (explicitly — see VERIFY skill)

- Live rendering of any page (no `.env.local`/Supabase creds in this
  worktree; did not attempt to boot `next dev`).
- Comhub data volume (2,110 contacts / 11k messages) — DATA lane, not code.
- Finance ledger reconciliation against post-sync data — DATA lane, not code.
- Google Search Console re-verification, sitemap re-submission — genuinely
  post-cut actions, can't be done pre-cutover.

### Tally

- ✅ MATCH: 9 areas (audit logs overall, finance/ledger, comhub, admin
  dashboard structure, about/careers/reviews/blog marketing pages, domain
  routing/sitemap/robots architecture, `[slug]` microsites)
- ⚠️ DRIFT closed: 2 (cleaners audit-log gap, errors viewer page) — both
  committed, tsc clean, tests green
- ⚠️ DRIFT flagged (not fixed): 1 (unexplained `6464900130` support number)
- ❌ MISSING: 0 remaining (both found instances closed above)
- Commits: `f6657ff1`, `90b919f9`
