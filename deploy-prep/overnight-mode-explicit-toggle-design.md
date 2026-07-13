# Overnight-Mode Explicit Toggle (Q-S1, FOR-JEFF-REVIEW)

**Status:** PROPOSAL / design only. No flag file created, no code changed, nothing wired into any live
process. The leader decides whether to adopt.

**Author:** W6, branch `p1-w6`, 2026-07-13.

---

## The problem

"Overnight autonomous mode" — the state that governs whether the leader may keep dispatching non-gated
work without waking Jeff — currently exists **only as prose inside `LEADER-HANDOFF.md`**, not as a
machine-checkable value. Real evidence from this fleet's own history, not a hypothetical:

- `LEADER-HANDOFF.md:153` — `### OVERNIGHT AUTONOMOUS MODE (activated 2026-07-11 ~20:37 by Jeff)`, a
  markdown heading inside a multi-hundred-line handoff doc.
- `LEADER-HANDOFF.md:81` — the operative rule ("Do NOT wake Jeff for non-gated work...") is one bullet in
  an 8-section document, not a standalone checkable state.
- The mode has **already flipped state multiple times in one week** without a durable record of the
  transitions: activated 2026-07-11 ~20:37 (`LEADER-HANDOFF.md:10`), then implicitly paused (budget/usage
  concerns — `LEADER-CHANNEL.md:1239` says "usage banker back in budget per Jeff" as the reason for the
  *next* resume), then explicitly resumed at 16:33 same day (`LEADER-CHANNEL.md:1239`: "RESUME FULL-STEAM
  (Jeff said start...)"). Three state transitions, zero of them recorded anywhere a new leader boot could
  mechanically check — only recoverable by reading channel prose and inferring the current state from
  whichever mention is most recent.

A new leader session boots by reading `NEW-LEADER-BOOT.md` + the handoff doc narrative (this is the same
boot path Q-O4's `boot-rule-reload-confirmation-design.md` already targets for banked *rules*; this item
is the parallel gap for the fleet's *operating mode*). If that session misreads or skips the overnight
section, two distinct failure directions exist:

1. **False-ON**: leader assumes overnight mode is still active and keeps dispatching/auto-approving
   non-gated work into business hours, when Jeff actually wanted the fleet paused or throttled.
2. **False-OFF**: leader assumes it needs to wait for Jeff on every non-gated item, stalling the fleet
   during a window Jeff explicitly authorized full autonomy for.

Either direction is a real cost (wasted spend or wasted fleet-hours) and neither is detectable today
without a human re-reading the whole handoff narrative.

## Design

### A single small state file, not a new subsystem

Reuse the append-only + flock-serialized write primitive already proposed in
`atomic-channel-write-design.md` (Q-N4) — do not invent a second concurrency mechanism for what is
structurally the same problem (one leader process, occasional writes, must never tear).

`FLEET-MODE.log` (proposed path: `/Users/jefftucker/fullloopcrm/FLEET-MODE.log`, append-only, one line per
transition, newest-last):

```
2026-07-11T20:37:00-04:00 mode=overnight set_by=Jeff reason="explicit overnight authorization"
2026-07-12T16:33:00-04:00 mode=overnight set_by=Jeff reason="RESUME FULL-STEAM, usage banker back in budget"
```

Fields: ISO timestamp, `mode` (`overnight` | `business-hours` | `paused`), `set_by` (must be `Jeff` —
leader never self-sets this field, only relays Jeff's own words, same non-self-authorization posture as
Q-S1's sibling gates), `reason` (free text, cites the channel line that authorized the change so it's
auditable back to source).

### Boot-time read algorithm (the part that actually closes the gap)

1. On boot, the leader reads **only the last line** of `FLEET-MODE.log` for current mode — not the whole
   handoff prose.
2. If the file is missing, empty, or its last line is unparseable: **default to `business-hours`** (the
   conservative choice — ask Jeff before dispatching non-gated work), not `overnight`. A missing/corrupt
   state file must never fail open into full autonomy.
3. If the last line's timestamp is older than a staleness threshold (proposed: 18h — long enough to span
   one real overnight session, short enough that a forgotten toggle doesn't silently persist for days) AND
   there is no corroborating recent Jeff-authored channel activity, the leader should treat the mode as
   **ambiguous** and post a one-line channel confirmation ask rather than assuming the stale value still
   holds. This directly prevents the "activated Monday night, still silently 'on' Thursday because nobody
   remembered to flip it off" failure mode.
4. The leader's own boot receipt (see Q-O4) is a natural place to also print the mode it read and its
   staleness age, so a human skimming the channel sees `mode=overnight (age: 2.1h)` instead of having to
   re-derive it.

### What this does NOT do

- Does not touch `.worker-driver.sh` or any live cron.
- Does not create `FLEET-MODE.log` in this pass — the file, its write call sites, and the boot-read logic
  are all still design, not code.
- Does not change who is authorized to set the mode — only Jeff's own words (relayed by the leader, per
  the standing non-self-authorization pattern used elsewhere in Section Q) should ever produce a new line.

## Open question for Jeff/leader

Is 18h the right staleness window, or should overnight mode auto-expire at a fixed wall-clock hour (e.g.
"business hours" always begins 8am ET regardless of when it was last set)? A fixed-hour expiry is simpler
to reason about than a rolling staleness window but doesn't handle a genuinely multi-day authorized
autonomous run. Recommend Jeff pick; this doc doesn't decide it.
