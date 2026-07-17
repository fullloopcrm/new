# yinez_memory self-review insert: write-side tenant-tag gap closed

**Author:** W4 · **Date:** 2026-07-17
**Trigger:** LEADER 13:43 order queue item (2): fresh-ground hunting on a new
surface, after closing the sms/webhooks siblings of the P2 tenant_id-stamping
class (item 1 this round).

## How this was found

Read `migrations/2026_05_09_tenant_id_core.sql` — the same migration behind
the `sms_conversation_messages` DEFAULT-to-nycmaid gap fixed across this
session — and confirmed it applies the identical pattern (NOT NULL + DEFAULT
nycmaid's UUID, "rollout safety net") to **57 tables**, not just
`sms_conversation_messages`. Grepped every insert site against that table
list, checking each payload for a stamped `tenant_id`. Nearly all were
already correct (comhub_* subsystem, deal_activities, campaign_recipients,
client_contacts, email_logs, etc. all stamp tenant_id from data already in
scope). One real gap found: `yinez_memory` in
`src/lib/nycmaid/conversation-scorer.ts`.

## The gap

`selfReviewConversation(conversationId)` — called unconditionally from the
**shared, multi-tenant** `/api/yinez` route
(`src/app/api/yinez/route.ts:141-142`) whenever a booking is created, not
just for the nycmaid tenant — already loads the conversation's own
`tenant_id` (`select('outcome, name, tenant_id')`, used to resolve the
tenant's own Anthropic key via `resolveAnthropic`), but never carried that
value onto the `yinez_memory` insert. The insert fell back to
`yinez_memory`'s column `DEFAULT` (nycmaid's UUID), mis-tagging every OTHER
tenant's self-review record as nycmaid's.

Confirmed the sibling `@/lib/conversation-scorer.ts` (used by the
tenant-scoped `admin/selena/score/route.ts`) already does this correctly —
`tenant_id: tenantId` on its `selena_memory` insert — so this was an isolated
gap in the nycmaid-legacy copy, not a systemic miss.

Read-side confirms the exposure: every `yinez_memory` read
(`selena/agent.ts:337,353`, `selena/tools.ts:384,500,514`) is
`.eq('tenant_id', tenantId)`-scoped. Effect for any tenant other than
nycmaid: their self-review memory is silently invisible to their own agent
context and to Jeff's `recall` tool when scoped to their tenant (self-
visibility bug, same shape as the sms_conversation_messages sibling). Live
cross-tenant disclosure risk is narrow today — the mis-tagged row's
`client_id` belongs to the foreign tenant, so it won't coincidentally match
a real nycmaid client in the per-client `recall` read, and `type:
'self_review'` isn't in the `['lesson','rule','instruction']` set the
global-lessons read surfaces — but it's still real data-integrity corruption
sitting in nycmaid's rows, and would become a bigger problem the moment
nycmaid's own client ids happen to collide (they can't, UUIDs) or the global
read set is ever widened to include `self_review`.

## Fix

`src/lib/nycmaid/conversation-scorer.ts` — `selfReviewConversation` now
stamps `tenant_id: (convo?.tenant_id as string) || NYCMAID_TENANT_ID` on the
`yinez_memory` insert, reusing the `convo` row already loaded earlier in the
function (no extra query). Imported the shared `NYCMAID_TENANT_ID` sentinel
from `@/lib/nycmaid/tenant` for the legacy-null-row fallback, matching the
pattern already used in `selena/core.ts`'s `handleReportIssue` /
`handleRemember`.

## Verification

- New regression test
  `src/lib/nycmaid/conversation-scorer.msg-tenant-tag.test.ts` asserts the
  `yinez_memory` insert carries the conversation's real `tenant_id`, not the
  DEFAULT.
- Mutation-verified: reverted the source fix only (test untouched) via
  `git diff` / `git apply -R`, confirmed RED
  (`expected undefined to be 'tenant-msg-tag'`), restored via `git apply`,
  confirmed GREEN.
- Full suite for the new test plus `api/yinez/` and `api/admin/selena/score/`
  (which exercise the sibling tenant-scoped scorer): 4 files / 10 tests, all
  green.
- `npx tsc --noEmit`: clean except the same 3 pre-existing, unrelated
  baseline errors called out in every prior W4 report this session
  (`bookings/broadcast/route.xss.test.ts` mock-typing issue,
  `sunnyside-clean-nyc/_lib/site-nav.ts` export-name mismatch).

## Surveyed and found clean (no action needed)

Line-read every non-cron, non-single-tenant-legacy insert site for the
other 56 tables in the migration's `scoped_tables` list. All already stamp
`tenant_id` from data resolved in scope at the call site:

- `comhub_*` subsystem (active_calls, mentions, messages, missed_call_sms,
  softphone_calls) — every insert site across
  `admin/comhub/voice/dial`, `admin/comhub/voice/log-softphone-call`,
  `admin/comhub/send`, `admin/comhub/email/backfill`,
  `admin/comhub/yinez/send`, `cron/comhub-email`, `webhooks/telnyx-voice`.
- `deals` / `deal_activities`, `campaign_recipients`, `client_contacts`,
  `client_reviews`, `email_logs`, `referral_commissions`,
  `unmatched_payments`, `schedule_issues` — all carry `tenant_id` explicitly
  or via a `tenantDb(tenantId)` wrapper.
- `sms_conversation_messages` write-side sweep (this session's items 1 +
  prior chat/yinez fix): confirmed zero remaining unstamped insert sites in
  production code — `portal/collect/route.ts` and
  `lib/selena-legacy-email.ts` both already stamp `tenant_id`; the
  `test/email-selena` diagnostic-only harness (404s unless
  `SELENA_TEST_TOKEN` is set) also stamps it correctly.
- `yinez_memory`'s other two insert sites (`selena/core.ts:1628,1840`,
  `handleReportIssue`/`handleRemember`) already resolve and stamp tenant_id
  from the conversation row with the same nycmaid fallback pattern applied
  here.

`notifications`, `admin_tasks`, `error_logs`, `sms_logs` have many call
sites; spot-checked a representative sample of each (webhooks/stripe,
email/monitor, error-tracking.ts, cron/payment-followup-daily) — all
tenant-scoped. Did not line-audit every one of the ~90 remaining
`notifications` insert call sites individually; cron-job sites already
carry an explicit `// tenant-scope-ok: cron job runs platform-wide by
design` annotation from prior sweeps.

## Not touched (standing rules)

File-only + code fix in this worktree; no push/deploy/DB migration. No prod
writes.
