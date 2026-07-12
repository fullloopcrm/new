# Secrets-at-Rest Audit — SECRET_ENCRYPTION_KEY usage + rotation risk

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12
**Scope:** Docs-only. Audit how vendor secrets are encrypted at rest, where the key comes from,
every read/write path that touches encrypted columns, and the **rotation / key-compromise** posture.
No code, routes, env, or DB changed. Gaps flagged inline and in §7.

---

## TL;DR

- **Mechanism is sound.** `src/lib/secret-crypto.ts` does AES-256-GCM with a random 12-byte IV and an
  auth tag, enveloped as `v1:<b64 iv>:<b64 ct>:<b64 tag>`. Key = `SECRET_ENCRYPTION_KEY` (64 hex chars =
  32 bytes). 7 tenant credential columns are covered via a single source-of-truth list
  (`ENCRYPTED_TENANT_FIELDS`). Both write paths reference that list, so there is **no field-list drift**.
- **GAP 1 (highest-impact, silent): no-key = plaintext, by design.** If `SECRET_ENCRYPTION_KEY` is unset
  or malformed, `encryptTenantSecrets()` **stores vendor API keys in cleartext** in Postgres and only emits a
  one-time `console.warn`. A prod deploy that forgets the key silently persists Stripe/Telnyx/Resend/Anthropic
  keys in plaintext — no error, no 500, no user-visible signal.
- **GAP 2 (enables GAP 1): the key is not in `.env.example` or the cutover env docs.** It appears only in the
  `/api/docs` runtime env list. Nothing in `platform/.env.example` or `ENV-VARS-FOR-CUTOVER.md` tells the
  operator to provision it → it is the single most likely env var to be forgotten → triggers GAP 1.
- **GAP 3 (the headline — rotation is a breaking outage):** the envelope carries a **format** version (`v1:`)
  but **no key id**. There is exactly one key, no dual-key/decrypt-fallback, and **no re-encryption script**.
  Rotating `SECRET_ENCRYPTION_KEY` makes every existing `v1:` envelope fail GCM auth → `decryptSecret()`
  **throws** → every money/comms path that decrypts a tenant key breaks for **all tenants** until each secret
  is manually re-entered. `CUTOVER-CHECKLIST.md` explicitly lists "`SECRET_ENCRYPTION_KEY` rotation procedure"
  under **"What this checklist does NOT cover."** So a suspected key compromise currently has **no clean
  remediation** — you cannot rotate without downtime + loss of every stored secret.
- **GAP 4 (multi-tenant blast radius):** one global key encrypts every tenant's secrets. Compromise of the
  single key exposes **all** tenants. No per-tenant keys, no crypto-shredding.
- **GAP 5 (secrets shipped to the browser):** `GET /api/settings` and `GET /api/admin/settings` return the
  **full tenant row**, including the secret columns. Encrypted values are inert ciphertext, but any tenant
  still on **legacy plaintext** (GAP 1 fallout) ships its **real API keys to the client**.
- **GAP 6 (health check has blind spots):** the `/admin/security` "encrypted at rest" indicator only inspects
  3 of the 7 encrypted columns (`stripe/telnyx/resend`), so `imap_pass`, `anthropic_api_key`, `indexnow_key`,
  and `telegram_bot_token` plaintext would report as clean.

**Method note (honesty):** I read `secret-crypto.ts` end-to-end and every import site of it (grepped
`secret-crypto`/`encryptSecret`/`decryptSecret`/`SECRET_ENCRYPTION_KEY`). Read paths were confirmed by opening
the settings + verify-checklist + businesses write handlers. I did **not** run the app or inspect the live DB,
so the *current* plaintext-vs-encrypted state of production rows is unknown from here — that is exactly what
the `/admin/security` page (GAP 6) is meant to answer, and its coverage is partial.

---

## 1. The primitive (verified) — `src/lib/secret-crypto.ts`

| Property | Value | Notes |
|---|---|---|
| Algorithm | `aes-256-gcm` | Authenticated encryption — good choice |
| IV | `randomBytes(12)` per encrypt | Fresh IV per call — good |
| Auth tag | stored in envelope, `setAuthTag` on decrypt | Tamper-evident |
| Envelope | `v1:<b64 iv>:<b64 ct>:<b64 tag>` | `v1` = **format** version, **not** a key id |
| Key source | `process.env.SECRET_ENCRYPTION_KEY`, must be 64 hex | `getKey()` throws if missing/wrong length |
| Legacy tolerance | `decryptSecret()` returns input unchanged if no `v1:` prefix | Plaintext still readable; re-save upgrades |
| Covered columns | `ENCRYPTED_TENANT_FIELDS` (7) | `stripe_api_key, telnyx_api_key, resend_api_key, imap_pass, anthropic_api_key, indexnow_key, telegram_bot_token` |

**Good:** `encryptTenantSecrets()` is idempotent (skips already-`v1:` values) and non-destructive (leaves
empty/null untouched so a tenant can clear a key). The businesses write path aliases the shared list
(`const ENCRYPTED_FIELDS = ENCRYPTED_TENANT_FIELDS`) — **no drift** between the two writers.

---

## 2. Write paths (encrypt) — verified

| Path | How it encrypts | OK? |
|---|---|---|
| `api/settings/route.ts` PUT (tenant self-serve) | `encryptTenantSecrets(body)` | ✅ uses shared list |
| `api/admin/settings/route.ts` PUT | `encryptTenantSecrets(...)` | ✅ |
| `api/admin/businesses/[id]/route.ts` PATCH | loops `ENCRYPTED_FIELDS` + `encryptSecret` + `isEncrypted` guard | ✅ shared list |
| `api/admin/businesses/[id]/profile/route.ts` | `encryptTenantSecrets(...)` | ✅ |

No write path was found that saves a covered column **without** going through the encrypt helper. (This is the
one dimension of this feature that is in good shape.)

## 3. Read paths (decrypt) — verified

All of these call `decryptSecret()` before using a tenant key as a Bearer token / SDK credential:

`lib/stripe.ts`, `lib/comhub-voice-config.ts`, `api/invoices/public/[token]/checkout`,
`api/quotes/public/[token]/deposit-checkout`, `api/invoices/[id]/send`, `api/quotes/[id]/send`,
`api/documents/[id]/send`, `api/documents/public/[token]/sign`, `api/dashboard/comms-preview`,
`api/finance/ai-ask`, `api/finance/receipts`, `api/finance/bank-connect/session`,
`api/routes/[id]/publish`, `api/team-members/[id]/stripe-status`,
`api/webhooks/telegram/[tenant]`, `api/cron/comhub-email`,
`api/admin/businesses/[id]/verify-checklist`.

**Failure mode to note:** `decryptSecret()` **throws** on a malformed envelope or an auth-tag mismatch (wrong
key). None of the callers above wrap it in a try/catch around the decrypt itself — they use the returned string
directly. So a key mismatch (see §5) turns every one of these into an unhandled 500. On the **public money
paths** (invoice/quote checkout, document sign) that is a customer-facing failure, not just an admin one.

---

## 4. GAP 1 — no key ⇒ silent plaintext at rest

`encryptTenantSecrets()` (secret-crypto.ts:100-119):

```
if (!encryptionKeyAvailable()) {
  // one-time console.warn, then...
  return updates          // <-- secrets saved verbatim (PLAINTEXT)
}
```

This is a deliberate "degrade gracefully instead of 500" choice, and it is defensible for **availability**.
But the failure is **silent and at-rest**: forget the env var in prod and every tenant's vendor keys land in
Postgres in cleartext, with only a server log line as evidence. Given GAP 2 (below), forgetting it is likely.

**Recommendation (not applied):** in production (`NODE_ENV==='production'`), treat a missing
`SECRET_ENCRYPTION_KEY` as **fail-closed** for writes to covered columns (reject the save with a clear error)
rather than silently storing plaintext — or at minimum surface it as a startup/health-check failure, not a
buried warn. Leader/Jeff decides; nothing changed here.

## 5. GAP 3 — rotation is currently a breaking operation

Because the envelope has **no key id**, `decryptSecret()` always tries the *current* `SECRET_ENCRYPTION_KEY`
against every `v1:` envelope. Consequences:

1. **Rotate the key → mass decrypt failure.** Every previously-encrypted secret was sealed with the old key;
   GCM auth fails under the new key; `decryptSecret()` throws. All 17 read paths in §3 break **for every
   tenant** simultaneously until each secret is re-saved (which re-encrypts under the new key).
2. **No migration/re-encryption tooling exists.** There is no script that walks `tenants`, decrypts with the
   old key, and re-encrypts with the new one. `grep` for `rotat|re-encrypt|keyId` in `secret-crypto.ts`: none.
3. **Key compromise has no clean fix.** The standard response to a leaked encryption key is *rotate + re-wrap*.
   Here that means downtime + manually re-entering every tenant's Stripe/Telnyx/Resend/Anthropic/IMAP/Telegram
   key, because the ciphertext becomes unrecoverable the moment the old key is gone.
4. `CUTOVER-CHECKLIST.md:287` lists the rotation procedure as **explicitly not covered** ("post-cutover
   hardening").

**What a safe rotation design would need (design note, not built):**
- Put a **key id** in the envelope (`v2:<kid>:iv:ct:tag`) and let `decryptSecret()` select the key by id from a
  small keyring (`SECRET_ENCRYPTION_KEY` + `SECRET_ENCRYPTION_KEY_PREVIOUS`), so old and new coexist.
- A **re-encryption job** (offline script, run by leader after Jeff approves — never a prod write from a worker)
  that decrypts-with-old, encrypts-with-new, and bulk-updates. Idempotent, resumable.
- Only after every row is `kid=new` do you drop the previous key.

## 6. GAP 5 — encrypted (and legacy-plaintext) secrets shipped to client

- `GET /api/settings` → `return NextResponse.json({ tenant })` (settings/route.ts:12-13) — the **whole tenant
  row**, secret columns included.
- `PUT /api/settings` → returns `{ tenant: data }` from `.select().single()` — same, post-update.
- `GET /api/admin/settings?tenant_id=…` → `.select('*')` → `{ tenant }` (admin/settings/route.ts:42-52).

For encrypted rows this ships inert `v1:` ciphertext (low risk, but unnecessary — no browser needs the sealed
key). For any tenant still on **legacy plaintext** (GAP 1), it ships the **real key** to the client. These
endpoints are permissioned (`settings.edit` / admin), so it is not an anonymous leak, but it is broader
exposure than needed. **Recommendation:** strip/mask the 7 covered columns from GET responses (return a boolean
"configured" flag instead of the value), the way a masked secret field normally works.

---

## 7. Flagged gaps (summary) — docs only, nothing applied

| # | Gap | Severity | Fix direction (leader/Jeff decides) |
|---|---|---|---|
| 1 | No key ⇒ silent plaintext at rest, warn-only | **HIGH** | Fail-closed in prod, or hard health-check failure |
| 2 | `SECRET_ENCRYPTION_KEY` absent from `.env.example` + `ENV-VARS-FOR-CUTOVER.md` | HIGH | Add to both (enables GAP 1) |
| 3 | Rotation = breaking outage; no key id, no re-encrypt script | **HIGH** | Keyring + `kid` envelope + offline re-encrypt job |
| 4 | One global key = all-tenant blast radius | MEDIUM | Per-tenant keys / envelope-per-tenant (larger design) |
| 5 | Secret columns returned by settings GET/PUT (plaintext for legacy rows) | MEDIUM | Mask covered columns in responses |
| 6 | `/admin/security` health check covers 3 of 7 encrypted columns | LOW | Extend `SECRET_COLS` to all `ENCRYPTED_TENANT_FIELDS` |
| — | `decryptSecret()` throws → unhandled 500 on money paths under key mismatch | MEDIUM | try/catch + degrade (ties to GAP 3) |

**Doing well (not gaps):** authenticated AES-256-GCM; fresh IV per encrypt; single source-of-truth field list
with no writer drift; idempotent, non-destructive encryption; legacy-plaintext read tolerance so migration is
gradual and non-breaking.

---

## Appendix — verification commands used

```
grep -rnE "secret-crypto|encryptSecret|decryptSecret|SECRET_ENCRYPTION_KEY" src   # all read/write sites
grep -n  "ENCRYPTED_FIELDS|ENCRYPTED_TENANT_FIELDS" src/app/api/admin/businesses/[id]/route.ts  # drift check
grep -rn "SECRET_ENCRYPTION_KEY" .env.example ENV-VARS-FOR-CUTOVER.md CUTOVER-CHECKLIST.md       # provisioning
sed  -n '33,49p' src/app/admin/security/page.tsx   # health-check column coverage (3 of 7)
```

**Nothing in this audit was applied. No routes, env files, keys, or DB rows were modified.**
