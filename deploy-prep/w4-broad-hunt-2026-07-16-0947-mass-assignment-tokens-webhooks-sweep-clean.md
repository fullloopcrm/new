# W4 broad-hunt — 2026-07-16 09:47

Continuation of the 08:37 LEADER order ("Good catch, real gap. Continue
broad-hunt, lower-risk surface. File-only, no push/deploy/DB.") — the "good
catch" being the referrers/referral-commissions unauthenticated PII lookup
just committed at 4f5019c1. Fresh angles this round, no code changed — all
checked clean, no exploitable gap found.

## 1. Mass-assignment on `.update(updates)` call sites (repo-wide)

Grepped every `.update(updates|updateData|body|payload|data)` in
`src/app/api` (34 hits) and read the construction of the update object at
each site that wasn't already covered by the prior admin/announcements
mass-assignment fix. Every one builds the update object as an explicit
field-by-field allow-list (`const updates: Record<string, ...> = {}` then
`if (x !== undefined) updates.x = ...`), not a spread of the raw request
body — `admin/prospects/[id]`, `admin/sales`, `admin/tenants/[id]`,
`admin/requests`, `admin/notes`, `deals*`, `finance/*`, `documents/[id]`,
`routes/[id]`, `recurring-expenses/[id]` all follow this pattern. No new
mass-assignment surface found.

## 2. Admin route auth-gate completeness

`requireAdmin`/`requirePermission` grep initially flagged 42 of 122
`api/admin*/route.ts` files as "missing" an admin gate. Manually resolved
every one down to 7 apparent misses, then read each: `admin/translate` and
`admin/ai-chat`/`admin/smart-schedule` are tenant-scoped (not admin-only)
via `getTenantForRequest()`, which is correct — any authenticated tenant
member, not just admins, is meant to use them. `admin-auth/logout` needs no
auth (clears its own cookie). `admin/google/callback` is an OAuth callback
protected by a signed, verified `state` param (CSRF-bound to the
tenant that initiated it), not a session — correct for that flow.
`admin/selena/monitor` and `admin/payments/finalize-match` are
internal-tool endpoints Bearer/header-key-gated via `safeEqual()`, by
design (external monitoring / automated reconciliation callers that don't
hold an admin session). All 7 are intentional alternate auth models, not
gaps.

## 3. Timing-safe secret comparison coverage

Grepped for `=== process.env.<SECRET>` / reversed anywhere in
`src/app/api` (non-timing-safe comparison of a caller-supplied value
against a stored secret). Zero hits outside `NODE_ENV`/`VERCEL_ENV`
checks — every internal-key/monitor-key comparison already routes through
`safeEqual()`.

## 4. Path traversal via filesystem ops

No `readFile`/`writeFile`/`createReadStream`/`createWriteStream` exist
anywhere under `src/app/api` — all persistence is Supabase Storage/DB, so
this class of bug has no surface on this codebase.

## 5. Public-token entropy (documents e-sign links, invoice/quote public
links)

Checked how `document_signers.public_token`, `invoices.public_token`, and
implicitly `quotes.public_token` are generated: `generateSignerToken()`
(`src/lib/documents.ts`) and `generateInvoicePublicToken()`
(`src/lib/invoice.ts`) both use `randomBytes(24).toString('base64url')` —
192 bits of CSPRNG entropy, not brute-forceable, so the lack of rate
limiting on the public token-lookup GET routes
(`documents/public/[token]`, `invoices/public/[token]`) is not a gap the
way the referral-code lookup was (that keyspace was small: 4-letter
prefix + 3 digits).

## 6. Regex construction from tenant/user data (ReDoS / regex-injection)

Grepped every `new RegExp(...)` built from a variable repo-wide (7 hits).
The one case building a regex from a tenant-controlled domain string
(`site-export.ts`'s `rewriteToRootRelative`) already escapes all regex
metacharacters before interpolating (`.replace(/[.*+?^${}()|[\]\\]/g,
'\\$&')`). The others interpolate short, length-checked keyword strings
into simple, non-backtracking patterns (`\b<word>\b`) — no catastrophic
backtracking shape, no injection (word source is either a fixed keyword
list or already escaped).

## 7. Prototype pollution via body merge

Grepped for `Object.assign(`, `_.merge(`, `deepmerge(` repo-wide. Only one
hit (`audit-context.ts`), which merges a fixed set of internal audit
fields, not request-body-controlled — not reachable from user input.

## 8. Webhook signature verification completeness

Confirmed every `api/webhooks/*/route.ts` (Telnyx SMS, Telnyx Voice,
Stripe, Stripe-platform, Clerk, Resend, Telegram x3) verifies a signature
before processing. `isWebhookVerifyDisabled()` bypass flag is fail-safe:
`flagValue === 'off' && NODE_ENV !== 'production'` — cannot be tripped in
prod regardless of the env var.

## Also checked clean

- `admin/requests/[id]/agreement` (inserts e-sign document_signers rows
  including a hardcoded internal countersigner) — gated by `requireAdmin()`.
- `finance/receipts` and `documents/[id]` short-lived signed-URL issuance —
  both scope the underlying storage path by `tenant_id` before signing.

File-only, no push/deploy/DB.
