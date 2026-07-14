# Test-suite health on `main` — pre-integration baseline

**P1/W1 18:01 queue item (b).** Not previously authored — checked `deploy-prep/`
on this lane; no prior file with this name or scope existed.

## Method

`main` was checked out into a **scratch worktree** (not this branch, not the
primary `/Users/jefftucker/fullloopcrm` checkout) so nothing here touches
`main` or any other lane:

```
git worktree add /tmp/flwork-p1-w1-main-health main
```

`main` at the time of this run: `669f588f` (`feat(fortress): Tenant Health
dashboard …`). `git merge-base main HEAD` on p1-w1 == `669f588f` — i.e. `main`
has not moved since this lane forked, so this is genuinely main's current tip,
not a stale ancestor.

`node_modules` in the scratch worktree was **symlinked** (not reinstalled) to
the shared store at `/Users/jefftucker/fullloopcrm/platform/node_modules` —
the same sharing pattern every other worktree in this fleet already uses (see
W6's `fleet-disk-monitoring-note.md`). This avoids an ~750MB `npm ci` and
matches how the app actually runs; it does not touch `main`'s files.

Ran the full suite with no path filter:

```
cd /tmp/flwork-p1-w1-main-health/platform && npx vitest run
```

Then removed the scratch worktree (`git worktree remove --force`) — nothing
persists from this check besides this report.

## Result — PRE-INTEGRATION BASELINE

```
Test Files  15 passed (15)
     Tests  119 passed (119)
```

- **Pass: 119 / 119**
- **Fail: 0**
- **Skipped: 0**
- **Test files: 15**

No `tsc --noEmit` was requested for this baseline (leader order scoped this to
vitest pass/fail/skip counts); flagging that main's typecheck health is
untested by this note if that's wanted separately.

## Why this number looks small

`main` predates essentially all of the P1 fleet's work. For comparison, p1-w1
alone is currently at **82 test files / 859 passing + 1 expected-fail**
(reported 18:00, this lane). The other 5 lanes are each carrying comparable or
larger deltas (tenantDb conversion probes, IDOR witnesses, ledger wiring,
schema/contract tests, SEO/CI guards). None of that exists on `main` yet — this
119/119 is the floor every lane's merge will be measured against, not a signal
that main is under-tested for what it currently contains.

## How to use this baseline

When each lane merges into `main`, the merged suite's file/test count should
be **main's 119 + the sum of each lane's own reported net-new tests** (each
lane's LEADER-CHANNEL reports already state their own deltas vs their own
prior round — this doc does not re-derive those, only anchors the starting
point). Any merged total that comes in **lower** than 119 plus the expected
lane deltas signals a lost test file (bad merge resolution, accidental
deletion, or a rename that broke a `vi.mock` path) and should block the
integration step until explained.
