# Untracked deploy-prep Orphans — reconciliation (docs only, nothing deleted)

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-13 · **Status:** read-only classification.
No file deleted, no file committed by this doc — recommendations only, per LEADER order.

**Scope:** `git status --short` on this worktree shows 5 untracked paths. This documents what each one
is and a keep/commit/delete recommendation for the leader/Jeff to action.

```
?? .worker-driver.sh
?? .worker-driver.sh.bak-session4
?? deploy-prep/INDEX.md
?? deploy-prep/orphan-domains-audit.md
?? deploy-prep/per-tenant-field-audit.md
```

---

## 1. `deploy-prep/INDEX.md`

**What it is:** the master map W6 authored last session — classifies all 52 `deploy-prep/*` docs against
`gated-wave-plan.md`'s literal wave numbers, `phased-deploy-runbook.md`'s phase groupings, and flags
docs that are "ready findings with no scheduled wave." Read in full this pass to confirm it's still
accurate against the current file listing (it is — no new deploy-prep doc from this session invalidates
its wave placements; the 3 new docs added this session, per §4 of this review, are additive and don't
change any existing entry).

**Recommendation: COMMIT.** This is a finished, load-bearing synthesis doc (202 lines) that the other
five workers' `deploy-prep/*` output doesn't replicate — it's the one file that tells Jeff/the leader
where all 52 docs fit without reading each one. Leaving it untracked means a `git clean`, a lost
worktree, or a fresh checkout silently drops it. No reason to withhold it; nothing in it depends on
unresolved decisions.

## 2. `deploy-prep/orphan-domains-audit.md`

**What it is:** cross-check of the 22 `PROTECTED` tenant domains (from
`platform/scripts/verify-protected-tenants.mjs`) against the in-repo domain-routing model
(`tenants.domain`, `tenant_domains`, `BESPOKE_SITE_TENANTS`, `src/app/site/*` folders). Flags malformed
domain strings and marks what can't be confirmed without live DB access. 133 lines, complete per its own
scope statement.

**Recommendation: COMMIT.** Same category as every other completed W6 audit doc already merged into this
branch's history (e.g. `per-unit-pricing-audit.md`, `admin-webhook-idor-audit.md`) — file-only,
read-only, already referenced by `INDEX.md` §4. No reason it should be the one audit doc left uncommitted.

## 3. `deploy-prep/per-tenant-field-audit.md`

**What it is:** documents the expected `routing_mode` / `vercel_project` / `status` / `owner_phone` per
tenant, sourced from code (presets, provisioning defaults, the same `verify-protected-tenants.mjs`
roster). Explicitly flags that `routing_mode`/`vercel_project` aren't even columns on this branch's
schema yet (migrations `055`/`056`/`059` live on other lanes) — honest about what it can't verify. 131
lines, complete.

**Recommendation: COMMIT.** Same reasoning as #2 — a finished read-only audit already cross-referenced by
`INDEX.md` §4, no blocker to landing it.

## 4. `.worker-driver.sh`

**What it is:** the **live, currently-running** polling driver for this worker (W6) — the exact process
that reads `LEADER-CHANNEL.md` for `LEADER->W6`/`LEADER->ALL` orders and spawns the `claude -p` (now
`--model sonnet -p`, per the 17:30 session-5 swap recorded in `RESUME-POINT.md`) invocation that is
executing this very task. Confirmed running: this file is what dispatched the order this report responds
to. It has never been committed to git in any lane on record (`git log --all --oneline -- .worker-driver.sh`
returns nothing) — it is fleet-operations tooling that lives in the worktree by convention, not
application code, and every other `flwork-p1-wN` worktree has its own copy, not this repo's tracked
content.

**Recommendation: KEEP, do NOT commit, and do NOT touch while a driver depends on it.** Three reasons:
1. It is **live** — editing or moving it out from under the running process risks breaking this worker's
   own dispatch loop (the standing rule from `fleet-supervisor-note.md`: never hot-swap a live fleet
   script).
2. Committing it would put session-specific, host-specific orchestration (absolute paths to
   `/Users/jefftucker/...`, a hardcoded worker ID) into the tracked history of a product branch — it
   doesn't belong in `p1-w6`'s commit history any more than a `.env.local` would.
3. If the leader wants driver scripts version-controlled for real (so `fleet-supervisor-note.md`'s
   respawn logic has a canonical source to restore from), that's a **separate, deliberate decision**
   about a dedicated fleet-ops location (e.g. a `fleet-ops/` tree outside any `p1-wN` product branch) —
   not something this reconciliation pass should silently do by committing today's ad hoc copy.

## 5. `.worker-driver.sh.bak-session4`

**What it is:** a stale backup of the driver script from an earlier session (file mtime `Jul 12 12:28`,
vs. the live file's `Jul 12 17:32`). Diffed this pass — the only difference is the live version invokes
`claude --model sonnet -p ...` while the `.bak-session4` copy invokes plain `claude -p ...` (pre-dates the
session-5 Sonnet swap documented in `RESUME-POINT.md`: *"all 6 `.worker-driver.sh` edited to `claude
--model sonnet -p`; drivers restarted while idle"*). It is explicitly excluded from `fleet-supervisor-note.md`'s
`pgrep` pattern already (*"pgrep pattern is anchored with `\$` so `.worker-driver.sh.bak-session4` never
matches a live driver"*) — so its presence is already accounted for by that design, not a live hazard.

**Recommendation: SAFE TO DELETE, but not by this pass** (standing rule: doc, don't delete). It has no
value beyond the one-line diff already captured above — that diff is now preserved in this doc's own text,
so nothing is lost if the leader or Jeff deletes the file itself. Recommend deletion once Jeff/the leader
confirms no other lane is relying on it as a reference for the pre-Sonnet driver invocation shape.

---

## Summary table

| File | Recommendation | Why |
|---|---|---|
| `deploy-prep/INDEX.md` | **Commit** | Finished synthesis doc, load-bearing, no blocker |
| `deploy-prep/orphan-domains-audit.md` | **Commit** | Finished audit, already referenced by INDEX.md |
| `deploy-prep/per-tenant-field-audit.md` | **Commit** | Finished audit, already referenced by INDEX.md |
| `.worker-driver.sh` | **Keep, don't commit, don't touch** | Live process; host/session-specific; not product code |
| `.worker-driver.sh.bak-session4` | **Safe to delete (not by this pass)** | Stale backup, diff already preserved above, already excluded from supervisor's pgrep pattern |
