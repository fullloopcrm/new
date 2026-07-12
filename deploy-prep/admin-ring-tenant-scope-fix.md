# ADMIN_RING tenant-scoping fix (W4, branch p1-w4)

## Bug (MED, now fixed on branch — not yet merged/deployed)

`platform/src/app/api/webhooks/telnyx-voice/route.ts`: after a7614f7 fixed
tenant resolution for the DB writes (`comhub_active_calls`, `comhub_messages`,
etc.), `buildRingTargets()` still had two global (nycmaid-only) leaks:

1. `comhub_admin_presence` (online softphones) was queried with **no**
   `tenant_id` filter — any tenant's online admin softphone could ring for
   any other tenant's inbound call.
2. PSTN fallback numbers came from a single global env var
   (`ADMIN_RING_LIST` / `ADMIN_FORWARD_PHONE`), so every tenant with no
   online softphone rang the same hardcoded (nycmaid) cell numbers,
   regardless of which tenant's DID the customer actually dialed.
   `VOICEMAIL_NOTIFY_PHONE` had the identical bug (derived from
   `ADMIN_RING_LIST[0]`) for the "new voicemail" SMS alert.

## Fix

- `buildRingTargets(tenantId)` now takes the resolved tenant and filters
  `comhub_admin_presence` by `tenant_id`.
- PSTN fallback numbers are now sourced per-tenant from
  `comhub_admin_voice_settings.fallback_cell_phone` (the same table/column
  the existing `/admin/comhub/voice/settings` UI already writes to — it was
  defined but never actually read by the ring logic).
- `notifyVoicemailToAdmin(tenantId, ...)` resolves the same way instead of
  the global env var.
- The `ADMIN_RING_LIST` / `ADMIN_FORWARD_PHONE` / `VOICEMAIL_NOTIFY_PHONE`
  env vars are no longer read anywhere in this route.
- Regression test: `route.admin-ring-scope.test.ts` (3 cases) proves a call
  resolved to tenant-A never dials/transfers to tenant-B's SIP address or
  cell, even when tenant-B has both configured and tenant-A has neither
  (falls through to voicemail instead of leaking cross-tenant).
- `tsc --noEmit` clean; full `telnyx-voice/` suite (13 tests, 3 files)
  passes.

## Operational note for leader/Jeff before this deploys

No DDL needed — `comhub_admin_voice_settings` and `comhub_admin_presence`
already have `tenant_id`. This is a **behavior change**, not just a bugfix:

- Any tenant (including nycmaid) that relied on the global
  `ADMIN_RING_LIST` env var for PSTN fallback will get **voicemail only**
  after this deploys until an admin sets their cell number via
  `/admin/comhub/voice/settings` (`fallback_cell_phone`), which upserts
  into `comhub_admin_voice_settings`.
- Action needed before/at deploy: confirm nycmaid's admin(s) have
  `fallback_cell_phone` set in that table (via the Settings UI, or ask
  Jeff to set it there) — otherwise nycmaid inbound calls with no admin
  softphone online will silently go straight to voicemail with no ring,
  same as any other tenant.
- Not fixed here (separate, smaller issue, flagged not touched): the
  voicemail SMS body still hardcodes `https://www.thenycmaid.com/admin/...`
  as the thread link for every tenant. Out of scope for this fix.
