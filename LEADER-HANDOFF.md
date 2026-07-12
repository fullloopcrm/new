# LEADER HANDOFF — Full Loop CRM orchestration
### Read this ENTIRE file first on restart. You are resuming as the LEADER. Jeff talks only to you.
**Context-handoff package authored by W2, 2026-07-11 ~21:50 (overnight autonomous session).**
Companion files: `RESUME-POINT.md` (tight snapshot) · `NEW-LEADER-BOOT.md` (paste-in boot prompt).

---

## 1 · SESSION SUMMARY (overnight autonomous, started 2026-07-11 ~20:37)

Overnight autonomous mode was activated by Jeff at ~20:37. The leader kept all four lanes busy on
**file-only, non-gated work** (no push / no deploy / no prod-DB writes) while every gated decision was
appended to `JEFF-MORNING-QUEUE.md` for Jeff's wake. **No worker crashes; all 4 drivers stayed alive.**

**Commits landed this session (per branch, from the channel changelog):**
- **p1-w1** → `53a28aee` — recurring.ts date-gen + open_365 holiday-gate unit coverage; vercel audit; migration-package files (`059_backfill_vercel_project.sql`).
- **p1-w2** → `79accdf0` (advances with this handoff commit) — resolver flip (`tenant_domains`-first + `tenants.domain` fallback + `TENANT_DIVERGENCE` assert-guard); **tenantDb() rollout 0→37 of 498 routes** across batches 1–6 (`d4ffcd0a`, `99b5e851`, `ad4ef479`, `abc774ea`, `85bf2968`, `c8c3f354`); `sms_conversation_messages` tenant_id stamp fix + helper `src/lib/sms-messages.ts` (`6b4fd1c5`); fix-proof tests for portal verify_code tenant-scope + ledger 23505 TOCTOU; Q5 prep `deploy-prep/e2e-tenant-cleanup.sql` (`1beba7be`); `recurring.test.ts` (`7d338535`); Q4 prep `deploy-prep/tenant-config-authoring-plan.md` (`79accdf0`); doc `platform/docs/tenantdb-none-write-routes.md`.
- **p1-w3** → `d25eb2a0` — stored-XSS JsonLd escape + 2 sibling components (`cf17dc25`); the-nyc-seo fabricated-AggregateRating purge (`0661ee8d`); ADRs **0001-engine-cutover … 0005-rls-defense-in-depth** (`platform/docs/adr/`); prospect→live onboarding runbook; cross-tenant self-attack suite GREEN 114/114.
- **p1-w4** → `ec6ac63f` — rate-limit-db MED-1 insert-error-denies-when-failClosed (`c985cb26`); portal-OTP failClosed HIGH-1 (`506c508f`); DR restore-drill plan (A6); **env-var-inventory doc IN FLIGHT** (order dispatched 21:48).

**Running completion numbers (authoritative source: `PUNCH-LIST.md` RUNNING% block):**
```
DONE (live+verified):        3 / 133  =  2%   ← the honest "complete" number
CODE-complete (branch-real): 31 / 133 = 23%   ← overnight work DEEPENS this bucket, not DONE
GATE (waits on Jeff):        23 / 133 = 17%
OPEN (no fix exists):        16 / 133 = 12%
TODO (new work):             59 / 133 = 44%
```
NOTE: the dispatch order quoted these as "~3 live / ~32 code / 23 gated / 16 open / 59 todo of 134" — the
tracker's exact figures are above (of **133**). Tonight's tenantDb / test / docs commits land in the **CODE**
bucket; the tracker recompute (`grep -cE '^- \[[ x]\]'` + per-tag counts) has not yet been re-run to absorb
them, so CODE is understated. **DONE stays 3** — nothing from the P1 sprint is in production.

---

## 2 · CURRENT FLEET STATE (verified at ~21:50)

| Lane | Branch @ tip | Driver pid | Lane focus |
|------|--------------|-----------|------------|
| **W1** | `p1-w1` @ `53a28aee` | **18355** alive | onboarding / provisioning / migration files / lib coverage |
| **W2** | `p1-w2` @ `79accdf0` | **18356** alive | resolver refactor + tenantDb rollout + isolation tests + deploy-prep |
| **W3** | `p1-w3` @ `d25eb2a0` | **18357** alive | SEO / XSS / ADRs / self-attack suite / runbooks |
| **W4** | `p1-w4` @ `ec6ac63f` | **18358** alive | READ-ONLY verification harness + deploy-prep docs |

- All four `~/flwork-p1-w{1,2,3,4}/.worker-driver.sh` polling drivers are running (pids 18355–18358 confirmed via `ps`).
- **W4 has a live sub-invocation** (`claude -p` pids ~55465/55467) actively running its env-var-inventory order — expect a `W4→LEADER` report shortly.
- **Coordination channel:** `/Users/jefftucker/fullloopcrm/LEADER-CHANNEL.md` (append-only; format `HH:MM LEADER→Wn:` / `Wn→LEADER:`).
- **Re-verify liveness at the instant you claim it:** `pgrep -fl "claude -p"` + `ps -p 18355 18356 18357 18358`. (Stale "all running" claims from un-rechecked polls is the failure that cost the last leader.)

---

## 3 · IN-FLIGHT WORK (dispatched, not yet reported complete)

- **W4** — `deploy-prep/env-var-inventory.md`: every required env var (TELEGRAM_WEBHOOK_SECRET, TENANT_HEADER_SIG_SECRET, SUPABASE_ACCESS_TOKEN_FULLLOOP, TELNYX_PUBLIC_KEY, RESEND_API_KEY, SECRET_ENCRYPTION_KEY, Stripe keys, per-tenant Anthropic) with where-set + failure-mode + which Part-0 stage needs it. Commit p1-w4.
- **W2** (this task) — LEADER CONTEXT-HANDOFF PACKAGE (this file + `RESUME-POINT.md` + `NEW-LEADER-BOOT.md`); commit p1-w2.
- **W1 / W3** — between orders as of this writing; **dispatch immediately on next check** (never idle). Candidate non-gated lanes in §7.

**Open decision threads surfaced by workers (not gated, need a leader call):**
- W2 flagged: `crews.setMembers()` deletes `crew_members` by `crew_id` with no crew-ownership re-check, reachable via `PATCH {id:<other-tenant-crew>}`; `crew_members`/`booking_assignees` have **no tenant_id column** so tenantDb can't close it → needs an explicit ownership guard. (IDOR-class, matches W1's "worth a human look".)
- W2 flagged: team-portal `messages`/`update-phone`/`15min-alert` + `client/preferred-cleaner`/`recurring` take a caller-supplied id from the BODY with no token check → IDOR-class; need a verified token (checkin/checkout HMAC pattern), which is an **auth change** = your call.
- W2 flagged (Q4-adjacent): provisioning writes `pricing_rows`/`emoji_usage`/`time_estimates{label,hours}` but `selena-legacy.ts` reads `pricing_tiers`/`emoji`/`time_estimates{size,estimate}` → live agent silently drops price table + emoji + time-est unless the config authors BOTH shapes.

---

## 4 · JEFF-GATED QUEUE (full context in `JEFF-MORNING-QUEUE.md`; nothing actioned)

| # | Decision | Recommendation | Blast radius if wrong |
|---|----------|----------------|-----------------------|
| **Q1** | Repoint DNS for **fladumpsterrentals.com** (DOWN — nameservers unreachable, 000; 29/30 other domains 200) | Repoint NS to working DNS (Vercel/registrar) — pure DNS-zone failure, code fine | LOW (DNS-only, reversible) |
| **Q2** | Repoint DNS for **toll-trucks-near-me** (GoDaddy→cancelled SiteGround zone, SERVFAIL) | Repoint NS to Vercel | LOW (DNS-only) |
| **Q3** | Approve **PART 0 release pipeline** — merge WAVE-2 → main + prod DB migrations + deploy (prod carries every WAVE-2 hole today) | Approve **STAGED** (A low-risk → B resolver-flip+guard → C auth after owner_phone backfill → D webhook idempotency after Telegram secret). **DO-NOT-SKIP:** owner_phone backfill BEFORE booking-owner deploy (19 tenants lock owners out); TELEGRAM_WEBHOOK_SECRET + re-register BEFORE deploy (bots go dark); extend pricing PASS-C allowlist + nycmaid guard BEFORE pricing backfill | **HIGH** (all 22 brands, money, auth) |
| **Q4** | **Engine cutover** — keep split (non-nycmaid on `selena-legacy`) OR cut over to new SELENA | **Keep split** until F2/F3 fixed + 15 empty `selena_config` authored (see ADR 0001 + `deploy-prep/tenant-config-authoring-plan.md`) | **HIGH** (every non-nycmaid customer AI) |
| **Q5** | Delete **6 leftover `w1-e2e-*` test tenants** still `active` (prod DB write) | Delete after safe-check proves 0 real bookings/payments/clients — script prepped, not run: `deploy-prep/e2e-tenant-cleanup.sql` (triple-guarded, DELETEs commented out) | LOW-MED (safe-check prevents wrong-row delete) |

---

## 5 · STANDING RULES (non-negotiable)

1. **Workers are NEVER idle.** No critical-path task → dispatch prep (read-only audits, file authoring, next-phase prep). Idle worker = leader failure.
2. **Only THREE hard gates wait for Jeff's explicit approval:** (a) prod-DB writes beyond what's applied, (b) `git push` to `main`, (c) deploy to prod. Everything else is the leader's call to keep flowing. Additionally **side-queue (never action, append + keep moving):** DNS changes · env-var changes · 3rd-party account changes · architectural decisions spanning tenants · anything touching money flow.
3. **Verify before you claim.** Real paste output (tsc/vitest/git log/pgrep at report-time). No stale reports. A "check that could have failed and didn't" — or it isn't verified.
4. **Overnight autonomous mode: ON.** Do NOT wake Jeff for non-gated work; when non-gated work runs low, author gated-item prep (deploy scripts, verify queries, rollback plans), docs/runbooks, and test coverage for uncovered load-bearing paths.
5. **Keep all 4 lanes busy.** On lane-complete: verify with paste → mark master-list items closed → dispatch next non-gated lane → never idle. Give BIG domain mandates (hours of work, self-refilling batch) so workers don't bounce back per-item.
6. **CONTEXT-HANDOFF at 65–70% context.** Before you run out of room, re-author this package (LEADER-HANDOFF + RESUME-POINT + NEW-LEADER-BOOT) so a fresh leader boots with zero loss. This file IS that mechanism.

---

## 6 · ARCHITECTURE RULES (violating these is the July-8-class bug)

1. **One shared codebase. Tenants differ by DATA + CONFIG, never by forked code.** There is exactly one app; a tenant is a row + a `selena_config`, not a branch. Never fork per-tenant.
2. **Global code changes must NEVER overwrite tenant data.** A deploy touches behavior for all 22 brands at once — tenant-specific state lives in the DB/config and is authoritative over code defaults.
3. **NYC Maid (`nycmaid`) is the untouched reference / flagship.** It is the only tenant on the new SELENA engine and the working baseline. Do not regress it; guard it explicitly (pricing backfill needs a nycmaid guard; `058` fixes its `routing_mode` template→bespoke). When in doubt, protect nycmaid.

---

## 7 · SUGGESTED NEXT STEPS (top 5)

1. **Config-Source-of-Truth (#1, DO FIRST).** Make `tenant_domains` authoritative, drop `tenants.domain`, CI reconcile blocks drift. Resolver flip is branch-real on p1-w2 (`tenant_domains`-first + fallback + assert-guard); shipping it is Q3 Phase B. Certifying isolation on ambiguous config = false confidence.
2. **Dispatch W1 + W3 to their next non-gated lanes now** (they may be between orders): W1 → remaining migration-package prep / provisioning-atomicity doc (D2) / more lib coverage; W3 → security backlog (26 SECURITY DEFINER rpc review notes, email raw-HTML remaining spots) + keep self-attack green.
3. **Resolve the 3 in-flight decision threads in §3** — crews ownership guard, team-portal IDOR token, Q4 config dual-shape — dispatch fixes or side-queue the auth ones.
4. **Land the auth/IDOR guards** (crew-ownership re-check; team-portal token binding) as file-only fixes with regression tests on the owning lanes.
5. **Prep the Part-0 execution runbook** so when Jeff approves Q3 the staged sequence (re-integrate WAVE-2 → rebuild-green → merge → DB 058/059/060/061/062/owner_phone/pricing → env → deploy → resolver-flip watch → re-probe) runs without improvisation. `BATCH-REVIEW-MANIFEST.md` already has phased A/B/C/D.

---

## 8 · FILE LOCATIONS

| What | Path |
|------|------|
| Master to-do (start→v1.0) | `/Users/jefftucker/flwork-todo/MASTER-TODO-LIST.md` |
| Running punch list + RUNNING% | `/Users/jefftucker/flwork-todo/PUNCH-LIST.md` |
| Jeff gated queue (Q1–Q5) | `/Users/jefftucker/fullloopcrm/JEFF-MORNING-QUEUE.md` |
| Gated actions in dep order + phased deploy | `/Users/jefftucker/fullloopcrm/BATCH-REVIEW-MANIFEST.md` |
| Deploy-prep scripts/plans | `deploy-prep/` on **p1-w2** (`/Users/jefftucker/flwork-p1-w2/deploy-prep/`): `e2e-tenant-cleanup.sql`, `tenant-config-authoring-plan.md`, `env-var-inventory.md` (p1-w4, in flight) |
| ADRs 0001–0005 | `platform/docs/adr/` on **p1-w3** (`/Users/jefftucker/flwork-p1-w3/platform/docs/adr/`): 0001-engine-cutover, 0002-config-sot, 0003-voice-multitenant, 0004-tenantdb-adoption, 0005-rls-defense-in-depth |
| tenantDb NONE-write route doc | `platform/docs/tenantdb-none-write-routes.md` on p1-w2 |
| Tight current-state snapshot | `/Users/jefftucker/fullloopcrm/RESUME-POINT.md` |
| Fresh-leader boot prompt | `/Users/jefftucker/fullloopcrm/NEW-LEADER-BOOT.md` |
| Coordination channel | `/Users/jefftucker/fullloopcrm/LEADER-CHANNEL.md` |
| This file | `/Users/jefftucker/fullloopcrm/LEADER-HANDOFF.md` (canonical committed copy on p1-w2) |

---

## APPENDIX — DURABLE OPERATIONS REFERENCE (unchanged across sessions; a fresh leader NEEDS this)

### ROLES (do not confuse)
- **YOU = LEADER.** Claude Code in the terminal. Filesystem, git, prod-DB (Supabase Mgmt API), Jeff-approved macOS screen/keyboard. You direct W1–W4 and report to Jeff. **Jeff talks only to you.**
- **4 WORKERS = W1–W4.** Separate Claude Code sessions. They execute lanes, report via the channel file, never talk to each other.
- **DESKTOP CLAUDE = CONSULTANT.** Holds full build history (pricing, positioning, exit math). Strategy/architecture/priority advice only; cannot touch the filesystem. YOU decide; it advises.

### ACCESS
- **FL Supabase:** Mgmt API, token `SUPABASE_ACCESS_TOKEN_FULLLOOP` in `~/.env.local`; project ref `cetnrttgtoajzjacfbhe`. DDL/read-only SQL via `POST https://api.supabase.com/v1/projects/<ref>/database/query`.
- **git:** gh account for fullloopcrm = `fullloopcrm` (verify-push hook enforces). Repo `~/fullloopcrm/platform`. Remote `github.com/fullloopcrm/new`. Prod branch = `main`; deploys need `[deploy]` in the commit or Vercel auto-cancels.
- **Integration worktree:** `/Users/jefftucker/flwork-integration` (branch `security-fixes-integration`, real node_modules via `npm ci` — Turbopack rejects symlinked node_modules, so full builds need real ones there).
- **Worker base branch:** all lanes base off `security/xss-theme-css-2026-07-10` (which is what `fullloopcrm` main worktree is checked out on).

### COMMUNICATION CHANNELS
- **To workers (file-based — the ONLY reliable way):** `~/fullloopcrm/LEADER-CHANNEL.md`, append-only. Never edit others' lines.
- Worker Terminal window ids drift across restarts — re-list with `osascript -e 'tell app "Terminal" to get {id, name} of windows'`.

### WORKER MECHANISM
- 4 polling drivers `~/flwork-p1-w{1,2,3,4}/.worker-driver.sh` (byte-offset poll of channel → `claude -p` headless → append report). Per-lane allowlists in each `.claude/settings.local.json`. Restart a driver: `do script "bash <path>" in window id`.
- **KNOWN FAILURE:** with ~60s polling a worker that finishes right after a check can sit idle up to ~60s. Never report "all running" from a stale poll — re-check `pgrep -fl "claude -p"` at report-time.

### SCREEN-DRIVING GOTCHAS (learned the hard way — do NOT repeat)
1. Workers stall in "manual mode" (wake, read order, pause on first tool call awaiting approval → look idle). Flip each pane to auto (Shift+Tab → "auto-accept edits on").
2. Worker watchers (Monitor/`tail -f`) are non-persistent and time out (~300s) → channel writes stop notifying. Re-arm persistent watchers or nudge the pane.
3. **Screen-driving Terminal TUIs is UNRELIABLE.** osascript `keystroke`/`key code` lands in whatever window is truly frontmost; focus-targeting a specific pane fails and has misfired into a plain zsh window and into the leader session. Only use keystrokes for the one-time Shift+Tab flip, and `screencapture -x` to CONFIRM the right window is frontmost before typing anything.
4. Windows can live on another macOS Space; `activate` won't bring them.
5. TUI text is in the terminal alternate screen buffer → accessibility reads return empty. Use `screencapture -x file.png` then Read the image, or have workers heartbeat status to files.
6. osascript breaks on `{ } " '` (syntax error -2741, silent send failure) — strip them.
7. Keep worker I/O file-based; use screen control only for the one-time flip.

### OVERNIGHT AUTONOMOUS MODE (activated 2026-07-11 ~20:37 by Jeff)
- **Side-queue file:** `~/fullloopcrm/JEFF-MORNING-QUEUE.md` — every gated item appended immediately with timestamp · decision · full context · recommended answer+reasoning · blast radius.
- **Never action** (append + keep moving): prod DB writes beyond current · git push to main · deploy · DNS · env vars · 3rd-party account changes · multi-tenant architectural decisions · money-flow decisions · anything touching the 22 own brands directly.
- **Keep flowing autonomously:** file-only work (RLS files, tenantDb adoption, test authoring, migration file authoring) · read-only audits · marking master-list items complete on verify · dispatching workers · merging worker branches into a FRESH integration branch (NOT main) · tsc/vitest/build on integration branches · docs/runbooks/ADRs.
- **Reporting cadence:** ~30 min heartbeat (running % + queue count); update master list on lane-complete; append side-queue items immediately; full status + queue summary at Jeff's wake.
