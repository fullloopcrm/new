# Gap/fluidity checkpoint — W4, 2026-07-17 14:40

Per 14:14 order item 3. File-only, no push/deploy/DB.

## This pass

1. **New fresh-ground surface: `cron/*` full read.** Found + fixed
   `cron/backup` stamping its nightly platform-wide summary onto an
   arbitrary real tenant (`tenants[0]`) — cross-tenant content leak
   (other tenants' slugs/errors) plus a permanent phantom unread badge on
   that innocent tenant (`sidebar-counts` has no `recipient_type` filter,
   unlike the bell endpoint). Switched to `alertOwner()`, matching every
   sibling cron job's platform-alert convention. RED→GREEN mutation-verified.
   Commit 2a283908.
2. **Surface continuation: re-grepped the rest of `cron/*` for the same
   `tenants?.[0]` shape** (zero other hits — confirmed this class is now
   closed) **and, while reading each file, caught 4 routes the earlier
   41-site timing-unsafe-compare sweep missed** (`jefe-heartbeat`,
   `comms-monitor`, `health-monitor`, `recurring-expenses`) — all still
   used plain `!==` against `CRON_SECRET`. Fixed with the same
   `safeEqual()` swap, no-new-tests per that sweep's own established
   precedent (behavior-preserving, no prior route tests on any of the 41).
   Commit 1064a04b.
3. This checkpoint.

## Surfaces surveyed this pass and confirmed clean (no fix needed)

- `leads/block`, `leads/verify` — same single `leads.view` permission gates
  all of `leads/*` (feed/domains/attribution/override/visits already have
  gate tests); confirmed this is the app's deliberate single-permission
  model for the whole leads module, not a naming-implies-narrower-scope bug.
- `ingest/lead`, `ingest/application` — both already hardened (timing-safe
  shared-secret compare, tenant-scoped, exact-not-substring phone dedup,
  `photo_url` scheme validation, `escapeHtml`'d email template rows).
- `test/email-selena` (+ `cleanup`), `test-emails` — all fail-closed on
  unset token / permission-gated, tenant-scoped.
- `unsubscribe` — signed HMAC token, `timingSafeEqual`, tenant-scoped.
- `admin/tenant-chats` + `dashboard/messages` (platform ↔ owner messaging) —
  correctly gated (`requireAdmin` / owner-only role check), tenant-scoped
  both directions; existing owner-only test file confirms.
- `google/auth` → `google/callback` OAuth flow — signed, HMAC+expiry+
  `timingSafeEqual` state param (explicit CWE-352 comment), tenant id comes
  only from the caller's own authenticated session, never user input.
- `social/*` connect/callback routes — already carry dedicated
  `route.token-leak.test.ts` + callback tests from a prior pass.
- `admin/cleanup-test-bookings` — re-confirmed the already-documented (not
  fixed, Jeff's call pending) generic-name-collision data-loss risk from
  `deploy-prep/w4-broad-hunt-2026-07-16-0730-...md` is still open and
  unresolved; did not re-litigate since it's already correctly flagged as a
  product-tradeoff decision, not a fresh finding.
- `cron/cleanup-videos`, `cron/email-monitor` — read in full; both correct
  (dispute-flag skip, `tenant_id: null` for the platform-heartbeat marker
  which is the SAFE version of the pattern `cron/backup` got wrong).

## Aging items still open (from prior passes, re-confirmed present, not
## re-litigated this pass)

- `create-tenant-from-lead.ts`'s missing atomic claim on
  `converted_tenant_id` — PROPOSED migration still unapplied, now 24h+
  stale, highest real-money blast radius of any pending migration
  (surfaced to Jeff via `JEFF-MORNING-QUEUE.md`, per 14:14 leader note).
- `admin/cleanup-test-bookings` name-collision risk (above).

## Next-target candidates if continuing `cron/*`

Not yet read this session: `cron/comhub-email` (317 lines, partially
touched by the 41-site sweep for its dual header/query auth — worth a full
read, not just the auth line), `cron/outreach`, `cron/refresh-job-postings`,
`cron/sales-follow-ups`, `cron/sync-google-reviews`.

No push/deploy/DB write this pass.
