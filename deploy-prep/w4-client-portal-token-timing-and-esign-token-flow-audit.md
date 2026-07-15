# W4 broad-hunt: client-portal token compare + e-sign/quote/invoice public-token flows

Scope: fresh area, excluding referrers/referral-commissions/team-PIN routes per LEADER order.
Areas covered: `src/app/api/documents/**` (e-sign), `src/app/api/quotes/public/**`,
`src/app/api/invoices/public/**`, `src/app/api/finance/cpa-tokens` + `src/app/api/cpa/[token]`,
`src/app/api/portal/**` (client portal, not team-portal).

## Fixed

**`src/app/api/portal/auth/token.ts` — `verifyPortalToken` used a non-constant-time
signature compare (`sig !== expected`).**

This HMAC token is the sole proof of `{ id: clientId, tid: tenantId }` for every
`/api/portal/*` route (bookings, availability, connect messages, notes, feedback,
requests, services) — i.e. it's the cross-tenant boundary for the entire client
portal. Comparing the hex signature with `!==` leaks per-byte timing signal,
which is the exact class of bug this codebase has already fixed elsewhere
(`ingest/application` `secretMatches`, and the sibling
`team-portal/auth/token.ts` `verifyToken`, which already uses
`crypto.timingSafeEqual` with a length guard). The client-portal verifier was
the one instance still using plain `!==`.

Fix: switched to the same length-checked `timingSafeEqual` pattern used in
`team-portal/auth/token.ts`. Verified:
- `npx vitest run src/app/api/portal/auth/portal-token-verify.isolation.test.ts` — 12/12 pass (round-trip, tid/id tampering, expiry, malformed input, wrong secret, cross-portal-token confusion, missing-secret-fails-closed).
- `npx tsc --noEmit` — clean.

No DB/migration involved — pure code fix, file-only per instructions.

## Reviewed, no issue found

- **Document e-sign public flow** (`documents/public/[token]/*`): signer tokens
  are `randomBytes(24)` (192 bits), atomic CAS updates on sign/accept prevent
  double-signing races, sequential-order re-check after claim, field updates
  scoped to `signer_id` from the token (can't write another signer's fields),
  PDF integrity re-hashed against `original_sha256` before finalizing.
- **Quote/invoice public accept + Stripe checkout** (`quotes/public/[token]/*`,
  `invoices/public/[token]/checkout`, `quotes/public/[token]/deposit-checkout`):
  charge amounts are always server-derived from stored `total_cents` /
  `deposit_cents`, never client-supplied — no price-tampering vector. Accept
  endpoints use compare-and-swap status updates to stay idempotent under
  concurrent replay.
- **CPA year-end-zip token** (`api/cpa/[token]/year-end-zip`): token is
  `randomBytes(24)`, checked against `revoked_at`/`expires_at` before serving
  financial exports; usage counted via a DB-side RPC (`cpa_token_bump_usage`)
  to avoid a read-then-write race.
- **Documents `[id]/*` internal CRUD** (void/duplicate/fields/send/signers):
  every mutating route re-fetches the parent `documents` row scoped to
  `tenant_id` before acting; a couple of subsequent single-table
  updates-by-id (e.g. `void/route.ts`) omit a repeated `tenant_id` filter on
  the write itself, but the id was already proven to belong to the tenant by
  the preceding scoped `.single()` fetch — not exploitable.

## Not touched (per LEADER order)

Did not open referrers, referral-commissions, or team-PIN/team-portal routes.
Noted only as a cross-reference: `team-portal/auth/token.ts` already has the
correct `timingSafeEqual` pattern, which is what confirmed the client-portal
file was the outlier rather than an intentional different convention.
