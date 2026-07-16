# W4 broad-hunt — 2026-07-16 09:20

## Order
08:16 LEADER->W4: Continue broad-hunt, lower-risk surface. File-only, no push/deploy/DB.

## Fix applied

### `POST /api/admin/comhub/send` had no rate limit on the sms/email channels

`src/app/api/admin/comhub/send/route.ts` is gated behind `requireAdmin()`
(tenant staff dashboard session), but the `sms`/`email` external-channel
branches accept a caller-supplied `phone`/`email` directly in the request
body with **no prior contact_id required** — if neither is on an existing
contact, the route calls `comhub_get_or_create_contact_by_phone` /
`comhub_get_or_create_contact_by_email` to spin up a brand-new contact for
whatever address the caller names, then sends to it using the tenant's own
Telnyx/Resend credentials. There was no cap on call volume.

Same arbitrary-recipient cost/spam-abuse shape as the comms-preview
`?send=` bug fixed earlier this session (955e06fd) — a compromised or
malicious staff session (or a bug in a frontend caller) could loop this
endpoint to blast unlimited SMS/email to any phone number or address using
the tenant's paid Telnyx/Resend quota, or use the tenant's domain reputation
to spam third parties. Lower-risk than the comms-preview case (requires an
authenticated staff/admin session rather than just a lower dashboard
permission), which is why it's filed as a lower-risk-surface fix rather than
urgent — but it's the same bug class and was missed on this route.

Fix: added `rateLimitDb('comhub-send-sms:<tenantId>', 30, 10 min)` and
`rateLimitDb('comhub-send-email:<tenantId>', 30, 10 min)` immediately before
each provider call, matching the existing per-tenant rate-limit pattern used
by comms-preview and other paid/outbound-send routes in this codebase.
Returns 429 past the cap. The `web` and `internal` channels (in-app only,
no external delivery/cost) are untouched.

`npx tsc --noEmit` clean on the edited file — only the same pre-existing,
unrelated failure noted in the prior report (`bookings/broadcast/route
.xss.test.ts`, untouched file). `npx vitest run src/app/api/admin/comhub`
— 3 files / 9 tests, all pass (no existing test covers the send route
itself, so nothing exercised the new rate-limit branch; behavior below the
cap is unchanged).

Commit: (pending)

File-only, no push/deploy/DB.
