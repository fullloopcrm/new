# Preview Smoke Gate Plan (A4)

**Author:** W1 (schema + backfill lane) · **Date:** 2026-07-12 · **Status:** FILE ONLY — spec/plan. **No workflow files edited.** This documents *how* to wire the gate; wiring is a leader/Jeff action.

Goal: run the **resolver-flip smoke suite** (`a2d9adb`) on **every preview deploy**
so a build that mis-routes a tenant host is caught *before* it can be promoted to
production — the brand-swap failure the whole `tenant_domains`-first flip exists
to prevent.

- **Suite:** `platform/src/lib/tenant-resolver-flip.smoke.test.ts`
- **Fixture:** `platform/src/lib/tenant-resolver-flip.fixture.ts`
- **Runbook (source of truth for the suite):** `platform/docs/RESOLVER-FLIP-SMOKE-RUNBOOK.md`
- **Runner:** vitest, from `platform/`

---

## What the suite gives us, and which parts gate

The suite has three layers (see runbook table). Only some are safe to *gate on*
for a preview:

| Layer | Runs when | Network? | Gate on a preview? |
|---|---|---|---|
| Offline sanity | always | no | **Yes** — free, catches fixture drift (empty/stale host list). |
| **Part B — synthetic divergence** | always | no (mocked Supabase) | **Yes** — proves the TENANT_DIVERGENCE assert-and-refuse guard *fires*. Deterministic, zero prod writes. |
| **Part A — live resolution** | `SMOKE_RUN=1` | yes (GETs) | **Conditional** — only meaningful against a URL that actually serves the tenant hosts. See "Two gate tiers" below. |

**Key constraint (from the runbook, do not skip):** Part A reads the
`x-tenant-slug` **response header** that `rewriteToSite()` sets in
`src/middleware.ts`. A preview URL only carries that header for a host if the
deployment resolves that host. In **preview (Host-override) mode** you point at
the preview base URL and send `Host: <domain>` — which **only works if that
deployment honors an overridden Host header**. Some edge setups route strictly by
real Host and ignore the override; then every host reports the same slug or none.
That's a known false-negative shape and is why Part A is a *conditional* tier, not
the always-on gate.

---

## Two gate tiers

### Tier 1 — ALWAYS gate (every preview + every PR): offline + Part B

Deterministic, no network, no secrets, no prod writes. This is the real
per-preview gate and it can also live in the existing PR CI.

```bash
# from platform/
npx vitest run src/lib/tenant-resolver-flip.smoke.test.ts
```

Passing proves: (1) the fixture still exposes ≥20 hosts and the carrying
subdomains match the live `BESPOKE_SITE_TENANTS` set (no drift), and (2) the
assert-and-refuse guard throws `TENANT_DIVERGENCE` on synthetic divergence,
passes on agreement, and returns `null` on a dangling pointer (never brand-swaps).

> Note: the whole file already runs inside `npx vitest run` (the CI unit-test
> step in `ci.yml`). Tier 1 gating is therefore **already in place for PRs today**
> as part of the normal test run — the only *new* thing this plan adds is Tier 2
> and making the preview-scoped invocation explicit.

### Tier 2 — CONDITIONAL gate (per preview, when the preview can serve the hosts): Part A

Runs the live resolution probe against the preview deployment. Gate on it **only**
when the preview genuinely resolves tenant hosts (Host-override honored, or the
domain is attached to the preview). Otherwise it produces expected "no
`x-tenant-slug`" failures for hosts not yet on this deploy — which is *correct
behavior*, not a regression, and must not red-gate.

```bash
# from platform/, against the just-built preview URL:
SMOKE_RUN=1 SMOKE_TARGET_URL=https://<preview-deployment-url> \
  npx vitest run src/lib/tenant-resolver-flip.smoke.test.ts
```

The **wrong-tenant probe** is the assertion that matters here:
`resolved to "X" but expected "Y" — WRONG TENANT (brand swap)` = block the promote.

---

## Trigger — when the gate should run

| Trigger | Tier | Rationale |
|---|---|---|
| Every PR / push (existing CI `verify` job) | Tier 1 | Already runs inside `npx vitest run`; catches fixture drift + guard regressions pre-merge. |
| **Every preview deploy** (Vercel Preview built) | Tier 1 + Tier 2 | Tier 1 always; Tier 2 pointed at the fresh preview URL. This is the new wiring A4 asks for. |
| Pre-promote to production (Phase B of Q3) | Tier 2 (direct mode after DNS) | The canonical post-flip check — hits `https://<host>/` directly. See runbook "Expected results by phase." |

**Where "every preview deploy" hooks in (options, pick one — none applied here):**

1. **Vercel Deploy Hook / post-deploy job** that runs the Tier-2 command with
   `SMOKE_TARGET_URL` = the deployment URL Vercel exposes. Cleanest, since it
   has the real preview URL.
2. **GitHub Actions `deployment_status` trigger** — fire when Vercel reports a
   preview `deployment_status`, read `deployment_status.target_url`, run Tier 2
   against it. Keeps it in CI alongside the existing `verify` job.
3. If neither is available, Tier 1 stays the guaranteed gate and Tier 2 is run
   manually from the runbook before any promote.

> This plan does **not** edit `.github/workflows/*` or add a Vercel hook. Those
> are the wiring steps; A4 is the spec for them.

---

## Env / inputs

| Var | Tier | Effect |
|---|---|---|
| *(none)* | Tier 1 | Offline + Part B run with no env. |
| `SMOKE_RUN=1` | Tier 2 | Enables Part A live network probing. |
| `SMOKE_TARGET_URL` | Tier 2 (preview) | Base URL to probe with an overridden `Host` header. This is how you point Part A at a **preview** before DNS is flipped. |
| `SMOKE_DOMAINS_JSON` | Tier 2 (optional) | Path to `[{host, expectedSlug}]` JSON to drive the host list off an **authoritative `tenant_domains` export** instead of the built-in fixture — needed to cover custom domains whose truth lives only in the prod table (runbook is explicit these are *not* invented in the fixture). |
| **Vercel protection-bypass token** | Tier 2 (protected previews) | If the preview is protected, the probe needs the bypass token/header or every request 401s and Part A fails for the wrong reason. Call this out in the wiring. |

**Secrets:** Tier 1 needs none. Tier 2 needs only the preview URL and, for
protected previews, the bypass token. It performs **read-only GETs** and **no
database access** — safe to run on untrusted preview infra.

---

## Gating rule (the decision the gate encodes)

**Block promote/merge when:**

- **Tier 1** fails at all — fixture drift or the assert-and-refuse guard not
  firing is a hard stop (deterministic; a failure is always real).
- **Tier 2** reports `WRONG TENANT (brand swap)` for any host — the critical
  case; a preview is serving the wrong tenant.

**Do NOT block on (expected, non-regression):**

- Tier 2 `no x-tenant-slug` / `HTTP >= 400` for a host **not attached to this
  preview** or when Host-override isn't honored by the edge — this is the
  documented pre-flip / preview-mode false negative. Treat as *inconclusive*,
  not *fail*. If Host-override is unreliable on your edge, run Tier 2 in **direct
  mode after DNS** (Phase B) instead of gating preview promotion on it.

**Divergence alerting (post-flip, complements the gate):** Part B proves the guard
logs `TENANT_DIVERGENCE host=<h> td=<A> legacy=<B>`. After the flip, alert on that
string in production logs — a live occurrence means a real host is claimed by two
tenants and the resolver is (correctly) refusing to serve it. The preview gate
catches it pre-promote; the log alert catches it in prod.

---

## Summary

- **Tier 1 (offline + Part B)** is the always-on, deterministic gate — already
  running in PR CI; make it explicit per preview.
- **Tier 2 (Part A live)** gates the brand-swap probe against the preview URL via
  `SMOKE_RUN=1 SMOKE_TARGET_URL=…`, but only counts `WRONG TENANT` as a failure;
  Host-override limitations make "no header" inconclusive, not a red gate.
- Wiring point for "every preview" is a Vercel deploy hook or a GH Actions
  `deployment_status` job — **not created here.**
