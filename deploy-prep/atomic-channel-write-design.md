# Atomic Channel Write — design (Q-N4, FOR-JEFF-REVIEW)

**Status:** DESIGN / PROPOSAL. No change to `LEADER-CHANNEL.md` or the running `.worker-driver.sh` is made by this doc. Authored by W6, `p1-w6`, 2026-07-12.

**Problem statement (from LEADER):** "how to make LEADER-CHANNEL.md appends torn-write-safe (flock / write-tmp-rename)."

---

## 1. Honest correction up front

The prompt lists "flock / write-tmp-rename" as candidate mechanisms. **write-tmp-rename is the wrong tool for an append log** and should not be used here. `rename(2)` atomically *replaces the whole file*. If two writers each do read-file → append-in-memory → write-tmp → rename, the second rename **clobbers the first writer's addition** (lost update), because each started from a stale snapshot. Rename-swap is correct for *replacing* a file's entire contents atomically (e.g. a config or a state file with a single owner), not for concurrent appends from 6+ writers. **The right primitive for a shared append log is an advisory lock (`flock`) serializing the appends.** The rest of this doc uses that.

## 2. The bug, precisely

Writers to `LEADER-CHANNEL.md` today:

- The leader appends orders (`echo/printf ... >> CHANNEL`).
- Each worker driver appends its own report via the `echo "... >> $CHANNEL"` it is told to run, **and** the driver's fallback block (`.worker-driver.sh` lines 25–28) appends a synthesized report line if the worker didn't.
- Each `claude -p` subprocess may itself append.

That is many independent processes appending to one file with `>>` (O_APPEND). Two distinct tearing risks:

1. **Interleave across a multi-line message.** A worker report can be multiple lines / a long line built by `printf`. The shell may emit it via more than one `write(2)` call. Between those calls, another writer's `write(2)` can land, so the two messages interleave in the file. Reports in this channel are routinely 1–2 KB — comfortably large enough to be split by the writing utility and to interleave.
2. **Partial line visible to readers.** The driver reads with `tail -c +N` / `grep`. A reader that samples mid-write can see a half-written line and mis-parse (or match `LEADER->W3:` inside a torn fragment).

### What O_APPEND does and does NOT guarantee

`>>` opens with `O_APPEND`, so the kernel makes the seek-to-EOF-and-write **for a single `write(2)`** atomic: two concurrent single-`write` appenders never overwrite each other, and each lands wholly at the end. POSIX only guarantees *whole-write* atomicity up to `PIPE_BUF` for **pipes**; for **regular files** the per-`write` append position is atomic on local filesystems, but the standard does not promise that a *logical message spanning multiple `write` calls* stays contiguous. So the real exposure is **(a)** any writer that uses more than one `write` per message, and **(b)** network/overlay filesystems where even single-write append atomicity is weaker. On this fleet all writers are on a local disk, so the dominant risk is (a): multi-`write` shell output interleaving.

## 3. Fix — flock-serialized append helper

Serialize every append through one advisory lock. All writers take the lock, append, release. `flock` is advisory, so **it only works if every writer cooperates** — the migration must convert *all* append sites, or the holdouts can still tear.

```bash
# channel-append.sh  (proposed helper; source it or call it)
CHANNEL="/Users/jefftucker/fullloopcrm/LEADER-CHANNEL.md"
LOCK="${CHANNEL}.lock"

channel_append() {
  # usage: channel_append "W6->LEADER: ...."   (one logical message; may be multi-line)
  local msg="$1"
  exec 8>>"$LOCK"          # open lock fd (append so we never truncate it)
  flock 8                  # block until exclusive
  printf '%s %s\n' "$(date +%H:%M)" "$msg" >> "$CHANNEL"
  flock -u 8               # release (also released on fd close / process exit)
  exec 8>&-
}
```

- One `flock` region wraps the whole `printf`, so even a multi-`write` message is contiguous.
- Lock auto-releases if the holder crashes mid-append (kernel closes the fd) — no stale lock, no deadlock.
- Readers *may* also `flock` (shared) before `tail`/`grep` to avoid reading a mid-append line, but with writers serialized and each message written under one lock the partial-line window is already closed for practical purposes; a shared read-lock is optional hardening.

### Portable variant without `flock(1)` (macOS base has no `flock` binary)

Same atomic-`mkdir` mutex used in the queue-claim design:

```bash
LOCKDIR="${CHANNEL}.lockd"
channel_append() {
  local msg="$1" tries=0
  until mkdir "$LOCKDIR" 2>/dev/null; do
    tries=$((tries+1)); [ "$tries" -gt 500 ] && { echo "channel lock stuck" >&2; return 1; }
    sleep 0.02
  done
  printf '%s %s\n' "$(date +%H:%M)" "$msg" >> "$CHANNEL"
  rmdir "$LOCKDIR"
}
```

Trade-off: a crash between `mkdir` and `rmdir` leaves a stale `.lockd`; add the dead-PID recovery from `atomic-queue-claim-design.md` §3A if you use this variant. `flock` avoids the stale-lock problem entirely, so **prefer `flock` (install via Homebrew `util-linux`)** and keep the `mkdir` form only as a no-dependency fallback.

## 4. Migration plan (all-or-nothing for advisory locking to hold)

1. Add `channel-append.sh` helper (this doc's snippet) — new file, no behavior change yet.
2. Convert **every** append site to call `channel_append`:
   - `.worker-driver.sh` lines 9, 23-instruction, 27 (leader-fallback).
   - The per-worker report instruction the driver injects into `claude -p` (change the required `echo ... >> $CHANNEL` to `channel_append "..."`).
   - Any leader-side script that appends orders.
3. Because `flock` is advisory, **step 2 must be complete before it protects anything** — a single un-converted writer reintroduces tearing. Track the conversion like a checklist and land it atomically.
4. This is a **channel-machinery change**, which the current LEADER order explicitly forbids hot-swapping. So this stays a FOR-JEFF-REVIEW proposal; adoption is Jeff/leader-gated during a quiet window (no in-flight `claude -p` writers).

## 5. Alternative considered: single-writer broker

A tiny long-lived process owns the file; everyone else sends messages over a FIFO (`mkfifo`) or unix socket, and the broker is the sole appender (so no locking needed). Cleaner concurrency story, but adds a daemon to supervise (another thing for `fleet-supervisor.sh` to keep alive) and a new failure mode (broker down = channel silent). **Not recommended** unless append volume grows enough that lock contention becomes measurable; the flock helper is far less machinery for this scale.

## 6. Interaction with other Q items

- **Q-N2 `atomic-queue-claim-design.md`**: claim ledger writes to `/tmp/leader-claims/`, not the channel, so the two locks never contend. The singleton-driver lock there also *reduces* the number of channel writers (one driver per worker instead of two), shrinking the tearing surface.
- **Q-N1 `fleet-supervisor.sh`**: if the single-writer broker (§5) were ever adopted, the supervisor would need to keep the broker alive too. With the flock helper (recommended), no new process to supervise.

## 7. Verification status

Design only; nothing wired. The channel and driver are untouched per the standing order. Recommended validation before adoption: in a throwaway file, launch ~10 background writers each calling `channel_append` in a loop, then assert every line matches the expected `HH:MM WNN->LEADER:` shape with zero interleaved/partial lines (`grep -vcE '^[0-9]{2}:[0-9]{2} '` should be 0).
