# W4 gap/fluidity checkpoint — 2026-07-18 11:36

## Closed this pass

- 11:22 checkpoint's aging item ("`GET /api/availability` is public+unauthenticated
  with zero rate limit, scriptable for tenant-slug enumeration") — fixed, plus its
  undiscovered sibling `GET /api/client/availability`. See
  `w4-broad-hunt-2026-07-18-1133-public-availability-rate-limit-fix.md`.

## Carried-forward aging items (unchanged, still open, not this pass's scope)

- `finance/cash-flow` partial-payment-double-count regression — 2 failing tests,
  unowned by this lane, reproduced in isolation every checkpoint since 10:08
  (7th+ reproduction this session). Still needs an owner.
- `lead-media/signed-url` + `team-portal/photo-upload` upload-size enforcement gap
  (opened 08:48 checkpoint) — documented, no live consumer to hook a fix into yet.
- Bucket-level Supabase `fileSizeLimit` on `uploads` — prod-infra recommendation
  for leader/Jeff, not applicable from this worktree (opened 08:48 checkpoint).
- `quotes.tiers` no caps (dormant, no frontend writer), service-area zones
  array/label uncapped, `domain-notes` notes/domain uncapped — all low-severity,
  authenticated+own-tenant-only, opened 10:59 checkpoint, unchanged.
- uuid package pinned by `@telnyx/webrtc` needs a major SDK bump to clear its
  npm-audit advisory — flagged 09:06, deferred to a dedicated session given how
  much voice-calling hardening has landed this session.
- esbuild/postcss npm-audit advisories — dev-only/toolchain-nested, no
  non-breaking fix available, unchanged since 09:06.

## New aging items opened this pass

None. The one item opened was closed in the same pass (fresh-ground item was the
aging item itself).

## No new gaps found this pass in adjacent territory

Investigated and confirmed clean (not gaps, no action needed):
`GET /api/referrers/[code]` (session-token gated via `getReferrerAuth`, not a
gap), `tenant/public`, `tenants/public`, `territories/options`, `service-types`,
`tenant-sitemap` (all public-metadata-only, no PII/financial data, and
`tenant-sitemap` needs to stay crawlable), every `cron/*` GET route (all
`CRON_SECRET`-gated), every `team-portal/*` GET route (all Bearer-token gated).

File-only. No push/deploy/DB.
