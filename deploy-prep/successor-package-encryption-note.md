# SUCCESSOR PACKAGE — ENCRYPTION-AT-REST / DECRYPT-ON-TRIGGER DESIGN

> **STATUS: DESIGN NOTE — FOR-JEFF-REVIEW.** Describes how the successor package
> (`deploy-prep/successor-package-template.md`) and its backing secrets are protected. No secrets or
> real values live in this file. Nothing here is implemented yet — it is the intended design.

The successor package is a paradox: it must contain enough to run the business in a crisis, yet if it
leaks it hands an attacker the keys to 22 brands. The design goal: **the package is useless to anyone
except the named successor at the moment it is actually needed.**

---

## 1. Two tiers of content

| Tier | What it is | Where it lives | Protection |
|------|-----------|----------------|------------|
| **Tier A — narrative** | Brand list, relationship *descriptions*, advisor names, runbook prose | The markdown template, plaintext | Access-controlled repo/store; no raw secrets by policy |
| **Tier B — secrets** | Credentials, banking, personal contact numbers, API keys | Encrypted blob, **never** in markdown | Encrypt-at-rest + decrypt-on-trigger (this doc) |

Tier A references Tier B only by **pointer** (e.g. "Stripe key → secret store item `brand-x/stripe`").
The markdown template already enforces this: every sensitive cell says `pointer`, never a value.

---

## 2. Sensitive fields (Tier B — must be encrypted, never plaintext)

Sourced from the live schema (`platform/supabase/schema.sql`) plus package-specific personal data.

### 2a. Per-tenant secrets already in the DB
These columns on `tenants` are live credentials — treat every one as Tier B:
- `stripe_api_key`  — Stripe secret key (full charge authority)
- `stripe_account_id` — Stripe Connect account
- `telnyx_api_key` / `telnyx_phone` — SMS send authority
- `resend_api_key` / `resend_domain` / `email_from` — email send authority
- `zelle_email`, `apple_cash_phone` — payout endpoints
- `google_place_id` — lower risk, but bundle for completeness

> The inventory query (`successor-inventory-query.sql`) reports these as **presence booleans only**
> (`has_stripe_key`, …) and never selects the value. That property must be preserved.

### 2b. Package-specific sensitive data (not in the app DB)
- Successor personal contact (Ashton's phone/email) — already in `SUCCESSOR-CONTACT.md`; keep that file
  out of any public surface
- Banking / bank login / routing for platform payouts and cost payments
- Advisor personal contact numbers
- Anchor-customer personal contacts and any confidential pricing/handshake terms
- Recovery material for email, DB (Supabase), and deploy (Vercel) accounts — master access

### 2c. Explicitly NOT sensitive (Tier A, plaintext OK)
- Brand/tenant names, slugs, industry, status
- Advisor names and their *domain* (legal/finance/…) without personal contact
- Revenue/cost *aggregates* once reviewed (totals, MRR) — figures, not credentials

---

## 3. Encrypt-at-rest

- **Algorithm:** authenticated symmetric encryption — **AES-256-GCM** (or libsodium
  `crypto_secretbox` / XChaCha20-Poly1305). Authenticated mode is mandatory so tampering is detectable.
- **What is encrypted:** the entire Tier-B blob (a structured JSON of the pointers' actual values),
  encrypted as one unit. Not field-by-field in markdown.
- **Data-encryption key (DEK):** random 256-bit key that encrypts the blob.
- **Key wrapping (envelope encryption):** the DEK is itself encrypted by a **key-encryption key (KEK)**
  held in a managed KMS (e.g. cloud KMS / 1Password / hardware token). The KEK never leaves the KMS.
  Rotating the KEK re-wraps the DEK without re-encrypting the blob.
- **At rest, an attacker who steals the blob** has AES-256-GCM ciphertext and a KMS-wrapped DEK — no
  usable material without the KEK.

---

## 4. Decrypt-on-trigger

Decryption is gated behind an explicit, auditable trigger so the package is inert during normal times.

### 4a. Trigger conditions (any one, defined by Jeff)
- **Dead-man's switch:** Jeff fails to check in for a configured window (e.g. N days). Check-in resets
  the timer. Missed → the trigger arms.
- **Manual break-glass:** Ashton (or a quorum, see 4c) explicitly requests decryption.
- Both should be supported; the dead-man's switch is the safety net if Jeff can't act.

### 4b. What "trigger" actually releases
The trigger authorizes the **KMS to unwrap the DEK** for the successor's authenticated session — it
does **not** email plaintext anywhere. Flow:
1. Trigger fires and is verified (identity + condition).
2. KMS unwraps the DEK to the successor's authenticated context only.
3. Successor decrypts the Tier-B blob locally; reads pointers' real values.
4. Every unwrap is logged (who, when, which trigger).

### 4c. Anti-abuse controls
- **Quorum / M-of-N (recommended):** require e.g. 2 of {Ashton, a named advisor, a lawyer} to release,
  so no single compromised party can pop the package. Shamir secret-sharing of the KEK-release
  authority is the clean implementation.
- **Notification:** any decryption attempt notifies Jeff (if reachable) and all quorum members — a
  surprise unwrap is itself an alarm.
- **Time-delay on manual trigger:** a configurable cool-off (e.g. 24–72h) before manual break-glass
  completes, during which Jeff can veto. The dead-man's switch has no delay (Jeff is by definition
  unreachable).
- **Audit log is append-only** and stored separately from the blob.

---

## 5. Rotation & hygiene

- Rotate the **KEK** on schedule (e.g. quarterly, aligned with the package's quarterly review) and
  immediately on any suspected compromise or advisor/successor change.
- Rotate the **DEK** by re-encrypting the blob whenever Tier-B contents change materially.
- When a per-tenant secret (Stripe/Telnyx/Resend key) is rotated in the app, update the blob so the
  package doesn't hand the successor a dead key.
- Never commit the blob, the DEK, or KEK material to git. This repo holds only Tier-A markdown and this
  design note. (Cross-check `deploy-prep/secrets-at-rest-audit.md` and
  `secrets-inventory-and-rotation-plan.md`.)

---

## 6. Threat cases this defends against

| Threat | Outcome |
|--------|---------|
| Repo / markdown leaks | Only Tier-A narrative exposed; no credentials (pointers only) |
| Encrypted blob stolen | Useless without KMS-held KEK |
| Single successor account compromised | Quorum + delay + notify blocks silent release |
| Jeff incapacitated | Dead-man's switch releases to successor through the audited path |
| Insider tries a quiet grab | Every unwrap notifies all parties and is logged |

---

## 7. Open decisions for Jeff (review checklist)

- [ ] Dead-man's-switch window (N days) and check-in method
- [ ] Quorum membership and M-of-N (recommend 2-of-3)
- [ ] Manual-trigger cool-off duration
- [ ] Which KMS / secret store holds the KEK (cloud KMS vs. 1Password vs. hardware token)
- [ ] Who holds the append-only audit log
- [ ] Confirm the inventory query stays presence-only for all secret columns (no value reads)
