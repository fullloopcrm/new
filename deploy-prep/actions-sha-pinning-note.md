# GitHub Actions SHA-pinning proposal

**Supply-chain hardening, PROPOSAL ONLY — authored NOT applied.** W3 does not edit the
workflow YAML or push. The leader/Jeff applies after review. This note enumerates every
third-party action across the repo's workflows and the exact pin change for each.

---

## The risk

Every `uses:` in this repo references a **mutable major tag** (`@v4`). A Git tag is a
movable pointer: the action's maintainer (or anyone who compromises the action repo, or a
hijacked maintainer account) can retag `v4` to point at new, malicious code. The next CI
run silently pulls that code and executes it **with the workflow's `GITHUB_TOKEN` and any
secrets in scope** — this is the `tj-actions/changed-files` (CVE-2025-30066, Mar 2025) and
`reviewdog` compromise class, where a retagged action exfiltrated CI secrets across
thousands of repos.

GitHub's own hardening guidance and OpenSSF Scorecard both require **pinning actions to a
full 40-char commit SHA**, not a tag. A SHA is immutable — it cannot be moved to point at
different code — so a pinned workflow runs exactly the reviewed bytes until a human bumps
the pin.

This repo's blast radius is real: `tenant-config-reconcile.yml` and `db-backup.yml` handle
Supabase credentials and DB dumps. An action swap there is a direct path to those secrets.

---

## Full action inventory (re-verified 2026-07-12)

Three distinct actions, all `actions/*` (GitHub-first-party), all pinned to the mutable
`@v4` major tag:

| Workflow | Line | Current | Resolved v4 tag-tip SHA (2026-07-12) |
|---|---|---|---|
| `ci.yml` | 31 | `actions/checkout@v4` | `34e114876b0b11c390a56381ad16ebd13914f8d5` |
| `ci.yml` | 33 | `actions/setup-node@v4` | `49933ea5288caeca8642d1e84afbd3f7d6820020` |
| `tenant-config-reconcile.yml` | 34 | `actions/checkout@v4` | `34e114876b0b11c390a56381ad16ebd13914f8d5` |
| `tenant-config-reconcile.yml` | 35 | `actions/setup-node@v4` | `49933ea5288caeca8642d1e84afbd3f7d6820020` |
| `tenant-scope.yml` | 28 | `actions/checkout@v4` | `34e114876b0b11c390a56381ad16ebd13914f8d5` |
| `tenant-scope.yml` | 29 | `actions/setup-node@v4` | `49933ea5288caeca8642d1e84afbd3f7d6820020` |
| `db-backup.yml` | 63 | `actions/upload-artifact@v4` | `ea165f8d65b6e75b540449e92b4886f43607fa02` |

**Distinct pins needed (3):**
- `actions/checkout` → `34e114876b0b11c390a56381ad16ebd13914f8d5`
- `actions/setup-node` → `49933ea5288caeca8642d1e84afbd3f7d6820020`
- `actions/upload-artifact` → `ea165f8d65b6e75b540449e92b4886f43607fa02`

> **How these SHAs were obtained (not guessed):** `gh api repos/<action>/git/ref/tags/v4`
> on 2026-07-12, which returns the commit the `v4` major tag currently points at. Because
> the `v4` tag is itself mutable, it may point somewhere else by the time this is applied —
> **re-resolve immediately before applying** (command in the "Re-resolve" section) and pin
> to whatever it returns then, rather than trusting a SHA that may have aged.

---

## The pin change (copy-paste — leader applies)

Pin to SHA, keep the human-readable major in a trailing comment so reviewers and Dependabot
can still read intent:

```yaml
# ci.yml  (also tenant-config-reconcile.yml lines 34-35, tenant-scope.yml lines 28-29)
-      - uses: actions/checkout@v4
+      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4
-      - uses: actions/setup-node@v4
+      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
```

```yaml
# db-backup.yml line 63
-        uses: actions/upload-artifact@v4
+        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4
```

No behavior change — the SHA is the exact commit `v4` resolves to today, so CI runs the
same action code, just frozen against future retagging.

---

## Re-resolve before applying (if the note has aged)

```bash
for repo in actions/checkout actions/setup-node actions/upload-artifact; do
  sha=$(gh api "repos/$repo/git/ref/tags/v4" --jq '.object.sha')
  echo "$repo@v4 -> $sha"
done
```
Pin to whatever these print. (For a specific semver instead of the major-tag tip, resolve
`git/ref/tags/v4.3.0` etc. — but the major-tag tip is the correct like-for-like pin for the
current `@v4` references.)

---

## Ongoing maintenance — required, or the pins rot

SHA pins freeze security *and* patches: pinned workflows never get upstream bugfixes until a
human bumps the SHA. Close the loop with **Dependabot for GitHub Actions** so pins are kept
current via reviewed PRs (Dependabot understands `@<sha> # vX` and bumps both). Proposed
`/.github/dependabot.yml` (separate file, also proposal-only):

```yaml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

Optionally add OpenSSF Scorecard or `zizmor` to CI to fail on any future unpinned `uses:`.

---

## Adjacent findings — flagged, NOT part of this change (leader's call)

1. **`db-backup.yml` has no top-level `permissions:` block.** The other three workflows
   set `permissions: contents: read` (least privilege). `db-backup.yml` therefore runs with
   the repo/org default `GITHUB_TOKEN` permissions, which can be read-write. It only needs
   `contents: read` (checkout + artifact upload use the artifact API, not repo contents
   write). Recommend adding `permissions: { contents: read }`. **Separate change** — not
   bundled into the pinning edit. (W3 previously hardened `tenant-scope.yml` the same way in
   commit `8eae3e17`; this is the one workflow that still lacks it.)

2. **The repo tracks an old major.** Upstream is now `actions/checkout@v7.0.0`,
   `actions/setup-node@v6.4.0`, `actions/upload-artifact@v7.0.1` (verified 2026-07-12) while
   this repo runs `@v4`. Pinning to the v4 tip is the correct *first* step (freeze what runs
   today); a **major-version upgrade** (v4 → v6/v7) is a distinct, separately-reviewed change
   with its own breaking-change surface — do NOT fold it into the SHA pin.

---

## Verification (post-apply, no deploy)

```bash
# 1. No mutable-tag uses: remain — every uses: must carry a 40-hex SHA.
grep -rnE "uses:\s+\S+@v[0-9]+\s*$" .github/workflows/   # expect ZERO rows
grep -rnE "uses:\s+\S+@[0-9a-f]{40}"  .github/workflows/  # expect 7 rows (all uses: pinned)

# 2. The pinned SHA still resolves to the intended v4 tip (no typo):
gh api repos/actions/checkout/git/ref/tags/v4 --jq '.object.sha'   # == 34e1148... at apply time

# 3. Trigger CI (or a dry re-run) and confirm each job's "Set up job" step resolves the
#    pinned action without error — a bad/typo'd SHA fails the checkout step immediately.
```
