# IDOR Baseline Triage — 2026-08-01 re-verification pass

Follow-up to [`idor-baseline-triage-2026-07-30.md`](./idor-baseline-triage-2026-07-30.md).
That pass individually traced all 129→63 baselined `file::table` signatures
and found 0 confirmed real IDORs. This pass (W6, readiness continue session)
does three things the prior one didn't: (1) checks whether the baseline is
still *current* after six intervening commits from other workers today,
(2) manually re-reads the highest-value remaining candidates (money, PII,
cross-tenant) against the live source rather than trusting the prior
write-up, and (3) extends past the analyzer's own documented blind spots
(non-`id` vectors, split/reassigned builders, dynamic table names) with real
greps and reads, which the 07-30 pass did not attempt.

## 1. Baseline currency check

Re-ran `npx tsx scripts/idor-lint-guard.ts --update-baseline` against
today's tree (after sec-03, sec-08, sec-04, sec-09, ai-06, bsr-02 all
committed) and diffed the regenerated file against the committed one with
`git diff` / `git status`: **byte-identical, zero changes.** 63 candidates
before, 63 after, same signatures. One of today's commits
(`e91f172da`, bsr-02) did touch a baselined file's route
(`src/app/api/team/[id]/route.ts`) — confirmed by reading the diff that the
touched code remains tenant-scoped throughout (uses `tenant_id` filters on
every `bookings`/`booking_team_members` query) and introduced no new
unscoped `id`-filtered chain. The baseline is current, not stale.

`npx vitest run src/lib/idor-route-guard.test.ts` — 12/12 pass (fixture
tests + tree ratchet against the unchanged 63-entry baseline).

## 2. Manual re-triage of the highest-value baseline candidates

Read the live current source (not the prior triage doc's summary) for the
candidates touching money, PII, or auth, end to end:

- `pin-reset/route.ts::member_pin_reset_codes` — every lookup is scoped
  through `findMember(tenantId, contact)` first; the reset-code row is only
  ever looked up/updated by `member_id` where `member` was itself resolved
  tenant-scoped. Rate-limited per-contact and per-IP. Safe.
- `admin/payments/finalize-match/route.ts::bookings` — internal-key-gated
  (`safeEqual` against `INTERNAL_API_KEY`); the caller-supplied `clientId`
  is explicitly re-verified against the resolved booking's `tenant_id`
  before being trusted (comment cites `cross-tenant-leak-register.md` — a
  previously-fixed FK-injection class). Safe.
- `finance/bank-import/route.ts::bank_import_batches` — `bank_account_id` is
  ownership-checked against `tenantId` before any subsequent query keys off
  it; all inserts carry `tenant_id` explicitly. Safe.
- `referral-commissions/route.ts` (GET/POST/PUT) — GET's `referrer_id`
  path requires a referrer session token whose `rid` must match, with an
  explicit code comment documenting a *previously real* unauthenticated
  IDOR here that was already fixed. POST/PUT both re-verify
  `tenant_id` on every read/write, including the CAS-style
  `.eq('id', id).eq('tenant_id', tenantId).neq('status','paid')` mark-paid
  transition that also gates a real Stripe Connect transfer. Safe.
- `referrers/[code]/route.ts::referrers` — session-token gated, cross-checks
  `referrer.tenant_id !== auth.tid` and `referrer.referral_code !== code`
  before returning anything; all downstream reads go through
  `tenantDb(referrer.tenant_id)`. Safe.
- `team-portal/update-phone/route.ts::team_members` — HMAC-signed token
  (`verifyPhoneFixupToken`) embeds the team_member_id; not caller-suppliable
  independent of a valid signature. Safe.
- `documents/[id]/void/route.ts::documents`, `quotes/[id]/send/route.ts::quotes`
  — both fall in the documented "ownership proven by a prior fetch in the
  same function" class: the initial `SELECT ... WHERE tenant_id = ? AND id = ?`
  confirms tenant ownership before the later `UPDATE ... WHERE id = ?`
  (no re-stated tenant_id on the update, but the `id` is a UUID primary key
  that already passed the ownership check earlier in the same request — not
  attacker-reachable for a different tenant's row). Safe.
- `admin/requests/[id]/agreement/route.ts::documents`/`::territories` —
  `requireAdmin()`-gated platform-staff route (accepted admin-cross-tenant
  class); `partner_requests` is already an allowlisted pre-tenant table.
  Safe.
- `webhooks/stripe/route.ts::bookings`, `checkout.session.completed` handler
  — the `client_reference_id` path (the one genuinely caller-editable input
  here) has an explicit, real mitigation: it re-fetches the Stripe Payment
  Link actually used for the checkout and compares its URL against the
  referenced booking's own tenant's configured `payment_link` before ever
  trusting the resolved `tenant_id` — read the full mitigation code, not
  just the comment describing it. Safe.

10 of the highest-sensitivity signatures in the 63-entry baseline, freshly
read end to end. Zero real IDORs found. Zero code changes required — no
finding here contradicted the 07-30 classification.

## 3. Beyond the baseline: the analyzer's own documented blind spots

`deploy-prep/idor-lint-guard-spec.md` §4 names three false-negative classes
the single-chain regex analyzer cannot see at all. Swept each for the first
time this pass (the 07-30 triage only covered what the analyzer itself
flagged):

**Non-`id` object keys** (`.eq('slug'|'code'|'token', …)`) — grepped every
`route.ts` for this shape: 13 matches. 10 resolve the `tenants` table
itself by `slug` (self-scoping — same accepted class as the `tenants` entry
already in `CROSS_TENANT_TABLES`, since the tenant boundary *is* the row).
The remaining 3 are the only non-`tenants` matches in the tree today, and
were read in full:
  - `cpa/[token]/year-end-zip/route.ts::cpa_access_tokens` — token
    resolves `tenant_id`/`entity_id` from the token row itself; token is
    `randomBytes(24)` base64url from `finance/cpa-tokens/route.ts`, and a
    witness test (`route.witness.test.ts`) already locks a foreign
    `entity_id` being rejected at mint time.
  - `invites/[token]/accept/route.ts::tenant_invites` — token resolves
    `invite.tenant_id`; all downstream member creation goes through
    `tenantDb(invite.tenant_id)`. Token is `randomBytes(32)` hex
    (`admin/invites/route.ts`).
  - `client/verify-code/route.ts::verification_codes` — tenant comes from
    `getTenantFromHeaders()` (the request's own resolved tenant, not the
    code), every query goes through `tenantDb(tenant.id)`, and the code
    lookup itself is additionally rate-limited per-identifier and per-IP.

**Split/reassigned query builders** (`.eq('id'|'*_id', …)` added in a later
statement instead of the initial chain the analyzer captures) — grepped for
the exact dangerous shape (`q = q.eq('id'...)` / `query = query.eq('*_id'...)`
on an otherwise-unscoped root) across every route: 3 matches
(`booking-notes/route.ts` ×2, `campaigns/send/route.ts` ×1). All three read
in full: the `booking-notes` ones filter by `booking_id`/`job_id` with
tenant scope established earlier in the same function; `campaigns/send`
reassigns onto `db = tenantDb(tenantId)`, an auto-scoped root, so the
reassignment is safe regardless of what gets added to it. **Zero instances
found of the actually-dangerous shape** (an id/`*_id` filter added only via
reassignment on a `supabaseAdmin`/`supabase` root with no `tenant_id`
anywhere in the function) — the pattern the spec warns could hide a real
unscoped chain from the analyzer entirely does not currently exist in the
route tree.

**Dynamic table names** (`.from(variableName)` instead of a string
literal) — grepped for this shape: 4 matches, all in
`/api/admin/monitoring/**` and `/api/admin/finance/more/route.ts`. All are
`requireAdmin()`-gated internal rollup/monitoring endpoints where the table
name comes from a hardcoded server-side list, never from request input —
the accepted "admin routes, cross-tenant by design" class, not a
caller-controlled table selector.

## What this pass does NOT establish (honest ceiling, per the checkpoint's
own spec — do not treat this as "0 IDORs, done")

- **The `.or(...)` / opaque-RPC ownership class was not swept.** The spec
  names this as a real false-negative mode; no grep or read was attempted
  against it this pass.
- **The non-`id`-vector sweep used a narrow pattern** (`slug`/`code`/`token`
  literals only). Other non-id column names that could carry the same risk
  (e.g. `ref_code`, `public_token`, `unsubscribe_token`, `stripe_session_id`,
  `external_id`) were not enumerated or checked.
- **Not all 63 baseline entries were individually re-read this session** —
  only the 10 highest-value ones (§2). The 07-30 pass's claim to have
  read all 63 was not independently re-verified entry-by-entry today; this
  pass instead re-verified that the *set itself* hasn't drifted (§1) and
  spot-checked the highest-stakes subset for real.
- **This remains a heuristic, single-chain, no-AST, no-DB text analyzer.**
  A genuinely obfuscated ownership check, a helper function that silently
  drops a tenant filter, or a future refactor that moves the tenant check
  to a different layer would not be caught by this tool or by this manual
  pass. Per the checkpoint's own framing, a clean "0 IDORs" claim is not
  achievable at the ceiling with this methodology — this pass raises
  confidence in the specific things it actually checked, not in the
  complete absence of any IDOR anywhere in the codebase.

## Verification

- `npx tsx scripts/idor-lint-guard.ts` — 0 new findings (63 known).
- `npx tsx scripts/idor-lint-guard.ts --update-baseline` then `git diff` —
  byte-identical, confirms currency.
- `npx vitest run src/lib/idor-route-guard.test.ts` — 12/12 pass.
- 10 baseline signatures + 7 non-baseline candidates (3 non-id-vector, 3
  split-builder, 4 dynamic-table, with overlap) read in full against live
  source, not summarized from memory or the prior doc.
