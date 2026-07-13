# Boot-Time Rule Reload Confirmation (Section Q-O4) — DOCS ONLY, nothing installed/run

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-13
**Status:** design only. No script written to `scripts/`, no hook, no cron, nothing wired
into `.worker-driver.sh` or any live leader process. FOR-JEFF-REVIEW.

**Problem statement (`MASTER-TODO-LIST.md` Section Q-O4):** "boot-time rule reload
confirmation (leader confirms it loaded latest banked rules)."

---

## 1. Why this is a real gap, grounded in how rules are actually banked today

Read `/Users/jefftucker/fullloopcrm/NEW-LEADER-BOOT.md` directly this pass (101 lines).
It is **not a static file** — new standing rules get appended to it over time as Jeff
bans them, e.g. its own tail shows three separate `## ADDENDUM`/banked-rule blocks added
after the original boot prompt: "ADDENDUM 2026-07-12 (session-2)", "INTRODUCE TO DESKTOP
ON EVERY LEADER START (banked by Jeff 2026-07-12)", "FULL HANDOFF MESSAGE ... (banked by
Jeff 2026-07-12)", and "OPS GOTCHAS (banked session-4 2026-07-12)". This is the mechanism
by which the fleet's operating rules evolve — Jeff or a worker edits this file, a later
rule supersedes an earlier one ("ADDENDUM ... supersedes stale bits above").

**The gap:** nothing today confirms a freshly-booted leader actually read the *current*
version of this file, as opposed to a stale cached read, a truncated read, or — the
documented failure mode — the wrong file entirely. This isn't hypothetical:
`deploy-prep/atomic-handoff-file-design.md` (Q-W4, this branch) already cites a **real
observed incident**, `LEADER-CHANNEL.md:939`, where a session read a stale
`~/flwork-integration/` copy instead of the canonical `~/fullloopcrm/` one.
`NEW-LEADER-BOOT.md` itself had to add an explicit correction for exactly this
("⚠️ PATHS ARE ABSOLUTE — READ THESE EXACT FILES... do NOT read handoff docs from
[flwork-integration]") — i.e. the fleet has already been burned by this once and papered
over it with a warning inside the same file a stale reader might not reach. A boot-time
confirmation mechanism is the difference between "we told the leader not to do this
again" and "we can verify, after the fact, whether it actually happened again."

---

## 2. Design — content-hash boot receipt, cross-checked against a rules manifest

Two pieces, both additive, both file-only:

### 2a. A rules manifest — append-only ledger of what "latest" means

`RULES-MANIFEST.log` (repo root, proposed, not created this pass): one line per banked
rule change, written by whoever edits `NEW-LEADER-BOOT.md` or `LEADER-HANDOFF.md`:

```
2026-07-12T21:50:00 NEW-LEADER-BOOT.md sha256:<hash-after-edit> "session-2 addendum: 6-worker manager mode"
2026-07-12T23:10:00 NEW-LEADER-BOOT.md sha256:<hash-after-edit> "banked: introduce-to-desktop-on-boot standing rule"
2026-07-12T23:40:00 NEW-LEADER-BOOT.md sha256:<hash-after-edit> "banked: full-handoff-message standing rule"
2026-07-13T02:15:00 NEW-LEADER-BOOT.md sha256:<hash-after-edit> "session-4 ops gotchas: driver offset-resync race, desktop-chat-only comms"
```

The **last line for a given file is the authoritative "latest banked rules" hash**. This
turns "did the leader load the latest rules" from a subjective/manual question into a
mechanical hash comparison.

### 2b. Boot receipt — the leader posts a fingerprint, not just a claim

At boot, instead of (or in addition to) the existing "introduce itself on Desktop" and
channel-rundown steps already standing rules, the leader computes and posts:

```
sha256sum /Users/jefftucker/fullloopcrm/NEW-LEADER-BOOT.md /Users/jefftucker/fullloopcrm/LEADER-HANDOFF.md
```

as a `BOOT-RECEIPT` line to `LEADER-CHANNEL.md`:

```
02:16 LEADER->CHANNEL: BOOT-RECEIPT session=5 NEW-LEADER-BOOT.md=sha256:a1b2c3... (101 lines) LEADER-HANDOFF.md=sha256:d4e5f6... (267 lines)
```

This is checkable two ways without trusting the leader's own narration:
1. **Against the manifest (§2a):** if the manifest's latest hash for `NEW-LEADER-BOOT.md`
   doesn't match the boot receipt's hash, the leader booted on a stale copy — same
   signature as the flwork-integration incident, now detectable in seconds instead of
   discovered mid-session.
2. **Against the live file, anytime:** Jeff or a later leader can re-run `sha256sum` on
   the canonical file and diff against any prior boot receipt in the channel history to
   see exactly which rule-set a given leader session actually operated under — useful
   forensics if a leader's behavior seems to contradict a rule that was supposedly banked
   before its boot.

### 2c. Verification script (proposed content, NOT written to `scripts/` this pass)

```bash
#!/usr/bin/env bash
# scripts/verify-boot-rules-freshness.sh (PROPOSED — not created this pass)
# Read-only. Compares the live canonical files against the last line of
# RULES-MANIFEST.log for each. Prints MATCH/STALE per file, exits 1 on any STALE.
set -euo pipefail
ROOT="/Users/jefftucker/fullloopcrm"
MANIFEST="$ROOT/RULES-MANIFEST.log"

status=0
for f in NEW-LEADER-BOOT.md LEADER-HANDOFF.md; do
  live_hash=$(sha256sum "$ROOT/$f" | cut -d' ' -f1)
  manifest_hash=$(grep " $f " "$MANIFEST" | tail -1 | grep -oE 'sha256:[a-f0-9]+' | cut -d: -f2)
  if [ "$live_hash" = "$manifest_hash" ]; then
    echo "MATCH  $f  $live_hash"
  else
    echo "STALE  $f  live=$live_hash manifest=$manifest_hash"
    status=1
  fi
done
exit $status
```

Usage: a leader runs this once at boot (or Jeff runs it against any leader's posted
`BOOT-RECEIPT` line) to get a MATCH/STALE verdict instead of trusting a narrated "I read
the files."

---

## 3. Why not something heavier (e.g. a hash embedded IN the files, or a pre-boot hook)

- **Embedding a self-hash inside `NEW-LEADER-BOOT.md`** (a hash-of-self line) is
  circular — the file can't correctly hash itself without a build step, and a stale copy
  would still carry its own (stale) embedded hash and "match itself," defeating the
  purpose. The manifest has to be a **separate, append-only** file so a stale copy has no
  way to fake a fresh-looking receipt.
- **A Claude Code hook firing at session start** was considered and rejected for this
  design: hooks fire per Claude Code session, but the "leader" role here is a convention
  layered on top of a generic session (per `NEW-LEADER-BOOT.md`'s own framing — any fresh
  session that pastes the boot prompt becomes "the leader"), not a distinguishable event
  type a hook could reliably gate on without false-triggering for every worker session
  too. A channel-posted receipt (§2b), checkable by a plain script, doesn't require
  hooking into session lifecycle at all — simpler, and matches how every other
  leader-boot obligation in this fleet already works (post to the channel / Desktop chat).

---

## 4. What Jeff/leader would need to do to adopt this (not done here)

1. Create `RULES-MANIFEST.log` at repo root, seed it with a first line hashing the
   current `NEW-LEADER-BOOT.md`/`LEADER-HANDOFF.md`.
2. Add "append a manifest line" to the existing rule-banking habit (i.e. whenever
   `NEW-LEADER-BOOT.md` or `LEADER-HANDOFF.md` gets a new `## ADDENDUM`/banked-rule
   block, also append the matching manifest line — same discipline, one extra line).
3. Add "post a `BOOT-RECEIPT` line" to `NEW-LEADER-BOOT.md`'s own "YOUR VERY FIRST
   ACTIONS" checklist (§ "YOUR VERY FIRST ACTIONS" in that file) — a one-line addition to
   an existing, already-followed checklist, not a new discipline layered on top.
4. Optionally create `scripts/verify-boot-rules-freshness.sh` (§2c) for Jeff to run
   on-demand against any leader's posted receipt.

**Nothing above was created, installed, or run this pass** — this is a design doc only,
per the "NO live-script activation" instruction. No `.worker-driver.sh` or any running
fleet script was touched.

**Cross-refs:** `deploy-prep/atomic-handoff-file-design.md` (Q-W4 — the write-tmp-rename
design for `RESUME-POINT.md`/`LEADER-HANDOFF.md` themselves, and the same
`flwork-integration` stale-copy incident this doc cites), `deploy-prep/pre-lane-branch-
state-check.md` (Q-W5 — the worker-side analog: verifying worktree state before dispatch,
same "verify, don't assume" principle applied to a different part of the fleet).
