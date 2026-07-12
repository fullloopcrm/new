# Rate-Limit Coverage Audit

**Scope:** state-changing + auth endpoints under `platform/src/app/api/*` — login, OTP,
PIN, portal/team auth, booking create, payment, and public form submits.
**Method:** direct grep + read of every `route.ts` that calls a limiter, plus targeted
reads of the sensitive endpoints that don't (2026-07-12, branch `p1-w6`). Docs only — no
code changed.
**Total route files:** 498. **Files that call a rate limiter:** 28 (all via `rateLimitDb`).

---

## The two limiter primitives

| Primitive | File | Store | Survives serverless cold start / multi-instance? |
|---|---|---|---|
| `rateLimitDb(key, max, windowMs)` | `src/lib/rate-limit-db.ts` | Postgres `rate_limit_events` table | ✅ yes — shared across all instances |
| `rateLimit(key, max, windowMs)` | `src/lib/rate-limit.ts` | in-memory `Map` | ❌ no — per-instance, wiped on cold start |

**`src/lib/rate-limit.ts` (the in-memory one) is dead code** — grep finds zero imports of
`@/lib/rate-limit` anywhere in `src/` outside its own `.test.ts`. Every live route uses the
DB-backed limiter. One endpoint (`auth/login`) hand-rolls its *own* in-memory `Map` inline
instead of using either helper (see finding #1).

**No middleware-level blanket rate limiting.** `src/middleware.ts` contains no limiter — every
endpoint is on its own.

`rateLimitDb` **fails open** on any DB error (`rate-limit-db.ts:27-31`, `:43-45`): if the
Postgres count query throws, the request is allowed. Acceptable for availability, but it means
a DB outage silently disables all rate limiting platform-wide.

---

## Protected endpoints (28 files, all `rateLimitDb`)

Limits shown as `max / window`, keyed by whatever follows the bucket prefix.

| Endpoint | Bucket key | Limit | Keyed by |
|---|---|---|---|
| `admin-auth` | `admin_auth:{ip}` | 5 / 15m | IP |
| `apply` | `apply:{tenant}:{ip}` | 3 / 10m | tenant+IP |
| `apply-ceo` | `apply_ceo:{tenant}:{ip}` | 3 / 10m | tenant+IP |
| `apply/signed-url` | `apply_signed:{tenant}:{ip}` | 10 / 10m | tenant+IP |
| `cleaners/upload` | `upload:{tenant}:{ip}` | 3 / 10m | tenant+IP |
| `client/book` | `client-book:{tenant}:{ip}` | 3 / 10m | tenant+IP |
| `client/check` | `client-check:{tenant}:{ip}` | 10 / 10m | tenant+IP (2 call sites) |
| `client/collect` | `client-collect:{tenant}:{ip}` | 3 / 10m | tenant+IP |
| `client/login` | `client-login:{tenant}:{ip}` | 5 / 10m | tenant+IP |
| `client/send-code` (OTP send) | `client-send-code:{tenant}:{identifier}` | 3 / 10m | tenant+phone/email |
| `client/verify-code` (OTP verify) | `client-verify:{tenant}:{ip}` | 5 / 10m | tenant+IP |
| `contact` | `contact:{tenant}:{ip}` | 3 / 10m | tenant+IP |
| `errors` | `errors:{ip}` | 30 / 1m | IP |
| `lead` | `lead:{tenant}:{ip}` | 5 / 10m | tenant+IP |
| `lead-media/signed-url` | `lead_media_signed:{tenant}:{ip}` | 60 / 10m | tenant+IP |
| `management-applications` | `mgmt_app:{tenant}:{ip}` | 3 / 10m | tenant+IP |
| `management-applications/draft` | `mgmt-draft:{ip}` | 30 / 1m | IP |
| `management-applications/signed-url` | `mgmt_app_signed:{tenant}:{ip}` | 10 / 10m | tenant+IP |
| `management-applications/upload` | `mgmt_app_upload:{tenant}:{ip}` | 5 / 10m | tenant+IP |
| `pin-reset` | `pin_reset:{tenant}:{contact}` | 5 / 15m | tenant+contact |
| `portal/auth` | `portal_auth:{phone}` | 5 / 15m | phone |
| `portal/collect` | `collect:{tenant}:{ip}` | 3 / 10m | tenant+IP |
| `prospects` | `qualify:{ip}` | 3 / 60m | IP |
| `referrers/auth/request` (OTP) | `referrer_otp_req:{ip}:{email}` | 5 / 15m | IP+email |
| `referrers/auth/verify` (OTP) | `referrer_otp_verify:{ip}:{email}` | 8 / 15m | IP+email |
| `reviews/submit` | `reviews:{ip}` | 5 / 60m | IP |
| `team-portal/auth` | `team_portal_auth_fail:slug:{slug}` + `...:ip:{ip}` | dual bucket (per-tenant + per-IP) | slug & IP |
| `track` | `track:{ip}` | 240 / 1m | IP |

Auth/OTP/PIN endpoints are well covered here: `admin-auth`, `portal/auth`, `team-portal/auth`,
`pin-reset`, both `client` OTP legs, and both `referrers` OTP legs all have DB-backed limits.

---

## Unprotected sensitive endpoints (NO rate limit)

Classified by who can reach them. **Public** = reachable by anyone on the internet.
**Token** = guarded only by a bearer/URL token. **Authed** = requires an operator/admin session.

| Endpoint | Method | Auth posture | Category | Risk |
|---|---|---|---|---|
| `auth/login` | POST | **public** (operator login) | AUTH | 🔴 see #1 — limiter is per-instance in-memory, not durable |
| `invoices/public/[token]/checkout` | POST | token only, **public** | MONEY | 🔴 Stripe checkout creation, unauthenticated, no limit |
| `quotes/public/[token]/deposit-checkout` | POST | token only, **public** | MONEY | 🔴 same shape as above |
| `quotes/public/[token]/accept` | POST | token only, **public** | MONEY/SIGN | 🟠 writes acceptance + signature payload |
| `documents/public/[token]/sign` | POST | token only, **public** | SIGN | 🟠 legally-binding e-signature write |
| `inquiry` | POST | **public** form | FORM | 🟠 spammable public lead form |
| `waitlist` | POST | authed (GET/POST tenant-gated) | FORM | 🟡 header comment claims "Rate-limited" but no limiter exists — see #4 |
| `ingest/lead` | POST | shared `INGEST_SECRET` header | INGEST | 🟠 secret is brute-forceable with no attempt cap |
| `ingest/application` | POST | shared `INGEST_SECRET` header | INGEST | 🟠 same shared secret, no attempt cap |
| `payments/checkout` | POST | authed operator (`getTenantForRequest`) | MONEY | 🟡 authed-only; add limit for abuse-in-depth |
| `payments/link` | POST | authed operator | MONEY | 🟡 authed-only |
| `admin/users/[id]/pin` | POST | authed (`requirePermission`) | AUTH/PIN | 🟡 sets a user PIN; authed-only |
| `team-portal/update-phone` | GET | token only | ACCOUNT | 🟡 phone change via token; ATO vector if token weak |
| `portal/request` | POST | portal bearer token | PORTAL | 🟡 authed customer only |
| `push/subscribe` | POST | authed | LOW | 🟢 authed-only |
| `feedback` | POST | admin-layout auth | LOW | 🟢 authed-only |

(Not exhaustive across all 498 routes — this is the sensitive/auth/money/form subset the order
asked for. The broad admin CRUD surface under `api/admin/*` and `api/cron/*` is intentionally
excluded: admin routes sit behind session auth, cron routes behind `CRON_SECRET`.)

---

## TOP FINDINGS (ranked)

### 🔴 #1 — `auth/login` (operator/admin login) has only per-instance in-memory rate limiting
`src/app/api/auth/login/route.ts:9-28`

The endpoint authenticates the operator dashboard: email+password against `admin_users`, **plus a
legacy fallback to a single shared `ADMIN_PASSWORD`** (`:81`). Its rate limiting is a module-level
`Map` (`loginAttempts`), 5 attempts / 5 min per IP.

On Vercel serverless this is weak: the `Map` is per-instance and wiped on every cold start, so an
attacker rotating requests across warm/cold instances (or simply after a scale event) faces little
real cap. This is the highest-value credential endpoint in the app — the shared-password fallback
means one correct guess yields `owner` — and it's the *only* sensitive auth route not on the
durable `rateLimitDb`. Every other auth route (`admin-auth`, `portal/auth`, `team-portal/auth`,
`client/login`, OTP legs) already uses `rateLimitDb`. Recommend porting `auth/login` to
`rateLimitDb(`login:${ip}`, 5, 15*60*1000)` (keyed by IP, and ideally also by email).

### 🔴 #2 — Public Stripe-checkout endpoints have no rate limit
`invoices/public/[token]/checkout`, `quotes/public/[token]/deposit-checkout`

Both are unauthenticated (token-in-URL only) and create Stripe Checkout sessions on the tenant's
own Stripe account. With no limit, a script can hammer session creation (Stripe API cost/abuse,
possible quota exhaustion) and/or brute-force `public_token` values. Recommend
`rateLimitDb(`pub-checkout:${ip}`, 10, 10*60*1000)` plus a per-token bucket.

### 🟠 #3 — Public signature/acceptance writes are uncapped
`quotes/public/[token]/accept`, `documents/public/[token]/sign`

Legally meaningful writes (quote acceptance, e-signature) reachable by anyone with a token, no
attempt cap. `quotes/.../accept` already caps the *signature payload size* (good) but not request
rate. Token brute-force and repeated-submit abuse are both open. Add an IP + per-token limit.

### 🟠 #4 — `waitlist` header comment claims "Rate-limited" but no limiter is wired
`src/app/api/waitlist/route.ts:8` (doc comment) vs. rest of file (no `rateLimitDb` call)

Documentation/reality mismatch — the file's own header says "Rate-limited" but grep confirms no
limiter reference in the handler. Either add the limit the comment promises or fix the comment so
the next reader isn't misled into thinking it's covered.

### 🟠 #5 — `ingest/lead` + `ingest/application` shared-secret endpoints have no attempt cap
Both authenticate via a single shared `INGEST_SECRET` header. Without a rate limit, that secret is
brute-forceable offline-style (unlimited online guesses). Add an IP-keyed limit so a wrong-secret
flood is throttled.

### 🟡 #6 — Authenticated money/PIN endpoints lack defense-in-depth limits
`payments/checkout`, `payments/link`, `admin/users/[id]/pin`

These require an operator/admin session, so external abuse is gated by auth — lower priority. But a
compromised or malicious authed session can drive unbounded Stripe link/checkout creation or PIN
churn. Worth a modest per-tenant limit as belt-and-suspenders, not urgent.

---

## Summary

- **Auth/OTP/PIN coverage is mostly good** — 7 of the 8 sensitive auth routes use durable
  `rateLimitDb`. The one gap is the most important one: **`auth/login`** (finding #1).
- **The real exposure is public, unauthenticated money/signature endpoints** (findings #2, #3):
  Stripe checkout creation and e-signature writes reachable by anyone with a token, uncapped.
- **`src/lib/rate-limit.ts` is dead code** — no route imports it; safe to delete after confirming,
  but out of scope here (docs only).
- **`rateLimitDb` fails open on DB error** — a Postgres outage disables all rate limiting silently.

**Recommended order to fix before deploy:** #1 (auth/login → durable limiter) → #2 (public
checkout) → #3 (public sign/accept) → #4 (waitlist comment) → #5 (ingest) → #6 (authed money).
</content>
</invoke>
