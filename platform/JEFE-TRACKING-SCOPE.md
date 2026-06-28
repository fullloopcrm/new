# Jefe — "Track Everything" buildout scope (2026-06-28)

**Goal:** Jefe is FullLoop's platform GM (Jeff's eyes/ears, NOT tenant ops). Extend his data layer so he tracks the whole platform's health, not just sales + notification-problems. He surfaces issues to Jeff via Telegram before they bite.

**Touch only these files** (don't refactor anything else):
- `src/lib/jefe/health.ts` — the data layer (`getPlatformHealth`, `PlatformHealth` type). ADD signals here.
- `src/lib/jefe/agent.ts` — `JEFE_PROMPT` (tell Jefe about the new signals + when to lead with them) and the `get_platform_health` tool description.
- Nothing else. Jefe is read-only (no action tools in this pass).

**Rules:**
- `npm run build` (rm `tsconfig.tsbuildinfo` first) before any push. `tsc` alone has missed errors the Vercel build caught — don't trust it.
- Verify table/column names against prod first via Management API (curl): token `SUPABASE_ACCESS_TOKEN_FULLLOOP` in `~/.env.local`, ref `cetnrttgtoajzjacfbhe`. python UA is WAF-blocked — use curl. Don't assume a column exists.
- Keep `getPlatformHealth` parallelized (it already runs queries in `Promise.all`). Add new queries to that batch.
- Platform-level only. NEVER surface a tenant's revenue/client counts as if they matter to Jeff.
- Commit acct: `fullloopcrm`. Prod branch `main` auto-deploys (slow, 3-5 min).

---

## Signals to ADD (worst-first — Jefe should lead with #1-2)

### 1. Provisioning health (BIGGEST GAP)
Which tenants can't actually operate. Right now ~0/21 have Stripe, ~20/21 no Telnyx.
- **Source:** `tenants` — `telnyx_api_key`, `resend_api_key`, `stripe_api_key`, `status`.
- **Add to PlatformHealth:** `provisioning: { tenants_total, no_sms, no_email, no_payments, fully_unprovisioned, by_gap: {tenant_name, missing: string[]}[] }`.
- **Jefe surfaces:** "X tenants can't charge, Y can't text — they're live but non-operational."

### 2. Comms deliverability %
System-check hit **24% notification success** — Jefe can't see send-success today.
- **Source:** `notifications` (has `status` — sent/failed/etc) over 24h. Group by status; compute success rate. Per-tenant fail counts for attribution.
- **Add:** `comms: { sent_24h, failed_24h, success_rate, worst_tenants: {tenant_name, failed}[] }`.
- Verify the `status` values first (e.g. 'sent'/'failed'/'pending').

### 3. Cron health
You got cron-silence alerts; Jefe is blind to them.
- **Source:** the cron jobs in `vercel.json` (expected cadence) vs their last run. Find how "last run" is recorded — check for a `cron_runs`/`job_runs` table or a timestamp pattern (the cron-silence monitor already computes this — locate it: grep `silent`/`Cron silence`/`fingerprint` in src). Reuse its logic.
- **Add:** `crons: { silent: {name, silent_hours, expected_hours}[] }`.

### 4. Real app error rate + trend
Jefe's "stability" is notification-derived, not actual errors.
- **Source:** find the error table (`error_logs`? grep `from('error` and `error-tracking.ts`). Count 1h + 24h + 7d, trend.
- **Add:** `errors: { last_1h, last_24h, last_7d }`.

### 5. Stuck payments (platform-level signal, not tenant revenue)
- **Source:** `bookings` where `status='completed'` and `payment_status != 'paid'` and `end_time < now-24h`. Count + per-tenant.
- **Add:** `payments: { stuck_unpaid_24h, by_tenant: {tenant_name, count}[] }`.

### 6. Tenant lifecycle
- **Source:** `tenants.created_at` (new signups 7d), `tenants.last_active_at` (going inactive — no activity 14d+).
- **Add:** `lifecycle: { new_7d, inactive: {tenant_name, last_active}[] }`.

### 7. Deploy/build failures
- **Source:** there's no DB record of Vercel deploys. Either (a) skip, or (b) read recent deploy status via `vercel ls`/`vercel inspect` if a token's available — likely out of scope for the DB tool. Lowest priority; note and defer unless easy.

---

## Acceptance
- `getPlatformHealth` returns all the above, parallelized, no extra round-trips per tenant (aggregate in code).
- `JEFE_PROMPT` updated: on a vague "status/how are we", lead with provisioning + deliverability if bad, then the existing issues. Zero-hallucination rule stays — every number from the tool.
- `npm run build` green, push, confirm deploy Ready, then message Jefe "status" in the group and eyeball the report.

## PHASE 2 — Jefe takes ACTION (build after the tracking signals land)

Jefe goes from read-only to a true GM who can *do* things on Jeff's behalf. Each
action is a separate Anthropic tool in `src/lib/jefe/agent.ts` (one tool = one
job), backed by a function in a new `src/lib/jefe/actions.ts`. Same hard rules:
platform-level only (never run a tenant's day-to-day ops), zero-hallucination,
and **confirm-before-act** on anything that sends an external message, spends
money, or mutates prod.

### Action pattern (REQUIRED)
Two-step for anything outbound/destructive:
1. Jefe proposes ("I'll text the-florida-maid's owner: '<draft>'. Confirm?") and
   the tool returns a preview — does NOT execute yet.
2. Only on Jeff's "yes" does Jefe call the execute variant. Read-only lookups
   (re-check health, fetch a tenant's config) run immediately, no confirm.

### Action tools to build
1. **notify_tenant_owner(tenant, message)** — draft → on confirm, send to the
   tenant owner via THAT tenant's own channel (telnyx/resend) or, if unprovisioned,
   surface "no channel — here's their email/phone to reach manually." (Reuse
   existing send libs; respect feedback_no_client_sms / no_mass_sms — owner only,
   never their clients.)
2. **rerun_cron(name)** — manually fire a cron route (the ones in vercel.json) to
   clear a silent-job alert. Confirm first.
3. **retry_failed_notifications(tenant?, since)** — re-send the failed
   notifications (the 24%-success problem). Capped + confirm.
4. **ack_issue(id)** — mark a security_event / notification / tenant issue as
   acknowledged so it stops surfacing (add an `acknowledged_at` column if needed).
5. **create_task(title, detail, tenant?)** — drop a to-do for Jeff (own
   `jefe_tasks` table) so "reach out to X" doesn't get lost. Jefe lists open tasks
   on request.
6. **provision_checklist(tenant)** — generate the exact keys/fields a tenant is
   missing (telnyx/resend/stripe/agent_name/telegram) so Jeff can finish setup
   fast. Read-only.

### Memory / continuity
Jefe is currently STATELESS (jefe/route.ts runs askJefe with no history — see
memory note: sms_conversations needs a tenant_id and Jefe is platform-level). For
multi-turn ("yes do it" referencing the prior proposal), give Jefe his OWN history
table (`jefe_messages`, no tenant_id) and thread the last N turns into askJefe.
This is REQUIRED for confirm-then-act to work across messages.

### Acceptance (phase 2)
- Each tool build-verified; confirm-before-act proven on one real flow (e.g.
  notify_tenant_owner → preview → "yes" → sends).
- JEFE_PROMPT updated with the action rules + the confirm pattern.
- Nothing destructive runs without an explicit Jeff "yes" in the same thread.

See memory `fullloop_jefe_platform_gm_2026_06_28` for telegram wiring + state.
