import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard (W3 lane: CI wiring under .github/workflows). Continues
// the surface ci-lint-scope-guard.test.ts opened this round: ci-full-suite-
// guard.test.ts pinned that ci.yml's vitest step can't be silently narrowed,
// but that treatment stopped at vitest -- neither the Lint step (closed
// above) nor the Typecheck step had any regression coverage against the same
// "speed CI up" pressure narrowing what it actually checks.
//
// `npx tsc --noEmit --pretty false` type-checks whatever tsconfig.json's own
// `include`/`exclude` says, i.e. the whole project by default. The one-token
// edit that silently shrinks that surface without touching anything a
// reviewer would think to double check: adding `-p <path>` / `--project
// <path>` pointing at a DIFFERENT, narrower tsconfig (or a positional file
// list, which makes tsc check only those files and ignore the project's
// `include` entirely). Either still exits 0 on every file left in scope,
// still prints "Typecheck (tsc --noEmit)" green, while a NEW type error in
// whatever fell out of scope ships straight to main.
//
// Deliberately NOT flagging removal of `--noEmit` itself: tsc's exit code
// reflects real compile errors regardless of `--noEmit` (it only controls
// whether .js output is written), so dropping it changes side effects, not
// the gate's pass/fail outcome -- not a narrowing risk, and asserting
// otherwise would just be a guard that fails on a harmless edit.
//
// Mutation-verified before writing the fix: appended
// `-p tsconfig.narrow.json` to ci.yml's Typecheck run line and confirmed
// this guard's "no project override" assertion fails with the exact
// predicted message; separately appended a bare positional file
// (`src/lib/telegram.ts`) and confirmed the "no positional file args"
// assertion fails too. Both reverted afterward (`git diff --stat ci.yml`
// empty).
//
// PURE SOURCE-READING of the workflow YAML -- no YAML lib, no runner -- same
// approach as ci-lint-scope-guard.test.ts / ci-full-suite-guard.test.ts.
// vitest runs with the platform package root as cwd, so ci.yml lives one
// level up.

const WORKFLOWS_DIR = join(process.cwd(), '..', '.github', 'workflows')
const CI_WORKFLOW = join(WORKFLOWS_DIR, 'ci.yml')

function ciYaml(): string {
  return readFileSync(CI_WORKFLOW, 'utf8')
}

function tscInvocationLines(yaml: string): Array<{ line: number; cmd: string }> {
  const out: Array<{ line: number; cmd: string }> = []
  yaml.split('\n').forEach((raw, i) => {
    if (/\btsc\b/.test(raw) && /\brun:/.test(raw)) {
      out.push({ line: i + 1, cmd: raw.trim() })
    }
  })
  return out
}

// Tokens after `tsc` that aren't recognized flags/flag-values are either a
// `-p`/`--project` override or a positional file list — either narrows the
// checked surface away from tsconfig.json's own full-project `include`.
const KNOWN_FLAGS = new Set(['--noemit', '--pretty'])
const KNOWN_FLAG_VALUES = new Set(['false', 'true'])

function scopeNarrowingTokens(cmd: string): string[] {
  const m = cmd.match(/\btsc\s+(.*)$/)
  if (!m) return []
  const tokens = m[1].split(/\s+/).filter(Boolean)
  return tokens.filter((t) => {
    const lower = t.toLowerCase()
    if (KNOWN_FLAGS.has(lower)) return false
    if (KNOWN_FLAG_VALUES.has(lower)) return false
    return true
  })
}

describe('CI invariant — Typecheck step stays full-project (no silent narrowing)', () => {
  it('ci.yml exists where the guard expects it', () => {
    expect(existsSync(CI_WORKFLOW), `no ci.yml at ${CI_WORKFLOW}`).toBe(true)
  })

  it('ci.yml still contains a tsc gate (the surface it protects is not deleted)', () => {
    expect(
      tscInvocationLines(ciYaml()).length,
      'ci.yml has no `run: … tsc …` step — the Typecheck PR gate is gone',
    ).toBeGreaterThan(0)
  })

  it('the tsc invocation stays --noEmit --pretty false, with no -p/--project override or positional file args', () => {
    const offenders = tscInvocationLines(ciYaml())
      .map((v) => ({ ...v, extra: scopeNarrowingTokens(v.cmd) }))
      .filter((v) => v.extra.length > 0)
    expect(
      offenders,
      'A Typecheck step has unexpected tokens beyond --noEmit --pretty false — ' +
        'a -p/--project override or a positional file list silently narrows tsc ' +
        'away from tsconfig.json\'s own full-project `include`:\n' +
        offenders.map((o) => `  ci.yml:${o.line} — extra: ${o.extra.join(', ')}\n    ${o.cmd}`).join('\n'),
    ).toEqual([])
  })
})
