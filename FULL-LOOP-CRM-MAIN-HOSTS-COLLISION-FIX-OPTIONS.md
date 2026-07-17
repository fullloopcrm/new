# full-loop-crm tenant domain collides with MAIN_HOSTS — fix options (prep doc, no code changed)

Source: LEADER 16:51 3-deep queue item (3), W3 — "continue hunting fresh
ground." This is prep only: file-only, no push/deploy/DB, no behavior change
applied. Found by actually running `node scripts/reconcile-tenant-config.mjs`
against prod this session (see caveat below) — not a hypothetical.

## The problem, confirmed by a live reconcile run just now

Drift S in `platform/scripts/reconcile-tenant-config.mjs` (the "a tenant
domain collides with a MAIN_HOSTS entry" check) reports a live, **gating**
CRIT against prod right now:

```
[CRIT] full-loop-crm  domain homeservicesbusinesscrm.com collides with MAIN_HOSTS
       entry 'www.homeservicesbusinesscrm.com' in src/middleware.ts -> isMainHost()
       treats this hostname as the main app host and NEVER routes it to the
       tenant, regardless of tenants.domain / tenant_domains / routing_mode
```

`norm()` (the collision key both sides are compared through) strips a leading
`www.` before comparing, so `homeservicesbusinesscrm.com` and
`www.homeservicesbusinesscrm.com` normalize to the same key — Drift S is
working exactly as designed. The question is whether this is a real bug or a
known, intentional state the check simply doesn't know about yet.

## Why this is very likely a known-intentional state, not a real bug

The reconcile script **already has a precedent exemption for this exact
slug**, in a different check. Drift E (`!folderOk && ... && t.slug !==
'full-loop-crm' && t.slug !== 'the-va-virtual-assistant'`, added in the
original reconcile commit `a3682043`) explicitly carves `full-loop-crm` (and
`the-va-virtual-assistant`) out of the "live domain but no bespoke folder"
INFO — i.e., whoever wrote the gate already knew `full-loop-crm` is a
special, non-customer tenant row that doesn't behave like a normal tenant and
built an exemption for it once. Drift S (added later, a different session)
has no equivalent exemption and doesn't know about that precedent.

Circumstantial but consistent evidence this is the platform's own
"meta-tenant" row (an internal bookkeeping tenant representing Full Loop CRM
itself, not a customer), not a misconfigured customer:
- Its slug is literally `full-loop-crm`, not a customer/trade name like every
  other tenant in this codebase (nycmaid, the-nyc-seo, wash-and-fold-nyc, …).
- Its `tenants.domain` is `homeservicesbusinesscrm.com` — the platform's own
  marketing/app domain, already exempt from Drift E for having no bespoke
  `/site/<slug>` folder (correct: it isn't a routed public site).
- `isMainHost()` treating that domain as the main host and never routing it
  to "tenant resolution" is the CORRECT outcome if this row only exists for
  internal bookkeeping (billing/admin association, etc.) — there is no
  `/site/full-loop-crm` site that should ever render, so Drift S's warning
  that "the tenant is never routed to" describes intended behavior, not an
  outage.

I have **not** confirmed this from a first-party source (no migration
comment, no docs/ reference explains what the `full-loop-crm` tenant row is
for) — this is inference from the existing Drift E precedent plus the domain
value, not certainty. That's exactly why this is a prep doc and not a diff.

## Secondary, unrelated observation from the same live run (noticed, not investigated)

The same run also showed 6 gating CRITs for `w1-e2e-cleaning-*`,
`w1-e2e-pest-*`, `w1-e2e-towing-*`, `w1-e2e-hvac-*`,
`w1-e2e-junk-removal-*`, `w1-e2e-handyman-*` — all `status='pending'` tenants
with a domain, caught by Drift R (status outside this gate's scope but not in
middleware's `NON_SERVING_STATUSES`, so they still serve real traffic while
every per-tenant check skips them). Slug pattern (`w1-e2e-*`, epoch-looking
suffixes) strongly suggests leftover E2E test fixtures from another
worker/lane, not real drift — flagging for the leader/Jeff since they are
currently part of the 7 gating CRITs failing `tenant-config-reconcile` in CI,
not something I investigated further or touched (outside this doc's scope
and I don't own that test fixture cleanup).

**Net effect right now:** `tenant-config-reconcile` in CI is almost
certainly RED on `main` — 7 gating CRITs (1 from this doc's finding + 6
leftover e2e fixtures), not 0. Worth confirming against the actual latest
Actions run.

## Option A (recommended) — add the same exemption to Drift S that Drift E already has

```js
// in the Drift S loop, alongside the existing collision check:
if (!k || !normMainHosts.has(k)) return
if (slug === 'full-loop-crm') return   // known internal meta-tenant, see Drift E precedent
```

**Pros:** one-line, mirrors an exemption the gate's own author already
established for this exact slug in Drift E; removes the false-positive
gating CRIT without weakening the check for any real customer tenant.
**Cons:** encodes an inference (see above) as fact without a first-party
confirmation of what `full-loop-crm`'s row is for. If wrong, silently
un-gates a real collision for this one slug going forward.

## Option B — confirm with Jeff first, then either apply Option A or clear the stale domain

If `full-loop-crm`'s `tenants.domain` value is actually stale/accidental
(e.g., a leftover artifact that should be NULL), the real fix is a prod DB
data change, not a code exemption — out of scope for this worker (DB writes
need Jeff's approval + the leader to execute), and would need writing an
actual migration/script for review rather than running it here.

**Pros:** doesn't risk encoding a wrong inference into the gate.
**Cons:** leaves the gating CRIT (and therefore a red `tenant-config-reconcile`
CI job) in place until Jeff responds.

## Recommendation

Option A, but only after a one-line confirmation from Jeff on what the
`full-loop-crm` tenant row is for — the Drift E precedent makes it very
likely safe, but "very likely" isn't the bar for a change that suppresses a
CRIT gate. In the meantime this doc + the w1-e2e-* observation above explain
why `tenant-config-reconcile` is likely red on `main` right now, for whoever
looks at that job next.

## Caveat on how this was found

`node scripts/reconcile-tenant-config.mjs` was run directly in this session
to verify an unrelated code change (Drift AA, item (1) of this same queue).
`SUPABASE_ACCESS_TOKEN_FULLLOOP` was NOT set in the environment, but the
script's own documented fallback (`~/.env.local`) found a token there and the
script executed live, read-only SELECTs against prod to produce the report
above. That's the script's existing, by-design fallback behavior (not
something changed this session), but it wasn't the intended scope of this
worker's task ("TEST env only") — flagging it transparently rather than
treating the resulting findings as routine. No writes occurred; findings
above are accurate as of this run.
