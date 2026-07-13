# Wave-Plan Gaps Reconcile — 16 unscheduled findings, webhook-idempotency placement, nycmaid routing_mode

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12 · **Status:** docs only, nothing applied,
no DB queried, no migration run.
**Purpose:** close the three open items `deploy-prep/INDEX.md` §3 flagged but did not resolve: (1) a
wave-placement recommendation for each of the 16 ready-findings-with-no-wave docs, (2) exactly where
webhook-idempotency fits relative to `061` and Wave 4, (3) resolve the nycmaid `routing_mode`
contradiction with evidence, not a guess. Feeds the leader's next fold-in pass on
`~/fullloopcrm/deploy-prep/gated-wave-plan.md` (Jeff-facing, not present in this worktree).

**Method note (honesty):** for §1 I read each of the 16 docs' TL;DR/verdict section (not every line)
to judge severity, readiness, and blast radius, then matched it against the wave definitions in
`gated-wave-plan.md` (read directly from the leader's checkout, `~/fullloopcrm/deploy-prep/`, since it
doesn't exist in this worktree) and the phase groupings in `phased-deploy-runbook.md`. For §3 I read the
actual migration files `055_tenant_domains_routing.sql`, `055_tenant_domains_routing.backfill.sql`, and
`058_fix_nycmaid_routing.sql` directly from sibling worktrees `~/flwork-p1-w1` and `~/flwork-p1-w2`
(read-only — no write, no branch touched) rather than reasoning from their absence in this branch as
`per-tenant-field-audit.md` had to.

---

## 1. The 16 ready-findings-with-no-wave — wave placement recommendation

Every doc below is real, already written, and was in `INDEX.md`'s "informs the gate but not named in
Wave 4" list. None are applied. Grouped by recommended destination, not file order.

### 1a. Fold into Wave 4 itself (same files, same deploy, ships with the named bundle)

| Doc | Why it belongs in Wave 4, not a separate wave |
|---|---|
| `webhook-rate-limit-coverage.md` | The 4 routes it flags 🔴 (telnyx-voice, all 3 telegram) are the **exact same files** `webhook-hardening-plan.md` §1/§2 already touches for signature fixes. Wiring a `rateLimitDb` call in is a one-line addition per handler while the file is already open for the sig fix — shipping it separately means opening the same 4 files twice. |
| `telnyx-sms-verify-killswitch-guard-spec.md` | Already explicitly cross-referenced by `webhook-hardening-plan.md`'s own "Cross-cutting: the `*_WEBHOOK_VERIFY=off` kill-switch" section — that section **is** this doc's fix, just not credited by filename. Ships in the same Wave A pass (§4 of the hardening plan) as the other `*_WEBHOOK_VERIFY=off` guards. No separate wave needed; it's already scheduled, just uncredited. |
| `mass-assignment-guard-spec.md` | 4 remaining `.update(body)` sites, same risk shape as the telegram secret-check (additive, no schema, no new secret, `pick()` helper already exists in `src/lib/validate.ts`). Cheap enough to ride in Wave 4 alongside the named bundle rather than open a Wave 4b for 4 call sites. |
| `or-filter-injection-determination.md` | Determination is done (LOW actual / MEDIUM latent), fix primitive (`buildIlikeOrFilter()`) is written and tested. Wiring it into the 6 flagged routes is small, additive, no schema. Bundle with the mass-assignment fix above — both are "tighten the 5-10 routes with a known-good helper" work of the same shape and size. |

### 1b. New "Wave 4b" — a named hardening pass right after Wave 4, before Wave 5's watch window starts

These are real but too large to silently fold into Wave 4 without inflating its blast radius, and none
of them block the resolver flip (Wave 5). Recommend Jeff either approves a distinct Wave 4b or explicitly
marks them backlog — right now they're in the scheduling gap INDEX.md §3b flagged.

| Doc | Why Wave 4b, not Wave 4 itself |
|---|---|
| `csp-security-headers-spec.md` + `csp-rollout-report-only-plan.md` | The doc's own phase map (Phase 0-4) is explicit that Phase 0 (static header polish) is safe to ship anytime, but Phase 1 (Report-Only) and beyond need a full shakeout window before enforcement — "do not skip to Phase 4" is the doc's own words. This is a multi-week rollout, not a Wave-4-sized change. Recommend: ship Phase 0 in Wave 4b, start Phase 1 (Report-Only, still non-blocking) same wave, and treat Phase 2-4 as its own backlog item with its own gate. |
| `input-validation-audit.md` (the `.or()` finding + the 217 unvalidated route-param sites + the `parseInt` NaN gaps) | The `.or()` half is already covered by `or-filter-injection-determination.md` in 1a. The remaining two findings (217 sites, `parseInt` NaN) are both LOW severity (error/DoS-flavored, not a breach) per the doc's own verdict — real but not urgent enough to hold up Wave 4. Backlog-eligible; Wave 4b if Jeff wants it swept while the input-validation surface is already being touched for the `.or()` fix. |
| `input-validation-coverage-audit.md` GAP 1 (no zod anywhere) + GAP 4 (267 routes, no length caps) | Systemic, cross-cutting, genuinely large (267 route files). Not a Wave 4 fit at all — this is a standalone initiative (adopt a schema library, then migrate routes incrementally) that deserves its own multi-wave plan, not a bullet in an existing wave. Recommend Jeff scope this separately rather than fold it anywhere. |
| `error-info-leak-audit.md` GAP 1 (142 routes leak raw `error.message`) | Same shape as above — 142 routes is too large for Wave 4b as a single pass. Recommend a **minimum-viable Wave 4b slice**: a single `sanitizeError()` helper (the doc names the gap: no central helper exists) wired into the highest-risk routes first (payment/finance, already-flagged in other audits), with the full 142-route sweep as backlog. GAP 3 (2 Telegram routes leaking `err.stack` into chat) is small and touches the **same telegram route files** as the Wave 4 secret-token fix — fold that specific 2-file fix into Wave 4 itself (see 1a pattern), not Wave 4b. |
| `csrf-coverage-audit.md` | Verdict is "adequate today" (SameSite covers the real mutating surface); the residual gap (4 low-value GET-mutations, no Origin-allowlist defense-in-depth) is explicitly framed as insurance, not a live hole. Low urgency — Wave 4b or backlog, Jeff's call, does not block anything. |
| `rate-limit-coverage-audit.md` (the non-webhook gaps: `auth/login`'s in-memory limiter, uncapped Stripe checkout) | 28 of the real endpoints are already covered; these are the 2 residual gaps in an otherwise-solid picture. Not urgent enough to name in Wave 4, but small enough to fold into Wave 4b alongside the webhook rate-limit fix (1a) since it's the same limiter primitive (`rateLimitDb`) being reused. |

### 1c. No wave needed — already resolved, or a test/verification artifact with no route dependency

| Doc | Why no wave |
|---|---|
| `secrets-in-logs-audit.md` | Verdict: **clean.** Zero secrets in logs; the PII items are optional hygiene, not a deploy blocker, per the doc's own TL;DR. Nothing to schedule. |
| `error-response-leakage-audit.md` | Verdict: **clean, already passing.** The doc adds a regression test (`error-response-leakage.test.ts`) that locks in the current good posture — that's a test file with no route dependency. It can merge into `main` whenever its branch integrates (Wave 1 rebuild-green, since it's part of the test suite that gate checks), not a deploy-blocking wave item. |
| `security-test-inventory.md` | Meta-doc — maps what's tested vs not. Not itself a fix; it's already captured by `INDEX.md`'s pointer into `pre-deploy-security-checklist.md`'s gate table. No wave placement needed; it's a reference doc, not a change. |

### 1d. Escalate — this one is more severe than "no wave," recommend explicit Wave 4 inclusion

| Doc | Why it needs to be named, not left to trail |
|---|---|
| `sms-conversation-ownership-guard-spec.md` | **HIGH**, and new this session — `POST /api/sms` performs **no ownership check at all** on a caller-supplied `conversation_id`, meaning any tenant-authenticated caller can write an outbound SMS message into another tenant's conversation thread (cross-tenant write, not just read). This is the same severity class as the already-gated selena IDOR (PR #15, GET-side PII read) — this is the POST-side write equivalent, undiscovered until this pass. **Recommend Jeff add this explicitly to Wave 4's named bundle** ("booking IDOR, voice webhook sig, telegram, portal OTP/PIN throttle, yinez, inbound-email, ledger TOCTOU, team-portal token constant-time compare") as a ninth item, or treat it with the same urgency as PR #15 (standalone hotfix) rather than let it sit in the same scheduling gap as the lower-severity items above. |

### 1e. Fold into Wave 1 (rebuild-green), not a separate wave

| Doc | Why Wave 1 |
|---|---|
| `dependency-vuln-summary.md` | `npm audit fix` resolves the bulk of the 31 advisories with no code change beyond the lockfile — natural to run as part of Wave 1's "rebuild green" gate (`npm run build` + `vitest` + `tsc --noEmit` already happens there; add `npm audit fix` immediately before it). The two judgment-call items (`next@16.2.10` minor bump — test it; `@telnyx/webrtc` "fix" that's actually a major **downgrade** from `2.26.4` — do **not** apply) need a separate Jeff decision, flagged as backlog, not blocking Wave 1. |

---

## 2. Where webhook-idempotency fits — resolving INDEX.md §3a

**The gap INDEX.md flagged:** Wave 2 requires `061` (journal_entries unique index) to land "before
webhook-idempotency code," but Wave 4's named bundle never lists webhook-idempotency as one of its eight
items. INDEX.md asked whether it's silently folded into "ledger TOCTOU fix" or a silent ninth item.

**Resolution — it's neither. It's a separate, later, three-part sub-sequence, not a Wave 4 line item at
all.** Evidence: `webhook-hardening-plan.md` §4 ("Safe sequencing") — already written this pass — lays out
its own three-wave internal structure, independent of `061`:

- **Wave A (sig fixes, §1+§2):** pure code, no schema, no new prod secret. Safe to fold into Wave 4
  itself (see §1a above — same files as the telegram/webhook-rate-limit fixes).
- **Wave B (telegram secret activation, §2 runtime):** env + `setWebhook` re-registration, per-bot,
  reversible. Belongs in **Wave 3 (env + secrets)** — it's exactly the same category as
  `TELEGRAM_WEBHOOK_SECRET` already listed there. Not Wave 4.
- **Wave C (idempotency wiring, §3):** **hard-gated on its own migration**,
  `2026_07_12_processed_webhook_events.sql` (creates `processed_webhook_events` with
  `UNIQUE(provider, event_id)`), landing in prod **first**. This migration is unrelated to `061`
  (`061` is `journal_entries(tenant_id,source,source_id)` — a different table, a different finding,
  ledger-TOCTOU not webhook-replay) — they are two independent DDL-before-code gates that happen to share
  the shape "unique index must exist before the code that depends on it deploys," not two halves of the
  same fix. **`061` gates the ledger-TOCTOU fix already named in Wave 4's bundle. The
  `processed_webhook_events` migration gates webhook-idempotency (Wave C above), a distinct, currently
  unscheduled fix.**

**Recommendation for the wave plan:** add `processed_webhook_events` DDL as its own Wave 2 line item
(it's a `CREATE TABLE IF NOT EXISTS`, safe to run anytime — the migration file itself says "safe to run
before the handlers are wired up: an empty ledger changes no behavior" — so it can run in the **same
sitting** as `061`, no new risk), and schedule Wave C's handler-wiring code as a **Wave 4b item** (after
Wave 4, since it needs the Wave 3 telegram-secret rollout to have actually landed for the telegram claim
sites to make sense, and it's the one part of the webhook-hardening-plan.md sequence explicitly marked
"the one ordering that can dark live traffic" if shipped before its migration). This closes the ambiguity
INDEX.md flagged: **webhook-idempotency is not folded into Wave 4's ledger-TOCTOU item and is not a
silent ninth item — it is its own future Wave 4b, gated on its own new migration, unrelated to `061`.**

---

## 3. The nycmaid `routing_mode` contradiction — resolved with the actual migration files

`per-tenant-field-audit.md` (this branch, earlier this session) could not resolve this because migrations
`055`/`058` don't exist on `p1-w6` — they live on `p1-w1` and `p1-w2` respectively. I read both files
directly from those sibling worktrees (`~/flwork-p1-w1/platform/src/lib/migrations/`,
`~/flwork-p1-w2/platform/src/lib/migrations/`) this pass — read-only, no writes, no branch touched.

**Verdict: `058` is authoritative for nycmaid's final state, and the two migrations do not actually
contradict each other — `058` is a deliberate, self-documented safety net for a known gap in `055`'s
backfill, not an accident.**

**What `055_tenant_domains_routing.backfill.sql` actually does:** it assigns `routing_mode = 'bespoke'`
to a **hardcoded slug list mirroring `BESPOKE_SITE_TENANTS`** (copied verbatim from `middleware.ts`,
including the literal string `'nycmaid'`), then defaults every remaining NULL row to `'template'`. The
backfill file's **own trailing comment block** already flags the exact hazard that caused the apparent
contradiction:

> "Migration 043 seeded nycmaid's two alias domains against `tenants.slug = 'the-nyc-maid'`, while the
> bespoke set + site folder use slug `'nycmaid'`... routing_mode for nycmaid still follows the slug list
> (mirrors middleware verbatim), so if the real slug is `'the-nyc-maid'` its rows resolve as `'template'`,
> not `'bespoke'` — resolve the slug question before treating tenant_domains as the SOLE routing source."

So `055`'s backfill assigns nycmaid to `'template'` **if and only if** `tenants.slug` for nycmaid is
literally `'the-nyc-maid'` rather than `'nycmaid'` — a real, acknowledged risk the migration's own author
could not resolve at authoring time (the slug question was still open).

**What `058_fix_nycmaid_routing.sql` does about it:** it does **not** key on slug at all — it explicitly
avoids the ambiguity by keying on the two literal live domains (`thenycmaid.com`,
`thenewyorkcitymaid.com`) and unconditionally sets `routing_mode = 'bespoke'` for every active
`tenant_domains` row on that tenant, regardless of what `055`'s slug-keyed backfill did. Its own header
comment states the reasoning explicitly: *"the P1 migration that added tenant_domains.routing_mode
defaults existing rows to 'template'. nycmaid is a PERMANENT-BESPOKE tenant... Leaving its host rows at
routing_mode='template' would route nycmaid's live custom domains to the wrong (shared-template)
surface."* It is idempotent (`WHERE routing_mode IS DISTINCT FROM 'bespoke'`) and fails loud if the
`routing_mode` column doesn't exist yet or if no `tenant_domains` row exists for either domain.

**Practical conclusion for the wave plan:**
- Both migrations are correct and internally consistent; there is no design contradiction, only a
  **known, self-flagged slug-mismatch risk in 055 that 058 exists specifically to close.**
- `gated-wave-plan.md`'s Wave 2 ordering (`055` → `056`/`059` → owner_phone → `061` → `062` → `058` →
  `060` → F3) already sequences `058` after `055`, which is all `058` requires (it only checks the column
  exists, and `055`'s own STEP 0 coverage-seed guarantees a `tenant_domains` row exists for nycmaid's
  domains before `058` runs). **No reordering is needed — the plan as written already lands nycmaid on
  `routing_mode = 'bespoke'`, matching `BESPOKE_SITE_TENANTS`, by the end of Wave 2.**
- The one thing still worth Jeff confirming (not blocking, informational): whether `tenants.slug` for
  nycmaid is actually `'the-nyc-maid'` or `'nycmaid'` — this determines whether `058` is doing real
  corrective work or a no-op idempotent confirmation, but **either way the end state is the same and
  correct.** `per-tenant-field-audit.md`'s §3 table entry for nycmaid ("bespoke, but flagged") can be
  updated to **"bespoke, confirmed post-Wave-2 via `058`"** — no longer an open contradiction.

---

## Cross-references

- `deploy-prep/INDEX.md` §3a, §3b — the two gaps this doc resolves.
- `deploy-prep/per-tenant-field-audit.md` §3 — the routing_mode table this doc's §3 finding updates.
- `deploy-prep/webhook-hardening-plan.md` §4 — the three-wave sub-sequence this doc's §2 maps onto the
  Jeff-facing wave plan.
- `~/fullloopcrm/deploy-prep/gated-wave-plan.md` — the literal Jeff-facing checklist this doc proposes
  edits to (leader's checkout, read this pass, not present in this worktree).
