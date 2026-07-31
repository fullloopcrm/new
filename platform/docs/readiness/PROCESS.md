# Readiness Ledger — Process Rules

These govern how `ledger.json`, `taxonomy.json`, and the coverage docs in
this directory get updated. They are binding on any session (human or
agent) that touches this system, not suggestions.

## Mandatory: independent adversarial re-check

**No scoring or verification work committed to this ledger is considered
trustworthy until it has been independently re-checked by a separate
session with no prior involvement in that work.**

This is not optional and does not need to be re-requested each time it
applies. "Separate session" means a session that did not write the
checkpoint, evidence, or fix being reviewed — the same self-marking-your-
-own-homework problem code review exists to catch applies here.

Why this exists: on 2026-07-30, the session that built this readiness
system scored 7 checkpoints (`lss-01/02/03/04/06/07`, `bsr-01`) against
commits that only existed on a separate, unmerged, PR-less branch
(`fix/sales-pipeline-leaks-2026-07-30`) — the ledger claimed real,
already-verified work before it was actually present in the branch/commit
the ledger itself was committed against. Every ledger-writing script
(`validate-ledger-evidence.mjs`, `check-ledger-sync.mjs`,
`check-taxonomy-signoff.mjs`) passed cleanly the whole time — none of them
check whether cited evidence is still *true*, only whether it's
*internally consistent*. It took an independent second session, with no
stake in the original scoring, re-running the actual checks (live queries,
test runs, `git merge-base --is-ancestor` on every cited commit) to find
it. `scripts/check-commit-ancestry.mjs` (added the same day) now catches
the specific branch-mismatch failure mode mechanically, but it cannot
catch a wrong live-query result, a misread file, or a misclassified route
— only an independent human or agent re-check can.

Minimum bar for "independently re-checked":
- Spot-check a meaningful sample of checkpoints scored above the
  `manual_code_read` cap (50) by re-running their actual evidence_type
  check (re-run the test, re-hit the live DB/endpoint, re-read the file) —
  not by re-reading the evidence text and agreeing with it.
- Verify every non-null `last_verified_commit` is a real ancestor of the
  branch/commit the ledger is committed against (mechanically enforced by
  `check-commit-ancestry.mjs`, but re-confirm it actually ran and passed).
- State explicitly which checkpoints held up and which didn't. "Looks
  right" is not a re-check result.

## Known-fragile pieces (as of 2026-07-30)

- `docs/readiness/per-domain-coverage-*.json` is **hand-maintained**. No
  script in `scripts/` generates, regenerates, or validates it, and
  `compute-readiness.mjs` does not read it — it only ever produces one
  blended overall coverage number. This file was already silently
  overwritten mid-audit once with no diff surfaced anywhere. Do not treat
  its numbers as pipeline-verified until a real regeneration script exists
  and is wired into CI the way the ledger checks are.
- Route/table domain classification (`full_classification` inside that
  same file) mixes genuinely code-informed judgment (real `.from(table)`
  extraction, real doc-comment reads) with earlier heuristic/path-based
  guesses, and even the code-informed portion has a real, sampled error
  rate — it is not filename pattern-matching, but it is also not reliable
  at the individual-route level without spot-checking.

## CI gates that exist today

- `validate-ledger-evidence.mjs` — score can't exceed its evidence_type's cap.
- `check-ledger-sync.mjs` — a checkpoint's depends_on_files changing in a PR
  requires that checkpoint's ledger entry to change in the same PR.
- `check-commit-ancestry.mjs` — every cited `last_verified_commit` must be a
  real ancestor of the commit being built.
- `check-taxonomy-signoff.mjs` — taxonomy.json (what's measured, severities,
  weights) can't change without a new `approved_note`.

None of these verify that evidence is *true* — only that it's internally
consistent with its own stated rules. That gap is exactly what the
adversarial re-check rule above exists to cover.
