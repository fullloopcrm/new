# W2 — 2026-07-18 11:15 — live-feed + social-connect permission gaps, social/post cap

## (1) New fresh-ground surface

Re-ran the broad-hunt grep (every `api/**/route.ts` calling
`getTenantForRequest`/`tenantDb` with no `requirePermission`/
`hasPermission` gate, cross-referenced against `rbac.ts`) — ~55 raw hits.
Most were false positives: already gated by `requireAdmin()` (a stricter,
different gate — platform-admin cookie, not tenant-role RBAC — e.g.
`admin/comhub/threads`, `admin/comhub/contacts/[id]/*`) or webhook/cron
routes correctly ungated by design (signature- or cron-secret-verified,
not tenant-session auth).

**P94 — `GET /api/admin/analytics/live-feed`** (visitor tracking: page,
referrer, device, time-on-page off `lead_clicks`) called only
`getTenantForRequest()` — any authenticated tenant role. Its sibling on
the same table, `GET /api/leads/feed` (already fixed a prior round), gates
behind `requirePermission('leads.view')` (owner/admin/manager, not
staff). No live frontend caller was found anywhere in `app/` — same
"fully executes for any authenticated tenant member, not wired to a live
caller" shape as P83/P89/P90/P91. Fixed: `requirePermission('leads.view')`,
matching `leads/feed`.

## (2) Continuation — same class, different shape

**P95 — `GET /api/social/connect/{facebook,instagram}`** (Meta OAuth
authorize step). Continuing down the same raw-hit list, found the
sibling `DELETE /api/social/accounts` (disconnect) already gates behind
`requirePermission('settings.integrations')` — owner-only by default,
not even admin. The two connect/authorize routes had zero gate, and
unlike P94 this one has a live wired-up caller:
`dashboard/social/page.tsx`'s "Connect" button, itself ungated
client-side. The OAuth callback can't re-check role (it authenticates
purely via the signed `state` minted by the authorize step — a redirect
flow with no session), so the authorize route was the *only* place a
role gate could exist. Connecting is the more dangerous half of the
connect/disconnect pair — any authenticated tenant member, including
staff, could authorize with their own personal Facebook/Instagram
account and have it bound as the tenant's integration. Fixed:
`requirePermission('settings.integrations')` on both, matching the
DELETE.

While confirming the write path for P95, read `lib/social.ts`'s
`postToFacebook`/`postToInstagram` and found the neighboring
`POST /api/social/post` (already gated at `campaigns.send`, so this is a
validation gap, not a permission one) forwards `message`/`caption`
straight to Meta's Graph API and, via `social_posts.content`, into a DB
text column with **zero type check or length cap** — same class as the
`invoices.void_reason` / `accounting_periods.notes` gaps fixed in prior
gap/fluidity rounds. `photoUrl`/`imageUrl` equally uncapped. Fixed:
`capString(message/caption, 5000)`, `capString(photoUrl/imageUrl, 2000)`
at the route boundary (truncates, matching the established free-text-cap
convention); a non-string `message`/`caption` now resolves to `null` and
hits the existing "required" 400 instead of being forwarded raw.

## (3) Gap/fluidity — carried-forward list

- `dashboard/messages` (owner's platform-support inbox) and
  `dashboard/comms-preview` (brand-preview dev tool) are also
  `getTenantForRequest()`-only with no `requirePermission` gate, but
  neither has a sibling endpoint establishing a role-differentiated
  permission for the same action — both read/render only the caller's
  own tenant data. Left untouched, flagged for a future round in case a
  reason surfaces to narrow them.
- The broader `_reason`/free-text-cap sweep (closed as a class two rounds
  ago per `w2-reason-field-cap-plus-mass-sms-caps-2026-07-18-0925.md`) is
  still confirmed dry outside of what P95's neighbor turned up — this
  round's `social/post` fix was a one-off found by proximity, not a new
  systemic sweep. A genuinely fresh `capString` audit (~200 raw
  `.update()`/`.insert()` route.ts hits with no `capString` reference,
  most legitimately not needing one) would need its own dedicated round
  to triage properly rather than a shallow pass squeezed into this one —
  flagging as the next gap/fluidity-lane candidate rather than
  half-auditing it here.
- Resolver lane (this worker's primary ownership per the standing brief):
  untouched again this round — still confirmed dry (5+ consecutive
  rounds now).

## Verification

- P94: 1 new test file (`route.rbac.test.ts`, 4 tests). RED/GREEN via
  `git diff` + `git apply -R` (worktree `git stash` is hook-blocked —
  shared `.git` dir across 4 worker worktrees).
- P95: 2 existing OAuth-state test files updated (role/tenantId mock
  shape) + 7 new permission-probe tests across both files. RED/GREEN
  confirmed (4 new probes went 200 pre-fix).
- social/post cap: 1 new test file (`route.post-text-cap.test.ts`, 5
  tests). RED/GREEN confirmed (4 of 5 probes wrong pre-fix).
- `npx tsc --noEmit`: clean after each change.
- Full suite, cumulative: 781/781 files, 3397/3434 tests passed, 37
  pre-existing skipped, 0 regressions (started round at 779/3418).
- `npm run audit:tenant`: same 4 pre-existing findings every round
  (`tenant-lookup.ts:214`, `tenant.ts:338` domain-lookup queries,
  `cron/recurring-expenses` intentional fan-out,
  `route.entity-insert-error.test.ts` JSDoc false-positive), none new.
- 3 commits (P94 fix cc571748 + docs ff1261cd, P95 fix b3e0286b, social/post
  cap fix 7fc019b3), file-only, no push/deploy/DB.
