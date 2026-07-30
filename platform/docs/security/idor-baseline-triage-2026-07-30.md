# IDOR Baseline Triage — 2026-07-30

Real triage of `src/lib/idor-route-guard.baseline.json` per the graduation
path in `deploy-prep/idor-lint-guard-spec.md` §7 step 1. This is a
**heuristic prototype** (single-chain text analysis, no AST, no DB) — it has
documented false positives AND false negatives (spec §4). Nothing here is an
authoritative "0 IDORs" claim; it is an honest account of what was checked
and what was found for THIS specific candidate set.

## What was actually reviewed

Every one of the 129 baselined `file::table` signatures as of this
session's start, individually traced against the real source: read the
flagged chain, read the surrounding function, and where the flagged
`.eq('id', …)` used a variable, traced backward to where that variable's
value actually originates (a prior tenant-scoped fetch in the same
function, a cryptographically signed/random token, an authenticated
session's own identity, or internal cron/webhook-derived state) to
determine whether an external caller could ever supply an arbitrary,
cross-tenant id at that point.

## Result: 0 confirmed real IDOR vulnerabilities requiring a code fix

Every flagged chain fell into one of the documented false-positive classes
from the spec, verified with real evidence, not assumed:

- **Ownership proven by a prior fetch in the same function** (the majority) —
  e.g. `webhooks/telnyx/route.ts`, `webhooks/stripe/route.ts`,
  `webhooks/resend/route.ts`, `webhooks/telnyx-voice/route.ts`, most `cron/*`
  routes, `jobs/[id]/sessions/[sessionId]/route.ts` (explicit tenant+job
  double-check in `loadOwnedSession`, split across two functions).
- **Token/signature-authenticated id, not caller-suppliable** —
  `documents/public/[token]/*`, `quotes/public/[token]/*`,
  `invoices/public/[token]/route.ts` (id resolved via an unguessable public
  token first), `team-portal/update-phone/route.ts` (HMAC-signed token with
  the target id embedded in the signed payload).
- **Session-based self-lookup, id never from the request** —
  `portal/messages/route.ts`, `team-portal/messages/route.ts` (the latter's
  own header comment already documents this: "team_member_id and tenant_id
  come from the VERIFIED token... never from the request").
- **Cron/webhook-internal iteration** — the id is a row the job/webhook
  itself already selected, not attacker-suppliable at all (`notifications`,
  `recurring_expenses`, `comhub_active_calls`, `campaign_recipients`,
  `campaigns`).
- **Admin routes gated on `requireAdmin()`** — a separate, platform-staff-only
  auth path (`admin_token` cookie, distinct from any tenant session).
  Cross-tenant access here is the accepted, by-design shape of an internal
  ops tool, not a customer-facing leak surface.
- **Test/dev harness gated by a static secret token** —
  `test/email-selena/*` (`SELENA_TEST_TOKEN`), not customer-reachable.
- **Unguessable matching value, not a sequential/predictable id** —
  `push/subscribe/route.ts` matches by the device's own push endpoint URL.
- **Genuinely low-sensitivity, pre-tenant data** — `track/route.ts`'s
  `lead_clicks` (anonymous marketing-attribution rows keyed by a
  client-generated session id).

## Real fix applied: 3 tables added to `CROSS_TENANT_TABLES`

Verified against a **live query against prod** (`information_schema.columns`),
not assumed from the table name — the schema check caught that two
similar-sounding tables (`platform_feedback`, `error_logs`) actually DO have
a `tenant_id` column and were correctly left off the allowlist, while these
three genuinely have none:

- `partner_requests` — pre-tenant sales-partner funnel, same class as the
  already-allowlisted `leads`/`prospects`/`waitlist`.
- `platform_announcements` — global platform changelog/announcement content.
- `crm_notes` — no `tenant_id` column at all; scoped via `client_id` FK, not
  tenant ownership.

## Baseline shrink: 129 → 63

Re-running `scripts/idor-lint-guard.ts --update-baseline` after the allowlist
change dropped the baseline from 129 to 63 — far more than the ~9 signatures
directly tied to the 3 newly-allowlisted tables. The other ~57 were **stale**:
routes that had already been fixed (converted to `tenantDb(...)`, or given an
explicit `.eq('tenant_id', …)`) by unrelated work sometime after the baseline
was last frozen, with nobody re-running `--update-baseline` to reflect it.
Verified this wasn't a tool bug via two independent spot-checks
(`invoices/[id]/route.ts`, `finance/bank-transactions/[id]/route.ts`) — both
now genuinely use the `tenantDb`-wrapped `db` root with explicit tenant
scoping, confirmed by reading the actual current source.

**All 63 remaining baseline entries were individually traced** (not just the
original ~129 minus the ones removed) — the full current list was reviewed
against the false-positive classes above with zero exceptions found.

## What this does NOT establish

- **Not an authoritative "0 IDORs" claim.** The analyzer's own documented
  false-negative classes (split/reassigned builders, dynamic table names,
  ownership faked via `.or(...)` or an opaque RPC, and non-`id` vectors like
  `.eq('slug', …)`/`.eq('token', …)`) are real gaps this triage pass cannot
  see, by design (spec §4).
- **Graduation path steps 2-4 not started** — no routes adopted `tenantDb(...)`
  as part of this pass (existing `tenantDb` usage found during triage was
  pre-existing), the `.eq('slug'|'token'|'code', …)` vectors were not added
  to the analyzer, and no blocking CI job was proposed.
- This is a **reporting prototype, still non-blocking** beyond the existing
  vitest ratchet — no `.github/workflows` file was touched.

## Verification

- `npx vitest run src/lib/idor-route-guard.test.ts` — 12/12 pass (fixture
  tests + tree ratchet against the new 63-entry baseline).
- Full suite and typecheck run as part of the same commit.
