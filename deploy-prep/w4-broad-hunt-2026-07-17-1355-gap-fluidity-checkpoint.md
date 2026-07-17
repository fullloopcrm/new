# W4 gap/fluidity — 2026-07-17 13:55

Queue (13:43 LEADER order, 3-deep, file-only, no push/deploy/DB):
(1) sweep sms/route.ts + webhooks/telnyx + webhooks/telegram (x2) for the
    same P2 tenant_id-stamping class as chat/yinez/admin-chat
(2) continue fresh-ground hunting on a new surface after that
(3) keep gap/fluidity current

This file is (3). Full detail in
`w4-sms-webhooks-tenant-tag-writeside-fix.md` (item 1) and
`w4-yinez-memory-self-review-tenant-tag-fix.md` (item 2).

## This pass — 2 closed

- **CLOSED (item 1)**: `sms_conversation_messages` write-side
  tenant-tagging gap closed on the 4 files flagged out-of-scope by the
  prior chat/yinez sweep — `sms/route.ts` (1 site), `webhooks/telnyx`
  (4 sites), `webhooks/telegram` platform-owner + per-tenant (2 sites
  each). 9 insert sites total, `2bac5a01`.
- **CLOSED (item 2, new surface)**: same bug CLASS, one level up — read
  the migration behind this whole pattern
  (`2026_05_09_tenant_id_core.sql`) and found it applies the identical
  NOT-NULL-plus-DEFAULT-nycmaid "rollout safety net" to **57 tables**, not
  just `sms_conversation_messages`. Audited every insert site against that
  full table list. Found one real gap: `yinez_memory` in
  `nycmaid/conversation-scorer.ts`'s `selfReviewConversation` — called
  from the shared multi-tenant `/api/yinez` route on every booking, not
  just for nycmaid — already loaded the conversation's own `tenant_id` but
  never carried it onto the insert. Fixed, `7484315a`.

## Surface status: tenant_id-DEFAULT write-side class — now believed closed

Everything else checked against the 57-table list came back clean —
comhub_* (5 tables, ~15 insert sites across 7 files), deals/deal_activities,
campaign_recipients, client_contacts, client_reviews, email_logs,
referral_commissions, unmatched_payments, schedule_issues all already stamp
tenant_id from data in scope. `sms_conversation_messages` and `yinez_memory`
(this session's finds) are the only two gaps this class has produced across
the whole tracker. Full survey detail + what was/wasn't individually
line-audited (notifications/admin_tasks/error_logs/sms_logs — spot-checked,
not exhaustively) is in `w4-yinez-memory-self-review-tenant-tag-fix.md`'s
"Surveyed and found clean" section. Recommend this specific bug class is
DONE — a future pass should pivot to a genuinely different surface rather
than re-scanning the same table list.

## Verification

- `npx tsc --noEmit`: same 3 pre-existing unrelated failures as every prior
  report this session (`bookings/broadcast/route.xss.test.ts` mock-typing,
  `sunnyside-clean-nyc/_lib/site-nav.ts` export-name mismatch).
- `npx vitest run` on all touched directories: 18 files, 39 tests, green
  (14 files/29 tests for sms+webhooks/telnyx+webhooks/telegram, 4
  files/10 tests for the yinez_memory fix + its two callers).
- Both fixes mutation-verified (RED before, GREEN after) via `git diff` /
  `git apply -R` — worker `git stash` stays blocked across worktrees
  sharing one `.git`.
- No push, no deploy, no DB write this pass. 2 commits (`2bac5a01`,
  `7484315a`).
