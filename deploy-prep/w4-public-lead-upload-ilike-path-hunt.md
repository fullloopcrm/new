# W4 broad-hunt: public lead/upload surfaces — ILIKE wildcard injection + upload path validation

Scope: fresh area per LEADER order, excluding referrers/referral-commissions/team-PIN
routes. Areas covered: `src/app/api/lead/**`, `src/app/api/email/monitor/**`,
`src/app/api/public-upload/**`, `src/app/api/uploads/**`, `src/app/api/apply/**`,
`src/app/api/management-applications/signed-url/**`, `src/app/api/lead-media/**`,
`src/app/api/cpa/[token]/**` (re-check only, no new issue), `src/app/api/webhooks/clerk/**`,
`src/app/api/google/auth`, `src/app/api/google/callback`, `src/app/api/admin/comhub/voice/control/**`.

Housekeeping: also committed 4 code fixes from the prior W4 round that the leader had
already reviewed and approved ("Good, fixed properly") but that were still sitting
uncommitted in the worktree — `/api/chat` + `/api/yinez` sessionId conversation-hijack
guard, `/api/portal/auth/token` constant-time compare, `/api/ingest/application` ILIKE
escape, `/api/admin/comhub/email/backfill` per-tenant IMAP resolution. tsc clean before
and after; no behavior change from what was already reviewed.

## Fixed

**`src/app/api/lead/route.ts` — unescaped ILIKE wildcard in the public
job-application dedupe lookup.**

`POST /api/lead` is a fully public, unauthenticated, tenant-resolved-from-host
endpoint. For `type: 'job-application'` submissions it deduped on
`.eq('phone', appPhone).ilike('name', name)` with the raw client-supplied
`name`. Postgres ILIKE treats `%`/`_` as wildcards, so a caller who already
knows (or brute-forces) another applicant's phone number could submit
`name: '%'` and get back `{ success: true, application_id, deduped: true }`
for that applicant's real `team_applications` row — an ID-disclosure/dedupe-
oracle on someone else's job application, gated only by guessing a phone
number within the tenant. Same bug class as `ingest/application`'s
`secretMatches`-adjacent dedupe, already fixed this round.

Fixed with a local `escapeLike()` (repo's established per-file pattern —
there's no shared lib helper; `/api/referrers`, `/api/client/check`,
`/api/pin-reset`, `/api/deals/manual`, `/api/webhooks/stripe`, etc. each
carry their own copy) escaping `\`, `%`, `_` before the `.ilike()` call.

**`src/app/api/email/monitor/route.ts` — unescaped ILIKE wildcard on
attacker-influenced payer name (x2: `payment_sender_name` match + `clients.name`
match in `matchPaymentToBooking`).**

`payment.senderName` comes from parsing inbound Zelle/Venmo confirmation
emails — the sender picks their own display name in their banking app, so
it's attacker-influenced input reaching `.ilike('payment_sender_name', '%'+senderLower+'%')`
and `.ilike('name', '%'+senderLower+'%')` unescaped. This is the exact class
already fixed in the sibling routes `admin/comhub/contacts/[id]/context` and
`cron/comhub-email` (commit `fcba7d3b`) — this file (a separate, still-live
payment-matching path, not the same file as either of those) was missed by
that pass. Impact: a payer could name themselves e.g. `%` or `_%` in their
Zelle/Venmo app to broaden the match and get their payment auto-attributed
to the wrong client's booking (money misattribution), or narrow/target a
specific other client's booking via crafted wildcards.

Fixed with the same local `escapeLike()` pattern.

**`src/app/api/public-upload/route.ts` (unauthenticated, tenant-from-host)
and `src/app/api/uploads/route.ts` (authenticated) — unvalidated `folder`
form field spliced directly into the storage path.**

Both routes build the upload key as `` `${tenantId}/${folder}/...` `` where
`folder` was taken verbatim from client `formData`, with no charset
restriction. This is inconsistent with the three sibling routes doing the
same job — `apply/signed-url`, `management-applications/signed-url`,
`lead-media/signed-url` — which all resolve `folder` from a fixed
`ALLOWED_TYPES` config keyed by an enum, never client-supplied text. A
`folder` value like `../<other-tenant-id>/x` would attempt to write outside
this tenant's prefix; whether Supabase Storage's server-side key handling
actually collapses `../` segments wasn't independently verified (no way to
test against the live storage backend from this worktree), but there's no
reason for a public, unauthenticated endpoint to accept an arbitrary path
segment when the codebase's own established convention next door is a
closed charset/allowlist. Also hardened `ext` (previously
`file.name.split('.').pop()`, also unrestricted) to the same
`[a-z0-9]{0,8}` charset already used by the signed-url routes.

Fixed: `folder` now stripped to `[a-zA-Z0-9_-]`, max 40 chars, defaulting to
the prior default (`lead-media` / `general`) if that leaves nothing. `ext`
lowercased + stripped to `[a-z0-9]`, max 8 chars, matching `apply/signed-url`.

Verified: `npx tsc --noEmit` clean; existing `lead/route.xss.test.ts` (9
tests) and `email/monitor/route.test.ts` still pass unmodified — neither
suite exercised the dedupe/matching ILIKE path directly, so this is a
same-behavior-on-legitimate-input, blocked-on-wildcard-input fix, not a
behavior change for real names/senders (only `\`, `%`, `_` are affected, and
none are legal characters that would otherwise need literal-matching in a
name/folder).

## Reviewed, no issue found

- **`webhooks/clerk`**: svix signature verified before any DB write (unless
  explicitly disabled via the guarded `*_WEBHOOK_VERIFY=off` pattern fixed
  elsewhere); user sync scoped by `clerk_user_id`, no tenant cross-write path.
- **`google/auth` + `google/callback`**: OAuth `state` is HMAC-signed
  (`signOAuthState`/`verifyOAuthState`) binding the callback to the
  initiating tenant — forged/missing state is rejected before any token
  exchange. CSRF-safe.
- **`admin/comhub/voice/control`**: `customer_call_id` supplied directly by
  the caller is re-verified against `comhub_active_calls` scoped to the
  admin's own `tenant_id` before any Telnyx action or DB write; a foreign
  tenant's call ID 404s rather than being acted on.
- **`apply/signed-url`, `management-applications/signed-url`,
  `lead-media/signed-url`**: correctly scoped already — type allowlist,
  MIME allowlist, path always `${tenant.id}/...`, filename is
  `timestamp-random.ext` (server-generated, not client-supplied), `ext`
  charset-restricted. These were the reference pattern used to fix the two
  routes above.
- **`finance/bank-transactions/[id]` PATCH**: multiple subsequent
  `.update(...).eq('id', id)` calls omit a repeated `tenant_id` filter, but
  `id` was already proven to belong to `tenantId` by the initial scoped
  `.select(...).eq('tenant_id', tenantId).eq('id', id).single()` fetch —
  same "not exploitable" pattern already noted in the prior
  documents-e-sign audit. Compare-and-swap on `status='pending'` correctly
  prevents double-posting the journal entry on a double-submit.
- **`admin/announcements/[id]`**: `platform_announcements` is a global
  (non-tenant) table gated by `requireAdmin()`, which checks a separate
  platform-superadmin cookie/token (`verifyAdminToken`), not tenant-admin
  auth — no tenant_id needed by design.
- Broader `.ilike(` sweep across `src/app/api/**`: every other hit either
  already runs through a local `escapeLike()` (the majority) or only ever
  receives a digits-only string (`cleanPhone.replace(/\D/g,'').slice(-10)`)
  which cannot carry `%`/`_`, or is an authenticated admin free-text search
  box (`admin/ai-chat`, `ai/assistant` client search) where over-broad
  matching stays inside the caller's own tenant scope — not a boundary
  issue, just a UX nit, left as-is.

## Not touched (per LEADER order)

Did not open `referrers/**`, `referral-commissions/**`, or PIN-based team
routes (`pin-reset`, team-portal PIN auth). Also stayed out of `referrals/**`
(client-lead-referral tracking, a distinct feature from the affiliate
`referrers` portal) since it wasn't clear that lane is outside another
worker's claim and it wasn't needed to complete this pass — flagging only:
`referrals/[id]/route.ts` had a `.update(...).eq('id', ...)` hit in the
heuristic sweep that was never actually opened/verified.
