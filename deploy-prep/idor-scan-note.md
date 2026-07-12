# IDOR scan — missing-tenant-scope reads on tenant-scoped tables

**Author:** W4 (verification-harness lane) · **Date:** 2026-07-12
**Trigger:** Leader order (b) — after fixing the `GET /api/selena?convoId`
cross-tenant SMS leak (commit `722ed11d`), audit sibling endpoints for the
**same** class: a by-id / by-convo **read** on a tenant-scoped table that omits
`.eq('tenant_id', …)` and is reachable from a **per-tenant** auth boundary.

## The bug class (what "same pattern" means)

A read is exploitable as a cross-tenant IDOR only when **all** hold:

1. The endpoint authenticates a **specific tenant** (`getTenantForRequest()`,
   `requirePermission()`, or a portal/field-staff token) — i.e. tenant-A and
   tenant-B are distinct principals.
2. The lookup key (`conversation_id`, `id`, …) is **caller-supplied** (query
   string / body / route param), not derived from an already-tenant-validated
   parent row or from the verified token.
3. The read (and its response) is **not** gated by `tenant_id` scope or an
   ownership check.

The fixed selena route hit all three: it resolved a tenant via
`getTenantForRequest()`, took `convoId` straight from the query string, and read
`sms_conversation_messages` filtered **only** by `conversation_id` while the
sibling conversation-LIST read one block down was tenant-scoped.

Reads that are **cross-tenant by design** (platform super-admin, monitoring
bearer key) or have **no authenticated tenant** (webhooks, cron) are a different
class and are called out separately below — they are not tenant-vs-tenant IDOR.

## Method

`src/app/api/**/route.ts` scanned (498 route files) for `supabaseAdmin
.from('<tenant-scoped table>').select(...).eq('<*_id or id>', …)` statements
lacking `tenant_id`. Tenant-scoped table list taken verbatim from
`migrations/2026_05_09_tenant_id_core.sql`. Broad pass: **38** such reads across
**26** files. Each was then triaged by reading the handler's auth guard and the
provenance of the lookup key. Read-only lane — no route was modified except the
authorized selena fix.

## Ranked findings

### P0 — live cross-tenant IDOR
| # | Endpoint | Status |
|---|----------|--------|
| 1 | `GET /api/selena?convoId` → `sms_conversation_messages` | **FIXED** in `722ed11d`. `.eq('tenant_id', tenantId)` added; witness flipped RED→GREEN with a positive control. |

No **other** live P0 of this class was found.

### P1 — fragile-but-currently-guarded (recommend hardening before multi-tenant GA)
| # | Endpoint | Why it's not a leak today | Risk |
|---|----------|---------------------------|------|
| 2 | `GET /api/sms?conversation_id` (`src/app/api/sms/route.ts:16`) | Messages are fetched by `conversation_id` **before** any tenant check, but the response is gated: a follow-up `sms_conversations` read scoped to `.eq('tenant_id', tenantId)` returns **404** and the messages are never emitted for a cross-tenant id. No disclosure. | The guard sits *after* the fetch and only blocks the `return`. A future refactor that moves/duplicates the return, or reads messages in a `Promise.all` with the check, silently reopens the exact selena leak. **Recommend:** scope the messages read itself (`.eq('tenant_id', tenantId)`) so correctness doesn't depend on statement ordering — mirror the selena fix. |

### P2 — write-side tenant-tagging gap (adjacent, not a read IDOR)
| # | Location | Issue |
|---|----------|-------|
| 3 | `POST /api/selena` reset, `sms_conversation_messages` insert (`src/app/api/selena/route.ts:170`) | The outbound-recovery message is inserted **without** `tenant_id`, relying on the column's `DEFAULT` (nycmaid) added by `2026_05_09_tenant_id_core.sql`. Harmless while nycmaid is the only tenant, but for a **second** tenant the row is mis-tagged nycmaid — which would then be (correctly) hidden from that tenant's own now-scoped `GET ?convoId` read. **Recommend:** set `tenant_id: tenantId` on the insert before onboarding tenant #2. Same applies to any other `sms_conversation_messages`/scoped-table insert that leans on the default. |

## Triaged and cleared (not this bug class)

**Cross-tenant BY DESIGN — platform super-admin (`requireAdmin` → `verifyAdminToken`, which passes only the global `super_admin` "God-mode, any tenant" token; tenant-admin tokens are rejected):**
- `admin/bookings/[id]/closeout-summary` (`payments`, `sms_logs` by `booking_id`)
- `admin/schedule-issues/fix` (`bookings`, `schedule_issues` by `id`)
- `admin/comhub/contacts/[id]/context` (`clients` by `id`)
- `admin/comhub/voice/settings` (`comhub_admin_voice_settings` by `admin_id`)

**Cross-tenant BY DESIGN — platform monitoring bearer key (`ELCHAPO_MONITOR_KEY`, platform-wide by spec; optional `?tenant=` ownership check):**
- `admin/selena/monitor` (`sms_conversation_messages` by `conversation_id`)

**No authenticated tenant — webhooks (provider-supplied external ids are how the tenant is *resolved*, not an escalation vector):**
- `webhooks/stripe` (`payments` by `stripe_session_id`)
- `webhooks/telnyx` (`campaign_recipients`, `clients`, `bookings`, `sms_conversation_messages`)
- `webhooks/resend` (`campaign_recipients` by `resend_email_id` / `campaign_id`)

**No authenticated tenant — cron (ids are system-derived from prior tenant-scoped queries; globally-unique ids keep counts correct):**
- `cron/comhub-email`, `cron/daily-summary`, `cron/generate-recurring`, `cron/payment-followup-daily`

**Row-scoped-ok — lookup key derived from an already-tenant-validated parent or from a verified token (checked line-by-line):**
- `selena/route.ts` message-COUNT loop — `c.id` iterates conversations already filtered `.eq('tenant_id', tenantId)`.
- `admin/selena/route.ts` — `getTenantForRequest`; count loops over tenant-scoped conversations.
- `campaigns/send` — `requirePermission('campaigns.create')`; `campaigns` loaded `.eq('tenant_id', tenantId)` before any `campaign_recipients` read.
- `invoices/[id]` — `requirePermission('finance.view')`; invoice loaded `.eq('tenant_id', tenantId).single()` (throws → 500 for a cross-tenant id) **before** the `payments`-by-`invoice_id` read.
- `jobs/[id]` — `getTenantForRequest`; `jobs` loaded `.eq('tenant_id', tenantId).single()` with a 404 gate before child `bookings`/`job_payments`/`job_events` reads.
- `jobs/[id]/sessions/[sessionId]` — `loadOwnedSession(tenantId, jobId, sessionId)` enforces `.eq('id').eq('tenant_id')` + job match before the id-only re-read.
- `portal/messages`, `team-portal/messages` — `thread_id` derived from the authenticated `clientId` / verified field-staff token, never caller-supplied.

**Public / auth-establishment flows (no tenant-vs-tenant boundary; classified by auth type + key provenance, not exhaustively line-audited):**
- `client/confirm/[token]` (booking by id derived from an unguessable token)
- `portal/auth`, `portal/connect` (client by id during login/connect)
- `referrers/[code]` (referral stats by referrer_id resolved from a public code)
- `track` (public click tracking by `session_id`; no tenant auth)

## Coverage caveats (honest limits)

- Scanner keys on `supabaseAdmin.from('table').select().eq('*_id')`. It does
  **not** catch: reads via `.rpc()`/DB functions, reads via `.in()` / `.or()` /
  `.match()` / `.filter()` instead of `.eq()`, dynamic table names, or ORM
  wrappers. Those were not swept.
- The P0/P1/P2 items were read line-by-line. The "public / auth-establishment"
  bucket was classified by auth type and key provenance, not a full read of each
  handler.
- RLS is **not** relied on here: every read uses `supabaseAdmin` (service role),
  which bypasses RLS. Tenant isolation is enforced only in application code, so
  these `.eq('tenant_id')` checks are the *sole* boundary — worth stating for the
  deploy gate.

## Recommendation for the deploy gate

- P0 (#1): fixed, tested, committed — Jeff-gated deploy.
- P1 (#2) and P2 (#3): not blockers for a single-tenant (nycmaid) deploy, but
  **must** be closed before onboarding tenant #2. Suggest tracking as pre-GA
  hardening tickets.
