# Incident Runbooks — per production failure mode

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12 · **Status:** docs only, nothing applied
**Scope:** one runbook per LIVE production failure mode the leader flagged: domain down, bot dark,
payment fail, DID 404, resolver divergence. This is distinct from
`deploy-prep/provisioning-runbooks.md`, which covers a tenant getting **stuck during onboarding**
before it ever goes live. Every failure mode here is about a tenant that **was working and stopped**,
or a systemic guard tripping in production. No code, env, or DB rows changed by this pass.

**Verification anchors read this pass:** `platform/src/lib/tenant-lookup.ts` (full file, incl.
commit `8e2c805e` diff), `app/api/webhooks/telnyx/route.ts` (full file),
`app/api/webhooks/telnyx-voice/route.ts:1-30,380-400`, `app/api/webhooks/telegram/route.ts`,
`.../telegram/jefe/route.ts`, `.../telegram/[tenant]/route.ts` (grep-confirmed: none of the three
check a secret token today), `app/api/webhooks/stripe/route.ts` (case list), reused from
`deploy-prep/health-monitor-coverage-gap.md` (Fortress + `/api/health` detail) and
`deploy-prep/gated-wave-plan.md` (Wave 3/5 items this doc expands into runbooks).

---

## 1. Domain down

**Symptom:** a live tenant's custom domain stops resolving correctly — full outage (DNS/SSL) or the
specific "serves stale/wrong content" variant already documented in depth.

**Detection:**
- Fortress (`platform/src/lib/tenant-health.ts` + `cron/tenant-health/route.ts`) — `reachable`,
  `routing`, `noLoop`, `formWired` checks, for any tenant **not** in `EXCLUDED_TENANTS`.
- **Known blind spot, already fully documented — do not re-diagnose from scratch:**
  `deploy-prep/health-monitor-coverage-gap.md` covers the exact incident class where Fortress passes
  clean (edge-cached homepage 200s) while `/api/health` and other dynamic API routes 404 on a stale
  deployment binding — nycmaid's 8-hour silent outage is the worked example. Read that doc first;
  this entry only adds the immediate-response steps, not the root-cause analysis (already done there).
- **Known blind spot #2:** any tenant in `EXCLUDED_TENANTS` (`tenant-health/route.ts:29-32` —
  currently `nycmaid`, `fla-dumpster-rentals`) has **zero** automated coverage, not degraded coverage.
  A missing row in `tenant_health`, not a red row — see gap doc §2c for why that reads as "nothing to
  report" on the dashboard instead of "unmonitored."

**Immediate response:**
1. `curl -sI https://<domain>/` and `curl -s https://<domain>/api/health` — compare status + headers
   against `onboarding-verify.ts`'s DNS/SSL checks (`dns_a`, `dns_cname_www`, `ssl_active`,
   `onboarding-verify.ts:21-77`) to localize DNS vs. deployment-binding vs. app-level.
2. Check `x-matched-path` and `x-vercel-cache`/`age` headers on the homepage response — a stale-binding
   incident looks like a long-lived cache HIT on static content while dynamic routes 404
   (`health-monitor-coverage-gap.md` §1's exact signature).
3. If the tenant is in `EXCLUDED_TENANTS`: there is no automated trail to consult — go straight to a
   manual `verify-checklist` POST-equivalent (or the raw curls in step 1) since Fortress has nothing on
   this tenant.
4. Vercel dashboard: confirm the domain's deployment binding (Jeff/leader — no worker lane has Vercel
   dashboard access). This is the actual fix for a stale-binding incident; nothing in this codebase can
   repoint a Vercel domain alias.
5. Once repointed, re-probe `/api/health` directly (don't trust the homepage 200 — see step 2) before
   declaring resolved.

**Blast radius:** contained to that tenant's public site + any inbound webhook that depends on the
same deployment (a stale binding can mean webhook routes are stale too, not just page content — check
both).

**Prevention gap (flagged, not fixed):** the full proposed fix (external synthetic `/api/health`
monitor, unconditional per-tenant coverage regardless of `EXCLUDED_TENANTS`, alert-channel fallback) is
already specified in `deploy-prep/health-monitor-coverage-gap.md` §4 — not re-specified here.

---

## 2. Bot dark

**Symptom:** a tenant's Selena bot (SMS and/or Telegram) stops responding to inbound messages. From
the client's side: they text, nothing comes back.

**Two structurally different causes — check both, they have different fixes:**

### 2a. SMS (Telnyx) — silent tenant-lookup miss

`webhooks/telnyx/route.ts:98-126` — inbound `message.received` looks up the tenant by
`.eq('telnyx_phone', to)`. If zero rows match, the handler returns `{received: true}` (a **200**, not
an error) and drops the message with **no log line, no alert** (`:124-126`). From Telnyx's perspective
this webhook succeeded; from the tenant's perspective their bot is dark, with nothing in this codebase
recording that it happened.

**Root causes:**
1. `telnyx_phone` never set or wrong on the tenant row (see `provisioning-runbooks.md` §3 for the DID
   gotcha — no gate stage catches an unseeded/misconfigured number).
2. E.164 formatting mismatch — the match is exact-string (`.eq(...)`, no normalization); a number
   stored as `(212) 555-0100` will never match Telnyx's `+12125550100`.
3. Deliberately configured dark: `chatbot_enabled: false`, or a lead landing while
   `auto_respond_leads: false` routes to the explicit `'auto_respond_leads_disabled'` no-reply branch
   (`webhooks/telnyx/route.ts:604`) — **check `tenants.selena_config` before treating this as a bug.**
   See `deploy-prep/prospect-to-live-runbook.md` §6 for the full config-field reference.

**Detection:** no automated alert exists for this today (confirmed by grep — the silent-drop branch has
no `console.error`, no Telegram notify). The only way to detect it is either the tenant/client
reporting "no reply," or a manual grep of Telnyx's own dashboard delivery logs against this app's
`sms_conversations`/`tenant_owner_messages` tables for a gap.

**Immediate response:**
1. Confirm the exact `to` number from the inbound event (Telnyx dashboard or the raw webhook payload if
   captured) and diff it byte-for-byte against `tenants.telnyx_phone` for the affected tenant.
2. If mismatched: correct the stored number to exact E.164, no re-deploy needed (data fix only — Jeff/
   leader, this worktree has no prod DB write access).
3. If matched: check `tenants.selena_config.chatbot_enabled` / `auto_respond_leads` — confirm this isn't
   intentional before escalating further.
4. If both check out and the bot is still dark: escalate to Telnyx-side (messaging profile detached —
   `provisioning-runbooks.md` §3 cause #2 — or an account-level issue at Telnyx).

### 2b. Telegram — the fail-closed-by-design future state

**Today (verified by grep this session):** none of the three Telegram webhook routes
(`webhooks/telegram/route.ts` — owner bot, `.../telegram/jefe/route.ts` — Jefe, `.../telegram/[tenant]/
route.ts` — per-tenant) check a secret token. They are not fail-closed today; the relevant gap is the
**opposite** one — `deploy-prep/telegram-tenant-webhook-auth-guard-spec.md` documents the per-tenant
route's unauthenticated bypass in full (not re-derived here).

**The "bot dark" failure mode this entry actually covers is a rollout risk, not a current-state bug:**
per `deploy-prep/gated-wave-plan.md` Wave 3, once `TELEGRAM_WEBHOOK_SECRET` is set and the auth guard
ships (`telegram-tenant-webhook-auth-guard-spec.md`, `webhook-auth-throttle-guard-spec.md`), **every**
tenant bot whose webhook wasn't re-registered with the new secret **fail-closes to 401** — Telegram's
own retry/backoff eventually gives up, and the bot goes dark for every tenant that was missed in the
re-registration sweep. This is explicitly called out in both specs' rollout sections
(`telegram-tenant-webhook-auth-guard-spec.md` "Rollout," step 2: "Re-register every existing tenant bot
... or Part 1 fail-closes all of them").

**Detection (once the guard ships):** Telegram's own webhook-info API
(`getWebhookInfo` per bot token) reports `last_error_message`/`last_error_date` for a failing webhook —
not currently polled by anything in this codebase. Recommend this be the concrete follow-on monitor,
not implemented here.

**Immediate response (once the guard ships):**
1. Confirm `TELEGRAM_WEBHOOK_SECRET` is actually set in the deploy env — if unset, Part 1's `secretOk()`
   fails closed unconditionally (`telegram-tenant-webhook-auth-guard-spec.md` line: "no configured
   secret => reject"), which would dark **every** tenant bot simultaneously, not just unmigrated ones —
   the first thing to rule out.
2. If the env var is set: the specific tenant's bot was likely missed in the one-off re-registration
   script (`telegram-tenant-webhook-auth-guard-spec.md` Rollout step 2). Re-run
   `registerTelegramWebhook(decryptSecret(tenant.telegram_bot_token), '<origin>/api/webhooks/telegram/
   <slug>', TELEGRAM_WEBHOOK_SECRET)` for that tenant specifically.
3. Verify via `getWebhookInfo` (Telegram Bot API) that the registered secret matches and `pending_update_
   count` is draining.

**Blast radius:** per-tenant for §2a (SMS lookup miss); potentially platform-wide for §2b if the env var
itself is the gap (step 1 above) — that distinction is the first thing to establish, not the last.

---

## 3. Payment fail

**Symptom:** a charge that should have succeeded (or a webhook that should have reconciled it) didn't,
discovered after the fact — as opposed to the pre-go-live "never configured" case, which is
`provisioning-runbooks.md` §2's scope, not this one.

**Detection — the webhook case list is the full surface area:**
`app/api/webhooks/stripe/route.ts` handles `checkout.session.completed`, `charge.refunded`,
`charge.dispute.created`, `payment_intent.payment_failed`, `account.updated`, `invoice.paid`,
`invoice.payment_failed`, `customer.subscription.deleted`. Any event type Stripe fires that isn't in
this list is silently un-reconciled — not an error, just never handled. Confirm the actual Stripe event
type first (Stripe dashboard → event log for that charge) before assuming this app's webhook is at
fault; a real gap is easy to conflate with "the event type was never going to be handled here."

**Root causes, in likelihood order:**
1. `payment_intent.payment_failed` fired and was handled correctly (card declined, insufficient funds)
   — this is Stripe reporting a real decline, not an app bug. Check `payments` table for the row this
   event should have created/updated.
2. Webhook endpoint for the **tenant's own** Stripe account/key was never registered — see
   `provisioning-runbooks.md` §2 root cause #3; charges succeed at Stripe, this app never hears about
   it. **This is the highest-blast-radius root cause** — money moved, no record.
3. Platform-level Stripe webhook (the `webhooks/stripe/route.ts` route itself) signature/secret
   misconfigured — check `Webhook secret not configured` (`:33`) or `Invalid signature` (`:43`)
   responses in logs; if either fired, **no** event of any type was processed during that window,
   platform-wide, not just for one tenant.
4. Idempotency collision on retried webhook deliveries — the "Full Loop signup" branch uses a
   compare-and-swap `UPDATE ... WHERE status IN (...)` claim specifically to survive Stripe's retry
   behavior (`:80-96`); other branches (invoice path, `:210-215`) dedupe via a `payments` row lookup on
   `stripe_session_id`. If a genuine double-charge or a dropped charge is suspected, check whether the
   relevant branch has this protection — not all of them use the same pattern, verify per event type.

**Immediate response:**
1. Stripe dashboard: confirm the actual event type and whether Stripe recorded a successful delivery to
   this app's webhook endpoint (response code, retry count).
2. If delivery never reached the app (network/config): check root cause #3 first — platform-wide, most
   urgent.
3. If delivery reached the app but no expected side effect happened: identify which `case` branch (or
   lack thereof, root cause is "event type not handled") should have fired, read that branch directly
   rather than guessing.
4. For a tenant-level Stripe account issue (root cause #2): `POST verify-checklist` for that tenant per
   `provisioning-runbooks.md` §2's recovery steps — reused verbatim, not re-derived here.

**Blast radius:** real money, silent by default (per `provisioning-runbooks.md` §2 — same underlying
gotcha, now in its post-go-live incident form). Root cause #3 is platform-wide and the most urgent to
rule out first, since it silently drops every event type at once, not just the one that got noticed.

---

## 4. DID 404

**Symptom:** an inbound call to a tenant's voice number gets no answer / immediate failure at Telnyx's
edge, or (SMS-adjacent case) an inbound text to the number is silently dropped per §2a.

**The real architecture, not the idealized one:** `webhooks/telnyx-voice/route.ts` is **hardcoded to a
single tenant.** Its own header comment says so: "Bind to nycmaid tenant — single Telnyx voice
connection (`TELNYX_VOICE_CONNECTION_ID`, `ADMIN_RING_LIST`) is nycmaid's. Other tenants need their own
voice routing config" (`:9-11`), and `NYCMAID_TENANT_ID` is a literal constant (`:10`). Grep-confirmed:
this route never queries `tenants.telnyx_phone` or does any per-caller tenant lookup at all — there is
no multi-tenant voice router in this codebase today.

**This is exactly the item flagged in `deploy-prep/gated-wave-plan.md` Wave 3:** *"Seed 2nd voice
tenant DID in tenants.telnyx_phone or its calls 404."* Read literally against the code: seeding
`tenants.telnyx_phone` alone does **not** give a second tenant working voice, because nothing reads
that column for inbound call routing — the fix that wave item is really gesturing at is standing up a
**second** Telnyx Call Control connection (or extending this route to be multi-tenant, which is a real
code change, not a data-seed) before a second tenant's DID can receive calls at all. Flagging this gap
explicitly since the wave-plan phrasing understates the actual work.

**Root causes:**
1. The tenant's DID was never purchased/assigned a Call Control connection at Telnyx at all —  calls
   fail at Telnyx's edge before ever reaching this app; nothing in this codebase's logs will show
   anything, because nothing here was invoked.
2. The tenant's DID **is** wired to `TELNYX_VOICE_CONNECTION_ID`, but that connection is nycmaid's — a
   second tenant sharing it would have their calls answered as if they were nycmaid (`ADMIN_RING_LIST`,
   `VOICEMAIL_PROMPT`, everything hardcoded to nycmaid's config, `:6-30`). This is worse than a 404 — a
   silent cross-tenant mix-up — so do not "fix" a DID-404 report by pointing a second number at the
   existing connection as a shortcut.
3. Signature-check misconfiguration (separate, already-specced issue): `deploy-prep/webhook-auth-
   throttle-guard-spec.md` Finding 1 documents the current presence-only, fail-**open** signature check
   on this same route (`:385-400`) — if `TELNYX_PUBLIC_KEY` is unset, the route accepts anything, which
   is the opposite failure mode from "404" but lives in the same file; don't conflate the two when
   triaging.

**Immediate response:**
1. Confirm at the Telnyx dashboard whether the affected DID has a Call Control connection assigned at
   all, and which one.
2. If unassigned: this is infrastructure work (Jeff/leader, Telnyx dashboard access) — assign a
   connection. If that connection is meant to be a NEW tenant's own voice line, the app-side work
   (multi-tenant routing in `telnyx-voice/route.ts`, currently absent per above) is a prerequisite, not
   optional — flag before promising the tenant working voice from a data change alone.
3. If assigned to the shared `TELNYX_VOICE_CONNECTION_ID`: this is root cause #2, a mis-provision, not
   a 404 — separate remediation (unshare the connection), not covered further here since it's a
   provisioning correction, not an incident-response step.

**Blast radius:** that tenant's voice channel entirely dark (root cause #1), or a cross-tenant identity
mix-up on every call (root cause #2, more severe and easy to miss since calls DO get answered).

**Prevention gap (flagged, not fixed):** no gate stage or checklist item (per
`deploy-prep/prospect-to-live-runbook.md` §2) verifies voice routing at all — the six onboarding tasks
cover Telnyx SMS provisioning generically but nothing distinguishes "SMS works" from "voice works,"
and voice is architecturally single-tenant today regardless.

---

## 5. Resolver divergence

**Symptom:** requests to a tenant's domain start throwing / 500ing instead of serving, specifically
during or after the Wave 5 resolver-flip window (`deploy-prep/gated-wave-plan.md` Wave 5).

**What's actually happening — this is a deliberate guard, not a bug:** commit `8e2c805e` (feat(P1):
TRANSITION assert-and-refuse guard on tenant divergence) added a cross-check to
`getTenantByDomain()` (`platform/src/lib/tenant-lookup.ts:114-155`). During the migration window where
both `tenant_domains` (new, authoritative) and `tenants.domain` (legacy, being retired) are live, every
domain lookup that resolves via `tenant_domains` is cross-checked against the legacy `tenants.domain`
row for the same host. If they name **different** tenants, the guard does not silently pick one — it
logs a greppable line and throws:

```
TENANT_DIVERGENCE host=<h> td=<A> legacy=<B>
```

(`tenant-lookup.ts:151`, both `console.error` and the thrown `Error` carry the identical string —
grep either). The request is refused outright: no tenant returned, nothing cached
(`tenant-lookup.ts:149-153`, comment: "Do NOT cache; do NOT return a tenant"). **This is correct,
intentional behavior** — the alternative is silently serving one tenant's data under the other
tenant's domain (the "brand-swap failure mode" the code comment names explicitly at `:106-109`). Do not
"fix" a divergence incident by patching the guard to stop throwing.

**Detection:** grep application logs for `TENANT_DIVERGENCE` — the string is identical between the
`console.error` and the thrown error message specifically so this is a one-grep diagnostic
(`tenant-lookup.ts:151-154`). `deploy-prep/gated-wave-plan.md` Wave 5 explicitly calls for "wire a prod
log alert on it" — **not implemented anywhere in this codebase today**, confirmed by grep for
`TENANT_DIVERGENCE` outside `tenant-lookup.ts`/its test file: zero hits. Until that alert exists, this
failure mode is only visible by manually tailing/grepping logs or noticing the resulting 500s.

**Root cause, always the same shape:** `tenant_domains.tenant_id` for a host disagrees with
`tenants.domain` for the same host — i.e., the two migration-era sources of truth were never
reconciled for that specific domain before Wave 5's flip began. This is exactly the class of bug the
guard exists to catch **before** go-live of the full cutover (`057_unfreeze` in Wave 5), not after —
seeing this fire during the 24-48h watch window is the system working as designed, not a new incident
to route around.

**Immediate response:**
1. Grep for the exact `TENANT_DIVERGENCE host=... td=... legacy=...` line — it names both conflicting
   tenant IDs directly, no further investigation needed to identify which two tenants collided.
2. Query both `tenant_domains` and `tenants.domain` for that host directly — determine which one is
   correct (almost always `tenant_domains`, since it's the new authoritative source per the code
   comment at `:97-99`, but confirm per-incident rather than assuming).
3. Correct the **stale** row (most likely `tenants.domain` still pointing at an old tenant for a
   repointed/reassigned domain) — a data fix, Jeff/leader, no prod DB write access from this worktree.
4. Once corrected, the next request for that host resolves normally — no redeploy needed, this is a
   pure data-path check on every request, not a cached/compiled decision.
5. **Do not** work around this by disabling the guard or reverting `8e2c805e` — that reintroduces the
   exact brand-swap risk the guard was built to close, and removes the loud failure in favor of a
   silent wrong-tenant response, which is strictly worse.

**Blast radius:** the specific host is fully down (guard throws, nothing served) until the data
conflict is corrected — a deliberate trade: total outage for that one host beats a silent cross-tenant
data leak. Confirm this trade-off is acceptable to Jeff if divergence incidents turn out to be frequent
during the watch window; if so, the fix is reconciling the underlying data faster/earlier, not softening
the guard.

**Prevention gap (flagged, not fixed):** the prod log alert Wave 5 calls for is not implemented — this
is the single highest-leverage fix for this failure mode specifically, since detection today is fully
manual (step 1 above) and this guard is expected to be exercised precisely during the highest-risk
24-48h window in the entire deploy plan.

---

## Summary — shared response pattern

| Failure mode | Automated detection today? | Primary diagnostic | Blast radius |
|---|---|---|---|
| Domain down | Partial — Fortress, with 2 documented blind spots | `/api/health` + header probe, Vercel dashboard | That tenant's site + dependent webhooks |
| Bot dark (SMS) | **No** — silent 200-drop, no log | `telnyx_phone` diff + `selena_config` check | That tenant only |
| Bot dark (Telegram) | **No** (pre-guard); Telegram's own `getWebhookInfo` (post-guard, unpolled) | env var check, then per-tenant re-registration | Platform-wide if env var is the gap, else per-tenant |
| Payment fail | Stripe dashboard only — no app-side alert | Stripe event log vs. webhook case list | Real money; platform-wide if root cause #3 |
| DID 404 | **No** | Telnyx dashboard connection assignment | That tenant's voice, or a cross-tenant mix-up (worse) |
| Resolver divergence | **No** (guard fires, nothing alerts) | grep `TENANT_DIVERGENCE` | That one host, fully down until data fixed |

Five of six failure modes above have **no automated production alert** — every one relies on either a
human noticing symptoms or a manual grep/dashboard check. This is the same shape as the gap
`deploy-prep/health-monitor-coverage-gap.md` already flagged for domain-down specifically; it holds
across the other four modes in this doc too. None of the fixes are implemented in this pass — file-only,
consistent with this lane's charter.

## Cross-references

- `deploy-prep/provisioning-runbooks.md` — the pre-go-live version of §3 (payment) and §4 (DID)'s root
  causes; read both docs for the full lifecycle of each failure class.
- `deploy-prep/prospect-to-live-runbook.md` — the pipeline these incidents interrupt; §6 (AI config) and
  the go-live gate table are directly relevant to §2 and §4 here.
- `deploy-prep/health-monitor-coverage-gap.md` — full proposed fix for §1.
- `deploy-prep/telegram-tenant-webhook-auth-guard-spec.md`, `webhook-auth-throttle-guard-spec.md`,
  `telnyx-sms-verify-killswitch-guard-spec.md` — the specs §2 and §4 build on.
- `deploy-prep/gated-wave-plan.md` Wave 3 (Telegram secret + DID seed), Wave 5 (resolver flip + alert) —
  the deploy-sequencing context for §2b, §4, §5.
- `deploy-prep/phased-deploy-runbook.md` (this session) — where these guards land in the actual deploy
  sequence.
