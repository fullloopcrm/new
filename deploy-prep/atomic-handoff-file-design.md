# Atomic Handoff-File Updates — design (Q-W4, FOR-JEFF-REVIEW)

**Status:** DESIGN / PROPOSAL. No change to `RESUME-POINT.md`, `LEADER-HANDOFF.md`, or any live
fleet script is made by this doc. Authored by W6, `p1-w6`, 2026-07-13.

**Problem statement (from MASTER-TODO-LIST.md §Section Q, THIS WEEK tier):** "Q-W4 atomic handoff
file updates (RESUME-POINT/LEADER-HANDOFF written atomically)."

---

## 1. This is a different failure mode from Q-N4 (channel writes) — say why up front

`atomic-channel-write-design.md` (Q-N4) covers `LEADER-CHANNEL.md`: many processes **append** to
one growing log, and the fix there is a serializing lock (`flock`), explicitly rejecting
write-tmp-rename because rename replaces the *whole file* and would lose concurrent appends.

`RESUME-POINT.md` and `LEADER-HANDOFF.md` are the opposite shape: **one owner (the leader) writes
the whole file each time**, wholesale, as a handoff snapshot — not an append log. For a
whole-file-replace, write-tmp-rename is the *correct* tool (it's what Q-N4 said to avoid for
appends, but this is the case it's designed for). So this doc does not inherit Q-N4's fix; it
proposes the file-replace analog.

## 2. The bug, precisely — two distinct risks, one already observed live

**Risk A — torn read of a wholesale rewrite.** These files are produced by a tool (`Write`,
`cat > file <<EOF`, or an editor's overwrite) that opens the target, truncates it, then writes the
new content. Between truncate and the final byte landing, any reader — a new leader session
booting, a worker `.worker-driver.sh` sourcing a status line, `NEW-LEADER-BOOT.md`'s own
instructions to "read `RESUME-POINT.md`" — that opens the file in that window sees a truncated or
partial document. `RESUME-POINT.md` is small (33 lines observed) so the window is short but
nonzero; `LEADER-HANDOFF.md` is not small (400 lines observed this session, was 174 lines
2026-07-12 evening per channel history) — write time and therefore the torn-read window scale with
its length, and it keeps growing.

**Risk B — stale-copy divergence across worktrees (this one is CONFIRMED, not hypothetical).**
`LEADER-CHANNEL.md` line 939 (2026-07-13 09:08) is the leader itself catching this live:

> "STOP reading the worktree copies — flwork-integration has STALE handoff files. The
> AUTHORITATIVE files are in /Users/jefftucker/fullloopcrm/ ... cd
> /Users/jefftucker/fullloopcrm to read them."

This repo is one `.git` with 20+ worktrees (confirmed via `git worktree list` from this branch —
`flwork-p1-w1` through `p1-w6`, `flwork-integration`, `flwork-todo`, `flwork-backlog`, etc., each a
separate working directory but tracked file *contents* only exist per-worktree on disk, not
synced). `RESUME-POINT.md`/`LEADER-HANDOFF.md` are tracked files, so every worktree has its own
on-disk copy from whatever commit that worktree's `HEAD` was at when it was created or last pulled.
A worker or a fresh leader session that reads the copy in *its own* worktree instead of the
canonical `/Users/jefftucker/fullloopcrm/` copy gets a snapshot that is silently out of date —
no error, no version mismatch signal, just wrong content that looks well-formed. This already cost
one leader session a stop-and-redirect; it is the higher-frequency, higher-blast-radius risk of the
two, because nothing before this doc's proposed fix (§4) tells a reader it's looking at a stale copy
rather than the truth.

## 3. Fix for Risk A — write-tmp-rename (same-directory, same-filesystem)

```bash
# handoff-write.sh (proposed helper)
handoff_write() {
  # usage: handoff_write /path/to/RESUME-POINT.md < new-content
  local target="$1" tmp
  tmp="$(mktemp "${target}.tmp.XXXXXX")"   # same dir as target => same filesystem => rename is atomic
  cat > "$tmp"
  chmod 644 "$tmp"
  mv -f "$tmp" "$target"                    # rename(2): atomic swap, no reader ever sees a partial file
}
```

- `mktemp` in the **same directory** as the target is required — `rename(2)` is only atomic within
  one filesystem; a tmp file in `/tmp` renamed onto a file in `/Users/jefftucker/fullloopcrm/` would
  silently fall back to copy+unlink on some setups (not on macOS APFS same-volume, but don't rely on
  that implicitly — same-dir `mktemp` makes it correct by construction, not by assumption).
- A reader that opens `RESUME-POINT.md` mid-update either gets the pre-rename inode (old, complete
  content) or the post-rename inode (new, complete content) — never a half-write. This closes Risk A
  fully; POSIX guarantees rename is atomic with respect to concurrent opens.
- Does **not** need a lock for the single-owner case (only the leader writes these files today per
  every observed write in channel history) — rename-swap alone is sufficient when there's one
  writer. If a second writer role is ever added (see §5), add the same `flock`-around-`mktemp+mv`
  pattern from Q-N4 to prevent a lost-update between two concurrent whole-file rewrites.

## 4. Fix for Risk B — single canonical path + a staleness guard, not sync

Do not try to keep 20+ worktree copies in sync — that's a distributed-consistency problem this
fleet doesn't need. Instead:

1. **One canonical location, stated once, checked automatically.** `NEW-LEADER-BOOT.md` and any
   onboarding instruction should say "the ONLY authoritative copy is
   `/Users/jefftucker/fullloopcrm/RESUME-POINT.md` — do not read a worktree-local copy" (this is
   already true in practice per line 939, just not yet load-bearing anywhere except that one manual
   correction).
2. **A staleness guard worth adding cheaply:** stamp both files with a generation marker the writer
   increments — e.g. a first line `<!-- gen:47 written:2026-07-13T11:40:00-04:00 -->` — so any
   reader (including a worktree-local stale copy) can tell at a glance it's looking at gen 47 vs.
   whatever generation is live, instead of silently trusting well-formed-looking but outdated
   content. Cheap to add (one `sed`/`printf` line in the write helper below), costs nothing to a
   reader who ignores it, and would have made the line-939 incident visible the moment the stale
   copy was opened instead of only after the leader separately noticed the mismatch.
3. Combine into one helper:

```bash
handoff_write() {
  local target="$1" tmp gen
  gen="$(( $(grep -oE 'gen:[0-9]+' "$target" 2>/dev/null | grep -oE '[0-9]+' || echo 0) + 1 ))"
  tmp="$(mktemp "${target}.tmp.XXXXXX")"
  { printf '<!-- gen:%s written:%s -->\n' "$gen" "$(date -Iseconds)"; cat; } > "$tmp"
  chmod 644 "$tmp"
  mv -f "$tmp" "$target"
}
```

## 5. What this does NOT cover (scope honesty)

- **Cross-worktree sync.** This design accepts that non-canonical worktree copies WILL drift and
  relies on the generation stamp + "read the canonical path" rule to make drift *visible*, not
  eliminated. A push-to-all-worktrees mechanism would be real machinery for a problem that's
  currently solved by "there is one true reader location" — not proposed, per YAGNI, unless drift
  recurs after this fix.
- **Concurrent multi-writer races.** Every observed write to these two files in this session's
  channel history was leader-authored, single-writer. If a second actor (e.g. a supervisor process
  from Q-N1) ever writes `LEADER-HANDOFF.md` directly, add the `flock` wrapper from Q-N4 around
  `mktemp+mv`; not added now because it isn't needed by the current write pattern and would be
  unverifiable speculative code.
- **Migration cost:** near zero — this is a drop-in replacement for however the leader currently
  produces these files (`Write` tool or a heredoc), not a new writer role. Adoption is a leader-side
  habit change (call `handoff_write` instead of overwriting directly) plus one line added to
  `NEW-LEADER-BOOT.md`; no schema, no new dependency, no fleet-script hot-swap, so it can land
  outside the "no live-fleet-script edits" restriction this pass operates under — but per that same
  restriction this pass authors the design only and does not wire it in.

## 6. Verification status

Design only; nothing wired, no existing file touched. Recommended validation before adoption: in a
scratch copy, run `handoff_write` from two backgrounded shells writing different content 20x each in
a loop, then confirm every resulting file is one of the two exact inputs in full (never a mix of
both) — proves the rename-swap is really atomic on this host's filesystem (APFS) before relying on
it for the real files.
