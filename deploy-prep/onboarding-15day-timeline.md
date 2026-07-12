# Onboarding 15-Day Timeline — Critical Path Feasibility Review

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12 · **Status:** docs only, nothing applied

**Scope:** does the leader's proposed 15-day onboarding SLA actually hold against the real
prospect-to-live pipeline documented in `deploy-prep/prospect-to-live-runbook.md`? Maps the critical
path, ranks the bottlenecks, and gives a straight verdict rather than a hedge.

**Verification anchors read this pass:** `deploy-prep/prospect-to-live-runbook.md` (full doc, built on
directly — not re-derived), `deploy-prep/provisioning-runbooks.md` §1–§3, `deploy-prep/provisioning-failure-runbooks.md`
(full doc), `app/api/webhooks/stripe/route.ts:171` (`expires_at`), `app/api/admin/invites/route.ts:38-68`
(second, different invite mechanism), `lib/availability.ts`, `lib/provision-tenant.ts` (grep for
`open_365`, zero hits).

---

## 0. Two go-live definitions — the SLA only makes sense against one of them

`prospect-to-live-runbook.md` §0/§7 already established there are two intake paths and only Path A
(sold lead) reaches a real go-live gate. This doc adds a second split that matters just as much for a
15-day SLA:

| | "Gated go-live" | "Business-ready go-live" |
|---|---|---|
| What flips | `tenants.status → 'active'` | Tenant is actually taking calls/SMS and shows up in search |
| What's required | Only `siteServes` (domain) + the onboarding gate's weak `payment` stage (§3 of the runbook — checks `payment_methods.length > 0`, not a real Stripe charge test) | Domain **and** DID/10DLC **and** SEO indexed **and** (optionally) AI configured |
| Enforced by code today? | Yes — hard gate | **No** — per the runbook's summary table, 4 of 6 checklist items (Telnyx, Resend, 10DLC, Google Business) and SEO/AI have zero gate |

A 15-day SLA measured against "gated go-live" and a 15-day SLA measured against "business-ready" are
two different claims with two different answers (§4). Path B (self-serve) is excluded from both — it's
already `active` at intake with no timeline concept at all, so "15 days" is meaningless for it as the
codebase stands.

## 1. Critical path stage map (Path A)

| Stage | Driven by | Automated in this codebase? | Realistic duration | Gates go-live? |
|---|---|---|---|---|
| Intake (`createTenantFromLead`) | System | Yes | Instant | N/A |
| Owner accepts invite | **Human** (tenant owner) | No reminder/renewal | Up to **14 days** (Path-B email invite, `webhooks/stripe/route.ts:171`) or **7 days** (separate admin-created invite, `admin/invites/route.ts:47` — a *different* mechanism, different expiry, confirmed by reading both call sites) | Not a formal gate, but nothing downstream starts until this happens |
| Tenant Stripe connect (`create_stripe`) | Human | No | No code-tracked SLA | No (weak check only, §3 of runbook) |
| Telnyx DID purchase + attach (`create_telnyx`) | Human | **No automated purchase flow exists at all** (confirmed, `provisioning-runbooks.md` §3) | Depends entirely on operator promptness | No gate exists (`provisioning-runbooks.md` §3 summary table) |
| 10DLC registration (`verify_10dlc`) | Human + **external carrier vetting** | No | External process, not code-controlled — flagging as an assumption to confirm with Telnyx/account docs, not a code-verified number | No gate |
| Resend email domain (`create_resend`) | Human + DNS propagation | No | DNS-dependent, external | No gate |
| Domain DNS pointed + verified (`configure_dns`) | Human (owner's registrar) + DNS propagation + Vercel TXT check | Vercel verification itself is fast once DNS resolves; the DNS action is manual | External/human-dependent | **Yes — `siteServes`, the only hard gate** |
| SEO indexing (`registerSeoProperty`) | System triggers it; Google's own indexing is external | Trigger is automated, the actual indexing lag is not | External, and not blocked on by anything in this codebase | No gate |
| AI/Selena config | Human, optional | No | No SLA | No gate |

## 2. Critical path determination

The invite-acceptance step is **serial and blocking** — nothing else in the checklist can start until
the owner logs in. That alone can consume up to 14 of the 15 days before the operator even begins DNS,
Telnyx, or 10DLC work. The real critical path is therefore:

```
[owner accepts invite: 0–14d, serial] → [DNS points + Vercel verifies: hard gate, human+external]
                                       → [siteServes passes → status flips 'active']
```

DID/10DLC/SEO/AI can run in parallel with DNS once the owner engages, but none of them block the
status flip — which is exactly why "gated go-live" and "business-ready go-live" diverge so sharply
here. A tenant can be `status: 'active'` while still SMS-dark (no DID/10DLC) and invisible to search
(no SEO index yet), and nothing in the codebase distinguishes that state from a fully operational one.

## 3. Bottleneck ranking (worst first)

1. **Owner-invite acceptance window** — up to 14 days, no reminder before expiry, no renewal on
   expiry (`provisioning-failure-runbooks.md` §4: "silently-dead invite... no dashboard surface,
   alert, or cron that flags this"). If the owner waits until day 13 to click the link, the 15-day SLA
   is already unachievable before any provisioning work even starts. **Highest risk, by far.**
2. **10DLC carrier registration** — external vetting with zero automation and zero gate
   (`provisioning-runbooks.md` §3: "DID not seeded" has no automated go-live detection at all). If this
   is slow, nothing in the system notices or blocks on it — a tenant can go fully "active" while SMS
   is completely broken.
3. **DNS propagation + owner DNS action** — hard-gates go-live (`siteServes`), but is otherwise
   unmonitored: "no alert fires while a tenant sits in domain-unverified limbo for days"
   (`provisioning-runbooks.md` §1, verbatim finding).
4. **SEO indexing lag** — doesn't block the status flip, but blocks the tenant actually being
   findable in search after go-live. A tenant can be "live" per the system and invisible per Google
   for a further stretch after that.
5. **Two different invite-expiry policies in the same codebase** — 7-day (`admin/invites/route.ts`)
   vs 14-day (`webhooks/stripe/route.ts`), confirmed by reading both. Worth reconciling regardless of
   the SLA question — it's an inconsistency, not a deliberate two-tier design as far as this pass can
   tell (no comment explains the difference).

## 4. Verdict

**Gated go-live (status flips `'active'`): achievable within 15 days, but only if the owner accepts
the invite within the first few days.** The domain/DNS mechanics themselves aren't the long pole — the
human dependency on invite acceptance is, since it alone can eat the entire budget with zero warning to
anyone that it's happening.

**Business-ready go-live (DID/10DLC live, SEO indexed): not reliably achievable in 15 days as this
pipeline is currently instrumented**, because two of the biggest real-world waits (10DLC vetting, SEO
indexing) run entirely outside any gate, alert, or tracked checklist deadline. A tenant can look "done"
in the `tenants` table while still not actually serving customers.

## 5. Recommended next actions (not implemented, file-only)

- Add a reminder before the invite expires (a day-7 nudge at minimum, for both the 7-day and 14-day
  variants) — right now the first signal anyone gets is silence, then a dead link.
- Add a `telnyx`/`comms` gate stage per `provisioning-runbooks.md` §3's own existing recommendation —
  cross-referencing that ask, not restating the design here.
- If a 15-day SLA is formally adopted, define it against **business-ready**, not just `status='active'`
  — otherwise the metric will report green while tenants are still non-functional. This is the same
  conclusion `prospect-to-live-runbook.md` §8 reaches independently from the Path-B angle; this doc
  reaches it from the Path-A timeline angle.
- Reconcile the 7-day vs. 14-day invite-expiry inconsistency — confirm with Jeff which policy is
  intended and align both call sites.
- Confirm actual 10DLC vetting and Google indexing timelines against the vendor/Search Console rather
  than relying on this doc's external estimates — those numbers are industry-general knowledge, not
  something this pass could verify from the codebase.

## Cross-references

- `deploy-prep/prospect-to-live-runbook.md` — the pipeline this timeline is built on; §8 already
  proposes the SLA-tracking mechanism this doc assumes doesn't exist yet.
- `deploy-prep/provisioning-runbooks.md` — per-failure-mode detail for domain/payment/DID/SEO.
- `deploy-prep/provisioning-failure-runbooks.md` — the invite-expiry and funnel-mode failure detail.
- `deploy-prep/health-monitor-coverage-gap.md` — the single-channel alert-path gap that any new
  invite/domain-limbo alert would inherit if not addressed first.
