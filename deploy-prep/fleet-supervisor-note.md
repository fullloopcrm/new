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

As of 2026-07-12, `pgrep -fl worker-driver` showed **two** driver PIDs for several workers at once (W1: 27879+29642, W3: 17343+29626, W5: 24095+29664). That is the live **offset-race double-run** bug (see `atomic-queue-claim-design.md`). A supervisor that blindly respawns can never *create* a duplicate, but it must not pretend the existing duplicates are healthy either — so it warns, and only reaps on an explicit flag. **The correct permanent fix is a singleton lock inside the driver, not this supervisor.** This script is a stopgap that keeps a *crashed* worker alive; it does not fix the duplication root cause.

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
