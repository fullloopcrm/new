# Handoff Verification Protocol (Q-N3)

> How the LEADER proves a successor session is genuinely LIVE — **drivers alive + successor posted + cron handed over** — *before* it deletes its own watch cron and stands down. A leader that stands down on an *unverified* successor kills the fleet (no driver feeding, no watch loop, orders pile up unread).
>
> Authored by W4 2026-07-12, grounded in the real machinery banked in `LEADER-HANDOFF.md` (self-spawn §284, timing §293-294, offset-race §305, fleet §266). **Not executed** — W4 is read/test-only; this is a runbook for the leader to run. Every command below is a *read/verify* (`pgrep`, `ps`, `osascript get history`, `grep` of the channel) — none mutate state except the final, deliberate `CronDelete` of the leader's own cron.

---

## 0. The failure this prevents

The leader runs a **1-min watch cron** (SESSION-ONLY) and is the only thing that (a) feeds workers their next 3-deep queue and (b) reacts to Jeff. If the leader stands down before a successor is truly driving:

- workers finish their queues and sit **DRY** with no one to refill them,
- Jeff's Desktop messages go unread,
- and — because the watch cron is session-scoped — **no cron re-arms itself**; the fleet silently stalls.

So the stand-down is **gated**: all three verification gates must PASS, in order, or the leader does **not** delete its cron.

**Hard invariant:** never run two leaders on the same channel longer than the verify step, and never leave zero. The window between "successor confirmed" and "old leader cron deleted" is the *only* time two leaders/crons may coexist — keep it seconds, not minutes.

---

## 1. Preconditions (before you even spawn)

Start this at **70% context; be fully done by 80%** (`LEADER-HANDOFF.md` §293 — supersedes all earlier figures). Before spawning the successor:

1. **Handoff package is current** — `LEADER-HANDOFF.md`, `RESUME-POINT.md`, `NEW-LEADER-BOOT.md` re-authored and committed (on `p1-w2` per §119). A fresh leader boots from these; stale = successor reconstructs context and drifts.
2. **Fleet is healthy right now** (not from a stale poll — §142). Capture the driver PIDs you will re-check in Gate 1.
3. **Boot prompt is in a FILE**, not inline osascript. `LEADER-HANDOFF.md` §285: inline escaped quotes are fragile and drop to a shell. Write the boot prompt to e.g. `/tmp/leader-boot.txt` and spawn with `$(cat ...)` so the long prompt expands in the *new* shell and never touches osascript quoting.

---

## 2. Spawn the successor

```bash
# prompt lives in a file — never inline
osascript -e 'tell application "Terminal" to do script "caffeinate claude \"$(cat /tmp/leader-boot.txt)\""'
```

`do script` returns the new window id as `tab 1 of window id NNNNN`. **Record NNNNN** — every gate below targets it by id (windows drift across restarts and can live on another Space; id is the only stable handle — §138, §148).

---

## 3. The three gates (all must PASS, in order)

### GATE 1 — DRIVERS ALIVE (the fleet can still be fed)

The successor is worthless if the workers it inherits are dead. Verify **at the instant you claim it** (§47, §142 — stale "all running" is the classic failure):

```bash
pgrep -fl "claude -p"                       # headless worker invocations in flight
ps -p <W1pid> <W2pid> <W3pid> <W4pid> <W5pid> <W6pid>   # the 6 polling drivers
# one driver per lane — kill any dupes (offset race stalls a lane, §254):
for n in 1 2 3 4 5 6; do echo "w$n:"; pgrep -f "flwork-p1-w$n/.worker-driver"; done
```

**PASS:** exactly one `.worker-driver` per lane (6 total), each PID alive.
**FAIL actions:** restart a dead driver (`do script "bash <path>" in window id <lane-win>`); kill any duplicate poller (two on one worktree race and stall it — §254). Do **not** proceed to Gate 2 with a dead/duplicated driver.

> Note: a worker with `running=none` but an unprocessed `LEADER->Wn` order in the channel is the **offset-resync race** (§305), not a dead driver — the order was appended mid-invocation and skipped. Re-append the order *after* the worker is idle. Don't misread this as a driver failure.

### GATE 2 — SUCCESSOR POSTED (it is actually booted and driving)

Two independent confirmations — one visual, one on-channel. **Do NOT use `pgrep -f "FRESH LEADER"`** — a running claude leader does not match that string; it false-negatives and nearly caused a double-spawn (§285).

**2a. Visual TUI proof** (read the new window, not the process table — §289-290):
```bash
osascript -e 'tell application "Terminal" to get history of tab 1 of window id <NNNNN>'
```
**PASS:** output shows the live claude TUI — a `❯` prompt + the Opus/`%` statusline, and usually boot output showing it read the handoff docs.
**FAIL:** blank, a plain `zsh` prompt, or an error → the spawn dropped to a shell (fragile-quoting misfire). Re-spawn from the file; do not stand down.

**2b. On-channel proof** — the successor must announce itself, AND the outgoing leader must post the rundown (§176-177). Confirm both landed:
```bash
tail -n 40 /Users/jefftucker/fullloopcrm/LEADER-CHANNEL.md
grep -nE "NEW-?LEADER|FULL RUNDOWN|successor .*(LIVE|online|booted)" \
     /Users/jefftucker/fullloopcrm/LEADER-CHANNEL.md | tail
```
**PASS:** a `LEADER->NEW-LEADER: FULL RUNDOWN` (from you) **and** a successor-authored line proving it read context and is taking the wheel (e.g. `NEW-LEADER->ALL: online, read handoff, resuming`). The rundown must carry: (1) what was done this session w/ commit shas + paths, (2) what remains w/ exact locations, (3) next steps in order, (4) guardrails (§177).
**FAIL:** rundown missing → post it. Successor line missing → the successor hasn't reached the channel yet; wait and re-check, or nudge. Do not stand down on 2a alone — a booted TUI that never posts may be stuck at a prompt.

### GATE 3 — CRON HANDED OVER (exactly one watch loop will run)

The watch cron is **SESSION-ONLY** and does not survive to the successor automatically (§266). The successor **re-arms its own** 1-min cron on boot. The danger is **double-drive** (two crons on one channel) or **zero-drive** (you delete yours before theirs exists).

Ordering is strict:
```bash
CronList                     # see both the successor's new cron AND your own
```
1. **Confirm the successor's cron exists** (a new 1-min watch cron id, not yours). If absent, the successor hasn't re-armed — **wait**; do not delete yours (zero-drive).
2. **Only then** delete your own:
```bash
CronDelete <your-own-watch-cron-id>
CronList                     # verify: exactly ONE watch cron remains (the successor's)
```
**PASS:** post-delete `CronList` shows exactly one watch cron, owned by the successor.
**FAIL:** two crons → you didn't delete yours (double-drive: workers get orders twice / racing). Zero crons → you deleted yours before the successor armed (fleet stalls). Fix to exactly one before continuing.

---

## 4. Stand-down (only after 3/3 PASS)

In order:
1. Post `LEADER(session-N)->session-N+1/ALL: STANDING DOWN — successor LIVE + verified in window <NNNNN>, drivers 6/6 alive, cron handed (yours deleted, theirs armed).` to `LEADER-CHANNEL.md`.
2. Post the **FULL HANDOFF message to Claude Desktop** chat "Building a custom CRM for home services" via guarded osascript (§274-275): what was done (commit shas), 6-fleet state, successor window id, top open gap. (Channel rundown + Desktop message together = the handover.)
3. Stop your own loop.

**Never** stop before step 1-2, and never before Gate 3 shows exactly one cron.

---

## 5. One-screen checklist

| Gate | Prove it | Command | PASS |
|---|---|---|---|
| **1 Drivers alive** | fleet can be fed | `ps -p <6 pids>`; one `.worker-driver` per lane | 6 alive, no dupes |
| **2a Successor booted** | TUI is live, not a shell | `osascript ... get history of tab 1 of window id <NNNNN>` | `❯` + Opus/% statusline |
| **2b Successor posted** | it's on the channel + rundown given | `grep NEW-LEADER/FULL RUNDOWN` in channel | both lines present |
| **3 Cron handed** | exactly one watch loop | `CronList` before+after `CronDelete <own>` | 1 watch cron (successor's) |
| **Stand-down** | handover recorded | channel STANDING DOWN + Desktop handoff | both posted, then stop |

**Abort rule:** any gate FAIL → do not delete your cron, do not stand down. Fix the gate or keep leading. A leader that keeps running is recoverable; a fleet abandoned to a dead successor is not.

---

## 6. Anti-patterns (each cost a prior leader — from `LEADER-HANDOFF.md`)

- `pgrep -f "FRESH LEADER"` to verify the successor → **false negative**, nearly double-spawned (§285). Use TUI history.
- Inline boot prompt in osascript → fragile quotes drop to a shell (§285). Prompt-to-file + `$(cat)`.
- Claiming "all drivers running" from a poll taken minutes ago (§142). Re-check at report-time.
- Deleting your cron before the successor re-armed → zero-drive stall (§3 Gate 3).
- Standing down with only a spawn, no channel rundown (§176) → successor boots blind, drifts.
- Assuming a window is where you left it — it may be on another Space; `activate` won't fetch it (§148). Target by id.
