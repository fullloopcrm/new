# W1 fresh-ground finding: the campaign_recipients-tracking send route has been orphaned since 2026-04-25 — the live "Send" button never populates campaign_recipients at all

Continuation of my own schema+backfill thread from `070_campaign_recipients_resend_tracking_columns.sql` /
`071_campaign_recipients_telnyx_tracking_column.sql` (both file-only, prepared earlier tonight). Those migrations
added the `resend_email_id`/`delivered_at`/`opened_at`/`telnyx_message_id` columns the Resend/Telnyx webhooks
write to, and flagged as a "deliberately deferred follow-up" that `notify.ts`'s email branch never captures/stores
the provider's returned email id, so the join key would stay NULL even with the columns live.

Digging into that follow-up surfaced a much bigger root cause: **the tracked send path those webhooks depend on
isn't just missing a column — it's not wired to the UI at all, and never has been since 2026-04-25.**

## Two independent campaign-send implementations exist; only the untracked one is live

- **`src/app/api/campaigns/[id]/send/route.ts`** — this is the ONLY route the dashboard calls
  (`dashboard/campaigns/[id]/page.tsx:36`, the "Send Now" button → `POST /api/campaigns/${id}/send`). It loops
  `clients`, calls `sendEmail()`/`sendSMS()` directly, and on success only updates `campaigns.status`/`sent_at`/
  `recipient_count`. **It never inserts a single `campaign_recipients` row, never calls `notify()`.**
- **`src/app/api/campaigns/send/route.ts`** — this is the fully-built recipient-tracking implementation: inserts a
  `campaign_recipients` row per client/channel, calls `notify()` per recipient, updates each row's `status` to
  `sent`/`failed`, and has a companion `PUT` (retry failed/pending). This is the ONLY code in the repo that ever
  writes a `campaign_recipients` row. **Nothing calls it.** Grepped the whole app (dashboard, admin, cron, Selena/
  Jefe tool registries) for any fetch/import targeting `/api/campaigns/send` or `campaigns/send/route` — zero
  hits outside the route's own file and one stale line in `admin/docs/page.tsx`'s API reference table.

Confirmed via git history this isn't a recent regression — it's been this way for 3 months: `campaigns/[id]/send/
route.ts` was touched by `74021bfc feat(campaigns): wire panel + send-route consumers` (2026-04-25), which is the
commit that wired the dashboard panel to *this* route. `campaigns/send/route.ts` (the tracked one) has had zero
UI-wiring commits since — it was built, presumably as the intended real implementation, and then orphaned when
the panel got wired to the other one instead.

## Net effect, layered on top of the columns-missing bug already found

1. Every real campaign send via the dashboard creates **zero** `campaign_recipients` rows.
2. `webhooks/resend/route.ts` and `webhooks/telnyx/route.ts` look up `campaign_recipients` by `resend_email_id`/
   `telnyx_message_id` to record delivered/opened/bounced — with no rows ever inserted, these lookups can never
   match anything, independent of the column-missing bug (070/071) fixing this on its own once live.
3. `campaigns.delivered_count`/`opened_count`/`failed_count` (the aggregate recount those webhooks perform) can
   never move off zero for any campaign sent through the live button.
4. Separately, and orthogonally: `dashboard/campaigns/[id]/page.tsx`'s own stat tiles read `campaign.open_count`/
   `campaign.click_count` — column names that don't match the tracked schema at all (`opened_count` is the real
   tracked column per `007_missing_tables.sql`; `open_count` doesn't exist anywhere; `click_count` doesn't exist
   anywhere either, and no click-tracking event is handled by either webhook). Those two tiles have always
   rendered `undefined ?? 0` regardless of anything else here.

## Not fixing blind — this is a decision, not a patch

Both routes have real, non-identical business logic that would need reconciling before either could safely
replace the other:
- `[id]/send` (the live one) enforces `settings.campaign_approval_required` (blocks sending an unapproved campaign
  when the tenant has that setting on) and calls `audit({action:'campaign.sent', ...})`. `send/route.ts` (the
  tracked one) does neither.
- `send/route.ts` supports a `client_ids` allow-list and a `recipient_filter` ('all' vs 'active') read from the
  campaign row; `[id]/send` always sends to every `status='active'` client with no filter option.
- `send/route.ts` requires `campaign.status === 'draft'` to start; `[id]/send` accepts anything except `sending`/
  `sent` (so also `approved`, `scheduled`, etc.) — a real behavioral difference in what counts as sendable.

Swapping the dashboard onto the tracked route (or backporting tracking into the live one) is a real product change
to the one send path every tenant uses, not a narrow bug fix — and needs the 070/071 migration live first regardless,
since writing `resend_email_id` to a column that doesn't exist would error the whole `campaign_recipients` insert.
Flagging for Jeff/LEADER to pick a direction:

- **(a)** Port tracking (recipient-row insert + `notify()` capturing the provider message id, once `notify()`'s
  return type is extended to surface it) into `[id]/send/route.ts`, keep it as the one live route, delete `send/
  route.ts` and its `PUT` retry endpoint (or move the retry logic over too).
- **(b)** Port the missing approval-gate + audit call + `client_ids`/`recipient_filter` support into `send/
  route.ts`, switch the dashboard's `sendCampaign()` to call it instead, delete `[id]/send/route.ts`.
- Either way: fix `[id]/page.tsx`'s stat-tile field names (`open_count`→`opened_count`; drop or genuinely implement
  `click_count`, since no click event is tracked anywhere) as part of the same pass, not left dangling after.

No code changed this pass — this needs a routing decision before any fix would be safe to write, same standard
applied to the `availability.manage_others` dead-permission finding logged earlier tonight (RBAC pass, `2e0f37ea`).
Migrations 070/071 remain prepared file-only, correct and unaffected by this — they're still the right columns to
add regardless of which route ends up canonical.

**Files read, none modified:** `src/app/api/campaigns/[id]/send/route.ts`, `src/app/api/campaigns/send/route.ts`,
`src/app/dashboard/campaigns/[id]/page.tsx`, `src/app/dashboard/campaigns/page.tsx`, `src/lib/notify.ts`,
`src/lib/email.ts`, `src/app/api/webhooks/resend/route.ts`, `src/app/api/webhooks/telnyx/route.ts`,
`src/lib/migrations/007_missing_tables.sql`.
