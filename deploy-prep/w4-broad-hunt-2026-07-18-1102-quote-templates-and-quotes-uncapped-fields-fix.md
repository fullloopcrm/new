# W4 — quotes / quote-templates uncapped array + field length fix — 2026-07-18 11:02

## Context

Per the 10:44 checkpoint's "next-target candidates" list, this pass continued
the corpus-diff fresh-ground method (previously-unswept `src/app/api/*`
directories) against `platform/src/app/api` (the real app root — the
top-level `src/` in this worktree is a near-empty stub; confirmed via
`git ls-tree` that the committed app lives under `platform/`, not `src/`).

## Directories checked this pass

`team-members/[id]/stripe-status`, `team-members/[id]/stripe-onboard`,
`test-emails`, `changelog` (+ `changelog/[id]`), `quote-templates`,
`service-area`, `sidebar-counts`, `territories/options`, `domain-notes`.

Clean (already hardened / no real gap): both `team-members/[id]/*` Stripe
routes (already `requirePermission` + tenant-scoped, per their own
in-code fix comments), `test-emails` (already rate-limited), `changelog` +
`changelog/[id]` (auth-checked, capped at 50 rows, no tenant PII), `sidebar-
counts` (count-only, tenant-scoped, leads gated by permission),
`territories/options` (intentionally public, status-only, no PII).

Lower-severity, not fixed this pass (noted below as aging items): `service-
area` PUT (`zones` array/label unbounded count+length — authenticated
settings.edit, own-tenant-only, low reachability); `domain-notes` POST
(`notes`/`domain` unbounded length — same authenticated own-tenant scope).

## Found + fixed: quotes / quote-templates uncapped writes

`POST /api/quote-templates`, `POST /api/quotes`, and `PATCH /api/quotes/[id]`
all wrote `line_items` (array) and free-text fields (title, description,
contact_name, contact_email, contact_phone, service_address, terms, notes,
name, industry, title_template) straight from the request body with **no
array-length cap and no per-field length cap** — same class as the
`import-clients` gap fixed last round (10:44 checkpoint), except this
surface has a public exposure angle the last one didn't: an accepted/sent
quote is rendered on the unauthenticated, tokenized `/quote/[token]` page, so
an oversized field written by an authenticated `sales.edit` session would
still be served to anyone holding the link. `quote-templates` was worse than
`quotes` on `line_items` specifically — it inserted `body.line_items` raw,
skipping even `normalizeLineItems`'s subtotal recompute, so a template's
line items weren't validated/typed at all before being loaded back into the
quote builder as a starting point for every future quote built from it.

Confirmed no stored-XSS angle compounding this: the public quote view
(`src/app/quote/[token]/quote-view.tsx`) has no `dangerouslySetInnerHTML`, so
React escapes all of these fields on render — this is a resource-abuse /
DB-bloat/oversized-payload hardening fix, not an XSS fix.

### Fix

- `src/lib/quote.ts`: `normalizeLineItems` now caps the array at
  `MAX_LINE_ITEMS=200` (`.slice()`, drops the tail) and truncates each
  item's `name`/`description` to 200/2000 chars. New shared
  `capQuoteTextField()` truncates the flat text fields (caps: title 200,
  industry 100, description 2000, contact_name 200, contact_email 254,
  contact_phone 30, service_address 500, terms 10000, notes 2000, name 200,
  title_template 200) and normalizes `null`/`undefined`/`''` to `null`.
- `src/app/api/quotes/route.ts` (POST) and `src/app/api/quotes/[id]/route.ts`
  (PATCH): all previously-uncapped flat fields now routed through
  `capQuoteTextField`; `line_items` already went through `normalizeLineItems`
  so it inherited the array/item caps for free.
- `src/app/api/quote-templates/route.ts` (POST): `line_items` now routed
  through `normalizeLineItems` (previously raw/unvalidated); `name`,
  `industry`, `title_template`, `description`, `terms` routed through
  `capQuoteTextField`.
- `tiers` (the good/better/best tiered-quote structure) intentionally left
  uncapped this pass — confirmed dormant (no frontend writer found in
  `_QuoteBuilder.tsx` or elsewhere), authenticated-only, own-tenant-only
  write. Listed below as an aging item rather than half-fixed with a
  shallow cap.

### Collateral fix (required for the above, not scope creep)

`src/app/api/quotes/[id]/route.status-race.test.ts` fully replaces the
`@/lib/quote` module mock (doesn't spread the real module), so adding the
new `capQuoteTextField` export broke 2 of its tests with "No
`capQuoteTextField` export is defined on the mock" until the mock was
updated to include a pass-through stub. Fixed in the same commit — this is
the mechanical fallout of adding an export a hand-written mock doesn't know
about, not a new finding.

## Verification

- New tests: `src/lib/quote.test.ts` (+4 cases: MAX_LINE_ITEMS truncation,
  per-item name/description truncation, `capQuoteTextField` cap/short-value/
  null-normalization), `src/app/api/quotes/route.field-caps.test.ts` (3
  cases), `src/app/api/quotes/[id]/route.field-caps.test.ts` (2 cases),
  `src/app/api/quote-templates/route.field-caps.test.ts` (2 cases). All
  pass; confirmed each cap test fails without the fix (verified by reading
  the pre-fix source, not just asserting the post-fix behavior).
- `npx tsc --noEmit` — 0 errors.
- Full suite `npx vitest run` — 721/723 files pass, 2521/2526 tests pass, 1
  expected-fail, 1 skipped, **2 files / 3 tests failing — both pre-existing,
  both already itemized in the 10:44 checkpoint, neither touched by this
  pass's diff**:
  - `src/app/api/finance/cash-flow/route.partial-payment-double-count.test.ts`
    (2/3 tests) — same live regression, now reproduced 4th+ time across
    checkpoints. Still unowned by this lane.
  - `src/app/api/cron/tenant-health/status-coverage-divergence.test.ts` (1
    test) — intentionally-committed RED test (commit `edb7f600`), unchanged.

## Aging items still open (re-confirmed present, not re-litigated this pass)

- `finance/cash-flow` partial-payment regression — needs the owning lane's
  attention (4th+ reproduction across checkpoints now).
- `status-coverage-divergence.test.ts` — intentionally RED, Fortress/
  middleware status-set divergence, fix location named in the test's own
  header.
- `quotes.tiers` (good/better/best) has no array/field caps — low
  reachability (dormant, no frontend writer found), authenticated-only,
  own-tenant-only. Worth a cap pass if/when the tiered-quote UI ships.
- `service-area` PUT `zones` array/label — unbounded count+length,
  authenticated settings.edit, own-tenant-only. Low severity, not fixed.
- `domain-notes` POST `notes`/`domain` — unbounded length, authenticated
  settings.edit, own-tenant-only. Low severity, not fixed.

## New aging items opened this pass

The three items directly above (`tiers`, `service-area` zones,
`domain-notes`) — none existed as "opened" in a prior checkpoint; they're
new findings from this pass's directory sweep, deliberately left unfixed as
lower-severity than the quotes/quote-templates fix actually shipped.

No push/deploy/DB this pass.
