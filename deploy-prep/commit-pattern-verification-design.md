# Commit-Pattern Verification (Section Q-S3) — DOCS ONLY, no hook installed

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-13
**Status:** design + a real read-only audit run this pass. No git hook installed, no
`.worker-driver.sh` or any live fleet script touched, per LEADER order.

**Problem statement (`MASTER-TODO-LIST.md` Section Q-S3):** "commit-pattern verification
(workers commit specific paths, never add `-A`)." This is also a standing rule for this
session directly ("never add all files at once (add specific paths)") — a fleet of 6+
worker worktrees sharing one `.git` object store means a stray `git add -A`/`git add .`
in any lane can accidentally commit host-local files (`.env*`, `node_modules/`,
`.worker-driver.sh`, editor swap/backup files) into a branch that later gets merged and
deployed. This doc covers two things: (1) a real audit of whether this has actually
happened, and (2) a design for catching it going forward — neither wired live.

---

## 1. Real audit run this pass (read-only, all 6 worktrees, no writes)

Two independent heuristics, since git doesn't record *which command* staged a commit —
only what ended up in it. Neither alone proves `-A` was or wasn't used; combined, they're
the strongest signal available from history alone.

### 1a. Disallowed-path scan

```
git log --oneline --name-only --since="2026-07-11" | \
  grep -E "^\.env($|\.)|node_modules/|\.worker-driver\.sh|\.bak|\.DS_Store"
```
Run against all 6 worktrees (`~/flwork-p1-w1` .. `~/flwork-p1-w6`).

**Result: zero hits in every worktree.** No commit in this session's window added an
`.env*` file, `node_modules/`, `.worker-driver.sh`, a `.bak` file, or a `.DS_Store` — the
exact class of file a careless `-A`/`.` would sweep in from a worker's local scratch
state. This is the finding that matters most: **no evidence of the failure mode this
rule exists to prevent, anywhere in the fleet, this session.**

### 1b. Wide-commit scan (>30 files changed in one commit)

```
git log --since="2026-07-11" --pretty=format:"%H %s" | while read hash rest; do
  n=$(git show --stat --format="" "$hash" | grep -c " | ")
  [ "$n" -gt 30 ] && echo "$hash ($n files): $rest"
done
```

Four commits fleet-wide crossed the 30-file threshold:

| Worktree | Commit | Files | Message |
|---|---|---|---|
| p1-w1 | `c749195e` | 47 | `fix(P1/SEO): kill fabricated AggregateRating + example.com canonicals across template + tenants` |
| p1-w3 | `6f88a702` | 161 | `fix(security): route all inline JSON-LD sinks through safeJsonLd (XSS residue sweep)` |
| p1-w3 | `a604b132` | 47 | `fix(seo): remove fabricated self-serving AggregateRating from all bespoke sites (CRITICAL-1)` |
| p1-w5/w6 | `6a052a58` | 43 | `feat(consortium-nyc): sweep positioning phrases (digital marketing...) -> web design [deploy]` |

**Read:** all four are single-purpose, repo-wide sweeps (a security fix applied
identically across every JSON-LD sink, a fabricated-rating removal applied across every
tenant site, a copy-phrase sweep) — the commit message names one coherent change and the
file count is explained by that change legitimately touching many files of the same kind
(e.g. one per tenant). This is what a *legitimate* wide commit looks like: a worker who
grepped for a pattern and edited N matching files, then added those N specific paths.
**Not, by itself, evidence of `-A` misuse** — but also not distinguishable from it by file
count alone, which is exactly why this heuristic is necessary-but-not-sufficient (see §3).

### 1c. Honesty note on what this audit can't see

`git log` only shows what a commit *contains*, never the command that staged it. A worker
who ran `git add -A` in a worktree that happened to have zero other dirty files at that
moment produces a commit indistinguishable from one built with explicit `git add <path>`
calls. This audit can rule out the **worst-case failure mode** (secrets/scratch files
leaking in) with high confidence — that class of file would show up in §1a regardless of
staging method, and none did — but it cannot certify every commit was staged path-by-path
as the rule requires. Closing that gap needs a prospective guard (§2), not a retrospective
scan.

---

## 2. Prospective guard — NOT installed

A `pre-commit` git hook (native git hook, not a Claude Code hook) that runs in every
worktree before a commit is created. Proposed content, file-only:

```bash
#!/usr/bin/env bash
# .git/hooks/pre-commit (PROPOSED — not installed by this pass)
# Blocks a commit if staged files include a path this fleet must never commit,
# regardless of how they were staged. Does NOT try to detect -A vs explicit add
# (git can't distinguish this after the fact) — instead blocks the one thing
# that actually matters: specific dangerous paths reaching a commit.

set -euo pipefail

DISALLOWED_PATTERN='(^|/)\.env($|\.[^/]*$)|(^|/)node_modules/|(^|/)\.worker-driver\.sh(\.|$)|\.bak[0-9a-z_-]*$|(^|/)\.DS_Store$|\.(pem|key)$'

staged=$(git diff --cached --name-only)
bad=$(echo "$staged" | grep -E "$DISALLOWED_PATTERN" || true)

if [ -n "$bad" ]; then
  echo "BLOCKED: staged files match the never-commit pattern:" >&2
  echo "$bad" >&2
  echo "If any of these is genuinely intended, stage it explicitly and re-run" >&2
  echo "with COMMIT_ALLOW_DISALLOWED=1 git commit ..." >&2
  [ "${COMMIT_ALLOW_DISALLOWED:-0}" = "1" ] || exit 1
fi

# Soft warning (does not block) on unusually wide commits, so a worker double
# -checks a >40-file commit is a real intentional sweep, not a stray -A.
n=$(echo "$staged" | grep -c . || true)
if [ "$n" -gt 40 ]; then
  echo "NOTE: $n files staged — confirm this is an intentional repo-wide sweep," >&2
  echo "not an accidental 'git add -A'/'git add .'. Not blocking." >&2
fi
exit 0
```

Design choices, explained:
- **Blocks by path, not by staging command** — the only thing git exposes after the fact
  is *what* is staged, so the guard has to act on that, not on how it got there. This
  directly closes the gap named in §1c: even if a worker ran `-A`, the dangerous paths
  named above can never actually land in a commit.
- **Hard block on disallowed paths, soft warning on wide commits** — a `.env` leak is
  unconditionally wrong; a 50-file commit might be a legitimate sweep (§1b shows 4 real
  ones this session). Blocking those outright would create false-positive friction against
  real work; a stderr note is enough for a human/agent to self-check.
- **Escape hatch is explicit and loud** (`COMMIT_ALLOW_DISALLOWED=1`), not a silent
  bypass — mirrors the shape of the `*_WEBHOOK_VERIFY=off` escape hatches audited
  elsewhere in this directory: an override should always be visible in the command that
  used it, never a default.
- **Per-worktree install, not fleet-wide by default** — `.git/hooks/` is NOT shared
  across worktrees sharing one object store (confirmed: `git rev-parse --git-path hooks`
  resolves to `.git/worktrees/<name>/hooks` per-worktree by default, unless
  `core.hooksPath` is explicitly pointed at a shared dir) — so installing this in one
  worktree does not silently change another lane's behavior. If Jeff wants it fleet-wide,
  installing it once per worktree (or setting a shared `core.hooksPath`) is a leader/Jeff
  decision, not made here.

**Explicitly not done this pass:** the hook file above is not written to
`.git/hooks/pre-commit` anywhere, not committed as an installed hook, and no
`.worker-driver.sh` or dispatch script was touched — per the standing "NO live-script
activation" instruction. This doc is the proposal; installing it is a Jeff/leader call.

---

## 3. Recommendation

1. **No incident found** — §1a's zero-hit disallowed-path scan across all 6 worktrees is
   the headline result; the rule appears to be holding in practice this session.
2. **Install the pre-commit hook (§2) if Jeff wants a durable guarantee** rather than
   relying on worker discipline + periodic audits like this one. Cheap, additive,
   reversible (`rm .git/hooks/pre-commit`), no schema/DB/deploy involved.
3. **Re-run the §1 audit periodically** (or fold into the successor/handoff runbooks) —
   it's a 2-command read-only check, cheap enough to run at any fleet review point without
   needing the hook installed first.

**Cross-refs:** `deploy-prep/pre-lane-branch-state-check.md` (Q-W5, adjacent — checks
worktree cleanliness *before* dispatch; this doc checks commit *content* after the fact),
`deploy-prep/git-reflog-recovery-runbook.md` (Q-W2, the recovery-side counterpart if a bad
commit like this ever does land and needs to be un-done).
