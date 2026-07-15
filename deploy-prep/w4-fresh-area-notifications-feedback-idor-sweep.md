# W4 broad-hunt: fresh-area authz sweep (notifications, portal feedback, misc)

Scope: fresh area per LEADER order (continuing broad-hunt). Did NOT touch
referrers, referral-commissions, or team-PIN routes.

Areas reviewed: `booking-notes/**`, `schedules/**`, `schedule/calendar`,
`catalog`, `service-types`, `domain-notes`, `routes/**`, `campaigns/**`,
`prospects`, `team-portal/{update-phone,checkin,notifications,preferences}`,
`portal/{notes,feedback,messages,request,bookings/[id]}`, `client/**`,
`webhooks/clerk`, `internal/deploy-hook`, `cron/**` (auth-gate check only),
`lead-media/signed-url`.

## Fixed

**`src/app/api/team-portal/notifications/route.ts` — PUT mark-single-read had
no owner check.**

`tenantDb()` only scopes updates by `tenant_id`. The mark-all-read branch
correctly filtered `.or('recipient_id.eq.<id>,recipient_id.is.null')`, but the
mark-one-read branch (`body.id`) updated `.eq('id', body.id)` with no
recipient filter — any authenticated team member could flip **any other team
member's** notification (or a tenant-wide broadcast) to `read` by
guessing/enumerating ids, since they share `verifyToken()` auth with no
per-row ownership check. Low impact (boolean flip only, no data exposure) but
a real within-tenant authz gap. Fix: applied the same
`recipient_id.eq.<id>,recipient_id.is.null` filter to the single-id branch.

**`src/app/api/portal/feedback/route.ts` — client-supplied `booking_id` not
verified to belong to the caller.**

POST accepted `booking_id` straight from the request body and inserted it
into `reviews` unchecked. A logged-in client (valid portal token) could
attach their review to **another client's booking** in the same tenant
(`tenantDb()` scopes by `tenant_id`, not by booking owner) — a data-integrity
issue (misattributed reviews tied to the wrong client's job), not a PII leak.
Fix: added a `tenantDb(auth.tid).from('bookings').select('id').eq('id',
booking_id).eq('client_id', auth.id).single()` check before insert; rejects
with 400 if the booking doesn't belong to the caller.

Verified:
- `npx tsc --noEmit` — clean.
- `npx vitest run src/app/api/team-portal/notifications/route.tenantdb.test.ts src/app/api/portal/feedback/route.tenantdb.test.ts` — 4/4 pass (existing tests don't exercise `booking_id`, so the new branch is additive/safe).

## Reviewed, no issue found

- `booking-notes/**`, `schedules/[id]`, `routes/[id]`, `campaigns/[id]`,
  `catalog`, `domain-notes`, `service-types`: all writes properly scoped by
  `tenant_id` (via `tenantDb()` or explicit `.eq('tenant_id', …)`), FK fields
  re-verified against tenant before write (routes `team_member_id` already
  had the fix-comment from a prior pass).
- `team-portal/{update-phone,checkin,preferences}`: signed-token /
  `verifyToken()`-gated, all scoped to `auth.id`/`auth.tid`.
- `portal/{notes,messages,request,bookings/[id]}`: `verifyPortalToken()` /
  `protectClientAPI()`-gated; ids used in `comhub_*` updates are derived
  server-side from the authenticated `clientId`, never attacker-supplied.
- `client/booking/[id]`, `client/reschedule/[id]`, `client/confirm/[token]`:
  `protectClientAPI(tenant.id, booking.client_id)` re-check after fetch;
  reschedule already re-validates a caller-supplied `team_member_id` against
  tenant before the join (prior-pass fix, comment present).
- `webhooks/clerk`: Svix HMAC verified, dev-only bypass flag is
  `NODE_ENV !== 'production'`-gated.
- `internal/deploy-hook`: Vercel HMAC-SHA1 signature, `timingSafeEqual`.
- `cron/**`: every route gated by `CRON_SECRET` / `protectCronAPI` — no
  unauthenticated cron handlers found.
- `lead-media/signed-url`: rate-limited, mime-allowlisted, unpredictable
  storage path (`randomBytes(4)` + timestamp), tenant resolved from host.
- Documents/quotes/invoices/cpa e-sign + public-token flows: already covered
  in a prior W4 pass (`w4-client-portal-token-timing-and-esign-token-flow-audit.md`)
  — not re-audited here.

## Noted, not fixed (outside blast radius / needs more investigation)

- Couldn't find where `bookings.client_confirm_token` is generated/set in
  this codebase (only column def + index in migration `050_...sql`, and
  reads in `client/confirm/[token]/route.ts`). If it's set elsewhere with a
  short/guessable value, the confirm-terms endpoint could be a target — flag
  for a follow-up pass with more time, not touched this session.

## Not touched (per LEADER order)

Did not open referrers, referral-commissions, or team-PIN/team-portal auth
internals.
