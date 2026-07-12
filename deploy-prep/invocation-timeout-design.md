# Invocation Timeout / Hung-Worker Watchdog — design (Q-W3, FOR-JEFF-REVIEW)

**Status:** PROPOSAL / design only. Nothing applied. `.worker-driver.sh` is **not** modified by this doc (standing rule: no touching live fleet scripts). This describes the change and hands over a ready-to-review patch; the leader applies it after Jeff approves.

**Author:** W6, branch `p1-w6`, 2026-07-12.

---

## The bug

`.worker-driver.sh` runs each order as a **blocking** command substitution with **no timeout**:

```bash
OUT=$(claude -p "...${ORDER}" --permission-mode acceptEdits 2>&1)
```

If that `claude -p` invocation ever wedges — API stall, a tool call waiting on stdin that never arrives, a network hang with no client-side deadline, or an internal loop — the driver **blocks on this line forever**. Consequences:

1. The `while true` poll loop never comes back around, so the worker **stops consuming new LEADER orders**.
2. No report is ever appended to the channel, so from the leader's side the worker just goes **silent**.
3. The driver **process is still alive** (`pgrep` finds it), so a respawn-on-death supervisor (see `fleet-supervisor-note.md`) sees "1 driver = healthy" and does nothing. A hung worker is invisible to a liveness-only check.

There is no heartbeat, so the leader cannot tell "busy on a legitimately long task" apart from "wedged."

## Why the obvious fix doesn't work here

The one-liner everyone reaches for is `timeout 900 claude -p ...`. **On this host it is not available:**

```
$ command -v timeout gtimeout   # → nothing
$ sw_vers -productVersion        # → 15.5 (macOS)
```

macOS does not ship GNU coreutils, so neither `timeout` nor `gtimeout` exists unless Homebrew coreutils is installed. The watchdog must therefore be **bash-native** (background the child, sleep, kill on expiry) so it works on the box as-is. If `coreutils` is later installed, `gtimeout` is a drop-in simplification — noted at the end.

## Design

Three pieces: **timeout + kill**, **retry with backoff**, **heartbeat**.

### 1. Bash-native timeout + process-tree kill

Run `claude -p` in the background, record its PID, and run a watchdog that kills it (and its child tool subprocesses) if it exceeds the deadline.

```bash
INVOKE_TIMEOUT_SECS=${INVOKE_TIMEOUT_SECS:-1200}   # 20 min hard cap per order
KILL_GRACE_SECS=${KILL_GRACE_SECS:-10}             # SIGTERM → wait → SIGKILL

run_with_timeout() {
  # $1 = prompt. Prints child output to stdout, returns:
  #   0   = completed
  #   124 = timed out (killed)
  local prompt="$1"
  local out_file; out_file=$(mktemp)

  claude -p "$prompt" --permission-mode acceptEdits >"$out_file" 2>&1 &
  local child=$!

  # Watchdog: sleep the deadline, then kill the child's whole process group
  # if it is still running.
  (
    sleep "$INVOKE_TIMEOUT_SECS"
    if kill -0 "$child" 2>/dev/null; then
      # negative PID targets the process group so tool subprocesses die too
      kill -TERM -- "-$child" 2>/dev/null || kill -TERM "$child" 2>/dev/null
      sleep "$KILL_GRACE_SECS"
      kill -KILL -- "-$child" 2>/dev/null || kill -KILL "$child" 2>/dev/null
    fi
  ) &
  local watcher=$!

  local rc=0
  if wait "$child" 2>/dev/null; then rc=0; else rc=$?; fi

  # Child finished (or was killed): stop the watchdog so it doesn't fire late.
  kill "$watcher" 2>/dev/null
  wait "$watcher" 2>/dev/null

  cat "$out_file"; rm -f "$out_file"

  # 143 = 128+SIGTERM, 137 = 128+SIGKILL → treat both as "timed out".
  if [ "$rc" -eq 143 ] || [ "$rc" -eq 137 ]; then return 124; fi
  return "$rc"
}
```

For the process-group kill (`kill -- -PID`) to reach tool subprocesses, the child must be its own group leader. Start the driver — or at least this call — under `set -m` (job control on) so each `&` gets its own process group, or launch via `setsid` if available. If neither is in play, the fallback `kill "$child"` still kills the top-level `claude` process, which is the thing that's wedged; orphaned tool children are reaped by the OS shortly after their parent dies. **This nuance is worth a real test before relying on the group-kill path** (see Verification).

### 2. Retry with backoff

A single hang is often transient (API blip). Retry a bounded number of times, backing off, before giving up and reporting the order as failed.

```bash
INVOKE_MAX_ATTEMPTS=${INVOKE_MAX_ATTEMPTS:-2}
INVOKE_RETRY_BASE=${INVOKE_RETRY_BASE:-15}

attempt=1
while :; do
  OUT=$(run_with_timeout "$PROMPT"); rc=$?
  [ "$rc" -ne 124 ] && break                       # completed (ok or app error)
  echo "[$(date +%H:%M:%S)] $ID TIMEOUT attempt $attempt/$INVOKE_MAX_ATTEMPTS" >> "$LOG"
  if [ "$attempt" -ge "$INVOKE_MAX_ATTEMPTS" ]; then
    printf '%s %s->LEADER: ORDER TIMED OUT after %d attempts (%ds cap) — order needs re-issue or manual look\n' \
      "$(date +%H:%M)" "$ID" "$INVOKE_MAX_ATTEMPTS" "$INVOKE_TIMEOUT_SECS" >> "$CHANNEL"
    OUT=""   # fall through; existing "did the worker report?" guard stays quiet
    break
  fi
  sleep $(( INVOKE_RETRY_BASE * attempt ))
  attempt=$(( attempt + 1 ))
done
```

Retry is **safe only because orders are expected to be idempotent-ish file work under `acceptEdits`** — a re-run redoes edits/commits in the same worktree. That assumption holds for the current file-only / design-doc workload. For an order that performs a non-idempotent side effect, a blind retry could double it. Flagged, not silently assumed. If that ever changes, gate retry behind an order-level opt-out.

### 3. Heartbeat (so "slow" ≠ "hung")

Timeout alone still can't tell the leader *why* a worker is quiet mid-order. A cheap heartbeat file fixes that: touch it before the invocation and let the watchdog refresh it, or simply stamp start/end.

```bash
HEARTBEAT=/tmp/worker-$ID.heartbeat
# before invocation:
printf 'START %s order=%s\n' "$(date +%s)" "${ORDER:0:80}" > "$HEARTBEAT"
# after invocation:
printf 'IDLE %s\n' "$(date +%s)" > "$HEARTBEAT"
```

A supervisor (or the leader) then treats a worker as **hung** when: driver PID alive **AND** heartbeat still `START` **AND** `now - START > INVOKE_TIMEOUT_SECS + slack`. That distinguishes the three states liveness-only checks collapse: dead (no PID), busy (PID + fresh START within cap), hung (PID + stale START past cap). This closes the blind spot in `fleet-supervisor-note.md` where a wedged worker reads as healthy.

## Tunables (env-overridable, sane defaults)

| Var | Default | Meaning |
|---|---|---|
| `INVOKE_TIMEOUT_SECS` | 1200 | Hard cap per order before kill. Set above your longest legit order. |
| `KILL_GRACE_SECS` | 10 | SIGTERM→SIGKILL grace so the child can flush. |
| `INVOKE_MAX_ATTEMPTS` | 2 | Total tries (1 retry) on timeout. |
| `INVOKE_RETRY_BASE` | 15 | Backoff seconds, multiplied by attempt#. |

**Pick `INVOKE_TIMEOUT_SECS` deliberately.** Too low and it kills legitimately long orders mid-flight (and the retry re-does the partial work); too high and a real hang wastes that long before recovery. 20 min is a starting guess, not a measured value — tune against observed real order durations in `/tmp/worker-$ID.log`.

## What this does and does not fix

- **Fixes:** a single wedged `claude -p` no longer freezes the worker forever; the leader gets an explicit `ORDER TIMED OUT` line instead of silence; hung vs. busy becomes distinguishable via heartbeat.
- **Does not fix:** the offset-race duplicate-driver issue (that's `atomic-queue-claim-design.md`) or crash-respawn (that's `fleet-supervisor-note.md`). This is the third leg — **hang** — alongside **duplicate** and **death**. All three are independent and compose.

## Verification done / not done

- **Not run.** This is a design; no script was modified or executed against the live fleet.
- Confirmed on-host: `timeout`/`gtimeout` absent (`command -v` → nothing), macOS 15.5 — this is why the design is bash-native rather than a `timeout` wrapper. Verified this turn.
- **Not verified:** that `kill -- -"$child"` reaches tool subprocesses in this driver's job-control setup. The group-kill path needs a real test (start a deliberately-sleeping child, confirm the whole tree dies) on a scratch driver before trusting it in production. The top-level `kill "$child"` fallback is the safe floor.
- No `shellcheck` on host (same as `fleet-supervisor-note.md`); `bash -n` syntax check is the cheapest pre-apply gate.

## If coreutils is later installed

`gtimeout` collapses `run_with_timeout` to:

```bash
gtimeout --kill-after="${KILL_GRACE_SECS}s" "${INVOKE_TIMEOUT_SECS}s" \
  claude -p "$prompt" --permission-mode acceptEdits 2>&1
# exit 124 = timed out, exit 137 = had to SIGKILL
```

Same exit-code contract, no hand-rolled watchdog. The retry/backoff/heartbeat wrapper around it is unchanged.
