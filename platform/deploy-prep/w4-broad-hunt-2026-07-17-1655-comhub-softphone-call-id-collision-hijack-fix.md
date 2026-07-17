# W4 broad hunt — 2026-07-17 16:55

Queue (16:30 LEADER order, 3-deep, file-only, no push/deploy/DB each):
(1) new fresh-ground surface
(2) continue whichever surface (1) opens up
(3) keep gap/fluidity current

## Surface selection

Prior checkpoint (`w4-broad-hunt-2026-07-17-1650-gap-fluidity-checkpoint.md`)
flagged `src/components/**` (163 files) as untouched-and-plausible, called
out specifically for "direct browser-side Supabase calls bypassing expected
server checks." Walked it: `grep -rl supabase src/components` turned up 4
hits, 3 of which are marketing copy mentioning the word "Supabase" as a tech
stack item (harmless). The 4th, `VideoUpload.tsx`, uses a server-issued
signed URL (not a client Supabase key) — clean, and its server route
(`/api/team-portal/video-upload`) was already fixed this session
(`w4-team-portal-video-upload-url-injection-fix.md`).

That dead-ended, so widened to the `comhub` (admin messaging/voice hub)
surface the softphone components call into — `src/app/api/admin/comhub/voice/**`.
The prior 05:00 IDOR sweep only explicitly checked `voice/token`; `dial`,
`active`, `cleanup`, `presence`, `settings`, and `log-softphone-call` had
never been individually read.

## CLOSED — cross-tenant call-row hijack via customer_call_id collision

`POST /api/admin/comhub/voice/log-softphone-call`'s `'started'` lifecycle
branch did:

```ts
await supabaseAdmin.from('comhub_active_calls')
  .upsert({ tenant_id: tenantId, customer_call_id: body.telnyx_call_id, ... },
           { onConflict: 'customer_call_id' })
```

`comhub_active_calls.customer_call_id` is `TEXT NOT NULL UNIQUE` —
**table-wide**, not compound with `tenant_id`
(`migrations/2026_05_19_comhub.sql:141`). Supabase-js upsert can't attach an
extra `WHERE tenant_id = ...` to the `ON CONFLICT` target, so this upsert
will happily overwrite ANY existing row that shares the same
`customer_call_id`, regardless of which tenant owns it.

`body.telnyx_call_id` is the softphone's client-side `call.id`
(`Softphone.tsx:402`), submitted over a plain authenticated-admin POST with
no server-side proof it corresponds to a real, currently-active Telnyx call
for the caller's own tenant. An admin of Tenant B who submits a
`telnyx_call_id` that collides with a row Tenant A currently owns —
whether guessed, replayed, or leaked out-of-band — overwrites that row's
`tenant_id`, `thread_id`, `contact_id`, `customer_phone`, and
`initiated_by_admin_id`, hijacking Tenant A's in-progress call thread
(the `answered`/`ended` lifecycle updates that follow are already correctly
tenant-scoped via `.eq('tenant_id', tenantId)` — only the initial upsert
was exposed).

This is the same threat model the codebase already treats as real: the
sibling `voice/control` route's own regression test (added earlier this
session, see its docstring) explicitly defends against "an admin who
obtained another tenant's call_control_id (e.g. a value that leaked
out-of-band)." Same class of gap, different route.

**Fix**: before the upsert, look up any existing row for that
`customer_call_id`; if one exists and belongs to a different tenant,
reject with 409 instead of overwriting. Same-tenant re-submission (e.g. a
reconnect re-firing the `'started'` event) still upserts normally.

## Verification

- New `src/app/api/admin/comhub/voice/log-softphone-call/route.test.ts`
  (3 tests). RED-confirmed via `git apply -R` on the route change only —
  the collision test failed (`200` instead of `409`, upsert fired) proving
  the hijack path was real → GREEN after re-applying the fix.
- `npx vitest run src/app/api/admin/comhub`: 6 files / 20 tests green
  (includes the sibling `voice/control` suite, unaffected).
- `npx tsc --noEmit`: same 2 pre-existing unrelated errors as every prior
  report this session (`bookings/broadcast/route.xss.test.ts` ordering-flake,
  `sunnyside-clean-nyc/_lib/site-nav.ts` type-only export mismatch).

## Continuation on the same surface (item 2)

Read the remaining unread `comhub/voice/*` routes:

- `dial/route.ts` — admin-gated, tenant-scoped `resolveTenantVoiceConfig`,
  outbound call target validated, no cross-tenant write path. Clean.
- `active/route.ts` — read-only `select` filtered `.eq('tenant_id', tenantId)`.
  Clean.
- `cleanup/route.ts` — already flagged in the `control` route's own comment
  as "unwired dead code" that doesn't call Telnyx; confirmed unreferenced
  by any cron/route caller via `grep -r "voice/cleanup"`. Not a live path,
  no action needed (dead-code note, not a fix).
- `presence/route.ts` — upserts `onConflict: 'admin_id'`, and
  `comhub_admin_presence` is also only `PRIMARY KEY (admin_id)` (not
  compound with `tenant_id`) — same shape as the bug above at first glance.
  But here `admin_id` comes from `getActiveAdminMemberId(tenantId)`,
  resolved server-side from the caller's own session, never from the
  request body — there's no client-controlled value that could collide
  with another tenant's row. Clean, but for a different reason than
  `log-softphone-call`; worth remembering this distinction (client-supplied
  vs. server-derived collision key) if another `onConflict` on a
  non-tenant-scoped unique column turns up elsewhere.
- `settings/route.ts` — same `onConflict: 'admin_id'` upsert shape as
  `presence`, same reason it's safe: `admin_id` is server-derived via
  `getActiveAdminMemberId(tenantId)`, never taken from the request body.
  Clean.

`comhub/voice/**` is now fully swept. The one real gap (customer_call_id
global-unique collision) is closed.

No push/deploy/DB. File-only.
