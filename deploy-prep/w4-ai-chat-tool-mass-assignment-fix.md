# W4 — AI-chat tool `updates` mass-assignment hardening (fixed)

**Date:** 2026-07-15 22:09 order
**Branch:** p1-w4

## Finding

Continuing the broad-hunt on lower-risk surface, following the same class of
bug just fixed in `1bf9c5c4` (admin/announcements PUT mass assignment).
Swept every `.update(<object>)` call site across `src/app/api` for
un-allow-listed writes. All REST routes were already properly allow-listed
(`invoices/[id]`, `quotes/[id]`, `deals/[id]`, `finance/entities/[id]`,
`documents/[id]`, `routes/[id]`, `admin/tenants/[id]`,
`admin/businesses/[id]`, `admin/users/[id]`, `admin/prospects/[id]`, etc. —
all build `updates` via an explicit field list, no gap).

Two files stood out as different in kind: the two AI-tool-calling chat
endpoints, `src/app/api/admin/ai-chat/route.ts` and
`src/app/api/ai/assistant/route.ts`. Both let Claude call `update_bookings`
and `update_client` tools, and both passed the tool call's `input.updates`
object straight to `supabaseAdmin.from(...).update(updates)` with **no
server-side field filtering** — the only constraint was the tool's declared
`input_schema.properties` list (e.g. `team_member_id, status, price, notes,
start_time, end_time, payment_status, payment_method` for bookings).

That schema is a hint to the model, not an enforced contract: Anthropic's
tool-use API does not reject extra JSON keys the model includes beyond what
`properties` declares (no `additionalProperties: false` equivalent
enforced server-side here). Both endpoints feed prior tool results — which
include client-supplied free text (`clients.notes`, `bookings.notes`,
addresses, etc., reachable from public booking/lead forms) — back into the
same LLM context window that later decides what to pass to `update_bookings`
/ `update_client`. A prompt-injection payload planted in a client's stored
notes could in principle steer a later tool call to include out-of-schema
keys (`tenant_id`, `id`, `client_id`, `team_member_pay`, `hourly_rate`,
etc.), which would have passed straight through to the `.update()` call
before this fix — e.g. reassigning a booking's `tenant_id` and effectively
transplanting/leaking it into a different tenant's data.

Both endpoints already had (and still have — untouched) the per-tool RBAC
gate (`TOOL_PERMISSIONS` + `hasPermission(ctx.role, ...)`) that a prior
session added specifically to stop a low-privilege tenant member from using
the chat widget to bypass the REST API's `bookings.edit`/`clients.edit`
permission checks — confirmed that gate is intact and unaffected by this
change. This fix is a different, narrower issue: it closes the "what
keys can land in the SET clause" gap for a caller who already has the
required permission (or an injected model output), not an authz bypass.

## Fix

Reused the existing `pick()` allow-list helper from `@/lib/validate`
(already used by `settings/services/[id]` and the codebase's other
allow-listed PUT routes) in both files:

- `admin/ai-chat/route.ts`: `update_bookings` now does
  `pick(input.updates, BOOKING_UPDATE_FIELDS)`; `update_client` does
  `pick(input.updates, CLIENT_UPDATE_FIELDS)`. Field lists mirror each
  tool's own declared `input_schema` exactly (booking: `team_member_id,
  status, price, notes, start_time, end_time, payment_status,
  payment_method`; client: `name, email, phone, address, notes, status,
  do_not_service`) — no behavior change for well-formed calls, only extra
  keys are now dropped.
- `ai/assistant/route.ts`: same pattern, matched to its own (slightly
  different) declared schemas (client fields there are `name, email, phone,
  address, notes, active` — no `status`/`do_not_service` in this file's
  tool definition).
- `create_booking` in both files was checked and left alone — it already
  builds an explicit `bookingData` object field-by-field with `tenant_id`
  hardcoded server-side, not spread from `input`.

## Verification

- `npx tsc --noEmit` — clean (one pre-existing unrelated failure in
  `bookings/broadcast/route.xss.test.ts`, confirmed present on `git stash`
  before this change too — not caused by this edit).
- `npx vitest run` on both files' RBAC test suites (4 files, 16 tests) —
  16/16 passed, no regressions.

File-only. No push/deploy/DB.
