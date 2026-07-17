# W4 gap/fluidity — 2026-07-17 12:21

Closing out the leader's 12:16 3-deep queue.

## Item 1 (fresh-ground hunting) — landed

Fresh surface: team-portal messaging/photo-upload (hadn't had a dedicated
pass tonight). `team-portal/photo-upload/route.ts` turned out to already be
correct — it's the PROPOSED/unwired companion route for a not-yet-applied
migration, and already carries this session's URL-prefix-validation pattern
from the video-upload/reviews/team-apps fixes. No action needed there.

`team-portal/messages/route.ts` had a real bug: `resolveThread()` calls both
`comhub_get_or_create_contact_by_phone` and `comhub_get_or_create_thread`
without `p_tenant_id`. Both Postgres functions require it (no `DEFAULT` in
`migrations/2026_05_19_comhub.sql`) — every other call site in the codebase
(`portal/messages`, `admin/comhub/send`, `admin/comhub/voice/dial`,
`webhooks/telnyx-voice`) passes it. Missing it means PostgREST can't resolve
the function signature and errors, which the route silently ignores (only
destructures `data`, never checks `error`). Net effect: any team member with
no pre-existing `comhub_contacts` row (i.e. anyone who hasn't message the
office before under a working code path) gets an empty thread on GET and a
misleading 404 "team member not found" on POST — the team-portal → admin
messaging feature is silently broken for first-time senders. Same bug class
as the telnyx-voice one fixed earlier this session
(`route.rpc-tenant-id.test.ts` already existed there as the regression
pattern) — the existing `messages-authz.test.ts`/`.isolation.test.ts` mocks
ignore RPC params entirely, so they could never have caught this.

Fixed both call sites to pass `p_tenant_id: member.tenant_id`. Added
`team-portal/messages/route.rpc-tenant-id.test.ts`, mirroring the
telnyx-voice regression-lock pattern (mock enforces the real function's
required-arg contract). Verified the new test fails against the un-fixed
code (temporarily reverted, confirmed 2 RPC-arg assertions + the POST
200-vs-404 assertion all fail) and passes with the fix.

## Item 2 (continue the surface) — swept clean, no further landing

Read through the rest of `team-portal/*`: `preferences`, `notifications`,
`connect/unread`, `update-phone`, `config`, `guidelines`, `availability`.
All tenant/member-scoped correctly (`notifications` and `connect/unread`
already carry deliberate scoping comments from prior sessions;
`update-phone` uses a signed token as the auth boundary rather than tenant
scoping, which is correct for its flow). No new bug found — the messages
RPC gap was the finding for this surface.

## Item 3 (this report)

Full suite: 564 files, 2078 passed / 1 failed (pre-existing, documented
intentional-RED `cron/tenant-health/status-coverage-divergence.test.ts`,
unrelated to this change) / 1 expected-fail / 1 skipped. `npx tsc --noEmit`:
same 2 pre-existing unrelated failures as every prior report this session
(`bookings/broadcast/route.xss.test.ts` mock typing,
`sunnyside-clean-nyc/_lib/site-nav.ts` import mismatch), no new errors.

Standing pending-approval queue unchanged (file-only, awaiting Jeff's
go-ahead on prod DDL, not re-listed in full — see each file):
- `2026_07_16_referrer_total_earned_atomic_bump_PROPOSED.sql`
- `2026_07_16_referrer_total_paid_atomic_bump_PROPOSED.sql`
- `2026_07_13_journal_entries_dedup_constraint_PROPOSED.sql`
- `2026_07_13_rls_pass3_tenant_policies_PROPOSED.sql` /
  `..._pass4_...sql`
- `2026_07_17_accounting_periods_audit_trigger_PROPOSED.sql`

No push, no deploy, no DB write this pass.
