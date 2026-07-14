# Merge-Conflict Dry-Run: p1-w4 → main

**Author:** W4 (verification-harness lane) · **Refreshed:** 2026-07-13 16:38 EDT
(round-2 refresh — original pass was 2026-07-12; see History below)
**Method:** `git merge-tree --write-tree origin/main origin/p1-w4` (git 2.39
real merge-ort simulation, not the legacy 3-arg plumbing tool). Read-only —
no ref updated, no working tree touched, nothing merged/pushed.
**origin/main HEAD at refresh:** `6a052a58` (18 commits ahead of the shared
fork point since the original pass)
**Merge base (unchanged):** `2cca5daa0fe953b8be89b541ff7e7488c4bb4a14`
**p1-w4 vs merge-base:** 222 files changed · **origin/main vs merge-base:** 81
files changed · **files touched by both sides:** 1 · **real conflicts:** 1

## Result: 1 file conflicts — SAME conflict as the original pass, unchanged

Despite 18 new commits landing on `main` and more commits landing on `p1-w4`
since the last pass, the conflict surface did not move: still exactly one
file, same root cause, same content on both sides.

### `platform/src/app/api/team-portal/auth/route.ts`

**Why:** Both branches independently fixed the same PIN-enumeration
rate-limit bypass (old key was `tenant_slug:pin`, so an attacker sweeping the
whole PIN space got a fresh 5-attempt budget per guess and was never
throttled) — but with different, incompatible approaches:

- **`origin/main`**: removes the pre-lookup rate-limit call entirely and adds
  a *post-failure* check with two separate buckets — `team_portal_auth_fail:slug:{tenant_slug}`
  (10 failures / 15 min) and `team_portal_auth_fail:ip:{ip}` (20 failures / 15 min).
  Only counts actual failed PIN attempts; successful logins never touch either
  bucket.
- **`p1-w4`**: keeps the original *pre-lookup* rate-limit call but changes the
  key from `tenant_slug:pin` to `tenant_slug:ip` (5 attempts / 15 min, single
  bucket). Runs before the PIN is checked, so it also throttles valid-PIN
  requests from a spraying IP.

Git's 3-way merge can't reconcile these: `origin/main` deletes the exact
lines `p1-w4` modified in place, so the merge produces
`<<<<<<< origin/main` (empty) / `=======` / `p1-w4`'s inserted block /
`>>>>>>> origin/p1-w4`.

**Suggested resolution:** unchanged from the original pass — keep
`origin/main`'s version (post-failure, dual-bucket by tenant AND by IP). It's
the stronger fix: it doesn't rate-limit legitimate logins pre-check, and it
closes both the single-tenant-sweep vector and the spray-across-tenants-from-
one-IP vector that `p1-w4`'s single IP-keyed bucket doesn't fully cover. Drop
`p1-w4`'s change to this file entirely on integration.

**Cross-lane note:** this is the *same* file and the *same* underlying root
cause (independently-fixed PIN rate-limit bug) that also conflicts on
`p1-w1` and `p1-w2` against `main` — see `conflict-risk-p1-w1.md` and
`conflict-risk-p1-w2.md`. All three lanes should resolve the same way (take
main's dual-bucket post-failure version); this is a single decision that
resolves 3 of the 6 lanes' conflicts on this file at once, not three separate
judgment calls.

## Everything else

No new conflicts introduced by either side's new commits since the last pass.
0 other files show `changed in both` for this branch pair; all other
differences are additions unique to one side (new files/tests on `p1-w4`, or
new files/commits on `main`) and merge without any hunk-level interaction.

## History

- **2026-07-12** (original pass): 1 conflict, same file, same content.
- **2026-07-13 16:38 EDT** (this refresh): re-verified against current
  `origin/main` (6a052a58, +18 commits) and current `p1-w4` tip — conflict
  surface unchanged. No action needed beyond noting cross-lane resolution
  applies identically across w1/w2/w4.
