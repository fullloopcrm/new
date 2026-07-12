# ADR 0003 — Voice is hardcoded to nycmaid: derive the tenant per-call from the dialed DID, guarded by an assert, before a second voice tenant

- **Status:** Proposed (recommendation: derive-per-DID + assert guard **before** onboarding any second voice tenant)
- **Date:** 2026-07-11
- **Decision driver:** The inbound-voice webhook writes every call into nycmaid's tenant. The moment a second tenant gets a voice number, its calls land in nycmaid's ComHub. What has to change first?
- **Deciders:** Jeff (owner), platform leader
- **Author:** W3 (reconcile-gate lane), file-only

---

## Context

Inbound voice (the ComHub call-control flow: answer customer → ring admin softphones/cells → voicemail + missed-call SMS) is handled by `platform/src/app/api/webhooks/telnyx-voice/route.ts`. **It is bound to nycmaid at the code level, on purpose, and the code says so:**

```
// Bind to nycmaid tenant — single Telnyx voice connection (TELNYX_VOICE_CONNECTION_ID,
// ADMIN_RING_LIST) is nycmaid's. Other tenants need their own voice routing config.
const NYCMAID_TENANT_ID = '00000000-0000-0000-0000-000000000001'
```

(`telnyx-voice/route.ts:9`)

That constant is then written as the tenant on **every** persisted row in the flow — verified, not inferred:

- `comhub_active_calls` insert → `tenant_id: NYCMAID_TENANT_ID` (`route.ts:475`)
- `comhub_messages` insert → `tenant_id: NYCMAID_TENANT_ID` (`route.ts:243`)
- `comhub_missed_call_sms` insert → `tenant_id: NYCMAID_TENANT_ID` (`route.ts:309`)

Two more couplings are hardcoded to nycmaid in the same file:
- The voicemail notification links to `https://www.thenycmaid.com/admin/comhub?thread=...` (`route.ts:338`) — nycmaid's domain, literal.
- SMS goes out via `sendSMS` from `@/lib/nycmaid/sms` (`route.ts:3`), and `TELNYX_FROM_NUMBER` defaults to nycmaid's number (`route.ts:7`).

And the connection-level routing (`TELNYX_VOICE_CONNECTION_ID`, `ADMIN_RING_LIST`) is a single env-global set — nycmaid's — per the file comment (`route.ts:9-10`).

**Why this is safe today and only today:** there is exactly one voice tenant. nycmaid is the only tenant with a live Telnyx voice number pointed at this webhook, so hardcoding its tenant id is currently correct-by-accident. The design note (`platform/CLAUDE.md`, "THE GLOBAL RULE") requires tenants to differ by *data, never code* — this webhook violates that rule, and the violation is latent, not visible, until a second number exists.

**The key fact that makes a fix cheap:** the webhook already receives the dialed number. Telnyx sends `to` (the DID the customer called) in the call-control payload, and the code already reads it — `p.to` is captured as `toAddress` on the inbound `call.initiated` branch (`route.ts:409`, used at `route.ts:468`). It is currently used only for logging, **not** for tenant resolution. The tenant is derivable from the same `telnyx_phone` column that the softphone path already reads per-tenant (`platform/src/lib/comhub-voice-config.ts:53`, `tenants.telnyx_phone`). So a DID→tenant lookup is `tenants.telnyx_phone == p.to`.

Note the outbound softphone path is **already** multi-tenant (`comhub-voice-config.ts` resolves `tenants.telnyx_*` per tenant, env only as fallback). The gap is specifically the **inbound webhook**, which never resolves a tenant at all.

## What breaks the instant a second voice tenant exists

If a second tenant is given a Telnyx number pointed at this webhook **before** the fix:

- Its inbound calls, voicemails, and missed-call SMS are written with `tenant_id = NYCMAID_TENANT_ID` → **they appear in nycmaid's ComHub inbox**, not the second tenant's. Cross-tenant data leak on a customer-facing surface.
- Voicemail notifications link the second tenant's admins to `thenycmaid.com/admin/comhub` — a tenant they can't access.
- Admin ring targets come from nycmaid's `ADMIN_RING_LIST` → the second tenant's calls **ring nycmaid's staff**.

This is a silent cross-tenant contamination, not a crash — the worst kind, because nothing surfaces the error until nycmaid's operators see another business's calls.

## Options considered

### Option A — Leave it hardcoded; onboard the second voice tenant later, "carefully"

- **Pros:** No work now.
- **Cons:** The hardcode is a tripwire with no guard. The failure mode is a cross-tenant leak that only shows up in production, after a real customer has called the wrong inbox. Relying on "remember to fix voice before adding a number" is exactly the kind of undocumented coupling that causes incidents. Rejected.

### Option B — Derive the tenant per-call from the dialed DID, and add an assert guard (the proposal)

Two parts:

1. **Derive-per-DID.** At the top of the inbound branch, resolve the tenant from `p.to` (`tenants.telnyx_phone == p.to`, active) into a `tenantId`, and thread that `tenantId` through every insert (`comhub_active_calls`, `comhub_messages`, `comhub_missed_call_sms`) and every tenant-scoped read, replacing the `NYCMAID_TENANT_ID` literal. Ring list, from-number, admin-link domain, and SMS sender all become per-tenant (`tenants.telnyx_*` + tenant domain), env as fallback.
2. **Assert guard.** If the DID does not resolve to exactly one active tenant, **do not silently fall back to nycmaid** — refuse the call path (return a handled error / route to a safe default that is *not* another tenant's inbox) and log loudly. This is the analogue of `assertNycmaidInvariant` (ADR 0001): a hard guard so a mis-provisioned number fails closed instead of leaking into nycmaid.

- **Pros:** Restores the "tenants differ by data, not code" rule for voice. A second voice tenant becomes a *data* change (add its number + `telnyx_*` config), not a code change. The guard makes the dangerous case (unmapped DID) fail closed instead of contaminating nycmaid.
- **Cons:** Real work in a 733-line webhook: thread `tenantId` through ~3 inserts + reads, make ring-list/from-number/domain/SMS per-tenant, and add the DID lookup + guard. Needs the DID→tenant mapping to actually be populated (a data precondition). Must be tested against nycmaid's existing flow to prove no regression on the one live voice tenant.

## Decision

**Recommend Option B, sequenced so nycmaid is never at risk and no second voice tenant is onboarded before the guard exists:**

1. **Add the assert guard first (fail-closed), even before full per-DID threading.** The cheapest safety win: resolve `p.to` and *assert it maps to nycmaid* for now. If an unmapped or non-nycmaid DID ever hits the webhook, it fails closed and logs — so a second number added prematurely cannot silently leak into nycmaid. This is a small, low-risk change that removes the tripwire immediately.
2. **Then thread `tenantId` through the flow** (inserts, reads, ring list, from-number, admin-link domain, SMS sender), env/nycmaid as fallback only where a tenant genuinely hasn't configured voice.
3. **Regression-prove against nycmaid** on both the answer→ring→bridge path and the no-answer→voicemail→missed-call-SMS path *before* any second tenant is provisioned. nycmaid's behavior must be byte-for-byte unchanged (same guarantee ADR 0001 protects for the agent).
4. **Only after 1–3**, onboard a second voice tenant as a **data** change: add its `telnyx_phone` + `telnyx_*` config and DID mapping; no code edit.

**Hard gate:** no second voice tenant gets a number pointed at this webhook until at least step 1 (the fail-closed guard) is deployed. Adding the number first is the one action that turns this latent bug into a live cross-tenant leak.

## Consequences

**If we derive-per-DID + guard (recommended):**
- Voice joins the rest of the platform in differing by data, not code. A second voice tenant is a config row, not a deploy.
- The unmapped-DID case fails closed and loud, so a provisioning mistake can't contaminate nycmaid's inbox.
- nycmaid is regression-proven before anything else changes.

**If we onboard a second voice tenant before the fix (rejected):**
- Its calls, voicemails, and missed-call SMS land in nycmaid's ComHub; its calls ring nycmaid's staff; its admins get links to nycmaid's domain. A cross-tenant leak on a live, customer-facing channel, discovered only after it happens.

**Follow-ups this ADR depends on (tracked elsewhere, not resolved here):**
- Confirm the DID→tenant source: `tenants.telnyx_phone` is the natural key (softphone path already uses it); verify it's populated for nycmaid and will be for any second tenant. Needs a DB read (out of scope for this lane — leader/Jeff).
- Decide the fail-closed target for an unmapped DID (handled error vs. a neutral platform IVR) — must never be another tenant's inbox.
- Per-call ADMIN_RING_LIST / voice-connection resolution: today these are single env-globals (`route.ts:9-10`); a second voice tenant needs its own, which is a data + Telnyx-provisioning task beyond this webhook.
