# Incident Response Runbook

_Status: OPERATIONAL REFERENCE. Docs only — nothing in this file executes anything._
_Owner: platform on-call. Last authored: 2026-07-11 (W4, branch `p1-w4`)._

## How to use this file

Each failure mode below is a self-contained card with four fields:

1. **Detection signal** — the concrete thing you observe (log line, monitor,
   provider dashboard, user report) that tells you this incident is live.
2. **Immediate mitigation** — the first read-only / low-blast-radius action to
   stop the bleeding, before any rollback.
3. **Rollback pointer** — where the reversal procedure lives. See the note
   directly below on rollback artifacts.
4. **Escalation** — who/what to pull in if mitigation + rollback don't clear it.

### ⚠️ Rollback-artifact note (read first)

The canonical rollback procedures are intended to live at
**`deploy-prep/rollback-plan.md`**. As of this writing that file **does not yet
exist** on any branch (`p1-w2`, `p1-w3`, `p1-w4` all absent). Until it lands,
the authoritative, per-phase rollback tables are the **Go / No-Go + ROLLBACK**
sections of **`deploy-prep/deploy-runbook.md`** (branch `p1-w3`). Every rollback
pointer below cites `rollback-plan.md` as the eventual home **and** the specific
`deploy-runbook.md` phase that carries the live procedure today. If the two ever
disagree, `rollback-plan.md` wins once authored; until then, `deploy-runbook.md`
is truth.

### Phased-deploy context (why rollbacks are phase-scoped)

The Part 0 release ships in four watched phases (`deploy-prep/deploy-runbook.md`).
Most incident rollbacks are "revert the phase that just deployed," so knowing
which phase is in flight is the fastest triage:

| Phase | What it ships | Reversal |
|-------|---------------|----------|
| **A** | Low-risk, non-behavioral (migrations, RLS enable commit) | Revert the commit; data migrations are additive |
| **B** | Resolver flip — `tenant_domains` becomes source of truth + `TENANT_DIVERGENCE` assert-guard | Revert the resolver deploy (fallback prefers `tenants.domain`, so revert restores prior behavior) |
| **C** | Auth-behavior (owner_phone gating, OTP/PIN lockout, full Telnyx voice verify) | Revert the Phase C deploy; `owner_phone` backfill data stays |
| **D** | Webhook idempotency (Telegram secret + re-register, journal dedup) | Fix registration/secret; revert deploy if bots dark |

---

## 1. Site down (platform or a tenant returns 5xx / unreachable)

**Detection signal**
- Uptime monitor flags the apex or a tenant host down; sustained 5xx spike in
  Vercel Analytics / logs; users report "site won't load."
- Distinguish scope: **all hosts down** (platform-wide — bad deploy, upstream
  Supabase outage) vs **one host down** (tenant-specific — DNS, domain config,
  or that tenant's data). A single-host failure that renders a 5xx from the app
  is usually resolver/data, not infra — check card #6 before assuming infra.

**Immediate mitigation**
- Check the current Vercel deployment status. If the newest production deploy
  went red or correlates with the incident start, **promote the last known-good
  deployment** (Vercel instant rollback) — this is faster than a git revert and
  is the first move for a platform-wide 5xx.
- If Vercel is green but the app still 5xxes, check Supabase status (the app is
  service-role-everywhere; a Supabase outage takes every DB call down). This is
  an upstream dependency — no code rollback fixes it.
- Read the error: a `TENANT_DIVERGENCE` throw (card #6) presents as a per-host
  500. Do not treat it as generic infra.

**Rollback pointer**
- `deploy-prep/rollback-plan.md` (canonical, pending) → today: revert the
  in-flight phase per `deploy-prep/deploy-runbook.md`. For a bad deploy, Vercel
  promote-previous is the mechanical rollback; the phase table above says what
  reverting each phase restores.

**Escalation**
- Platform-wide + Vercel/Supabase both green after 10 min → escalate to Jeff
  (leader) with the exact deploy SHA in production and the first 5xx timestamp.
- Suspected Supabase outage → confirm on Supabase status page before paging;
  it's a vendor incident, not ours.

---

## 2. DNS SERVFAIL (a custom domain stops resolving)

**Detection signal**
- `dig <domain>` / `dig www.<domain>` returns `SERVFAIL` or `NXDOMAIN`; tenant
  reports their branded domain is unreachable while the `*.fullloopcrm.com`
  subdomain still works.
- This is a **name-resolution** failure (before the request reaches the app),
  distinct from card #1 (app returns 5xx) and card #6 (app resolves the wrong
  tenant). If `dig` returns records but the site errors, it's not this card.

**Immediate mitigation**
- Confirm the domain's DNS records point at Vercel (apex `A`/`ALIAS` and `www`
  `CNAME` per Vercel's required values) and that the domain is still verified in
  the Vercel project. A dropped/expired verification or a registrar-side record
  change is the usual cause.
- Check for registrar/nameserver-level failure (expired domain, nameserver
  outage, DNSSEC misconfig → SERVFAIL). These are **outside our
  infrastructure** — no deploy rollback affects DNS.
- Interim: the tenant's `<slug>.fullloopcrm.com` subdomain resolves
  independently of their custom domain and can be used as a fallback URL while
  DNS is repaired.

**Rollback pointer**
- Not a code-deploy incident, so `rollback-plan.md` / `deploy-runbook.md`
  phases do **not** apply. If a recent **domain-config** change (Vercel domain
  add/remove, `tenant_domains` edit) triggered it, reverse that specific change;
  cross-ref the config-source-of-truth ADR (`platform/docs/adr/0002-config-sot.md`).

**Escalation**
- DNS records correct but still SERVFAIL after propagation window → escalate to
  the domain owner / registrar; this is a registrar or nameserver incident.
- Domain verified-and-correct in Vercel but not serving → escalate to Jeff with
  `dig` output and the Vercel domain status.

---

## 3. Bot dark (Telegram / SMS bot stops responding)

**Detection signal**
- Inbound messages get no reply; no webhook hits in logs for that channel.
- **Telegram:** `getWebhookInfo` shows a non-empty `last_error_message` or a
  `pending_update_count` climbing with `last_error_date` recent — typically a
  secret-token mismatch returning 401 to Telegram, so it stops delivering.
- Correlate with a **Phase D** deploy: Phase D adds webhook idempotency and
  requires `TELEGRAM_WEBHOOK_SECRET` set **and the webhook re-registered with
  that secret first** — if the secret ships before re-registration, Telegram's
  calls 401 and the bot goes dark.

**Immediate mitigation**
- Verify `TELEGRAM_WEBHOOK_SECRET` is present in prod env **and** that the
  registered webhook was set with the same secret (`setWebhook` with
  `secret_token`). If they diverge, **re-register the webhook** with the current
  secret — this is the fix, not a rollback.
- Confirm the webhook URL still points at the live endpoint and returns 2xx to a
  signed test delivery.

**Rollback pointer**
- `deploy-prep/rollback-plan.md` (pending) → today: **Phase D** Go/No-Go in
  `deploy-prep/deploy-runbook.md` — "any bot goes dark (secret/registration
  mismatch) → fix registration." Revert the Phase D deploy only if
  re-registration does not restore delivery.

**Escalation**
- Secret + registration correct and bot still dark → escalate to Jeff; capture
  `getWebhookInfo` output and the last successful inbound timestamp.
- SMS channel dark with provider showing delivery failures → treat as a provider
  (Telnyx) incident; escalate to the messaging owner with the provider error.

---

## 4. Owner locked out (an owner can't access their dashboard)

**Detection signal**
- Owner reports they cannot log in; auth-failure log lines for that owner; OTP or
  PIN verification returning 429 (rate-limit lockout) or 401 (rejected).
- Correlate with **Phase C**, which ships auth-behavior changes: `owner_phone`
  gating (backfilled from a prior 19-NULL state), OTP brute-force lockout, and
  team-portal PIN throttling keyed on IP+slug. A lockout right after Phase C is
  the prime suspect.

**Immediate mitigation**
- **429 / lockout:** confirm it's a rate-limit lockout (throttle keyed on
  IP+slug for PIN, per-IP + IP-independent lockout for OTP). If the owner is
  locked by legitimate retries, the lockout window clears itself; do **not**
  disable the throttle to unblock one owner (that reopens the brute-force hole
  the fix closed).
- **Auth rejected (owner not recognized):** verify the `owner_phone` backfill
  actually populated that owner's row — the gating change assumes it ran; a
  still-NULL `owner_phone` will fail the gate. This is a data-prereq check, not
  a code change.
- Preserve nycmaid legacy access assumptions — the owner-of-A-on-tenant-B path
  is intentionally denied; confirm the owner is hitting **their own** tenant.

**Rollback pointer**
- `deploy-prep/rollback-plan.md` (pending) → today: **Phase C** Go/No-Go in
  `deploy-prep/deploy-runbook.md` — "any owner locked out → revert the Phase C
  deploy; `owner_phone` backfill data stays." Reverting restores prior auth
  behavior without losing the backfill.

**Escalation**
- Backfill present + not a rate-limit window + still locked out → escalate to
  Jeff; do not hand-edit auth state under pressure.
- Any sign the lockout coincides with a **cross-tenant auth success** anywhere →
  this is a security incident, not just a lockout: page immediately and treat as
  Phase C No-Go (revert).

---

## 5. Payment webhook failing (provider webhook erroring / ledger not posting)

**Detection signal**
- Payment provider dashboard shows webhook deliveries failing (non-2xx) and/or
  retrying; expected ledger entries missing after a paid event; duplicate-charge
  or double-post reports.
- Distinguish **delivery failure** (provider can't reach us / signature rejected
  → 4xx/5xx at our endpoint) from **processing failure** (we 200 the webhook but
  the ledger row didn't land).

**Immediate mitigation**
- **Delivery/signature failure:** verify the webhook signing secret in prod env
  matches the provider's, and that the endpoint URL is current. A rotated secret
  or stale URL causes every delivery to fail signature and 4xx.
- **Double-post / idempotency:** the ledger write treats a unique-violation
  (`23505`) as an idempotent success — a retried webhook should be a no-op, not a
  double charge. If you see doubles, that guard is the thing to check first, not
  to remove.
- **Missing ledger row:** use the provider's **replay/resend** for the specific
  event once the endpoint is confirmed healthy — do not hand-insert ledger rows;
  let the idempotent path reconcile.

**Rollback pointer**
- `deploy-prep/rollback-plan.md` (pending) → today: webhook idempotency behavior
  is **Phase D** in `deploy-prep/deploy-runbook.md`. If a Phase D deploy
  introduced the failure, revert per its Go/No-Go; the `23505`-idempotent write
  is designed so replays after revert stay safe.

**Escalation**
- Endpoint healthy + secret correct but provider still failing deliveries →
  escalate to the payments owner and open a provider-side investigation.
- Any suspected **double-charge that actually hit a customer** → treat as a
  financial incident: page Jeff immediately, freeze further replays, reconcile
  before any more writes.

---

## 6. Resolver TENANT_DIVERGENCE alert

**Detection signal**
- Log line (Vercel logs / `console.error`) of the exact form:
  `TENANT_DIVERGENCE host=<host> td=<tenantA> legacy=<tenantB>`.
- Meaning: after the **Phase B** resolver flip, `tenant_domains` (the new source
  of truth) resolves `<host>` to tenant **A**, but the legacy `tenants.domain`
  path resolves the same host to tenant **B**. The guard **asserts-and-refuses**:
  it throws rather than serve, so the affected host returns an error **instead of
  serving the wrong tenant**. That is the fail-safe working — a divergence never
  silently brand-swaps.
- Because the guard throws, this can surface as a per-host 500 (see card #1);
  the `TENANT_DIVERGENCE` log line is what disambiguates it from generic infra.

**Immediate mitigation**
- The guard is already preventing cross-tenant serving for that host, so the
  priority is **reconcile the two config sources**, not restore serving-at-any-
  cost. For the logged `<host>`, determine which tenant is correct and make
  `tenant_domains` and `tenants.domain` agree (the divergence is a data
  inconsistency between the two tables).
- Do **not** "fix" it by pointing the host at whichever tenant makes the error go
  away without confirming which tenant legitimately owns the domain — that risks
  the exact brand-swap the guard exists to prevent.

**Rollback pointer**
- `deploy-prep/rollback-plan.md` (pending) → today: **Phase B** Go/No-Go in
  `deploy-prep/deploy-runbook.md` — "any domain renders the wrong tenant, or
  `TENANT_DIVERGENCE` fires in prod → revert the resolver deploy. The fallback
  path already prefers `tenants.domain`, so reverting the merge restores prior
  behavior." Related artifacts: `platform/docs/RESOLVER-FLIP-SMOKE-RUNBOOK.md`,
  `platform/src/lib/migrations/057_unfreeze_tenants_domain.sql`, and the
  config-source-of-truth ADR `platform/docs/adr/0002-config-sot.md`.
- Note on this branch (`p1-w4`): the `TENANT_DIVERGENCE` guard lives on `p1-w2`
  (resolver flip `ee8943a`) and is **not** present here — this card documents the
  post-Phase-B production behavior, not current `p1-w4` code.

**Escalation**
- More than one host diverging, or divergence on a high-traffic tenant → escalate
  to Jeff and treat Phase B as No-Go (revert) rather than reconciling host-by-host
  under load.
- Divergence that traces to a bad `tenant_domains` migration (`058`/`059`, the
  tenant_domains-correctness prereqs) → coordinate the fix with the leader before
  editing prod config; prod DDL is Jeff-gated.

---

## Cross-references

- `deploy-prep/deploy-runbook.md` — phased deploy + per-phase Go/No-Go & rollback (branch `p1-w3`).
- `deploy-prep/rollback-plan.md` — canonical rollback home (pending authoring).
- `deploy-prep/post-deploy-probes.md` — per-fix live prove-it commands (branch `p1-w3`).
- `platform/docs/RESOLVER-FLIP-SMOKE-RUNBOOK.md` — Phase B resolver smoke suite (branch `p1-w3`).
- `platform/docs/adr/0002-config-sot.md` — config source-of-truth (tenant_domains authoritative).
- `platform/docs/adr/0003-voice-multitenant.md` — voice per-DID tenant derivation.
- `platform/docs/tenant-isolation-rls-plan.md` — RLS + scoped-client plan.
