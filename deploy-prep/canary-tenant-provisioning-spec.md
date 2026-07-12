# Canary Tenant — Provisioning Spec

**Author:** W4 (verification-harness lane) · **Branch:** `p1-w4` · **Date:** 2026-07-12
**Status:** design/provisioning spec · doc-only · no code/routes/DB touched · **unblocks A5**

> Companion to `synthetic-canaries-spec.md`, which declares the dedicated canary
> tenant a **blocking prerequisite** (§1 there) but does not say how to stand one
> up. This doc is the how: the exact rows/columns to set, the side-effect traps
> to avoid, and a safe teardown. Provisioning itself is a **leader/DB action** —
> the SQL below is prepared as a script for the leader to run after Jeff approves;
> nothing here is executed from this lane.

---

## 0. TL;DR (read this first)

- **The whole game is credential isolation, and the safe-default is NOT uniform.**
  Every side-effecting send path in this codebase is keyed off a **per-tenant
  credential column**, and falls back differently when that column is null:

  | Side effect | Per-tenant key | If the column is NULL | Safe for a canary? |
  |---|---|---|---|
  | **SMS** (Telnyx) | `tenants.telnyx_api_key` + `tenants.telnyx_phone` | **no send at all** — `hasSMS = !!(telnyx_api_key && telnyx_phone)` | ✅ leaving null **is** the suppression |
  | **Stripe** | `tenants.stripe_api_key` (encrypted) | **falls back to platform `process.env.STRIPE_SECRET_KEY` (LIVE)** | ❌ null = **real charge risk** — MUST set a `sk_test_…` key |
  | **Email** (Resend) | `tenants.resend_api_key` | **falls back to platform `RESEND_API_KEY` (LIVE sender)** | ❌ null still sends — must route recipients to a sink |

  Grounding: SMS gate `src/lib/notify.ts:248,276` and `src/app/api/portal/auth/route.ts:68`;
  Stripe fallback `src/lib/stripe.ts:7`, `src/lib/payment-processor.ts:56,240`;
  Email fallback `src/lib/email.ts:6`, `src/lib/notify.ts:247`.

- **Consequence:** "just leave the keys blank" isolates SMS but **not** Stripe or
  email. A canary provisioned naively will (a) hit the platform's **live** Stripe
  account on the checkout canary and (b) send **real** admin/lead emails from the
  platform Resend key. Both of §1's traps must be closed explicitly.

- **Provision once, reset-in-place — do not create-per-run.** ~21 child tables FK
  to `tenant_id`; a create/delete-per-run canary means cascading cleanup across
  all of them every cycle. Use a **fixed** canary tenant + fixed synthetic client,
  and have each canary reset its own rows (§4).

---

## 1. Isolation requirements (close every trap)

### 1.1 Payments — force Stripe TEST mode (trap: live fallback)
`getStripe(tenant.stripe_api_key)` decrypts the tenant key, and **only if it is
null** uses `process.env.STRIPE_SECRET_KEY` — which in production is the platform
**live** key (`src/lib/stripe.ts:6-9`, `src/lib/payment-processor.ts:54-58,240`).

- **Action:** set `tenants.stripe_api_key` on the canary to an **encrypted
  `sk_test_…` key** (encryption via the same `encryptSecret` path used for real
  tenants — see `src/lib/secret-crypto*`). Never leave it null.
- **Assert after provisioning:** a checkout against the canary returns a session
  id beginning `cs_test_…`, not `cs_live_…`. If you see `cs_live_`, the key did
  not take — **stop, the canary is unsafe.**

### 1.2 SMS — suppress by omission (safe default)
`hasSMS` is false unless **both** `telnyx_api_key` and `telnyx_phone` are set
(`src/lib/notify.ts:248`; portal login `src/app/api/portal/auth/route.ts:68`).

- **Action:** leave **both** `telnyx_api_key` and `telnyx_phone` NULL. No SMS can
  be dispatched for the canary — the strongest possible suppression (no provider
  call happens at all).
- **Portal-login canary reads the code from the DB, not from a phone.** The 6-digit
  code is persisted to `portal_auth_codes` (`tenant_id, client_id, code,
  expires_at`) **before** any send (`route.ts:57-63`). The canary asserts login by
  selecting the freshest unexpired code for its `(tenant_id, client_id)` and
  posting it back — no SMS/email needed. This is the cleanest deep-login probe.

### 1.3 Email — the sneaky one (trap: platform fallback + SMS→email fallover)
Two ways real email escapes:
1. **Platform Resend fallback:** with `tenants.resend_api_key` null, sends use the
   platform `RESEND_API_KEY` (`src/lib/email.ts:6`, `notify.ts:247`) — real mail.
2. **Portal SMS→email fallover:** when SMS is suppressed (§1.2), portal login
   **falls back to emailing** `client.email` (`route.ts:84-96`). So a suppressed
   phone silently turns into a real email unless the recipient is a sink.

- **Action:** route **every** recipient the canary can reach to a sink inbox you
  control:
  - `tenants.owner_email` + admin-contact addresses → `canary@fullloopcrm.com`
    (or a `+canary` alias) so `emailAdmins` (`src/app/api/lead/route.ts:12`) lands
    in the sink, not a human's inbox.
  - the synthetic canary **client's** `email` → the same sink, so the portal
    fallover email (and lead-confirmation email) is harmless.
- **Optional hard-off:** set `tenants.notification_preferences` to disable the
  relevant comm keys once send paths consult `isCommEnabled` (currently inert —
  `src/lib/comms-prefs.ts:6-8` notes nothing calls it yet), so this is belt-and-
  suspenders, not the primary control. The primary control is the sink inbox.

### 1.4 Data isolation & reporting hygiene
- **Tag it.** Add `tenants.is_synthetic boolean default false` (new column — DDL
  below, leader-run) and set it `true` on the canary. Every prod revenue/analytics
  query should exclude `is_synthetic = true` so canary bookings/leads never
  pollute dashboards. (`synthetic-canaries-spec.md` §1 assumes this tag exists.)
- **Own domain/subdomain.** The canary needs a real host so middleware resolves it
  like any customer (`src/middleware.ts:216-252`). Recommended: platform subdomain
  `canary.homeservicesbusinesscrm.com` (no cert/DNS purchase, resolves via the
  existing subdomain path) with `tenants.slug = 'canary'`. A bare subdomain also
  **exercises the C-1 subdomain-coverage gap** from the health audit as a bonus.
- **Service-area sanity.** Give the canary a real zip + service area so the
  booking canary's address passes in-area validation (booking payload needs an
  in-area address — see `synthetic-canaries-spec.md` §2).

---

## 2. Provisioning method — two options

**Option A (preferred): admin create + targeted patch.**
1. Create via the existing path `POST /api/admin/businesses` (writes
   `status='setup'`, `billing_status='setup'`, `domain`, slug, timezone —
   `src/app/api/admin/businesses/route.ts:64-95`). This gives a normal, resolvable
   tenant with no special-casing.
2. Patch the isolation columns the create path does not set: encrypted
   `stripe_api_key` (test), `is_synthetic=true`, sink `owner_email`, null
   `telnyx_*`. (Leader/DB or an admin settings update — see §3 SQL.)

**Option B: direct insert.** One SQL insert with every column set (also §3). Faster
but bypasses any create-time side effects the admin route performs (e.g. seeding
default config); prefer A unless you know those are unnecessary for a canary.

Either way, provision the **synthetic client** the deep canaries act as (the
booking/portal canaries need a stable `client_id` in the canary tenant with a
sink email and a phone that never receives SMS).

---

## 3. Prepared DDL/DML (leader-run, after Jeff approval — NOT executed here)

> Save as `platform/migrations/2026_07_12_canary_tenant.sql` and run against the
> target project only after review. Values in `<…>` are placeholders. The
> `stripe_api_key` must be the **encrypted** form of an `sk_test_…` key (encrypt
> with the project's `encryptSecret`, do **not** paste a raw key into SQL/VCS).

```sql
-- 1. Tag column (idempotent). Exclude is_synthetic=true from all prod reporting.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_synthetic boolean NOT NULL DEFAULT false;

-- 2. The canary tenant. status stays a served-but-benign value; slug 'canary'.
INSERT INTO tenants (name, slug, industry, status, billing_status,
                     domain, timezone, zip_code, owner_email,
                     stripe_api_key, telnyx_api_key, telnyx_phone,
                     resend_api_key, is_synthetic)
VALUES ('Canary (synthetic)', 'canary', 'cleaning', 'active', 'setup',
        NULL,                       -- served on canary.homeservicesbusinesscrm.com subdomain
        'America/New_York', '<in-area-zip>', 'canary@fullloopcrm.com',
        '<ENCRYPTED_sk_test_key>',  -- REQUIRED: forces Stripe TEST mode (else live fallback)
        NULL, NULL,                 -- telnyx null → SMS fully suppressed
        NULL,                       -- resend null → platform key, but recipients are sinks
        true)
ON CONFLICT (slug) DO UPDATE
  SET stripe_api_key = EXCLUDED.stripe_api_key,
      telnyx_api_key = NULL, telnyx_phone = NULL,
      owner_email = EXCLUDED.owner_email,
      is_synthetic = true;

-- 3. Synthetic client the deep canaries act as (sink email; phone never texted).
--    Adjust column list to the real clients schema before running.
INSERT INTO clients (tenant_id, name, email, phone, active)
SELECT id, 'Canary Client', 'canary@fullloopcrm.com', '+10000000000', true
FROM tenants WHERE slug = 'canary'
ON CONFLICT DO NOTHING;
```

**Post-provision verification (run once, by hand):**
- `SELECT status, is_synthetic, stripe_api_key IS NOT NULL AS has_stripe,
   telnyx_api_key IS NULL AS sms_off FROM tenants WHERE slug='canary';`
  → expect `is_synthetic=t`, `has_stripe=t`, `sms_off=t`.
- Hit `https://canary.homeservicesbusinesscrm.com/` → serves the canary's own
  site (not `/site/template`, not the marketing page). Confirms middleware
  resolution end-to-end.
- Fire one checkout canary → session id is `cs_test_…` (§1.1 assertion).

---

## 4. Teardown / cleanup (reset-in-place)

The deep canaries write rows every run (`bookings`, `clients`/`portal_leads`,
`portal_auth_codes`). ~21 child tables FK to `tenant_id`, so **create/delete the
tenant per run is the wrong model** — it forces cascading cleanup everywhere.

**Strategy: keep the tenant forever, reap its transient rows.**
- **Bookings:** each booking canary either (a) deletes rows it created
  (`DELETE FROM bookings WHERE tenant_id = <canary> AND source = 'canary'`) or
  (b) reuses a fixed booking id it overwrites. Prefer a `source='canary'` marker
  on inserts so cleanup is a single scoped delete.
- **Leads:** `DELETE FROM clients/portal_leads WHERE tenant_id=<canary> AND
  email='canary@fullloopcrm.com'` on a schedule, or keep one fixed synthetic
  client and null its lead spawn.
- **Auth codes:** `portal_auth_codes` already self-expires (`expires_at`,
  10 min) and the route deletes prior unused codes per phone on each send
  (`route.ts:49-55`), so this table self-reaps — no extra teardown needed.
- **Never** run these deletes with an unscoped or slug-mismatched `tenant_id`.
  Every teardown statement must be `WHERE tenant_id = (SELECT id FROM tenants
  WHERE slug='canary' AND is_synthetic)` to make a wrong-tenant wipe impossible.

**Full decommission (if the canary is ever retired):** delete child rows by
`tenant_id` across the FK tables first, then the `tenants` row — leader/DB action,
never from an automated canary.

---

## 5. Open decisions for the leader (blocking A5)

1. **Domain choice:** platform subdomain `canary.homeservicesbusinesscrm.com`
   (zero-cost, recommended) vs a dedicated apex. Subdomain also covers the C-1 gap.
2. **`is_synthetic` column + reporting-exclusion sweep:** adding the column is
   cheap; the follow-through (every revenue/analytics query filters it) is the
   real work and must land or the canary pollutes dashboards.
3. **Stripe test key source:** which `sk_test_…` account backs the canary, and who
   encrypts it into `stripe_api_key`. Until this exists, the checkout canary
   **cannot** be enabled safely (§1.1).
4. **Sink inbox:** confirm `canary@fullloopcrm.com` (or a `+canary` alias) is real
   and monitored-but-ignorable, so §1.3 holds.

Until 1–4 are decided, canaries stay in the shallow GET-only mode Fortress already
runs — i.e. A5's deep canaries remain **blocked on this provisioning**.
