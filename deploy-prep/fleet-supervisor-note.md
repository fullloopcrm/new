# Fleet Supervisor — run note (Q-N1, FOR-JEFF-REVIEW)

**Status:** PROPOSAL. `scripts/fleet-supervisor.sh` is authored but **not wired in and not run.** It defaults to DRY_RUN. Nothing in the live fleet is touched by authoring this.

**Author:** W6, branch `p1-w6`, 2026-07-12.

---

## What it does

Sweeps a fixed list of worker driver processes on an interval and:

| Drivers found for a worker | Action |
|---|---|
| **0** | respawn with per-worker exponential backoff (`5s → 10s → … → 300s` cap) |
| **1** | healthy; backoff counter resets after `120s` of sustained health |
| **>1** | **WARN** (duplicate = the double-run bug). Only stops extras if you pass `--reap --live`; keeps the oldest PID. |

Logs to `/tmp/fleet-supervisor.log`. Backoff state lives in `/tmp/fleet-supervisor-state/`.

## Why it is deliberately timid

**Correction (LEADER, 2026-07-12):** an earlier version of this note read the "two PIDs per worker" from `pgrep -fl worker-driver` as live duplicate drivers. That was a **false positive** — the 2nd PID is the driver's own transient work-subshell (a child, `PPID` = the driver), not a second driver. DRY/idle workers show 1 PID; busy workers show 2. So there are **no live duplicate drivers**, and the supervisor's `>1` WARN path is guarding against a *structural* possibility (a genuine second driver from cron re-launch / crash-respawn overlap), not something happening right now. The real bug is the **offset-race** — latent, not active — whose permanent fix is a singleton lock inside the driver (see `atomic-queue-claim-design.md`), **not** this supervisor. This script is a stopgap that keeps a *crashed* worker alive; it does not fix the offset-race root cause.

Because the two-PID reading was a subshell (not a duplicate), the supervisor must be careful **not** to WARN on a worker's transient work-subshell. The pgrep pattern must match only the driver process itself (anchored on the driver script path), not its children, or every busy worker would trip a false duplicate WARN. Flag for the `--reap` path especially: never reap a child work-subshell mistaking it for a duplicate driver.

## How to run (when Jeff clears it)

```bash
# 1. Dry run — prints what it WOULD do, spawns/kills nothing:
bash scripts/fleet-supervisor.sh --once

# 2. See it decide over time, still no side effects:
bash scripts/fleet-supervisor.sh          # loops, DRY_RUN on

# 3. Actually respawn dead drivers (no killing):
bash scripts/fleet-supervisor.sh --live

# 4. Also stop duplicate drivers, keeping the oldest per worker:
bash scripts/fleet-supervisor.sh --live --reap
```

Recommended first real use: `--live` (respawn-only) **after** the duplicates are cleared by hand, so the supervisor starts from a clean 1-driver-per-worker baseline. Use `--reap` only once you have confirmed the singleton-lock fix is NOT yet in place and you accept the supervisor arbitrating which duplicate survives.

## Config knobs (top of the script)

- `FLEET` — the `ID:WORKTREE` list. **Edit if worktrees change.**
- `POLL_SECS=30`, `BACKOFF_BASE=5`, `BACKOFF_MAX=300`, `BACKOFF_RESET_SECS=120`.
- pgrep pattern is anchored with `\$` so `.worker-driver.sh.bak-session4` never matches a live driver.

## Verification done / not done

- **Not run** (proposal; would spawn real processes). No shellcheck available on this host (`which shellcheck` → not found), so it was **not** statically linted — written defensively (all expansions quoted, `set -u`, `[ ]` tests). Flag: worth a `shellcheck` pass on a host that has it before first `--live` run.
- Manual read-through only. `bash -n scripts/fleet-supervisor.sh` (syntax-only, no execution) is the cheapest safe check and is recommended before running.

## Dependencies / sequencing

- Depends on `.worker-driver.sh` existing and executable in each worktree (it re-execs it as-is; it does **not** modify it).
- Should be superseded by, or paired with, the singleton-lock change proposed in `atomic-queue-claim-design.md`. If that lands, `--reap` becomes unnecessary and the supervisor collapses to pure respawn-on-death.
