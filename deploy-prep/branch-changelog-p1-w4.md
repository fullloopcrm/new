# Branch changelog — p1-w4 (security round: selena IDOR, witness tests, verification harness)

**Author:** W4 (verification-harness lane) · **Date:** 2026-07-12 · **Branch:** `p1-w4`
**Scope:** this changelog covers the three items named in the leader's queue
order — the selena cross-tenant IDOR (found → witnessed → fixed), the witness
tests added this round, and the read-only verification harness (live curl
probes + readiness doc). It is **not** a full log of every commit on this
branch (85 commits span many earlier sessions/queues — happy-path locks,
auth/authz isolation suites, DR runbooks, etc.); those are indexed in their
own docs (`test-coverage-scoreboard.md`, `happy-path-coverage-final.md`,
`e2e-flow-coverage.md`).

---

## 1. Selena cross-tenant IDOR — found, witnessed, fixed

**The bug:** `GET /api/selena?convoId=<id>` read `sms_conversation_messages`
filtered only by the caller-supplied `conversation_id` — no `tenant_id` scope,
no ownership check — while the sibling conversation-LIST query one block down
*was* tenant-scoped. An operator authenticated as tenant-A who passed
tenant-B's `convoId` received tenant-B's full SMS booking transcript (name,
phone, address, email).

| Step | Commit | What it did |
|---|---|---|
| 1. Witness (RED) | `eec486b7` | Added a WITNESS test proving the leak: a green witness pinning the missing filter, plus an `it.fails` security spec that passes while vulnerable and flips RED once fixed. No route touched (read-only lane). |
| 2. Fix | `722ed11d` | Added `.eq('tenant_id', tenantId)` to the `convoId` read in `platform/src/app/api/selena/route.ts`, matching the sibling conversation-LIST query. Column exists (migration 010), backfilled NOT NULL (`2026_05_09_tenant_id_core.sql`). |
| 3. Regression lock | (same commit, `722ed11d`) | Witness converted to a permanent regression lock: NEGATIVE (cross-tenant `convoId` discloses nothing) + POSITIVE control (owning tenant still reads its own convo in full). |

**Deploy status:** fixed and tested; deploy stays **Jeff-gated** (PR #15) per
standing rules — this worker does not merge or deploy.

**A second, related gap surfaced by the same read-through** and is tracked as
**NEEDS-FIX** (not yet fixed — route edit is leader/Jeff-gated):

| Commit | What it found |
|---|---|
| `56409094` | WITNESS: `POST /api/selena` reset inserts a recovery message into `sms_conversation_messages` **without** `tenant_id`, falling back to the column DEFAULT (`'nycmaid'`). Benign under single-tenant; for tenant #2 this mis-tags the row so the now-scoped `GET ?convoId` **hides that tenant's own message** (self-visibility bug, not a disclosure). |

Full disposition (FIXED / NEEDS-FIX / SAFE) for this and the other 37 by-id
reads audited alongside it: `deploy-prep/idor-remediation-status.md` (source
scan: `deploy-prep/idor-scan-note.md`, 498 routes swept).

---

## 2. Witness tests added this round

"Witness" pattern used throughout: a green test proving the current
(vulnerable or gap) behavior, paired with an `it.fails` security-spec
asserting the desired behavior — passes while the gap is open, flips RED the
moment it's closed, so the fix is provably verified rather than asserted.

| Test file | Commit | Proves | State after this round |
|---|---|---|---|
| `platform/src/app/api/selena/route.convoid-cross-tenant.witness.test.ts` | `eec486b7` → converted `722ed11d` | Selena `convoId` cross-tenant read | **Closed** — converted to permanent NEGATIVE+POSITIVE regression lock after the fix landed. |
| `platform/src/app/api/selena/route.reset-insert-tenant-tag.witness.test.ts` | `56409094` | Selena reset-insert missing `tenant_id` | **Open** — `it.fails` tripwire; route edit not yet made (leader/Jeff-gated, out of this read-only lane). |
| `platform/src/middleware.tenants-public-not-public.witness.test.ts` | `f278a2b9` | `/api/tenants/public` (plural) absent from `middleware.ts` `isPublicRoute` — every request 307s to `/sign-in` before the route's own handler runs | **Open** — `it.fails`; fails **closed** (no data leak), so lower urgency than an IDOR. One-line `isPublicRoute` fix documented in `deploy-prep/tenants-public-route-not-registered.md`. |

`tsc --noEmit` clean and full `vitest` run reported green (aside from
pre-existing unrelated failures already flagged in prior W4 reports) at each
commit above — see individual commit messages for exact pass/fail counts.

---

## 3. Verification harness — read-only live probes

**Design doc:** `deploy-prep/verification-harness-readiness.md` — splits
post-deploy tenant-resolution checks into READY-NOW (pure `GET`s against real
tenant data, safe to run any time) vs BLOCKED-ON-A5 (anything with a side
effect — checkout, portal-login send, lead email — gated on the neutered
canary tenant per `deploy-prep/canary-tenant-provisioning-spec.md`).

**Executed this round** (2026-07-12, ~18:00): live `curl`/`dig` probes against
production, covering `/api/health`, `/api/tenants/public?slug=`,
`/api/tenant/public` (via custom domain and via `Host:` header), subdomain
DNS, and `/api/tenant-sitemap?slug=`. Full results + exact commands:
`/tmp/w4-report-20260712-180037.md`. Findings from that probe, each written up
as its own doc since neither is a cross-tenant-read IDOR (this tracker's bug
class — see `idor-remediation-status.md` recap):

| Finding | Severity | Doc |
|---|---|---|
| `www.thenycmaid.com` API routes return Next.js's generic 404 (`x-matched-path: /404`); static/ISR pages still 200 from an ~8h-stale edge cache — working theory is a stale/wrong Vercel domain→deployment binding | **HIGH** (flagship tenant's own domain) | `deploy-prep/nycmaid-stale-deployment-finding.md` |
| `/api/tenants/public` missing from `middleware.ts` `isPublicRoute` — 307s to `/sign-in` before the route's own (auth-free) handler runs | MEDIUM (fails closed, no live symptom — only caller is behind an already-410'd route) | `deploy-prep/tenants-public-route-not-registered.md` |

**Confirmed correct** where reachable: custom-domain tenant resolution
(`www.thefloridamaid.com`, `www.consortiumnyc.com`) served the right tenant
each time with no cross-tenant bleed; `/api/health` and `/api/tenant-sitemap`
passed as expected. Subdomain-based routing
(`<slug>.homeservicesbusinesscrm.com`) has no DNS in production today — flagged
as unreachable/unverifiable, not a bug.

**What this harness did not do** (read-only lane, standing rules): no
POST/PUT/DELETE, no checkout/booking/lead/portal-login side effects, no Vercel
dashboard/DNS changes. The stale-deployment hypothesis is evidence-backed, not
confirmed against the Vercel project directly — that requires access this
worktree doesn't have.

---

## Deploy-gate summary (this round's security work only)

- Selena `convoId` leak — **FIXED**, regression-locked, Jeff-gated deploy (PR #15). Not a blocker to leave open; already closed pending merge.
- Selena reset-insert mis-tag — **NEEDS-FIX** before tenant #2 onboarding. Not a single-tenant (nycmaid) blocker. Witnessed, unfixed.
- `/api/tenants/public` middleware gap — **MEDIUM**, fails closed, no live symptom today. Witnessed, unfixed.
- `www.thenycmaid.com` stale deployment — **HIGH**, needs Vercel-side investigation (leader/Jeff — outside this worktree's access). Not app-code, not this branch's fix to make.

Full 38-item IDOR rollup: `deploy-prep/idor-remediation-status.md`.
