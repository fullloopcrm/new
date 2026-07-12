# Atomic Queue Claim — design (Q-N2, FOR-JEFF-REVIEW)

**Status:** DESIGN / PROPOSAL. No change to the running `.worker-driver.sh` is made by this doc. Authored by W6, `p1-w6`, 2026-07-12.

**Problem statement (from LEADER):** "how a worker atomically claims an order so two invocations cannot double-run it (offset-race is the live bug; propose the fix mechanism)."

---

## 1. The bug, precisely

`.worker-driver.sh` claims work like this (current code):

```bash
OFF=$(wc -c < "$CHANNEL")           # my private byte offset
while true; do
  CUR=$(wc -c < "$CHANNEL")
  if [ "$CUR" -gt "$OFF" ]; then
    NEW=$(tail -c +$((OFF+1)) "$CHANNEL"); OFF=$CUR
    ORDER=$(printf '%s\n' "$NEW" | grep -m1 -E "$PAT")   # LEADER->W6|ALL
    [ -n "$ORDER" ] && break
  fi
  sleep 2
done
# ... spawn `claude -p "...$ORDER"` ...
```

The "claim" is nothing more than **advancing a process-local variable `OFF`.** It is invisible to any other process. There is no shared record that says "order X is taken."

**Two failure modes, one root:**

1. **Duplicate drivers (observed live).** On 2026-07-12, `pgrep -fl worker-driver` showed *two* `bash .../.worker-driver.sh` PIDs for W1, W3, and W5 simultaneously. Each has its own `OFF`. When a `LEADER->W3:` line lands, **both** W3 drivers see it, both advance their own `OFF`, both spawn `claude -p` for the same order → the order runs twice. For a `LEADER->ALL:` line, every duplicated worker double-runs. This is the "offset-race."

2. **Overlapping invocations of one order.** Even with a single driver, a `claude -p` run can take minutes. If a second driver (from cron re-launch) starts during that window, it reprocesses everything after *its* fresh `OFF` — which includes the still-in-flight order.

Root cause in one line: **claiming and executing are not guarded by any shared, atomic mutual-exclusion primitive.** Byte offsets are per-process state, not a lock.

## 2. Why "just track offset better" doesn't fix it

Any purely-local bookkeeping (offset, seen-set in memory, a per-process file) fails the moment a second process exists, because the two processes don't share it. The fix must live in **shared filesystem state mutated atomically**, or in **preventing the second process from existing at all.** The design below does both (defense in depth).

## 3. Fix — two layers

### Layer A (primary): singleton driver via `flock`

Stop duplicate drivers from ever coexisting. A driver that cannot get an exclusive lock on its own lockfile exits immediately.

```bash
# top of .worker-driver.sh, after ID/WT are set:
LOCK="/tmp/worker-${ID}.driver.lock"
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "[$(date +%H:%M:%S)] $ID driver already running (lock held) — exiting" >> "$LOG"
  exit 0
fi
# fd 9 stays open for the life of the process; lock releases automatically on exit/crash.
```

- `flock -n` is non-blocking: the second driver fails fast and exits, so cron re-launches are harmless.
- The lock is released by the kernel when the holder dies (crash-safe — no stale lockfile to clean).
- **This alone eliminates the observed double-run**, because both failure modes require ≥2 drivers per worker.

macOS note: `flock(1)` is not part of the base OS. Options: install `util-linux`/`flock` via Homebrew, or use the `/usr/bin/shlock` idiom, or an atomic-mkdir lock (below). The mkdir approach needs no extra binary.

Portable no-`flock` singleton (atomic `mkdir`):

```bash
LOCKDIR="/tmp/worker-${ID}.driver.lockd"
if ! mkdir "$LOCKDIR" 2>/dev/null; then
  # stale? if the recorded PID is dead, take it over; else exit.
  if [ -f "$LOCKDIR/pid" ] && ! kill -0 "$(cat "$LOCKDIR/pid")" 2>/dev/null; then
    rm -rf "$LOCKDIR"; mkdir "$LOCKDIR" || exit 0
  else
    exit 0
  fi
fi
echo $$ > "$LOCKDIR/pid"
trap 'rm -rf "$LOCKDIR"' EXIT
```

`mkdir` is atomic on POSIX filesystems: exactly one racing process succeeds. The stale-PID recovery handles the crash case that `flock` gets for free.

### Layer B (defense in depth): per-order claim ledger

Even with a singleton, a belt-and-suspenders claim makes double-execution impossible if a second process ever slips through. Each order gets a **stable claim key**, and a worker executes only if it wins an atomic create on that key.

**Claim key.** Derive a stable ID per order line so retries/duplicates collapse to the same key. Use the absolute byte offset of the matched line plus a content hash:

```bash
# ORDER is the matched line; OFF_AT is the channel byte offset where it began.
KEY=$(printf '%s\n' "$ORDER" | shasum -a 256 | cut -c1-16)
CLAIM="/tmp/leader-claims/${ID}.${OFF_AT}.${KEY}"
```

**Atomic claim** (whichever is available; all are single-winner):

```bash
mkdir -p /tmp/leader-claims
# Option 1: noclobber redirect — fails if the file exists.
if ( set -o noclobber; : > "$CLAIM" ) 2>/dev/null; then
  # WON the claim -> execute the order
else
  echo "[$(date)] $ID: order $KEY already claimed, skipping" >> "$LOG"
  # do NOT spawn claude -p
fi
```

`set -o noclobber` + `>` is an `O_EXCL`-style create: exactly one process can create the file; the rest get EEXIST and back off. `mkdir "$CLAIM"` works identically and needs no subshell.

Record completion in the claim file (append the finishing PID/time) so a supervisor or audit can distinguish "claimed-and-running" from "claimed-and-done":

```bash
printf 'pid=%s start=%s\n' "$$" "$(date +%s)" > "$CLAIM"
# ... after claude -p returns ...
printf 'done=%s\n' "$(date +%s)" >> "$CLAIM"
```

## 4. Recommendation

1. **Ship Layer A (singleton lock) first.** It is ~6 lines, crash-safe with `flock`, and directly kills the observed duplicate-driver double-run. Prefer `flock` if the binary is available; otherwise the atomic-`mkdir` variant (no dependency).
2. **Add Layer B (claim ledger) as hardening** so that even a rogue second process can never execute the same order twice. Keys are content+offset derived, so `LEADER->ALL` lines are claimed per-worker.
3. Clear the existing duplicate drivers **once, by hand** (or via `fleet-supervisor.sh --reap`) before landing the lock, so every worker starts from a clean 1-driver baseline.

## 5. Interaction with other Q items

- **Q-N1 `fleet-supervisor.sh`**: once Layer A is in, the supervisor's `--reap` path becomes unnecessary; it collapses to respawn-on-death. The supervisor and the lock are complementary — the lock prevents duplicates, the supervisor heals genuine deaths.
- **Q-N4 `atomic-channel-write-design.md`**: the claim ledger writes to `/tmp/leader-claims/`, *not* to `LEADER-CHANNEL.md`, so it does not add contention to the channel. Channel-append atomicity is a separate concern handled there.

## 6. Verification status

Design only. Snippets are **not** wired into the live driver (LEADER: do not hot-swap the running `.worker-driver.sh`). Recommended validation before adoption: `bash -n` the patched driver, then start two copies by hand in a throwaway worktree and confirm the second exits on the lock.
