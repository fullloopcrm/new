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
// Verified clean today: ci.yml:55 is exactly `run: node scripts/audit-
// tenant-scope.mjs`, no trailing tokens.
//
// Mutation-verified before writing this guard: appended `--update-baseline`
// to ci.yml's Tenant-isolation guard line and re-ran tenant-scope-workflow-
// consolidation.test.ts directly — all 4 of its assertions stayed green
// (its `.includes()` check does not notice the appended flag). Confirms
// the gap this guard closes was real, not a hypothetical. Reverted before
// writing this file (`git diff --stat .github/workflows/ci.yml` empty
// afterward).
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
    if (/\baudit-tenant-scope\.mjs\b/.test(raw) && /\brun:/.test(raw)) {
      out.push({ line: i + 1, cmd: raw.trim() })
    }
  })
  return out
}

// Anything after the script path is a flag audit-tenant-scope.mjs itself
// reads and reacts to (`--all`, `--update-baseline`) or an unknown future
// one — all of them are scope-narrowing/neutering risk by construction
// here, since the bare command is the only invocation that keeps the gate
// able to fail.
function extraTokens(cmd: string): string[] {
  const m = cmd.match(/\baudit-tenant-scope\.mjs\s+(.*)$/)
  if (!m) return []
  return m[1].split(/\s+/).filter(Boolean)
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
