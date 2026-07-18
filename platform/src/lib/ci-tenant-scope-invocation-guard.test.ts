import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard (W3 lane: CI wiring under .github/workflows). New
// fresh-ground surface, item (210).
//
// Every prior guard in this lane (items 204-209) assumed the tenant-scope
// and protected-tenant guard steps' own wiring — that they run, in the
// right job, without `if:`/`continue-on-error`/`|| true` — was the whole
// bypass surface. tenant-scope-workflow-consolidation.test.ts's own
// "still runs the guard" assertion, and protected-tenant-guard-wiring.
// test.ts's equivalent, both use `yaml.includes('node scripts/audit-
// tenant-scope.mjs')` / `.includes('node scripts/verify-protected-
// tenants.mjs')` — a SUBSTRING check. That passes just as happily whether
// the line is the bare command or the bare command plus trailing flags,
// because `.includes()` doesn't care what comes after the match.
//
// scripts/audit-tenant-scope.mjs (unlike verify-protected-tenants.mjs,
// which takes no argv flags at all) reads two of its own:
//   `--all`            -> process.exit(ALL ? 0 : 1) — ALWAYS exits 0,
//                         turning the gate into a report that can never
//                         fail a PR regardless of what it finds.
//   `--update-baseline` -> writes every CURRENTLY flagged finding (baseline
//                         debt AND any brand-new leak introduced in the
//                         same PR) straight into scripts/.tenant-scope-
//                         baseline.json and exits 0, silently accepting
//                         the new leak as "known debt" instead of failing
//                         on it.
// Appending either token to ci.yml's Tenant-isolation guard run line is a
// one-token edit that still prints a normal-looking pass, still shows the
// step green, while permanently disabling (or worse, laundering new leaks
// into) the one backstop that exists because the service-role client
// bypasses Postgres RLS (see the script's own header comment). This is the
// same "runs but checks less" bypass family as items (206)/(207), just
// against a script that has actual dangerous flags to append, rather than
// scope-narrowing ones.
//
// Verified clean today (pre-(247)): ci.yml:55 was exactly `run: node
// scripts/audit-tenant-scope.mjs`, no trailing tokens.
//
// Mutation-verified before writing this guard: appended `--update-baseline`
// to ci.yml's Tenant-isolation guard line and re-ran tenant-scope-workflow-
// consolidation.test.ts directly — all 4 of its assertions stayed green
// (its `.includes()` check does not notice the appended flag). Confirms
// the gap this guard closes was real, not a hypothetical. Reverted before
// writing this file (`git diff --stat .github/workflows/ci.yml` empty
// afterward).
//
// UPDATED for item (247): the step's `run:` moved from a single-line `run:
// node scripts/audit-tenant-scope.mjs` to a multi-line `run: |` block, piped
// through `tee tenant-scope-output.txt` so identify-failed-step can grep the
// captured output to tell a real leak apart from the script itself crashing
// (the same "two reasons for exit 1" ambiguity (246) closed for tenant-
// config-reconcile.yml's own drift-gate step). The invocation line no longer
// carries a literal `run:` prefix on the same line — the old
// same-line-anchored detector below stopped matching it entirely (verified:
// re-running this file against the (247) diff with the OLD detector reported
// zero invocation lines, silently passing the "no trailing flags" test for
// the wrong reason — nothing to check, not "checked and clean"). The
// detector now matches the invocation itself, prefixed by an optional
// `run:` — this still refuses to match a bare mention of the script inside a
// comment (a comment line starts with `#`, not `node` or `run:`) — and the
// tee pipe is explicitly allowlisted as the one legitimate suffix, so a
// dangerous flag (`--all` / `--update-baseline`) appended either instead of
// or alongside the pipe is still caught.
//
// PURE SOURCE-READING of the workflow YAML — no YAML lib, no runner — same
// approach as ci-lint-scope-guard.test.ts / ci-typecheck-scope-guard.
// test.ts. vitest runs with the platform package root as cwd, so ci.yml
// lives one level up.

const WORKFLOWS_DIR = join(process.cwd(), '..', '.github', 'workflows')
const CI_WORKFLOW = join(WORKFLOWS_DIR, 'ci.yml')
const GUARD_SCRIPT = join(process.cwd(), 'scripts', 'audit-tenant-scope.mjs')

function ciYaml(): string {
  return readFileSync(CI_WORKFLOW, 'utf8')
}

function tenantScopeInvocationLines(yaml: string): Array<{ line: number; cmd: string }> {
  const out: Array<{ line: number; cmd: string }> = []
  yaml.split('\n').forEach((raw, i) => {
    const trimmed = raw.trim()
    // Matches both the historical single-line `run: node scripts/audit-
    // tenant-scope.mjs` form and the current (247) multi-line `run: |` block
    // form, where the invocation is its own line with no `run:` prefix at
    // all. Anchored to the START of the trimmed line so a comment mentioning
    // the script filename elsewhere never matches.
    if (/^(?:run:\s*)?node\s+scripts\/audit-tenant-scope\.mjs\b/.test(trimmed)) {
      out.push({ line: i + 1, cmd: trimmed })
    }
  })
  return out
}

// The one legitimate suffix after the script path today: (247)'s `| tee
// <file>` capture, which lets identify-failed-step disambiguate a real leak
// from a script crash — see the comment above the Tenant-isolation guard
// step in ci.yml. Anything else after the script path is either a flag
// audit-tenant-scope.mjs itself reads and reacts to (`--all`,
// `--update-baseline`) or an unknown future one — all of them are
// scope-narrowing/neutering risk by construction here. A flag appended
// ALONGSIDE the tee pipe still fails this check (the allowlist regex
// requires the suffix to be EXACTLY the tee pipe, nothing more).
const SAFE_TEE_SUFFIX_RE = /^\|\s*tee\s+\S+\.txt$/
function extraTokens(cmd: string): string[] {
  const m = cmd.match(/\baudit-tenant-scope\.mjs\s+(.*)$/)
  if (!m) return []
  const suffix = m[1].trim()
  if (SAFE_TEE_SUFFIX_RE.test(suffix)) return []
  return suffix.split(/\s+/).filter(Boolean)
}

describe('CI invariant — Tenant-isolation guard invocation stays bare (no --all / --update-baseline / other flags)', () => {
  it('ci.yml and the guard script exist where the test expects them', () => {
    expect(existsSync(CI_WORKFLOW), `no ci.yml at ${CI_WORKFLOW}`).toBe(true)
    expect(existsSync(GUARD_SCRIPT), `no guard script at ${GUARD_SCRIPT}`).toBe(true)
  })

  it('ci.yml still contains a tenant-scope guard invocation (the surface it protects is not deleted)', () => {
    expect(
      tenantScopeInvocationLines(ciYaml()).length,
      'ci.yml has no `run: … audit-tenant-scope.mjs …` step — the Tenant-isolation gate is gone',
    ).toBeGreaterThan(0)
  })

  it('the audit-tenant-scope.mjs invocation carries no trailing flags', () => {
    const offenders = tenantScopeInvocationLines(ciYaml())
      .map((v) => ({ ...v, extra: extraTokens(v.cmd) }))
      .filter((v) => v.extra.length > 0)
    expect(
      offenders,
      'The Tenant-isolation guard step passes extra tokens to audit-tenant-scope.mjs. ' +
        '`--all` makes the script exit 0 unconditionally regardless of findings; ' +
        '`--update-baseline` writes every currently-flagged query (including any brand-new ' +
        'leak in this same PR) into scripts/.tenant-scope-baseline.json as accepted debt and ' +
        'exits 0. Either keeps the step green while disabling or laundering the gate:\n' +
        offenders.map((o) => `  ci.yml:${o.line} — extra: ${o.extra.join(', ')}\n    ${o.cmd}`).join('\n'),
    ).toEqual([])
  })
})
