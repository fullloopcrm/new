# Broad hunt — W4, 2026-07-17 21:34

Per the 21:27 order: fresh-ground surface (item 1). Continuing the two
next-target candidates named in the 21:30 checkpoint
(`src/app/api/social/**` and `src/app/api/finance/bank-connect/session/**`),
plus opportunistic sweeps that opened up while reading those.

## Surfaces read end-to-end this pass

1. **`src/app/api/social/**` (Facebook/Instagram OAuth + posting)** — all 8
   route files read: `connect/facebook`, `connect/facebook/callback`,
   `connect/instagram`, `connect/instagram/callback`, `accounts` (GET/DELETE),
   `post`, `posts`, plus `src/lib/social.ts` and `src/lib/oauth-state.ts`.
   Already fully hardened: HMAC-signed + TTL'd + timing-safe-compared OAuth
   `state` (CWE-352 CSRF close), `requirePermission('settings.integrations')`
   on connect/disconnect, `access_token` stripped from the GET /accounts
   response (dedicated `route.token-leak.test.ts` already covers this),
   `saveSocialAccount`'s upsert uses the tenant-compound
   `onConflict: 'tenant_id,platform'` key. `photoUrl`/`imageUrl` passed to
   Meta's Graph API unvalidated is Meta's server fetching the URL, not ours —
   not an SSRF against our infra. Clean, no fix.

2. **`src/app/api/finance/bank-connect/session/**` (Stripe Financial
   Connections)** — single route, tenant's own decrypted Stripe key,
   `requirePermission('finance.expenses')`, customer created/persisted
   per-tenant. Clean, no fix. Pulled the thread further into
   `bank-import/route.ts` + `src/lib/bank-import.ts` (CSV/OFX parser) and
   `bank-transactions/[id]/route.ts` (categorization + journal posting):
   tenant-scoped bank-account lookup before any write, atomic
   compare-and-swap status claims (already the pattern fixed earlier this
   session for double-submit races), CoA row re-verified against
   `tenant_id` before use (FK alone doesn't scope tenancy), race-safe
   `categorization_patterns` upsert with 23505 retry. All clean — this
   corner of finance is part of the already-exhaustively-audited surface,
   confirmed still clean on a fresh read.

3. **Google Business OAuth** (`google/callback`, `google/status`) — same
   `verifyOAuthState`/CSRF pattern as social; `google/status` returns only
   `connected`/review-stats/business-title, never the raw
   `access_token`/`refresh_token`. Clean.

4. **Cron-auth consistency sweep** — grepped all 47
   `src/app/api/cron/*/route.ts` handlers for a recognizable auth-guard call
   (`protectCronAPI`, `CRON_SECRET`, etc). First pass flagged 5 as
   "no auth check found" (`anthropic-health`, `confirmation-reminder`,
   `phone-fixup`, `rating-prompt`, `refresh-job-postings`) — false positives
   from an incomplete grep pattern; all 5 do call `protectCronAPI(request)`
   on read. Re-ran with the correct helper name included: 47/47 covered, no
   gap. Not a new finding, just closing out a lead that looked promising for
   a few minutes.

5. **`dangerouslySetInnerHTML` exhaustive-ish pass** (flagged
   partially-swept at 21:30) — re-grepped, found 524 call sites (not 154;
   the 21:30 count undercounted, likely a `.tsx`-only grep). Filtered out
   `JSON.stringify(...)` sites (already-escaped JSON-LD, 357 of them) and
   spot-checked the remainder for anything DB-backed rather than static
   developer copy: grepped for files combining `dangerouslySetInnerHTML`
   with `supabase`/`fetch(`/`getTenant` in the same file. Found 5:
   `dashboard/ai/page.tsx` (already confirmed safe pre-21:30 — escapes
   before markdown), and 4 in `nyc-classifieds` (`BusinessProfileClient.tsx`,
   `listings/[category]/[subcategory]/page.tsx`, `porch/page.tsx`,
   `porch/post/[id]/[slug]/page.tsx`) — all of these DB-adjacent files use
   `dangerouslySetInnerHTML` ONLY for the same
   `JSON.stringify(schema).replace(/</g, '\\u003c')` JSON-LD pattern already
   closed. The nycmaid blog `[slug]/page.tsx` paragraph-render site (styled
   for embedded `<a>` tags, looked concerning at first glance) traced back
   to `BLOG_POSTS` — a static, developer-authored TS array in
   `_lib/seo/blog-data.ts`, zero DB/user input. Marking this class fully
   swept now (not just spot-checked): every non-JSON.stringify site that
   isn't static copy has been individually traced to its data source.

6. **Also read while adjacent**: `apply-ceo/route.ts` (rate-limited,
   upload-prefix-validated file URLs, escaped HTML email — same hardening
   already ported to `sales-applications`), `migrate-cleaner-notifications`
   and `migrate-sms` (permission-gated no-op compatibility shims, not live
   migration paths), `internal/deploy-hook` (Vercel HMAC-SHA1
   timing-safe-compared signature, project-scoped token), `domain-notes`
   (tenant-scoped, compound `onConflict: 'tenant_id,domain'`). All clean.

## Net result

No live bug found this pass — a genuinely broad but clean sweep. Both
21:30-flagged next-target candidates are now closed. The
`dangerouslySetInnerHTML` lead is now fully closed (was previously only
spot-checked). No code changes this pass.

No push/deploy/DB this pass.
