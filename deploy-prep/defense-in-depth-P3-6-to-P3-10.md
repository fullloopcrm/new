# Defense-in-Depth Backlog — P3-6 … P3-10 (enumeration + status)

**Status:** file-only audit / no code changed by this doc
**Author:** W2 (resolver + tenant-isolation lane)
**Date:** 2026-07-12
**Worktree:** `p1-w2` @ `4308602a` (facts re-verified against this tree, not assumed)

---

## 0. Honesty note — read this first

`P3-6..P3-10` were **never enumerated** in `LEADER-CHANNEL.md`. They appear only
as an **"out-of-sprint" range placeholder** in two end-of-day ledgers:

> "Still genuinely OPEN (no commit): P2-5, P2-7, P3-1, **P3-6..10 (out-of-sprint)**"
> — W1 GO/NO-GO v2 (channel ~17:12) and W4 final security posture (channel ~17:19)

The **defined** P3 series is only P3-1…P3-5:

| Item | What | Status |
|---|---|---|
| P3-1 | *(referenced as open, never described in-channel)* | **OPEN / undefined** |
| P3-2 | portal + team-portal token verify → `crypto.timingSafeEqual` (kill timing side-channel) | **DONE** `fabd246` (p1-w1) |
| P3-3 | `rate-limit-db` fail-**closed** opt-in; 9 auth-critical callers flipped | **DONE** `038428f` (p1-w1) |
| P3-4 | strip `x-tenant-sig` echo off the response (static-HMAC forge token) | **DONE** `282bee7` (p1-w1) |
| P3-5 | Selena owner-tool FK ownership validation | **DONE** `e4ff36e` (p1-w4) |

So there is **no canonical P3-6..P3-10 list to transcribe.** This doc therefore
**assigns** the concrete defense-in-depth residuals that *are* surfaced across the
channel + audits to the five slots, grouped by defensive layer, each grounded in a
source (channel line / commit / file) and re-verified in this worktree where it is
code-level. If the leader had a different five in mind, treat this as a proposal to
reconcile, not a discovered fact.

**Branch-state caveat (matters for every "DONE" below):** each lane's fixes live on
its own branch (`p1-w1/w3/w4/w5/w6`); most are **not merged** into `p1-w2`, the
integration branch, or `main`. Two items I re-checked are literally still-unfixed
*in this worktree* (P3-8 x-tenant-sig echo; P3-10 fail-closed) because the owning
commit is on a sibling branch. "DONE" = a tested commit exists, **not** "present on
the deploy target."

**Legend:** 🟥 open · 🟨 partial / audited-not-implemented · 🟩 done (commit exists) · 🔒 gated behind a precondition.

---

## P3-6 — DB-layer RLS enablement (the belt behind app-layer scoping) 🟨🔒

**What:** Positive Row-Level-Security policies keyed on tenant identity, so a query
that *forgets* `tenant_id` still cannot cross tenants at the DB layer. This is the
DB half of defense-in-depth; the app half is P3-7.

**Status — PREP authored across lanes, nothing executed:**
- W5 `deploy-prep/rls-gap-closure.sql` + `rls-gap-closure-verify.sql` — ENABLE RLS +
  `tenant_isolation` FOR-ALL policy on all **58 no-RLS tenant tables**, risk-tiered,
  with an in-migration guard that ABORTS if any target still has NULL `tenant_id`
  (commit `d575be2c`, **p1-w5**).
- W1 `2026_07_11_rls_tenant_tables.sql` — idempotent coverage cross-referenced to
  the 132 tenant-scoped tables in `audit-tenant-scope.mjs` (channel ~20:45, **p1-w1**).
- ADR-0005 `rls-defense-in-depth.md` (commit `ad68c906`, **p1-w3**) pins the rules.
- **In THIS worktree:** `platform/docs/tenant-isolation-rls-plan.md` (verified prod
  state: RLS on but **0 policies**, `sms_conversations` RLS off, no
  `SUPABASE_JWT_SECRET`) and `platform/src/lib/migrations/046_rls_deny_on_new_tables.sql`
  (deny-all on new sensitive tables — a no-op under service_role today).

**What remains (hard preconditions, per ADR-0005 — do NOT skip):**
1. **NULL-tenant backfill MUST complete first** — a policy on a table with NULL
   `tenant_id` rows makes those rows silently vanish from tenant reads.
2. **RLS is INERT while the app is `service_role` everywhere** — policies enforce
   nothing until a **scoped client** cutover lands. Until then P3-7 is the live gate.
3. `SUPABASE_JWT_SECRET` not in prod env yet.
4. **Leader runs the DDL after Jeff approves** (worker rule: prepare as files only).

---

## P3-7 — tenantDb app-layer rollout (make the scoped path the default) 🟨

**What:** Route every tenant-scoped table access through `tenantDb(tenantId)` so the
`.eq('tenant_id', …)` filter and insert-stamp are automatic — the primary guard
until P3-6's DB backstop is live.

**Status — IN PROGRESS (this lane owns it):**
- **37 / 498** `route.ts` converted (tip `4308602a`). See
  `deploy-prep/tenantdb-conversion-progress.md` for the live count + next batch.
- Maps authored: `tenantdb-rollout-plan.md` (order + exceptions),
  `tenantdb-conversion-batch-plan.md` (next 20 EASY), `tenantdb-triage.md`.
- **19** converted routes now carry a `*.isolation.test.ts` wrong-tenant probe
  (14 prior + 5 added this session: bank-transactions/[id], receipts/attach,
  quotes/[id]/convert, documents/[id]/signers, clients/import).

**What remains:** 461 unconverted (145 EASY / 251 HARD / 65 no-DB). Two residual
leak classes tenantDb **cannot** close and that need hand-written guards:
- **Join-table writes** with no `tenant_id` (the `crew_members` landmine class) —
  need a parent-ownership check.
- **Caller-supplied FK injection** (register P1/P2/P4/P5/P6) — `tenantDb` stamps the
  row's own `tenant_id` but does **not** validate a body `client_id`/`entity_id`/
  `coa_id` belongs to the tenant.

---

## P3-8 — middleware perimeter hardening (CSRF Origin allowlist + admin_token validity) 🟨

**What:** Add an Origin/Referer allowlist to the middleware for state-changing
methods, and stop trusting `admin_token` by mere presence.

**Status — AUDITED, not implemented:**
- W6 `deploy-prep/csrf-coverage-audit.md` (commit `809fef93`, **p1-w6**): CSRF defense
  is **100% SameSite-cookie based** — no CSRF token, no Origin/Referer check anywhere.
  Mutating POST/PATCH/DELETE are covered (Strict/Lax cookies + Bearer/HMAC), but W6
  recommends an **Origin allowlist for mutating methods** as defense-in-depth and
  flags **4 state-changing GET handlers** under Lax cookies (notifications,
  dashboard/messages, connect/messages, admin/tenant-chats) forgeable via top-level GET.
- **Re-verified in this worktree:** `middleware.ts:259-260` — the admin gate is
  `const adminCookie = req.cookies.get('admin_token')?.value; if (adminCookie)` —
  **presence-only**, not HMAC-checked (channel ~08:2x LOW). Real auth is re-verified
  in-route (`verifyAdminToken`, constant-time), so this is a defense-in-depth
  weakness, **not** a confirmed bypass (no unguarded allowlisted mutator was found).

**What remains:**
1. Origin allowlist for POST/PATCH/PUT/DELETE in `middleware.ts`.
2. Convert the 4 Lax GET writers to POST (or add an Origin check).
3. Optionally verify the `admin_token` HMAC in middleware instead of trusting presence.

**Branch caveat — CLOSED (2026-07-13, this worktree):** P3-4 stripped the
`x-tenant-sig` **response** echo on `p1-w1` (`282bee7`); the merge-state gap in
p1-w2 (`middleware.ts:438` still doing `response.headers.set('x-tenant-sig',
tenantSig)`) is now fixed directly on p1-w2 (commit `17debc4a`) rather than
waiting on integration — 3 new regression tests in
`src/middleware.secret-echo.test.ts`, verified non-vacuous. `x-tenant-id`/
`x-tenant-slug` are still echoed (not secret, unaffected).

**`admin_token` HMAC verification — FIXED (2026-07-13, this worktree, commit
`b74a43f0`):** middleware's admin bypass gate was presence-only
(`if (adminCookie)`); any cookie value fell through past the Clerk redirect
into the dashboard API surface (route-level `verifyAdminToken()` still
rejected garbage, so this was never a confirmed live bypass — just a weak
edge check). Now verifies HMAC+expiry+role in middleware itself via
`admin-token-edge-verify.ts`, an Edge-Runtime-safe port byte-compatible with
the Node-side `verifyAdminToken` (proven via round-trip test against a
real Node-signed token). 7 fail-closed tests (forged/expired/wrong-secret/
tenant_admin-role/garbage) + 1 CONTROL (valid token still bypasses) in
`src/lib/admin-token-edge-verify.test.ts` +
`src/middleware.admin-token-verify.test.ts`.

**CSRF write-guard on 4 Lax-cookie GET handlers — FIXED (2026-07-13, this
worktree, commit `ec728ab1`):** `notifications`, `dashboard/messages`,
`connect/messages`, `admin/tenant-chats` GET handlers each perform a
mark-read/read-cursor WRITE. SameSite=Lax cookies (admin_token, tenant-owner
session) still attach on a cross-site top-level GET navigation, so a forged
link ran authenticated and silently flipped read-state. Origin/Referer
aren't reliably sent on GET navigations (the register's original suggested
fix), so this uses `Sec-Fetch-Site` instead (sent by every modern browser on
every request, unspoofable by a remote page) via new `csrf-guard.ts` —
skips the write, not the read (the read's response isn't visible
cross-site anyway). 13 new tests across the 4 routes + the helper.

**Origin allowlist for mutating methods (POST/PATCH/PUT/DELETE) — still not
implemented, and now deprioritized:** those methods already carry
`admin_token`/session cookies with `sameSite: 'lax'`, which is NOT sent on a
cross-site fetch/XHR/form POST regardless of Origin — only the GET-navigation
case above was a live gap. An Origin allowlist here would be redundant
defense-in-depth, not a closed hole; left open, not blocking.

---

## P3-9 — output-encoding hardening (escape-by-default serializers) 🟨

**What:** Make HTML/JSON-LD serialization escape by default so tenant-controlled DB
strings can never break out of context.

**Status — the one LIVE hole is fixed; a backlog + one residual remain:**
- Live stored-XSS in the shared template `JsonLd` was fixed (W3 `d25eb2a0` /
  `cf17dc25`, **p1-w3**) + fabricated-AggregateRating purge.
- W3 traced 16 serializer definitions + the template DB-taint path: the template
  was the **one** serializer needing the `<` fix; the other **~382 unescaped inline
  call-sites are defense-in-depth, not live holes** (they pass const-derived data)
  (channel ~08:09).
- **Residual still live:** W4 flagged JSON-LD stored-XSS via tenant DB fields in
  `GenericHome.tsx:43-44` + `LongformArticle.tsx:50` — raw `JSON.stringify` that
  **bypasses** the `JsonLd.tsx` escape; `identity.name`/`geo.placename`/FAQ come from
  `load.ts` `supabaseAdmin`. **HIGH** (channel ~17:54). *(Not in this worktree; on p1-w4's review.)*

**What remains:**
1. Land the `GenericHome`/`LongformArticle` escape (escaped `<JsonLd>` or `.replace(/</g)`)
   — the one still-live item.
2. Optionally make the ~382 defense-in-depth serializer sites escape-by-default so a
   future const→DB refactor can't silently open a hole.

---

## P3-10 — rate-limit fail-closed completion (insert-fail path) + throttle belt 🟩 (MED-1 fixed)

**What:** Finish the fail-closed story for the DB-backed rate limiter, so a DB error
never silently disables an auth throttle.

**Status:**
- W1 P3-3 added a `{failClosed}` opt-in and flipped **9 auth-critical callers** (now
  **10+**, see below) to deny-on-error (commit `038428f`, **p1-w1**). Public callers
  stay fail-open by design. Confirmed present in this worktree's `rate-limit-db.ts`
  (the earlier "not merged" caveat below no longer applies — the option exists here).
- **MED-1 — FIXED (2026-07-13, this worktree, commit `a92c5ede`):** the **INSERT**
  (record-attempt) failure path now denies (`{allowed:false, remaining:0}`) when
  `failClosed` is set, instead of only logging and returning `allowed:true`. Public
  (non-`failClosed`) callers unchanged (fail-open). 4 new regression tests in
  `rate-limit-db.test.ts` (insert-fail closed/open, logging, insert-success control).

**What remains:**
1. Belt: Stripe `idempotencyKey` on payment writes (P1-6) — **0 grep hits**, low risk
   (existing 061 + 23505 guard). Track, don't block.

---

## Not in this bucket (tracked elsewhere, listed so nothing is lost)

- **P3-1** — referenced as open but **never described** in-channel; needs the leader
  to define it before it can be statused. Flagged, not assigned a slot here.
- **P2-5 / P2-7** — the other two "genuinely open (no commit)" items in the same
  ledger line; out of the P3 defense-in-depth series, not enumerated here.
- **voice `ADMIN_RING` still nycmaid-global** — MED residual (channel ~17:19), a
  multi-tenant-config gap, not a defense-in-depth layer.

---

## Summary

| Slot | Layer | State | Blocking precondition |
|---|---|---|---|
| P3-6 | DB RLS backstop | 🟨🔒 prep only | NULL backfill + scoped client + JWT secret + Jeff-approved DDL |
| P3-7 | app-layer tenantDb | 🟨 37/498 | join-table + FK-injection guards are separate work |
| P3-8 | middleware CSRF/admin_token | 🟩 x-tenant-sig echo, admin_token HMAC verify, and the 4-GET-writer CSRF gap all fixed; mutating-method Origin allowlist deprioritized (redundant given SameSite=Lax) | none blocking |
| P3-9 | output encoding | 🟨 1 live residual | land GenericHome/LongformArticle escape |
| P3-10 | rate-limit fail-closed | 🟩 fixed | Stripe idempotencyKey belt item only (low-risk, tracked) |

None of these is a **confirmed live cross-tenant bypass** — they are the belt-and-
suspenders layers behind the app-level `.eq(tenant_id)` gate that already carries
isolation today. Each is file-only prep or a small implementation; **none should be
started by W2 without a leader GO** (this doc only enumerates + statuses them).

---

## Addendum (2026-07-13) — Telegram webhook fail-open gap closed (adjacent to P3-8)

Not part of the original P3-6..P3-10 enumeration, but the same "unauthenticated
trigger surface" shape as P3-8's admin_token concern, found while working this
backlog: `verifyTelegramSecretToken()` in `webhook-verify.ts` deliberately failed
**open** when no secret token was configured — all 3 Telegram webhook routes
(global owner bot, `jefe` platform-GM bot, per-tenant bots) accepted unauthenticated
updates gated only by a body-supplied chat ID (forgeable, not a secret). These bots
can trigger the Selena/Jefe agent and send messages. Flipped to fail-closed (commit
`608f6916`) — unconfigured secret now 401s instead of silently processing. 6 tests
flipped from "fails open" to "fails closed" (route-level + unit).

**FLAG for Jeff/leader — breaking change, do NOT deploy until confirmed:**
`TELEGRAM_WEBHOOK_SECRET` (global bot), `JEFE_WEBHOOK_SECRET` (jefe bot), and each
live tenant's `telegram_webhook_secret` column must be set + registered with
Telegram's `setWebhook` `secret_token` param, or the affected bot goes dark (401s
its own legitimate traffic) on deploy.
