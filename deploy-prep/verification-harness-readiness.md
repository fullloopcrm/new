# Verification-Harness Readiness — W4 read-only probe suite

**Status:** doc-only · no code/routes/DB touched · consolidates the read-only
live-endpoint probes W4 can run **after** a deploy to confirm tenant resolution
serves the right tenant.
**Author:** W4 (verification lane, read/test-only) · branch `p1-w4`
**Companions:** `synthetic-canaries-spec.md`, `canary-tenant-provisioning-spec.md`
(the A5 canary blocker), `fortress-health-coverage-audit.md`.

---

## 0. What this doc answers

The leader order asks: of the read-only verifications W4 owns, **which are ready
to run POST-DEPLOY right now** (tenant-resolver serving the correct tenant,
per-tenant `200`s), **vs which need the canary tenant** (the A5 blocker) before
they're safe to run.

The split is driven by one rule: **a probe that only READS existing tenant data
is safe today; a probe that triggers a SIDE EFFECT (Stripe checkout, booking
insert, portal-login send, lead email) must wait for the neutered canary** so it
doesn't hit live Stripe or send real messages. See the side-effect table in
`canary-tenant-provisioning-spec.md §1`.

Set `ORIGIN` once for every command below:

```bash
ORIGIN=https://www.homeservicesbusinesscrm.com   # or the freshly-deployed preview origin
```

---

## 1. How tenant resolution works (the thing these probes verify)

Two public-read resolution paths exist; the probes exercise both:

| Path | Endpoint | Tenant comes from | File |
|---|---|---|---|
| **Explicit slug** | `GET /api/tenants/public?slug=<slug>` | `?slug=` query → `tenants.slug` lookup | `src/app/api/tenants/public/route.ts` |
| **Slug or header** | `GET /api/tenant-sitemap?slug=<slug>` | `?slug=` **or** `x-tenant-slug` header (custom-domain rewrite) | `src/app/api/tenant-sitemap/route.ts:16-28` |
| **Host → subdomain** | `GET /api/tenant/public` | `getTenantFromHeaders()` ← middleware resolves `<slug>.<domain>` to a signed `x-tenant-id` | `src/app/api/tenant/public/route.ts`, `src/middleware.ts:54-59` |

Middleware maps `<slug>.homeservicesbusinesscrm.com` / `<slug>.fullloopcrm.com` →
tenant (`src/middleware.ts:54-59`), and darkens only `suspended|cancelled|deleted`
tenants (`NON_SERVING_STATUSES`, `middleware.ts:29`). "Tenant-resolver flip" =
confirming, right after deploy, that each of these paths still returns the
**correct** tenant and no cross-tenant bleed.

---

## 2. READY POST-DEPLOY NOW — no canary required (read-only against real tenants)

These read existing rows only. Pick **two known-good slugs** you already operate
(e.g. `the-nyc-maid`, `wash-and-fold-nyc`) as `SLUG_A` / `SLUG_B`; the probes
assert the resolver serves each correctly and never crosses them.

```bash
SLUG_A=the-nyc-maid
SLUG_B=wash-and-fold-nyc
```

### P1 — platform health (no tenant) — smoke gate before anything else
```bash
curl -fsS "$ORIGIN/api/health" | jq '{status, checks}'
```
**Expect:** HTTP `200`, `status:"healthy"`, `checks.database:"ok"`. A `503` here
means DB/env is down — **stop, do not run the rest.** (`src/app/api/health/route.ts`)

### P2 — slug resolver returns the RIGHT tenant (per-tenant 200)
```bash
curl -fsS "$ORIGIN/api/tenants/public?slug=$SLUG_A" | jq
curl -fsS "$ORIGIN/api/tenants/public?slug=$SLUG_B" | jq
```
**Expect:** each → `200`, body `.tenant.slug == <the slug queried>` and a matching
`.tenant.name`. Proves slug→tenant resolution is live and per-tenant.

### P3 — cross-tenant NON-bleed (resolver never serves the wrong tenant)
```bash
A=$(curl -fsS "$ORIGIN/api/tenants/public?slug=$SLUG_A" | jq -r .tenant.name)
B=$(curl -fsS "$ORIGIN/api/tenants/public?slug=$SLUG_B" | jq -r .tenant.name)
[ "$A" != "$B" ] && echo "PASS: A≠B ($A / $B)" || echo "FAIL: same tenant served for two slugs"
```
**Expect:** `PASS`. Slug A must never surface Slug B's name — the read-side
analog of the ledger cross-tenant locks in the vitest suite.

### P4 — unknown slug fails closed (no default/first-tenant leak)
```bash
curl -s -o /dev/null -w '%{http_code}\n' "$ORIGIN/api/tenants/public?slug=zzz-does-not-exist-$RANDOM"
curl -s -o /dev/null -w '%{http_code}\n' "$ORIGIN/api/tenants/public"   # missing slug
```
**Expect:** `404` for the unknown slug (`route.ts:17`), `400` for the missing
slug (`route.ts:8`). A `200` returning *some* tenant would be a resolver leak.

### P5 — host/subdomain resolver serves the correct tenant
```bash
curl -fsS -H "Host: $SLUG_A.homeservicesbusinesscrm.com" "$ORIGIN/api/tenant/public" | jq '{name, industry}'
```
**Expect:** `200` with `SLUG_A`'s `name`. Drives the middleware subdomain path
(`middleware.ts:54-59`) → `getTenantFromHeaders()`. If it `404`s, the
signed-header handoff broke in the deploy.
> Note: against a preview origin the `Host` override may not trigger the same
> rewrite as production DNS; treat P5 as **production-origin** verification and
> fall back to P2/P3 on previews.

### P6 — sitemap resolver (second slug-path, exercises `x-tenant-slug`)
```bash
curl -fsS "$ORIGIN/api/tenant-sitemap?slug=$SLUG_A" | head -c 400
```
**Expect:** `200`, tenant-specific sitemap content; `400` when `slug` omitted
(`route.ts:20`). Confirms the custom-domain header path resolves the same tenant.

**Summary — Section 2 is runnable the moment a deploy is live, needs only slugs
you already own, and mutates nothing.**

---

## 3. NEEDS THE CANARY TENANT (A5 blocker) — do NOT run until the canary exists

Everything below either (a) triggers a real side effect, or (b) requires a token
tied to a specific tenant's data that we shouldn't fabricate against a live
tenant. All are gated on the neutered canary from
`canary-tenant-provisioning-spec.md` (encrypted **test-mode** Stripe key, phone
nulled, emails routed to a sink, `is_synthetic=true`).

| Probe | Endpoint | Why it needs the canary |
|---|---|---|
| Checkout session round-trip | `/api/team-portal/checkout`, public invoice checkout | Creates a **real Stripe Checkout Session**; against a live tenant this hits the platform's live Stripe. Canary uses a test-mode key. (`canary spec §2`) |
| Public **invoice** view/pay | `/api/invoices/public/[token]` | Needs a valid per-tenant `token`; forging/guessing against a live tenant is unsafe + leaks real invoice data. Canary mints its own token. |
| Public **quote** view/accept | `/api/quotes/public/[token]` | Same — token-scoped to real customer data; accept flow mutates a live deal. |
| Public **document** signer | `/api/documents/public/[token]` | Token-scoped; signing mutates a live doc. |
| Portal-login send | client-portal login | Sends a real 6-digit code SMS/email. Canary reads the code from the DB and has phone nulled + email sinked. (`canary spec §4`) |
| Lead / contact capture | `/api/contact`, `/api/lead` | Inserts a lead **and** fires `emailAdmins` to real admins. Canary sinks admin email + flags `is_synthetic`. |

**Blocker:** these stay RED until the leader provisions the canary tenant (A5).
The provisioning spec + the `is_synthetic` column DDL are FILES for the leader to
run after Jeff approves — W4 does not run prod DDL or writes.

---

## 4. Run order & pass criteria (post-deploy)

1. **P1** health smoke — must be `200/healthy` or STOP.
2. **P2–P6** resolver probes — every one green ⇒ tenant-resolver flip verified,
   per-tenant `200`s confirmed, no cross-tenant bleed. Record actual slugs +
   response names in the run log.
3. **Section 3** — only after the canary tenant is live; until then report them
   explicitly as **BLOCKED-ON-A5**, not skipped-silently.

**Honest status right now:** Section 2 (6 probes) is authored and ready — it has
**not** been executed here (no deploy target from this read-only worktree; these
are curl-against-live commands for the operator to run post-deploy). Section 3
(6 probes) is BLOCKED on the A5 canary. This doc is the consolidated map, not a
record of a completed run.

---

## 5. Cross-worker scope caveat

W4 sees only branch `p1-w4`. The resolver endpoints and middleware cited above
are as they exist on this branch at authoring time; if another worker changes
`middleware.ts` or the public routes before deploy, re-confirm the paths in
Section 1 before running. The A5 canary and any `is_synthetic` filtering live
outside this worktree's authority — leader-owned.
