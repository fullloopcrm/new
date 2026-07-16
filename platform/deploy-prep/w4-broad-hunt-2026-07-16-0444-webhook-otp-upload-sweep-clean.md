# Broad-hunt — W4, 2026-07-16 04:44 order

File-only, no push/deploy/DB. Continuing broad-hunt on a lower-risk surface
per LEADER instruction. No code changes this pass — everything checked was
already correctly hardened.

## Surfaces checked (all clean)

- **Inbound webhook signature verification** — read `lib/webhook-verify.ts`
  end-to-end plus every call site: Telnyx SMS (`webhooks/telnyx`), Telnyx
  voice (`webhooks/telnyx-voice`), Resend (`webhooks/resend`), Telegram
  (`webhooks/telegram`, `/jefe`, `/[tenant]` via `lib/telegram-webhook-auth.ts`).
  All fail-closed on missing/misconfigured secret, use timing-safe compares
  (`timingSafeEqual` / Ed25519 `crypto.verify`), and check a 5-min timestamp
  window where applicable. The local-dev `*_WEBHOOK_VERIFY=off` escape hatch
  is itself hardened — `isWebhookVerifyDisabled()` ignores it whenever
  `NODE_ENV === 'production'`, so a leaked/copy-pasted env var can't disable
  verification in prod.
- **Resend inbound email tenant scoping** — `resolveTenantIdForInboundEmail()`
  fails closed (drops the row rather than writing an unscoped, cross-tenant-
  visible `inbound_emails` row) when the recipient address doesn't resolve.
  `html_body`/`text_body` are stored raw from the sender but have zero
  render sinks anywhere in `src/app` today (grepped) — dormant, not a live
  stored-XSS, consistent with the pattern flagged (not fixed) in several
  prior sessions for other unrendered fields.
- **File upload path traversal** — re-checked all `formData` upload routes
  that build a storage path from `file.name` (`public-upload`, `uploads`,
  `cleaners/upload`, `finance/upload`, `reviews/upload`,
  `management-applications/upload`, `booking-notes/upload`,
  `admin/notes/upload`, `team-applications/upload`). Every one only extracts
  the extension via `.split('.').pop()` + a `[^a-z0-9]` strip, and the
  `folder` param (where client-suppliable) is slug-sanitized — matches the
  fix pattern from earlier sessions (`public-upload`/`uploads` comments
  confirm this was already patched). No traversal possible.
- **OTP/verification-code flows** (`client/send-code`, `client/verify-code`)
  — `crypto.randomInt` for the 6-digit code, per-identifier + per-IP rate
  limits with `failClosed: true` on both send and verify, exact (not
  substring/suffix) phone matching, `escapeLike()` on the email `ilike`
  lookup, and the API response strips the row down to a `safeClient` allow-
  list (no `pin`, no internal fields). Already well-hardened from prior
  sessions per the inline comments.
- **Stripe checkout amount trust** — `quotes/public/[token]/deposit-checkout`
  (public, token-scoped, unauthenticated) derives `unit_amount` entirely
  server-side from `quote.deposit_cents - quote.deposit_paid_cents`; no
  client-supplied amount reaches Stripe. Rate-limited per token.
- **Public/signed token entropy** — `generateSignerToken()` (documents,
  `crypto.randomBytes(24)`) and `generatePublicToken()` (quotes) both use
  CSPRNG, not sequential/guessable IDs.
- **SSRF on outbound fetches** in `lib/site-readiness.ts` / `lib/site-export.ts`
  (admin-triggered domain health-check + site export against a tenant's own
  domain) — both already route through `safeFetch` (SSRF-guarded), not raw
  `fetch`.
- **Auth-via-query-string** — grepped for `searchParams.get('key'|'token'|
  'secret'|'api_key'|'auth')` used as an auth credential anywhere in
  `src/app/api` (would leak into server/CDN access logs) — zero hits.
- **`Math.random()` for security-sensitive values** — only 2 non-crypto uses
  found (`referrals` POST `referral_code`, `referrers` POST id suffix), both
  admin/staff-authenticated marketing/coupon codes with no auth or payout
  value attached — not a real target. Every actual credential (OTP codes,
  session tokens, upload paths, signer tokens) already uses `crypto.randomInt`
  / `randomBytes`.
- **Command injection** — grepped for `child_process`/`exec(`/`new Function(`;
  every hit was `RegExp.prototype.exec()` (regex matching), not shell exec.
  No command-injection surface exists in this codebase.
- **Missing CSP header** — confirmed still absent from `next.config.ts`.
  Already flagged 3x in prior sessions (`w4-broad-hunt-2026-07-15-1738.md`,
  `-2130.md`, `-0044-host-header-origin-fix.md`) with the same reasoning:
  ~20 tenant marketing sites with different third-party script/frame origins
  (Stripe.js, Google Maps, Facebook/Instagram SDK, OAuth callbacks) mean a
  blind CSP add risks silently breaking checkout or an OAuth flow on some
  tenant this sweep didn't sample. Not re-flagging as new — restating only
  because I checked it again and it's still the single known gap, still
  correctly deferred to a dedicated tenant-by-tenant origin audit rather
  than a drive-by header add.

## Result

No new exploitable gap found this pass. This lower-risk surface (webhook
auth, upload paths, OTP flows, checkout amount trust, token entropy, SSRF
guards) is already thoroughly hardened from ~100 prior broad-hunt passes on
this branch. tsc not re-run — no code was changed.
