# Post-Deploy Verification Readiness — W4 read-only probes

**Status:** doc-only · no code/routes/DB touched · a POST-DEPLOY *decision matrix*
for W4's verification surface.
**Author:** W4 (verification lane, read/test-only) · branch `p1-w4`
**Companions (source of truth for the actual commands — this doc does NOT
re-paste them):**
- `verification-harness-readiness.md` — the six live curl probes P1–P6 + the
  needs-canary side-effect table, with exact command bodies and expected codes.
- `canary-tenant-provisioning-spec.md` — the A5 canary (test-mode Stripe, phone
  nulled, email sinked, `is_synthetic=true`) that gates the side-effect probes.
- `synthetic-canaries-spec.md`, `fortress-health-coverage-audit.md`.

This file answers the one question the leader asked for (c): **of everything W4
can verify, what runs safely against the live deployment right after cutover, and
what must wait for the canary tenant.** It adds the parts the companion doc does
not carry: the CI-vs-live split, per-probe blast radius, abort triggers, and who
runs each. For the how-to-run, follow the companion.

---

## 1. First cut: not everything W4 owns is a "post-deploy" probe

W4's verification surface is two different things that must not be conflated:

| Layer | What it is | When it runs | Against what |
|---|---|---|---|
| **A. Vitest harness** | `*.test.ts` locks (refund cross-tenant isolation, Selena convoId witness, tenant-client proof-of-conversion, webhook/checkout, ledger math, fortress divergence) | **CI / pre-deploy** — a merge gate | Mocked deps + build; **never** touches a live tenant or the deployed origin |
| **B. Live curl probes** | P1–P6 in the companion doc | **Post-deploy** — against the running deployment | Real HTTP endpoints of the deployed origin |

**Rule:** the vitest harness is a *pre-deploy* gate — it proves the code is
correct before it ships and is meaningless to "run post-deploy" (it doesn't hit
the deploy). Only **Layer B** is a post-deploy activity. Anyone who says "run W4's
tests post-deploy" means the curl probes, not vitest.

The rest of this doc is entirely about **Layer B**.

---

## 2. The decision matrix — every post-deploy probe

Columns: **Post-deploy-safe now** = read-only vs data that already exists, no side
effect, runnable the moment a deploy is live. **Canary-required** = triggers a
side effect (Stripe/SMS/email/mutation) or needs a fabricated per-tenant token, so
it must run against the neutered A5 canary, never a live tenant.

| # | Probe (see companion for command) | Reads / Effects | Blast radius | Safe post-deploy now? | Canary req'd? | Abort-the-deploy on failure? |
|---|---|---|---|---|---|---|
| P1 | Platform health `/api/health` | read-only | none | ✅ yes | no | **YES** — 503 ⇒ DB/env down, stop & roll back |
| P2 | Slug resolver `/api/tenants/public?slug=` | read existing tenant row | none | ✅ yes | no | **YES** — resolver not serving ⇒ tenants dark |
| P3 | Cross-tenant non-bleed (A≠B) | read two tenant rows | none | ✅ yes | no | **YES** — same tenant for two slugs = data-leak, roll back |
| P4 | Unknown-slug fail-closed (404/400) | read (miss) | none | ✅ yes | no | **YES** — a 200 here = default-tenant leak |
| P5 | Host/subdomain resolver `/api/tenant/public` | read via signed header | none | ✅ yes* | no | WARN on preview / **YES** on prod origin |
| P6 | Sitemap resolver `/api/tenant-sitemap?slug=` | read-only | none | ✅ yes | no | HIGH — second resolver path regressed |
| S1 | Checkout session round-trip | **creates Stripe Checkout Session** | live Stripe charge surface | ❌ no | **yes** | n/a until canary |
| S2 | Public invoice view/pay `/invoices/public/[token]` | needs real token; pay mutates | live customer $ + PII | ❌ no | **yes** | n/a until canary |
| S3 | Public quote accept `/quotes/public/[token]` | mutates a live deal | live deal state | ❌ no | **yes** | n/a until canary |
| S4 | Public document sign `/documents/public/[token]` | mutates a live doc | live doc state | ❌ no | **yes** | n/a until canary |
| S5 | Portal-login send | **sends real SMS/email code** | real customer inbox/phone | ❌ no | **yes** | n/a until canary |
| S6 | Lead/contact capture `/api/contact`,`/api/lead` | inserts lead + `emailAdmins` | real admin inbox + row | ❌ no | **yes** | n/a until canary |

\* P5 depends on production DNS doing the subdomain→signed-header rewrite; a
preview origin may not reproduce it. Treat P5 as **production-origin** verification
and lean on P2/P3 for previews (per companion §2, P5 note).

**Tally:** 6 probes (P1–P6) are post-deploy-safe today and need only two slugs W4
already operates. 6 probes (S1–S6) are **BLOCKED-ON-A5** — the neutered canary.

---

## 3. Post-deploy run sequence

1. **Gate:** run **P1** first. `503`/unhealthy ⇒ STOP, do not proceed, roll back.
2. **Resolver flip:** run **P2 → P6** in order. Every green ⇒ tenant resolution
   verified live, per-tenant `200`s, no cross-tenant bleed. Record the actual
   slugs + returned tenant names in the run log (not just pass/fail).
3. **Any "abort-the-deploy = YES" probe red** (P1–P4, or P5/P6 on prod) ⇒ treat as
   a failed deploy: roll back / hold the alias, don't chase it forward.
4. **S1–S6:** do **not** run against the live deployment. Report them as
   **BLOCKED-ON-A5**, explicitly — never silently skipped. They become runnable
   only once the leader provisions the canary tenant, and even then they run
   against the canary origin, not a customer tenant.

---

## 4. Run ownership & guardrails

- **Who runs P1–P6:** the operator/leader against the live origin post-deploy.
  W4 authored them from the read-only worktree and has **not** executed them here
  (no deploy target from `p1-w4`). This is a map, not a completed run.
- **Who runs S1–S6:** deferred to the canary owner (leader) after A5 lands.
- **What W4 will not do:** run prod DDL, provision the canary, hit live Stripe, or
  send to real customers. The `is_synthetic` column DDL + canary provisioning are
  FILES for the leader to run after Jeff approves.
- **Branch caveat:** W4 sees only `p1-w4`. If another worker edits `middleware.ts`
  or the public resolver routes before deploy, re-confirm the endpoint paths in
  companion §1 before running P1–P6.

---

## 5. One-line summary

Post-deploy, run **P1–P6** (health + tenant-resolver, all read-only, all safe now)
and treat P1–P4 (+ P5/P6 on prod) failures as roll-back triggers; hold **S1–S6**
(checkout / token-pay / portal-send / lead-email) until the **A5 canary** exists.
The vitest harness is a **pre-deploy** CI gate, not a post-deploy probe.
