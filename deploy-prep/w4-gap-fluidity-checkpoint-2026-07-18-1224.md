# W4 gap/fluidity checkpoint — 2026-07-18 12:24

## Closed this pass

- Committed the `portal/messages` legacy non-tenant-bound `client_session`
  fix that was sitting uncommitted since the 12:09 pass (LEADER flagged
  this as the first action of the round). Commit `5de70b50`. See
  `w4-broad-hunt-2026-07-18-1209-portal-messages-legacy-admin-session-fix.md`.
- `the-nyc-marketing-company` contact route: unescaped attacker-controlled
  object *key* injected raw into the notification-email HTML (value on the
  same row was correctly escaped, key was not). Fresh-ground find, not a
  re-flag of the earlier rate-limit pass on this same file. Commit
  `0cdf12a3`. See
  `w4-broad-hunt-2026-07-18-1224-nyc-marketing-contact-key-html-injection-fix.md`.

## Carried-forward aging items (unchanged, still open, not this pass's scope)

- Shared `ADMIN_PASSWORD` login surface still live on 4 public tenant sites
  (`nyc-mobile-salon`, `wash-and-fold-nyc`, `wash-and-fold-hoboken`,
  `the-florida-maid` `/login` pages → global `/api/auth/login` PIN
  fallback). Downstream is dead/orphaned, secret is already documented as
  deprecated. Needs leader/Jeff product call before deletion — unchanged
  since 12:09.
- `platform/CLAUDE.md`'s "Known debt" section is stale (its "~22 cloned
  admin pages" claim for `wash-and-fold-{nyc,hoboken}` no longer matches
  disk). Doc-only fix, unchanged since 12:09.
- `quotes.tiers` no caps (dormant, no frontend writer), service-area zones
  array/label uncapped, `domain-notes` notes/domain uncapped — unchanged
  since 10:59 checkpoint.
- uuid package pinned by `@telnyx/webrtc` npm-audit advisory — unchanged
  since 09:06, deferred to a dedicated session.
- esbuild/postcss npm-audit advisories — dev-only/toolchain-nested,
  unchanged since 09:06.
- Nonce-based production CSP — standing by prior decisions not to ship one
  unilaterally in a broad-hunt pass (needs a dedicated per-tenant
  script/frame/connect-src audit). Unchanged since 11:51.
- `platform/src/lib/migrations/2026_07_18_uploads_bucket_file_size_limit_PROPOSED.sql`
  — awaiting leader/Jeff review + apply. Unchanged since 11:51.

File-only. No push/deploy/DB.
