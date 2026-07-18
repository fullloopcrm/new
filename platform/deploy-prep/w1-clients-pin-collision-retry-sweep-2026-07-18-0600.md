# W1 gap/fluidity: clients.pin collision-retry fix never reached 8 other live mint sites

**Date:** 2026-07-18 06:00
**Surface:** `idx_clients_tenant_pin_unique` (2026_07_17_clients_pin_unique.sql) —
the (tenant_id, pin) uniqueness constraint this session already added
application-layer regenerate-and-retry handling for on 4 files
(`client/collect`, `client/verify-code`, `client/book`, `POST /api/team`,
landed in `w1-clients-pin-and-team-members-pin-collision-retry-2026-07-18-0253.md`).
That doc's own "Noticed" section explicitly flagged the gap: *"Did not sweep
every OTHER insert site that mints a `clients.pin` beyond those four."* This
round did that sweep.

## The bug

Grepped the whole codebase for every `pin: randomInt(...)` / `pin =
crypto.randomInt(...)` mint of `clients.pin` and cross-referenced against the
4 already-fixed files. Found **8 more live call sites**, none with any
collision handling, split across two unrelated subsystems:

**Public/operator lead-capture routes** (5 files) — each does a bare
`.insert()` on the new-client branch and either `if (error) throw error`
(caught by the route's outer catch → generic 500, the lead is lost) or an
inline 500 response:
- `src/app/api/contact/route.ts`
- `src/app/api/portal/collect/route.ts`
- `src/app/api/ingest/lead/route.ts` (external partner sites, shared
  `INGEST_SECRET`)
- `src/app/api/deals/manual/route.ts` (operator manual-entry)
- `src/app/api/lead/route.ts`

**Selena's SMS/agent tool layer** (`src/lib/selena/core.ts` ×3,
`src/lib/selena/tools.ts` ×1) — a completely different subsystem hitting the
same `clients` table via the conversational AI, not the web lead-capture
funnel:
- `createOrLinkClient()` (SMS name-capture auto-create) — didn't even check
  the insert's `error` at all; on collision the client creation silently
  no-opped (`if (client) { ... }` just skipped), dropping context for a
  real SMS lead with no error surfaced anywhere.
- `handleCreateBooking()`'s auto-create-client branch — checked the error
  and returned `Auto-create client failed`, but never retried, failing a
  first-time SMS booking outright on a random collision.
- `handleSendPin()` — the worst instance: this is an **UPDATE**, not an
  insert, regenerating an invalid/missing PIN. It ignored the update's
  error entirely and texted the customer the "new" PIN regardless of
  whether it actually saved. On a 23505 collision, the customer receives a
  PIN via SMS that was **never persisted** — the DB still has the old
  invalid PIN — permanently locking them out of portal login until they
  contact support, with no indication anything went wrong.
- `handleCreateClient()` (tools.ts, the owner-facing `create_client` tool)
  — checked the error and returned it, but never retried.

All 8 are real, live, externally-reachable code paths (public forms, an
external-partner ingest webhook, and the actual SMS/chat conversational
flow) — not dead code. (Two other `pin: randomInt(...)` sites were checked
and intentionally **not** touched — see "Not fixed" below.)

## The fix

Applied the exact same pattern as the already-fixed 4 files: regenerate via
`randomClientPin()` (`src/lib/client-auth.ts`) and retry up to
`MAX_CLIENT_PIN_ATTEMPTS` (5) on a `23505` from `idx_clients_tenant_pin_unique`,
instead of surfacing the raw collision as a generic failure.

- `src/app/api/contact/route.ts`, `portal/collect/route.ts`,
  `ingest/lead/route.ts`, `deals/manual/route.ts`, `lead/route.ts` — swapped
  `randomInt` for `randomClientPin`/`MAX_CLIENT_PIN_ATTEMPTS` from
  `@/lib/client-auth`, wrapped each insert in the standard retry loop.
- `src/lib/selena/core.ts` — `createOrLinkClient()` now checks the insert
  error and retries; `handleCreateBooking()`'s auto-create branch retries
  instead of failing on the first collision; `handleSendPin()`'s update now
  retries and, critically, only texts the SMS once the update actually
  succeeds — if every attempt collides it returns `Failed to send PIN`
  instead of sending an unpersisted PIN.
- `src/lib/selena/tools.ts` — `handleCreateClient()` (the `create_client`
  owner tool) retries the same way; kept a `pin` variable outside the loop
  since the success response echoes it back to the caller.
- Both `core.ts` and `tools.ts` had `import crypto from 'crypto'` as their
  *only* remaining use was the now-replaced `randomInt` calls — removed the
  now-dead import from both rather than leave an unused import.

## Not fixed — flagged per scope discipline

- `src/app/api/test/email-selena/route.ts` — same bare-insert shape, but
  this is a test-only harness returning 404 unless `SELENA_TEST_TOKEN` is
  set, and further gated by `safeEqual(body.key, expectedToken)` per
  request. Not a public-facing surface the way the 5 lead-capture routes
  are; left as-is.
- `src/lib/selena-legacy-email.ts`'s `handleInboundEmail()` — confirmed
  **dead code**: exported but has zero non-test importers anywhere in the
  repo (grepped `handleInboundEmail` across all of `src`). Not reachable,
  so not fixed.
- Also confirmed dead and unrelated to this fix: the three per-tenant
  `_lib/email-templates.ts` and `_lib/selena.ts` files under
  `src/app/site/{nyc-mobile-salon,wash-and-fold-hoboken,wash-and-fold-nyc}`
  — near-exact forks of `nycmaid/email-templates.ts` (same function names/
  order) with **zero** `escapeHtml()` usage, initially looked like the same
  cross-party HTML-injection class as this session's earlier nycmaid fixes.
  Grepped every import of `_lib/email-templates` and `_lib/selena` across
  those 3 site trees (and the wider repo) and found none outside a code
  comment — these tenants have no `src/app/site/<tenant>/api` routes at all
  and run entirely on the shared global routes per `CLAUDE.md`'s GLOBAL
  rule. Vestigial, not live; not a real vulnerability, just dead weight.
  Not touched (cleanup, not a fix, out of this round's scope).

## Verification

- `tsc --noEmit --pretty false`: same 4 pre-existing baseline errors only
  (admin-auth route type gen, cron/outreach + cron/payment-reminder tests,
  sunnyside-clean-nyc site-nav), 0 new. First pass surfaced 2 new errors
  from removing the `crypto` import while a `pin` shorthand reference in
  `tools.ts` still depended on the old local variable — fixed by keeping
  `pin` declared outside the retry loop instead of inlining
  `randomClientPin()` into the insert call.
- `eslint` on all 15 touched/added files: 0 errors (5 pre-existing warnings
  in `core.ts`, all on unrelated unused-variable/prefer-const lines far
  from this diff).
- New tests (8 files, 16 tests):
  - `src/app/api/{contact,portal/collect,ingest/lead,deals/manual,lead}/route.pin-collision-retry.test.ts`
    — each asserts (a) 2 seeded collisions still succeed on the 3rd insert
    attempt with the exact expected attempt/pin-generation count, and (b)
    999 simulated collisions stop exactly at `MAX_CLIENT_PIN_ATTEMPTS` (5)
    and surface an error instead of retrying forever.
  - `src/lib/selena/pin-collision-retry.test.ts` — `createOrLinkClient`
    (via `extractAndSave`) retry-and-succeed; `handleCreateBooking`
    auto-create give-up-and-error, using the `createFakeSupabase()` +
    `_addUniqueConstraint('clients','pin')` harness already established by
    `mark-payment-received-insert-error.test.ts`.
  - `src/lib/selena/send-pin-collision-retry.test.ts` — a hand-rolled
    `supabaseAdmin` mock (the fake harness only simulates unique-constraint
    violations on `insert`, not `update` — confirmed by reading
    `fake-supabase.ts`'s `op === 'insert'` gate) proving both that a
    collision retries and that `sendSMS` is never called with a PIN that
    failed to persist.
  - `src/lib/selena/create-client-pin-collision-retry.test.ts` — the
    `create_client` owner tool, retry-and-succeed plus give-up, gated
    through `runTool`'s real owner-auth path (seeded `tenants.owner_phone`
    + `trustedOwnerPhone: true`, matching `mark-payment-received-insert-error.test.ts`'s
    convention).
  - Every retry-succeeds test asserts the *exact* attempt count (e.g. 2
    seeded collisions → exactly 3 insert/update attempts and exactly 3
    `randomClientPin()` calls), and every give-up test asserts the count
    stops exactly at the cap with 999 simulated collisions — direct
    evidence the loop executes and terminates, not pattern-matched
    confidence.
- Full `npx vitest run`: 660/660 files, 3444 passed + 1 pre-existing
  expected-fail (3445 total), 0 regressions (was 652/652, 3428+1 before
  this pass — +8 files/+16 tests, exactly the new coverage added).

File-only, no push/deploy/DB. All 7 production files fixed are outside the
`tenant_domains` schema+backfill lane; nothing here required a new SQL file
since `idx_clients_tenant_pin_unique` already exists from the prior pass —
this only extends application-layer handling of it to the sites that were
missed.

## Noticed (not fixed, flagging per scope discipline)

- Did not do a full second sweep of *every other* `CREATE UNIQUE INDEX` in
  the repo for this same "constraint exists, some app-layer insert(s) never
  got a retry" pattern — this round was scoped specifically to
  `idx_clients_tenant_pin_unique` (the exact constraint the prior doc
  flagged as incompletely swept). A broader sweep across every
  unique-constrained column is a separate, larger pass.
- `team_members.pin` (the sibling constraint from the same prior fix,
  `idx_team_members_tenant_pin_unique`) was not re-swept for other mint
  sites beyond the ones already fixed — grepped briefly and didn't find
  additional bare `team_members` PIN inserts, but that check was
  opportunistic, not exhaustive, in this pass.
