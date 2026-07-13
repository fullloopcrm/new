# deploy-prep/ INDEX — one-stop map of every doc to its wave

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12 · **Status:** docs only, read-only synthesis,
nothing applied, nothing merged.
**Purpose:** Jeff (or the leader) has 52 files in this directory. This is the single entry point:
which wave/phase each doc belongs to, which docs are companions vs near-duplicates, and which docs
describe real findings that **no wave currently schedules**. Built by reading every doc's header +
scope note and cross-referencing against `gated-wave-plan.md` (the literal, Jeff-executable checklist,
not present in this worktree — it lives untracked in the leader's own checkout; read there) and
`phased-deploy-runbook.md` (this lane's own grouping of those waves into phases A-D).

**Method note (honesty):** this is a classification pass, not a re-audit. I read each doc's title,
scope line, and cross-references (not every finding in every doc) to place it. Severity/verdict claims
inside each doc are that doc's own — not re-verified here. Where a doc's placement required judgment
(no explicit wave-plan line item), I say so and flag it rather than guessing.

---

## How to read this

- **Wave N** = the doc directly documents, specs, or backs a line item in `gated-wave-plan.md`'s
  literal Wave N checklist.
- **Phase X (grouped)** = `phased-deploy-runbook.md` groups this wave into Phase A/B/C/D; see that doc
  for the sequencing/risk view.
- **Informs gate, not scheduled** = the doc feeds `pre-deploy-security-checklist.md`'s go/no-go verdict
  table but its fix is **not named as a line item in any wave** — see §3 below.
- **Fleet-ops (not in wave plan)** = leader/fleet-governance proposals (Q-series), a separate track from
  Jeff's deploy waves entirely.
- **Post-deploy ops** = runbooks that operate *after* the wave-plan's deploy sequence completes; also
  not wave-plan line items.

---

## 1. Full map

### Wave 0 — Zero-risk merges
| Doc | Notes |
|---|---|
| *(none)* | PR #14/#15 and the nycmaid Vercel binding are leader/W4/Jeff actions with no W6 deploy-prep doc. |

### Wave 1 — Re-integrate + rebuild green · Phase A (grouped)
| Doc | Role |
|---|---|
| `cross-lane-merge-conflict-audit.md` | Primary — maps where the 6 `p1-wN` lanes collide; recommends integration order. |
| `branch-integration-plan.md` | Primary — builds directly on the audit above; concrete merge execution plan. |
| `channel-vs-git-reconciliation-note.md` | Adjacent — read-only check that worker `DONE` claims match real commits, so Wave 1 integrates verified work, not phantom claims. Also fits Fleet-ops (§2). |

### Wave 2 — Prod DB migrations, strict order · Phase B (grouped)
| Doc | Role |
|---|---|
| `rpc-security-definer-review.md` | Backs `060` (lockdown SECURITY DEFINER RPCs). |
| `per-unit-pricing-audit.md` | Backs F3 pricing backfill (**DO-NOT-SKIP #2**). |
| `webhook-idempotency-audit.md` | Findings behind the `061` dup-probe + unique index step. |
| `webhook-dedupe-helper-design.md` | Design for the helper that pairs with `061`'s new unique index. |
| `webhook-hardening-plan.md` | Ready-to-apply change list once `061` lands — see gap flagged in §3. |
| `prod-audit-trail-spec.md` | Adjacent — a new-table spec (audit trail), not itself a named Wave 2 line item, but same DDL-before-deploy category. |
| *(no W6 doc)* | `055` routing schema, `056`/`059` vercel_project backfill, owner_phone backfill (**DO-NOT-SKIP #1**), `062` inbound_emails tenant_id, `058` nycmaid routing_mode flip — no dedicated spec file in this branch. These appear to be owned by other lanes (wave plan's own migration-collision note names `059`/`060` on w1, `058`/`061` on w2). `per-tenant-field-audit.md` (new, §2c below) documents what's knowable about the routing_mode/vercel_project target state from this branch's code. |

### Wave 3 — Env + secrets · Phase B (grouped)
| Doc | Role |
|---|---|
| `credential-rotation-policy.md` | Policy layer (when/why/who) for the six credentials, incl. `TELEGRAM_WEBHOOK_SECRET`. |
| `secrets-inventory-and-rotation-plan.md` | Full inventory + mechanics this policy depends on. |
| `secrets-at-rest-audit.md` | Drills into `SECRET_ENCRYPTION_KEY` specifically — narrower than the inventory doc. |
| `token-freshness-note.md` | `SUPABASE_ACCESS_TOKEN_FULLLOOP` staleness — backs the config-SoT reconcile build-gate env step. |
| `telegram-tenant-webhook-auth-guard-spec.md` | States its own hard prerequisite: `TELEGRAM_WEBHOOK_SECRET` provisioned + every bot re-registered, or this Wave 3 step must complete first. |
| `webhook-auth-throttle-guard-spec.md` | Same prerequisite, for the global telegram+telnyx-voice guard. |

### Wave 4 — Deploy the security bundle · Phase C (grouped)
Literal bundle per `gated-wave-plan.md`: booking IDOR, voice webhook sig, telegram, portal OTP/PIN
throttle, yinez, inbound-email, ledger TOCTOU, team-portal token constant-time compare.

| Doc | Role |
|---|---|
| `admin-webhook-idor-audit.md` | Source of the booking-IDOR-adjacent finding; its Finding 1 is closed by the telegram guard spec below. |
| `webhook-auth-throttle-guard-spec.md` | Closes "voice webhook sig" + telegram (P1 financial-DoS). |
| `telegram-tenant-webhook-auth-guard-spec.md` | Closes "telegram" (per-tenant route). |
| `pre-deploy-security-checklist.md` | The consolidated go/no-go gate for this phase — rolls up most other Wave-4-adjacent audits below into one verdict table. |

**Docs that inform the Phase C gate but are NOT named as line items in `gated-wave-plan.md` Wave 4** (see
§3 for why this matters): `csp-security-headers-spec.md`, `csp-rollout-report-only-plan.md`,
`csrf-coverage-audit.md`, `input-validation-audit.md`, `input-validation-coverage-audit.md`,
`mass-assignment-guard-spec.md`, `or-filter-injection-determination.md`,
`rate-limit-coverage-audit.md`, `webhook-rate-limit-coverage.md`, `secrets-in-logs-audit.md`,
`error-info-leak-audit.md`, `error-response-leakage-audit.md`, `dependency-vuln-summary.md`,
`security-test-inventory.md`, `sms-conversation-ownership-guard-spec.md`,
`telnyx-sms-verify-killswitch-guard-spec.md`.

### Wave 5 — Resolver flip (24-48h watch window) · Phase D (grouped)
| Doc | Role |
|---|---|
| `incident-runbooks.md` | Its "resolver divergence" runbook is the direct response procedure for this wave's watch window (also covers 4 other live-failure modes — see Post-deploy ops). |
| `health-monitor-coverage-gap.md` | The nycmaid `/api/health` monitoring gap this wave's watch window needs closed first, or a resolver-flip regression could go unalerted the same way. |

### Wave 6 — DNS · Phase D (grouped)
| Doc | Notes |
|---|---|
| *(none)* | Jeff/registrar-only per standing rule; no W6 doc touches DNS. |

### Wave 7 — Sign / attest · Phase D (grouped)
| Doc | Role |
|---|---|
| `compliance-readiness-checklist.md` | P1-P11 status for the DPA/SAQ-A sign-off items. |
| `dr-drill-plan.md` | The backup-restore-drill procedure (P12). |
| `successor-package-template.md` | Adjacent, not a literal Wave 7 item — separate continuity initiative (consultant hole #20). |
| `successor-package-encryption-note.md` | Design note for protecting the template above. |

### Meta (spans all waves)
| Doc | Role |
|---|---|
| `phased-deploy-runbook.md` | Groups Waves 0-7 into Phases A-D with go/no-go gates and rollback posture. Not a substitute for `gated-wave-plan.md` — the sequencing/risk view on top of it. |

---

## 2. Fleet-ops (leader/fleet governance — NOT part of Jeff's gated-wave-plan)

These are Q-series proposals for running the worker fleet itself, a separate track from tenant/prod
deploy work. None are referenced by `gated-wave-plan.md`.

| Doc | Q-ref |
|---|---|
| `atomic-channel-write-design.md` | Q-N4 |
| `atomic-queue-claim-design.md` | Q-N2 |
| `fleet-cost-visibility-note.md` | Q-O5 |
| `fleet-disk-monitoring-note.md` | Q-O3 |
| `fleet-supervisor-note.md` | Q-N1 |
| `invocation-timeout-design.md` | Q-W3 |
| `channel-vs-git-reconciliation-note.md` | Q-W1 (also listed under Wave 1 — dual relevance) |

## 2c. Post-deploy ops (after the wave-plan sequence completes)

`phased-deploy-runbook.md`'s own cross-references section calls these "ongoing operational documents
that pick up where this deploy runbook's exit criteria leave off" — i.e. explicitly not wave-plan line
items:

| Doc |
|---|
| `onboarding-15day-timeline.md` |
| `prospect-to-live-runbook.md` |
| `provisioning-runbooks.md` |
| `provisioning-failure-runbooks.md` |

---

## 3. Flags

### 3a. Gap in the wave plan itself (not a W6-doc problem)
`gated-wave-plan.md` Wave 2 says the `061` unique index must land "before webhook-idempotency code" —
implying that code ships in a later wave. But Wave 4's own bullet list never names webhook-idempotency
as one of the bundle's items. Either it's silently folded into "ledger TOCTOU fix" (plausible — same
family of guard) or it's an uncounted ninth item. **Recommend Jeff confirm which** before Phase C ships,
so `webhook-hardening-plan.md`'s ready-to-apply diffs aren't skipped by omission.

### 3b. Ready findings with no scheduled wave
The 16 docs listed at the end of the Wave 4 section above are real, ranked findings/specs — several
"ready-to-apply, NOT applied" — that `pre-deploy-security-checklist.md` uses to compute its go/no-go
verdict, but that verdict table (rows B, C, E, G, H, I, J) already shows several as 🟠 GAP or worse. None
of these gaps has a wave-plan line item scheduling the fix. Two ways to read this: (1) they're
genuinely lower-priority than the named Wave 4 bundle and can trail it, or (2) they were found after
`gated-wave-plan.md` was authored (2026-07-12 ~19:04) and haven't been folded in yet. **Recommend Jeff
either bundle the still-GAP rows into Wave 4 explicitly, spec a "Wave 4b" hardening pass, or mark them
accepted-risk/backlog** — right now they exist in a scheduling gap, not because anyone decided to defer
them.

### 3c. Self-acknowledged content duplication (intentional, not an error)
`provisioning-failure-runbooks.md` states its own §§1-3 are "condensed restatements" of
`provisioning-runbooks.md`'s §§1-3 (domain/payment/DID), kept for standalone readability, with 2 new
failure modes added (§§4-5: owner-invite expired, funnel_mode wrong). This is real duplicated content by
design, not a contradiction. If Jeff wants one canonical provisioning-runbook file instead of two
overlapping ones, that's a merge task; flagging so it doesn't get mistaken for an accident.

### 3d. Companion pairs (narrower/broader split — not duplicates, just noting the relationship for navigation)
- `error-response-leakage-audit.md` is an explicitly narrower, testable subset of
  `error-info-leak-audit.md` ("do any HTTP error responses embed a stack trace or secret env value?" vs.
  the broader DB-internals/identifier leak question).
- `rate-limit-coverage-audit.md` deliberately scoped out webhooks; `webhook-rate-limit-coverage.md`
  covers exactly that gap.
- `input-validation-coverage-audit.md` (request bodies) and `input-validation-audit.md` (route params +
  query strings) are two intentional halves of one surface.
- `secrets-at-rest-audit.md` (encryption key specifically) and `secrets-inventory-and-rotation-plan.md`
  (every secret) — same relationship.
- `webhook-idempotency-audit.md` (findings) → `webhook-dedupe-helper-design.md` (helper design) →
  `webhook-hardening-plan.md` (apply plan) is a 3-doc pipeline on one topic, not 3 independent takes.

### 3e. No contradictions found between docs' factual claims
I did not find two docs asserting conflicting facts about the same code/finding. `defense-in-depth-P3-review.md`
does flag its own "cross-lane numbering conflict" internally (see that doc's final section) — that's
between migration numbers across lanes, already captured in `gated-wave-plan.md` Wave 1's collision note,
not a conflict between two deploy-prep docs.

---

## 4. New this pass

Two docs added alongside this index, per the leader's synthesis-over-authoring instruction:

- `per-tenant-field-audit.md` — expected `routing_mode`/`vercel_project`/`status`/`owner_phone` per
  tenant, sourced from code (presets, provisioning defaults, `verify-protected-tenants.mjs`), with
  live-DB-only fields clearly marked.
- `orphan-domains-audit.md` — cross-check of the 22 protected-tenant domains against
  `BESPOKE_SITE_TENANTS` / site folders / `tenant_domains` model, flagging malformed domain strings and
  the live-DB verification this can't complete without `SUPABASE_ACCESS_TOKEN_FULLLOOP`.
