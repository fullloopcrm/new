# Full Loop Readiness Scorecard — 2026-07-30

Methodology: Full Loop Real Readiness Scoring System (Parts 1-5, Jeff, 2026-07-30).
First run of this system — no prior scorecard to diff against.

**Important limitation, stated up front, not buried:** I could not locate the
actual Round 1 / Round 2 / deep-pass / Collecting-Activating-Booking source
audit documents in the filesystem — the referenced
`~/Desktop/fullloopcrm-audit-2026-07-29.txt` no longer exists, and no other
copy was found. Every checkpoint below is grounded in either (a) this
session's own direct, fresh verification (live queries, live `git log`,
actually-executed tests — much of it from today's DR drill and
Lead→Sale→Schedule work), or (b) a currently-existing repo artifact (an ADR,
a runbook, live code) I read and independently confirmed against the running
system. Nothing here is carried forward from a prior session's self-report
un-checked. Where a domain's checkpoint list is thin because I did not have
time to review it exhaustively this run, that is stated explicitly rather
than smoothed over.

---

## Domain scores

### Security, Auth, Tenant Isolation & Core Infra — weight 25%

| Checkpoint | Score | Evidence (this session) |
|---|---|---|
| Offsite DB backup (hourly, B2) | 100 | Live: `fullloop-db-backup.log` shows continuous successful uploads through this morning, most recent ~20min before session start. Actually restored one (see below), not just trusted the log. |
| DR restore drill | 100 | Executed live today: real backup downloaded from B2, restored into a scratch project, all 3 §6 checks passed (row counts, tenant isolation, real booking+payment round-trip via the app's own atomic functions). ~20min restore-verify time. |
| CI green on `main` | 100 | `git merge-base --is-ancestor` confirmed today; also personally caught and fixed a real CI failure on PR #65 this session (missing SEO-noindex allowlist entry) and verified the fix passes. |
| Tenant-scope CI gate (`audit-tenant-scope.mjs`, blocking) | 100 | Ran live today as part of the full 884-file suite: 1 finding, in a test-fixture route (`api/fixture/route.ts`), not real app code — a real, non-vacuous, currently-clean result. |
| IDOR baseline triage (124 candidate signatures) | 0 | `git log` on `idor-route-guard.baseline.json`: 2 commits ever, one creation (07-12), one incidental. Zero dedicated triage commits since. Confirmed via direct history read this session. |
| RLS policy coverage | 50 | Live query: 186 real policies across 173 tables (real, substantial build-out since the DR runbook's "0 policies" note). But 13 genuine tenant-owned tables (`contacts`, `crm_notes`, `inbound_emails`, `inquiries`, `leads`, `partner_requests`, `tenant_locations`, `tenant_notes`, `tenant_projects`, `user_preferences`, `crew_members`, `booking_assignees`, `geo_nearby_places_cache`) still have RLS enabled with zero policies. App bypasses RLS via service_role regardless, so this isn't the real enforcement boundary either way. |
| PIN hashing (`clients.pin`, `team_members.pin`) | 0 | Live query: both are plain 6-digit numeric strings, not hashes, right now. |
| Migration-tool cutover (ADR 0008, the "158 files" question) | 25 | **Resolved, not just re-flagged:** the conversion tool (`scripts/migrate-legacy-to-cli.mjs`) is real and exists. The ADR's claim that it "produced 158 files" in `supabase/migrations/` is plausible — but those 158 files were never git-committed; `git log --all` shows zero commits ever adding them. Today's `supabase/migrations/` has exactly 1 file total, unrelated to the conversion. Real tooling exists, output never landed. |
| PITR / backup-tier confirmation | 0 | Still unconfirmed — no Supabase Management API read endpoint exists for plan/PITR state (confirmed via the real OpenAPI spec today); requires dashboard access not available in this session. Flagged, not scored higher on a guess. |

**Domain score: 52.8** (unweighted mean of 9 checkpoints — no per-checkpoint sub-weights specified in the system, so equal weight used; flagged as a modeling choice)

### Finance, Payroll, Billing & Payments — weight 20%

| Checkpoint | Score | Evidence |
|---|---|---|
| Ledger balance invariant | 100 | Live query: every real `journal_entries` row in prod has debits == credits, zero exceptions, right now. |
| `post_journal_entry()` function | 100 | Exercised live today (DR drill): posted a real, balanced $150 entry against restored data via the actual production function, not a mock. |
| Payroll (`payroll_payments`) | 50 | Route + table exist, code reads real. Live query: **zero rows ever** — built, deployed, never actually used in prod. |
| AR-aging pagination | 0 | Read live: `finance/ar-aging/route.ts` has no `.limit()`/`.range()` at all — genuinely unbounded query, confirmed present, unfixed. |
| LTV / client-analytics pagination | 0 | Same — `client-analytics/route.ts` has no `.limit()`/`.range()`. |
| Stripe deposit-paid webhook | 75 | 3 existing test files covering this path all pass today (quote-deposit-race, payment-link-hijack, tenant-scope) — real test run, not a live curl against a real Stripe event this round. |

**Domain score: 54.2**

### Lead → Sale → Schedule pipeline — weight 20%

| Checkpoint | Score | Evidence |
|---|---|---|
| Web-form lead → deal (`api/lead`, `api/contact`) | 100 | Read + traced today; existing tests pass; this session added trackError alerting to the previously-silent failure path (its own test proves the wiring). |
| Cross-site ingest lead → deal | 75 | Same pattern, existing test passes; not independently live-curled this round. |
| Inbound-SMS unknown-sender lead creation | 100 | **Was 0 this morning** (confirmed gap via live code read: notification-only, no client/lead/deal). Fixed and shipped this session, new tests passing (3/3). |
| AI-chat lead creation (phone given, no match) | 100 | **Was 0 this morning.** Fixed and shipped this session, new tests passing (3/3). |
| Instant response for phone-only leads | 0 | Confirmed: only a synchronous, opt-in EMAIL confirmation exists. No SMS auto-response for phone-only leads exists anywhere. |
| Sold-quote → correct fulfillment dispatch | 100 | Was a real, live-confirmed bug this morning (both of prod's 2 ever-"sold" deals had no booking). Fixed and shipped this session; 3 new tests + all 30 pre-existing related tests still pass. |
| Unscheduled-Jobs monitoring | 100 | Built and shipped this session (real prod case: a $365 Job sat unscheduled 11+ days with zero alert before this fix); 3 new tests passing. |
| Deal-pipeline-entry alerting | 100 | Built and shipped this session; new test proves trackError fires on a real simulated failure. |
| Crew-member deactivation cascade | 25 | Confirmed gap: no reassignment/flagging code exists for a deactivated member's future bookings. Live query: zero currently-active incidents of this in prod right now — a latent risk, not a live fire. |

**Domain score: 77.8**

Structural note, not a checkpoint: the formal Lead→Deal→Quote→Sale pipeline is
thinly used platform-wide (only 2 deals have ever reached "sold" out of
~337 total deals; the `jobs` table has only 4 rows ever). Most of the
platform's ~3420 real bookings bypass this formal pipeline entirely via
direct booking-creation paths. This doesn't lower any individual checkpoint's
score, but it means this domain's mechanics are lightly exercised in
practice — worth knowing when reading the 77.8.

### CRM Core (Clients, Marketing, SEO, Reviews) — weight 10%

**Only 3 checkpoints reviewed this round — most of this domain is
NOT SCORED THIS ROUND** (general client management, marketing pages, and the
broader SEO pipeline were not reached given session time).

| Checkpoint | Score | Evidence |
|---|---|---|
| Tenant review pages (6 checked: consortium-nyc, wash-and-fold-nyc, nycmaid, the-nyc-exterminator, nyc-mobile-salon, fla-dumpster-rentals) | 0 | Read live: **all 6** are fully static — zero DB/fetch calls in any of them. The Phase 1 "reviews-page fix" does not cover any of these 6. |
| Referral click-tracking consolidation | 0 | Read live: `/api/referrals/track` doesn't record a click at all — its own code comment says "for now just return tenant info." No `click_count` column exists anywhere. A second, separate `referrers` system exists in parallel — never consolidated. |
| SEO issue tracking | 25 | Table exists; live query shows exactly 1 row ever. Barely started, not "built." |

**Domain score: 8.3, based on 3 of an unknown-larger-total checkpoint set — treat this number as a lower bound on a thin sample, not a full domain read.**

### AI Agent (Yinez) & Communications — weight 10%

**Only 2 checkpoints reviewed this round — most of this domain
(Telegram alert reliability, the translation pipeline, comms-preference
gating) is NOT SCORED THIS ROUND.**

| Checkpoint | Score | Evidence |
|---|---|---|
| Web-chat / SMS conversational engine | 75 | Live query: 1,903 real conversations, most recent 5 minutes before this check — genuinely active, current usage. Code also read today as part of the chat-route fix. Not a fresh end-to-end test run this round beyond the existing suite. |
| Voice AI agent (phone-answering) | 0 | The `tenants.voice_agent_enabled` column referenced in prior planning notes **no longer exists in the schema** — this feature appears to have been abandoned or superseded, not merely "not yet configured" as earlier notes described. |

**Domain score: 37.5, based on 2 checkpoints — treat as a lower bound on a thin sample.**

### Tenant Onboarding & Activation — weight 15%

| Checkpoint | Score | Evidence |
|---|---|---|
| Tenant-profile registry (PR #64) | 100 | Merged to `main` (`git log` confirmed today). Its migration's columns (`contract_signed_at`, `trial_ends_at`, `cancelled_at`, `account_owner`, `acquisition_channel`, etc.) **verified live-present on prod right now** — not just assumed from the merge. |
| Activation automation (PR #65) | 100 | Merged to `main` today — after I personally found and fixed its real failing CI check this session. Its migration's columns (`activated_at`, `activation_health_snapshot`, `onboarding_nudge_sent_at`) **verified live-present on prod right now**, despite the migration file's own header saying "GATED — not applied" (that comment is stale; the real, current DB state is what's scored). |
| Onboarding questionnaire completeness (6 fields added) | 75 | Commit confirmed on `main` via `git log` today. Not independently live-curled against a real onboarding submission this round. |
| Phase 2 build-out (industry service lists, national geocoding, Projects-vs-Services toggle) | 25 | Real plan exists and one slice shipped (the Nominatim→Overpass geocoding fix, merged to main today). The bulk of Phase 2 — national service-area coverage beyond NY/NJ, industry-aware service lists — remains unbuilt; confirmed via an uncommitted-only change sitting in a separate worktree. |

**Domain score: 75**

---

## Overall platform-wide score

| Domain | Weight | Score | Weighted |
|---|---|---|---|
| Security/Auth/Tenant-Isolation/Infra | 25% | 52.8 | 13.2 |
| Finance/Payroll/Billing/Payments | 20% | 54.2 | 10.84 |
| Lead→Sale→Schedule | 20% | 77.8 | 15.56 |
| CRM Core | 10% | 8.3 | 0.83 |
| AI Agent & Communications | 10% | 37.5 | 3.75 |
| Onboarding & Activation | 15% | 75.0 | 11.25 |

**Platform-wide score: 55.4%**

Caveat, not smoothed away: the CRM Core and AI Agent domains carry real
weight (20% combined) but were scored off only 5 checkpoints total between
them, not a full domain review. If the untouched parts of those two domains
are weaker than the sampled parts, this number is optimistic; if stronger,
it's pessimistic. Treat 55.4% as a real floor-anchored estimate, not a
precision figure.

## "Safe to onboard the next tenant" score

Narrower view: Onboarding/Activation, Lead→Sale→Schedule, and
Security/Tenant-Isolation only, re-weighted proportionally to their original
weights (25/20/15 → normalized 41.7% / 33.3% / 25%):

| Domain | Normalized weight | Score | Weighted |
|---|---|---|---|
| Security/Tenant-Isolation/Infra | 41.7% | 52.8 | 22.02 |
| Lead→Sale→Schedule | 33.3% | 77.8 | 25.9 |
| Onboarding & Activation | 25.0% | 75.0 | 18.75 |

**Safe-to-onboard score: 66.7%**

---

## Explicitly NOT SCORED this round

- Most of CRM Core (general client management, marketing pages, the broader SEO pipeline beyond the one issue-tracking table checked).
- Most of AI Agent & Communications (Telegram alert delivery reliability, the EN/ES translation pipeline, comms-preference gating logic).
- PITR/backup-tier plan confirmation (no accessible read path this session).
- A live end-to-end curl of the onboarding questionnaire submission itself, and of the Stripe deposit webhook against a real event.
- The original Round 1/Round 2/deep-pass audit documents — could not be located in the filesystem this session (see note at top).

---

## The actual question: is it safe to send the next onboarding questionnaire today?

**Yes, with two specific conditions, not a plain yes.** The mechanics that directly gate a new tenant's setup — the two most recent onboarding/activation PRs — are not just merged but *live-column-verified on prod right now*, and the Lead→Sale→Schedule pipeline had its one confirmed live revenue-leak (sold deals silently never getting scheduled) fixed and tested this same session. Those are the parts of the system a new tenant's onboarding actually exercises, and they're in real, checked shape today.

The security domain's 52.8 is what's dragging the safe-to-onboard number down to 66.7, but look at *why*: the IDOR-triage backlog, plaintext PINs, and unconfirmed PITR tier are all pre-existing, platform-wide conditions that exist identically whether you onboard one more tenant today or not — onboarding tenant #23 doesn't meaningfully change that exposure surface. The two things that *do* specifically affect a new tenant's actual experience are real and worth naming as conditions: (1) if the next tenant operates outside NY/NJ or needs an industry-specific service list, Phase 2's gaps mean their self-serve setup will be materially incomplete — check their industry/geography before sending; (2) the AR-aging and LTV pagination bugs and the crew-deactivation gap are real but low-blast-radius at current scale and don't need to block onboarding, just need to stay on a real near-term list, not fall off it. Send the questionnaire if the next tenant is a standard NY/NJ home-service business — hold if they're the kind of tenant Phase 2 was scoped for.
