# team-portal/connect POST channel_id IDOR — W4, 2026-07-15

File-only. Continuation of the broad-hunt order (19:44 LEADER->W4).

## The gap

The prior pass (`deploy-prep/w4-broad-hunt-2026-07-15-2337.md`) fixed the
identical bug in `portal/connect` (client-side) but explicitly noted its
sibling `team-portal/connect` suite was "untouched, not part of this fix."
Checked it this pass — same bug class, present.

`POST /api/team-portal/connect` accepted a caller-supplied `channel_id` and
used it directly as the insert target for `connect_messages` with
`sender_type: 'team'`. `tenantDb(auth.tid)` stamps `tenant_id` on the insert,
so this can't cross a tenant boundary, but within a tenant a team member
(field-staff auth, the lowest-trust credential tier in this app — `role`
defaults to `'worker'`) who obtains another channel's UUID (a `'client'` DM
channel, a `'referrer'` channel — schema in `migrations/connect-chat.sql`
allows both) could inject a message into it, impersonating team
communication to a client or referrer they aren't assigned to.

The only real caller, `src/app/team/connect/page.tsx`, always echoes back
the `channel_id` from its own prior GET response (the single per-tenant
`'general'` channel) — so only an off-path/forged request is affected, same
as the portal/connect case.

## Fix

`src/app/api/team-portal/connect/route.ts` — when `channel_id` is supplied
in the POST body, verify it resolves to the tenant's `'general'`-type
channel (`tenantDb(auth.tid).from('connect_channels').eq('id', targetChannelId).eq('type','general').single()`)
before using it; return 403 if not found. Team members only ever legitimately
post to the shared general channel (unlike clients, which have a dedicated
per-client channel), so the check is scoped to `type: 'general'` rather than
an owner-id match.

## Verification

- `npx tsc --noEmit` clean.
- Existing `src/app/api/team-portal/connect/route.tenantdb.test.ts` (2 tests)
  passes unchanged.
- Confirmed via grep that `src/app/team/connect/page.tsx` is the only
  frontend caller and only ever sends its own resolved general-channel id.

File-only, no push/deploy/DB.
