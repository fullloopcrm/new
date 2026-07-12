# Reconcile CI gate audit (C4) — config-SoT drift gate

**Auditor:** W2 · **Date:** 2026-07-12 · **Scope:** confirm the config-SoT
reconcile CI gate is *active* and *correct*, post-merge.

## TL;DR

The gate is **wired and correct on the integration branch**, but **NOT yet on
`main`**. It becomes active on `main` only when the integration branch merges.
Two items can't be confirmed from the repo alone and need a GitHub-side check
(marked ⚠️ below): (1) that a run with the real Supabase token actually reports
0 gating-CRIT, and (2) that the workflow is a *required* status check in branch
protection. Everything checkable from source is correct.

## What the gate is

- **Script:** `platform/scripts/reconcile-tenant-config.mjs` — a READ-ONLY drift
  detector across the four things that decide "which domain → which tenant →
  which site → which Vercel project":
  1. `tenants.domain` (resolver checks FIRST)
  2. `tenant_domains` active rows (resolver fallback; carries the authoritative
     `routing_mode` / `status` / `vercel_project` per domain)
  3. `BESPOKE_SITE_TENANTS` in `src/middleware.ts`
  4. `src/app/site/<slug>/` folders that actually render
- **Workflow:** `.github/workflows/tenant-config-reconcile.yml` — runs the script
  on `push:[main]` + `pull_request`, CRIT fails the job, WARN/INFO don't; Telegram
  alert on failure.
- **Origin:** commit `cf373c81` ("feat(reconcile): token-guard +
  routing_mode/status/vercel_project drift, CI gate").

## Branch state (the "post-merge" question)

Verified with `git cat-file -e <ref>:<path>` and `git log`:

| ref | has workflow file? | notes |
|-----|--------------------|-------|
| `origin/main` / `main` | **NO** | main tip `669f588f` does not contain `cf373c81` |
| `integ/wave2-2026-07-11` | YES | integration branch |
| `p1-final-integration` | YES | |
| `p1-w3` | YES | |
| `p1-w2` (this worktree) | **NO** | still carries the older 125-line read-only script, no workflow |

**Conclusion on "active":** the gate is present on the integration branches and
will start gating on `main` the moment one of them merges (the `push:[main]`
trigger only fires for a workflow file that exists on `main`). Until that merge,
`main` has **no reconcile gate**. This is expected for a not-yet-merged change;
flagging it so nobody reads "gate exists" as "gate is guarding production."

## Correctness review (integration-branch version, 225-line script)

Read in full from `integ/wave2-2026-07-11`. Findings:

### Correct ✓

1. **Token-guard is first and safe.** `loadToken()` reads
   `$SUPABASE_ACCESS_TOKEN_FULLLOOP` from env (CI secret) → `~/.env.local` →
   returns `null`. On `null` it logs and `process.exit(0)`. So a branch/fork
   without the secret passes cleanly instead of erroring. (The old p1-w2 version
   did `console.error(...); process.exit(1)` — that would have red-gated every
   secretless run. The integration version fixes this.)
2. **Read-only.** Every `sql()` call is a `SELECT`. No INSERT/UPDATE/DELETE/DDL
   anywhere. Safe to run against the live DB from CI.
3. **Exit code gates on CRIT only.** `gatingCrit = totalCRIT − pendingCRIT`;
   `process.exit(gatingCrit ? 1 : 0)`. WARN/INFO never block. Matches the stated
   contract in the workflow comment.
4. **Known-pending orphans reported but non-gating.** `KNOWN_PENDING_ORPHANS`
   (`toll-trucks-near-me`, `wash-and-fold-hoboken`) still surface as CRIT in the
   report but are subtracted from `gatingCrit`, so a disposition Jeff hasn't made
   yet doesn't block unrelated PRs. Any *other* unresolvable bespoke slug still
   hard-fails (Drift L). This is the right call — visible but not a merge blocker.
5. **Drift checks are coherent.** G (DB says bespoke, middleware won't route it →
   the exact 2026-07-10 mis-route class) is CRIT; Drift D now defers to G to avoid
   double-reporting. H/I/J (routing_mode/status disagreements) and K
   (`vercel_project` NULL) are WARN-only, which is appropriate — they're config
   smells, not active outages.
6. **Workflow shape matches the repo's other gates** (`ci.yml`,
   `tenant-scope.yml`): checkout → setup-node@20 → run in `platform/` → Telegram
   `notify-failure` job gated on `if: failure()`. Secret passed via
   `env.SUPABASE_ACCESS_TOKEN_FULLLOOP`. `timeout-minutes: 10`.
7. **No install step needed and none present.** The script uses only Node
   built-ins (`node:fs/url/path`) + global `fetch` (Node 20). Correctly omits
   `npm ci` — keeps the job fast and independent of the build.

### Caveats / things to confirm ⚠️

1. **⚠️ Fork PRs run the gate as a no-op.** GitHub does not expose repo secrets to
   `pull_request` runs from forks, so `SUPABASE_ACCESS_TOKEN_FULLLOOP` is empty →
   token-guard skips → `exit 0`. For this private single-org repo (PRs are
   same-repo branches, secret present) this is fine, but it means the gate cannot
   be relied on for external-fork PRs. Documenting, not a defect.
2. **⚠️ "0 gating-CRIT on the real DB" is unverifiable from source.** The commit
   message claims a clean read-only run (0 CRIT, all sources agree). I cannot
   re-run it here (no Supabase Management-API token in this worktree, and standing
   rules bar prod reads/writes). Leader/Jeff should confirm the first `main` run
   after merge is green — if the live DB has real drift, the gate correctly goes
   red and that must be triaged, not bypassed.
3. **⚠️ Required-check status is a GitHub setting, not in the repo.** The workflow
   *runs*, but whether it *blocks merge* depends on branch-protection rules on
   `main` (Settings → Branches → Required status checks). Confirm
   `tenant-config-reconcile / reconcile` is listed as required once it's on `main`
   — otherwise it's advisory only.
4. **Middleware parsing is regex, not AST.** `BESPOKE_SITE_TENANTS` is extracted
   with `/BESPOKE_SITE_TENANTS\s*=\s*new Set<string>\(\[([\s\S]*?)\]\)/`. If that
   declaration is ever reformatted (e.g. `new Set([...])` without the
   `<string>` generic, or built from a spread), the match silently yields an
   empty set and the bespoke-vs-DB drift checks go quiet. Low risk today (the
   pattern matches current `middleware.ts`), but it's a brittle coupling worth a
   comment or a guard that fails if the set parses empty while the file clearly
   references the symbol.

## Verification performed

- `git cat-file -e <ref>:.github/workflows/tenant-config-reconcile.yml` across
  `main`, `integ/wave2-2026-07-11`, `p1-final-integration`, `p1-w3` — table above.
- `git merge-base --is-ancestor cf373c81 HEAD` → not in p1-w2 HEAD.
- Full read of the 225-line integration-branch script + the 56-line workflow.
- Confirmed exit-code path, token-guard order, and read-only-SELECT invariant by
  reading every `sql(...)` call site.

Not performed (can't, from here): a live run of the script; inspection of GitHub
branch-protection required-checks. Both are ⚠️ items above for leader/Jeff.

## Recommended actions (for leader, not W2 — file-only lane)

1. Merge an integration branch to `main` so the `push:[main]` trigger activates
   the gate on production.
2. After merge, confirm the first `main` run is green (or triage real drift).
3. Add `tenant-config-reconcile / reconcile` to `main`'s required status checks.
4. (Optional) Harden the middleware regex to fail loudly if it parses an empty
   set while `BESPOKE_SITE_TENANTS` is present in the file.
