# Credential Rotation Policy — Stripe / Telnyx / Resend / Supabase service-role / encryption key

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12 · **Status:** proposed policy, 0% implemented
**Scope:** WHEN and WHY to rotate these five credentials, and WHO owns the action. This is deliberately
narrower than — and depends on — `deploy-prep/secrets-inventory-and-rotation-plan.md`, which already
documents the full rotation *mechanics* (exact procedure, breaking/non-breaking classification, blast
radius) for **every** secret in the platform, including these five. Read that doc for "how." This doc
answers "how often, on what trigger, and who's accountable" — a policy layer that doesn't exist yet.

**Verification anchors read this pass:** `lib/secret-crypto.ts:16-27`, `lib/supabase.ts:1-11`,
`lib/onboarding-verify.ts` (full file, reused below as the post-rotation verification mechanism),
`deploy-prep/secrets-inventory-and-rotation-plan.md` (existing, full read),
`deploy-prep/secrets-at-rest-audit.md` (existing, referenced for the encryption-key special case).
Confirmed by grep: **no rotation automation, expiry tracking, or reminder cron exists anywhere in this
codebase** for any credential — every `cron/*` route was checked for rotation/expiry logic; the only
hits are unrelated (session-token expiry, recurring-schedule resume), not credential rotation.

---

## TL;DR

This policy is a proposal to fill a real gap: today, rotation of these five credentials happens **only**
reactively, with no cadence, no ownership record, and no verification step. That's not a criticism of
prior work — the mechanics doc already did the hard part (how to rotate each one safely). What's missing
is the operational habit: a calendar cadence, a trigger list, and a "did it actually work" check. Nothing
in this document is implemented — no cron added, no rotation performed, no live credential touched.

---

## 1. Scope — the five credentials, current storage

| Credential | Scope | Storage | Notes |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | Platform-wide | Vercel env | Per-tenant `stripe_api_key` also exists (encrypted in `tenants` table) — see `lib/stripe.ts`, decrypts tenant key or falls back to the platform env key. |
| `TELNYX_API_KEY` (+ `NYCMAID_TELNYX_KEY`) | Platform-wide | Vercel env | Per-tenant `telnyx_api_key` (encrypted) is the norm for live tenants — see `provisioning-runbooks.md` §3. |
| `RESEND_API_KEY` (+ `NYCMAID_RESEND_KEY`) | Platform-wide | Vercel env | Per-tenant `resend_api_key` (encrypted) also exists. |
| `SUPABASE_SERVICE_ROLE_KEY` | Platform-wide, single value | Vercel env | **No per-tenant equivalent — this is the one DB god-key.** `lib/supabase.ts:5` falls back to the literal string `'placeholder'` if unset at boot, rather than throwing. The app does not crash-fail loud on a missing key; it silently constructs a client against a fake URL that will simply error on every query. Worth a loud startup assertion — **not fixed here** (file-only pass), flagged as a real footgun for whoever owns rotation. |
| `SECRET_ENCRYPTION_KEY` | Platform-wide, single value | Vercel env | The envelope key for **every** per-tenant secret above (Stripe/Telnyx/Resend/IMAP/Anthropic/Telegram keys stored encrypted in `tenants`). `getKey()` in `lib/secret-crypto.ts:20-24` **throws loud** if unset — good, fail-closed, unlike the Supabase key above. This is the highest-stakes credential in this list: per `secrets-at-rest-audit.md`, there is no key-id envelope and no re-encrypt tooling, so rotating it today is a breaking outage, not a routine action. |

## 2. Rotation cadence policy (proposed)

| Credential | Time-based cadence | Breaking on rotation? | Owner |
|---|---|---|---|
| `STRIPE_SECRET_KEY` (+ per-tenant) | 90 days | No — Stripe supports overlapping keys; create→swap→revoke is zero-downtime | Jeff (Stripe dashboard access) |
| `TELNYX_API_KEY` (+ per-tenant) | 90 days | No — new key, swap, delete old | Jeff (Telnyx dashboard access) |
| `RESEND_API_KEY` (+ per-tenant) | 90 days | No — new key, swap, revoke | Jeff (Resend dashboard access) |
| `SUPABASE_SERVICE_ROLE_KEY` | 180 days | **Yes** — brief downtime window; rotate at Supabase, paste into Vercel env, redeploy in the same change (per `secrets-inventory-and-rotation-plan.md` item #9) | Jeff (Supabase org owner) |
| `SECRET_ENCRYPTION_KEY` | **No routine cadence — see §2a** | **Yes, catastrophically** — every stored tenant secret becomes undecryptable | Jeff, only on confirmed compromise |

90 days for the three vendor API keys is a starting proposal, not a number derived from any compliance
requirement found in this codebase — adjust if Jeff has an existing policy elsewhere. The distinction
that matters is: the top three are cheap, safe, and routine; the bottom two are not, and should be
treated differently by policy, not just by procedure.

### 2a. `SECRET_ENCRYPTION_KEY` — the deliberate exception

This key does **not** get a routine rotation cadence in this policy, and that's intentional, not an
oversight. Per `secrets-at-rest-audit.md` §5, rotating it today has no re-encrypt path — every `v1:`
envelope in the `tenants` table was sealed with the current key, and swapping keys makes all of them
fail GCM authentication simultaneously (mass decrypt failure across every tenant's Stripe/Telnyx/Resend/
Anthropic/IMAP/Telegram secret at once). Putting this on a 90-day calendar would mean scheduling a
recurring outage for no security benefit. **Pre-requisite before this key can join the routine-cadence
list:** the keyring/`kid`-envelope + offline re-encrypt job described in the audit. Until that exists,
this key rotates **only** on confirmed compromise, accepting the documented outage as the cost of that
specific incident — see §3.

## 3. Trigger-based rotation (applies regardless of the time-based cadence above)

Rotate immediately, off-cycle, on any of the following — for **any** of the five credentials:

- Confirmed or suspected leak: committed to git (even briefly, even if reverted), logged in plaintext
  anywhere, pasted into a chat/ticket/screen-share, or found in a stack trace/error log.
- Staff or contractor offboarding, for any credential they had dashboard or env access to.
- A vendor-side breach notice (Stripe, Telnyx, Resend, or Supabase security advisory naming your
  account/org, even indirectly).
- Any production incident where the credential's value appeared unredacted in logs, error responses, or
  monitoring output.

For the three vendor keys and the Supabase service-role key, trigger-based rotation follows the same
safe procedure as routine rotation (§2, create→swap→revoke or the breaking Supabase sequence) — just
off-cycle. For `SECRET_ENCRYPTION_KEY`, a trigger event means accepting the outage in §2a; there is no
safer path today.

## 4. Ownership and access

All five credentials require vendor-dashboard or Vercel-env write access that **no worker lane has**
(per this repo's standing rule: workers prepare files, never touch live prod credentials). Every
rotation in this policy is 100% Jeff-gated. Worker lanes' role is limited to: detecting a credential
problem (via `onboarding-verify.ts` checks, per `provisioning-runbooks.md`), proposing a rotation is
needed, and — once Jeff has rotated a value — running the verification in §5. No lane should ever hold,
paste, or view a raw value for any of these five credentials.

## 5. Verification after rotation — how to confirm it actually worked

A rotation that "should have worked" is not verified — reuse the same live checks the codebase already
has, rather than inventing new ones:

- **Per-tenant Stripe/Telnyx/Resend keys:** `POST /api/admin/businesses/[id]/verify-checklist` for a
  representative tenant — `verifyStripeAccount`, `verifyTelnyxNumber`, `verifyResendDomain`
  (`lib/onboarding-verify.ts`) all make live calls against the new value.
- **Platform-level Stripe/Telnyx/Resend keys** (the env-var fallback, used when a tenant has no
  per-tenant key of its own): the same `verify-checklist` run against a tenant that has *no*
  `stripe_api_key`/`telnyx_api_key`/`resend_api_key` of its own will exercise the platform fallback
  path in `lib/stripe.ts` and equivalents.
- **`SUPABASE_SERVICE_ROLE_KEY`:** confirm the app boots and a basic admin-scoped read succeeds (e.g.
  the tenant-profile GET endpoint) — this also indirectly confirms the `lib/supabase.ts:5` placeholder
  fallback was not silently triggered by a typo'd new value.
- **`SECRET_ENCRYPTION_KEY`:** only ever rotated per §2a (compromise, planned outage). Post-rotation
  verification means confirming the re-encrypt job (once it exists) actually re-sealed every tenant's
  secrets under the new key — decrypt-and-recheck a sample of tenants across all six secret types before
  declaring it done, not just that the app started without throwing.

## 6. Logging / audit trail

**Today there is no record anywhere — in code or docs — of when any of these five credentials was last
rotated.** No cron, no reminder, no log table. This policy proposes (does **not** implement) a minimal
fix: a `deploy-prep/rotation-log.md` entry (or a `credential_rotations` table row) per rotation event,
recording date, credential, who performed it, and the trigger (routine cadence vs. which trigger in §3).
Without this, the 90/180-day cadences in §2 have no way to be enforced or even checked — flagging as a
concrete follow-on, out of scope for this file-only pass.

## 7. What this document does not do

It does not add any cron job, reminder, or automation. It does not rotate any credential. It does not
touch any live env var, Vercel project, or vendor dashboard. It is a policy definition only — the
mechanics for actually executing a rotation safely are already fully specified in
`deploy-prep/secrets-inventory-and-rotation-plan.md`.
