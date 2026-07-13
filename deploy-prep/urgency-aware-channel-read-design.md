# Urgency-Aware Channel Read — leader prioritizes urgent Jeff messages (Q-S4, FOR-JEFF-REVIEW)

**Status:** PROPOSAL / design only. No format change applied to `LEADER-CHANNEL.md`, no script written, no
live process altered. The leader decides whether to adopt.

**Author:** W6, branch `p1-w6`, 2026-07-13.

---

## The problem

`LEADER-CHANNEL.md` is a single flat, append-only, chronological log. Checked directly (not assumed):
**every line in the file, including Jeff-originated directives, is written in the identical
`HH:MM SRC->DST: text` shape as routine worker chatter.** Grepping the file for a distinct Jeff marker
(`^[0-9][0-9]:[0-9][0-9] Jeff`, `Jeff:`) turns up nothing — Jeff has never posted to the channel directly
in this fleet's history; every one of his instructions is relayed *inside* an ordinary
`LEADER->W<n>:`/`LEADER->ALL:` line, paraphrased ("Per Jeff:", "Jeff said start", "Jeff wants...", "(Jeff:
keep going)"). Confirmed by direct inspection — lines like `LEADER-CHANNEL.md:1239`
("...Jeff said start; usage banker back in budget per Jeff...") and `LEADER-CHANNEL.md:1256` ("FYI...
(Jeff: keep going)") are structurally indistinguishable from any other `LEADER->W6:` dispatch line unless a
reader parses the prose inside it.

This session's own tail is a real example of the risk: between 11:36 and 11:44 (`LEADER-CHANNEL.md:1591`-
`1606`) five workers (W1, W2, W3, W5, W6) each posted a multi-hundred-word completion report in the same
8-minute window, all structurally identical `W<n>->LEADER:` lines. If a genuinely urgent Jeff-relayed
instruction had landed in the middle of that burst, nothing in the file's structure would let a leader (or
a monitoring script) distinguish it from the surrounding worker DONE reports without reading every line's
full text. Urgency today lives entirely in vocabulary ("STOP", "HOLD ALL", "GATE") that a human has to
notice — there is no structural signal a script can act on.

## Design

### A minimal, low-friction tag — not a new channel

Do not create a second file or a separate "urgent" channel; that adds a second thing to poll and a second
place work can go missing (the opposite of Q-S2's goal). Instead, reserve a **one-token prefix** inside
the existing line format, written only when relaying an instruction that actually originated from Jeff and
carries time pressure:

```
11:42 LEADER->W6 [JEFF-URGENT]: <text>
```

- The `[JEFF-URGENT]` tag is opt-in and rare by design — most Jeff-relayed instructions are not time-
  critical (e.g. "Per Jeff: base engine + per-tenant layer..." at `LEADER-CHANNEL.md:664` is a scoping
  instruction, not an urgent one) and should NOT be tagged, or the tag dilutes to meaninglessness. Reserve
  it for the "STOP"/"HOLD ALL"/budget-cutoff class of message, matching the existing informal precedent at
  `LEADER-CHANNEL.md:469` ("HOLD ALL. Leader restarting...").
- The leader is the only writer of this tag (same non-self-authorization posture as Q-S1 — a worker never
  self-tags its own report as urgent).

### Read-side behavior (the part that actually changes anything)

1. On every poll cycle (whatever cadence the leader's own loop already uses to notice new channel
   content), grep new lines for `\[JEFF-URGENT\]` **first**, before processing the routine dispatch/report
   backlog that accumulated since the last read.
2. If a tagged line is found, the leader surfaces/acts on it immediately regardless of where in the
   backlog it landed — it does not wait its turn behind N worker completion reports simply because they
   happened to be appended first.
3. This is a strict ordering change only (urgent-first), not a filtering change — no message is dropped or
   hidden; every line still gets read, tagged lines just jump the queue.

### What this does NOT do

- Does not require Jeff to change how he communicates (he never posts to the channel directly today — the
  leader relays). The tagging decision and burden sit entirely with the leader session doing the relay,
  which is the one place in this pipeline that already reads Jeff's actual words before writing the line.
- Does not touch the append mechanism itself (still governed by Q-N4's flock design, unaffected by this).
- Does not implement any actual read-loop change in this pass — this is a format + read-order convention
  proposal only; no leader script exists in this worktree to modify (the leader's own driver loop is not
  part of `p1-w6`).

## Flag for Jeff/leader

This only helps if the leader session actually applies the tag consistently when relaying something
urgent — it is a discipline convention, not an enforced mechanism, unless paired with a lint check (e.g.
Q-S2's `reconcile-queue.mjs` could also flag any line containing "STOP"/"HOLD ALL"/"URGENT" in its prose
that was NOT `[JEFF-URGENT]`-tagged, as a soft nudge). Not designing that check here to keep this doc
scoped to Q-S4 alone; noting the natural pairing with Q-S2 for whoever picks that up next.
