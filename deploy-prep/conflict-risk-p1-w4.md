# Merge-Conflict Dry-Run: p1-w4 → main

**Author:** W4 (verification-harness lane) · **Date:** 2026-07-12
**Method:** `git merge-tree $(git merge-base origin/main p1-w4) origin/main p1-w4`
**Merge base:** `2cca5daa0fe953b8be89b541ff7e7488c4bb4a14`

## Result: 1 file conflicts

98 files are net-new on `origin/main` (merge cleanly as additions), 24 files
changed on both sides but auto-merge cleanly (no marker), and **1 file** has a
real textual/semantic conflict.

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
`<<<<<<< .our` (empty) / `=======` / `p1-w4`'s inserted block / `>>>>>>> .their`.

**Suggested resolution:** Keep `origin/main`'s version (post-failure,
dual-bucket by tenant AND by IP) — it's the stronger fix: it doesn't
rate-limit legitimate logins pre-check, and it closes both the
single-tenant-sweep vector and the spray-across-tenants-from-one-IP vector
that `p1-w4`'s single IP-keyed bucket doesn't fully cover. Drop `p1-w4`'s
change to this file entirely on integration; no code from this lane's diff to
this file needs to survive.

## Everything else

No other conflicts. The 98 "added in remote" files and 24 "merged" files
integrate without manual resolution. Full raw `git merge-tree` output
retained at `/tmp/w4-mergetree-output.txt` on this machine for reference if
needed (not committed — regenerate with the command above if it's gone).
