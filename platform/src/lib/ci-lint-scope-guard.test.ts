import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard (W3 lane: CI wiring under .github/workflows). New
// fresh-ground surface -- ci-full-suite-guard.test.ts pinned that ci.yml's
// vitest step can't be silently narrowed (--shard/--changed/--project/--dir/
// -t/--include/a positional path), and its own header explicitly names the
// risk it is guarding against: "If anyone later adds ... to ci.yml:46 to
// speed CI up, this guarantee breaks." That guard, and preflight-check.
// test.ts's own doc comment ("mirrors ci.yml's verify job minus
// install/lint" -- lint EXPLICITLY excluded), both stop at vitest. Nothing
// in this lane's existing coverage reads the "Lint" step's OWN command line
// (`npx eslint src --quiet`) to check what directory it actually targets.
//
// The identical "speed CI up" pressure that motivated the vitest guard
// applies just as easily here: `npx eslint src --quiet` -> `npx eslint
// src/app --quiet` (or any subdirectory) is a one-token edit that still
// prints "Lint passed" and still exits 0 on every existing violation-free
// file in scope, while silently no longer catching a NEW eslint error
// introduced in `src/lib`, `src/components`, `src/hooks`, or any other
// sibling directory under src/ that fell out of scope. No red X, no log
// line calling out what got dropped -- ci-gate-neutering-guard.test.ts only
// pins that the Lint STEP can't be neutered via continue-on-error/`|| true`/
// `if:`; it says nothing about the step still running against a SMALLER
// surface than before. Same blind spot `--ignore-pattern` opens: it doesn't
// change the target directory, but silently excludes matching files from
// the same `src` invocation without touching the visible directory argument
// at all.
//
// Mutation-verified before writing the fix (not just reasoned about):
// changed ci.yml's Lint step from `npx eslint src --quiet` to `npx eslint
// src/app --quiet` and confirmed this guard's "no narrowing" assertion below
// fails with the exact predicted message; separately added `--ignore-
// pattern "lib/**"` and confirmed it fails too. Both reverted afterward
// (`git diff --stat ci.yml` empty).
//
// PURE SOURCE-READING of the workflow YAML -- no YAML lib, no runner -- same
// approach as ci-full-suite-guard.test.ts. vitest runs with the platform
// package root as cwd, so ci.yml lives one level up.

const WORKFLOWS_DIR = join(process.cwd(), '..', '.github', 'workflows')
const CI_WORKFLOW = join(WORKFLOWS_DIR, 'ci.yml')

function ciYaml(): string {
  return readFileSync(CI_WORKFLOW, 'utf8')
}

// Every line across ci.yml that invokes eslint as a shell run step. Line-by-
// line (not a `- name:` step-block parse) keeps this robust to the step
// being renamed, matching ci-full-suite-guard.test.ts's own vitest-line
// finder.
function eslintInvocationLines(yaml: string): Array<{ line: number; cmd: string }> {
  const out: Array<{ line: number; cmd: string }> = []
  yaml.split('\n').forEach((raw, i) => {
    if (/\beslint\b/.test(raw) && /\brun:/.test(raw)) {
      out.push({ line: i + 1, cmd: raw.trim() })
    }
  })
  return out
}

// Flags that silently shrink what eslint actually checks without touching
// the visible target directory argument.
const SCOPE_NARROWING_FLAG_PATTERNS: Array<{ re: RegExp; why: string }> = [
  { re: /--ignore-pattern(\b|=)/, why: '--ignore-pattern (excludes matching files from this invocation)' },
  { re: /--no-eslintrc\b/, why: '--no-eslintrc (drops the shared config, including rules that currently gate)' },
]

function scopeViolations(cmd: string): string[] {
  const reasons: string[] = []
  for (const { re, why } of SCOPE_NARROWING_FLAG_PATTERNS) {
    if (re.test(cmd)) reasons.push(why)
  }
  return reasons
}

// The eslint command's target argument -- the first non-flag token after
// `eslint` -- must be exactly `src` (the whole tree), not a narrower
// subdirectory or glob.
function eslintTarget(cmd: string): string | null {
  const m = cmd.match(/\beslint\s+(.*)$/)
  if (!m) return null
  const tokens = m[1].split(/\s+/).filter(Boolean)
  const target = tokens.find((t) => !t.startsWith('-'))
  return target ?? null
}

describe('CI invariant — Lint step stays full-scope (no silent narrowing)', () => {
  it('ci.yml exists where the guard expects it', () => {
    expect(existsSync(CI_WORKFLOW), `no ci.yml at ${CI_WORKFLOW}`).toBe(true)
  })

  it('ci.yml still contains an eslint gate (the surface it protects is not deleted)', () => {
    expect(
      eslintInvocationLines(ciYaml()).length,
      'ci.yml has no `run: … eslint …` step — the Lint PR gate is gone',
    ).toBeGreaterThan(0)
  })

  it('the eslint invocation targets the whole `src` tree, not a narrower subdirectory or glob', () => {
    const offenders = eslintInvocationLines(ciYaml())
      .map((v) => ({ ...v, target: eslintTarget(v.cmd) }))
      .filter((v) => v.target !== 'src')
    expect(
      offenders,
      'A Lint step no longer targets the full `src` tree — this silently drops ' +
        'whichever directories fell out of scope from eslint error coverage:\n' +
        offenders.map((o) => `  ci.yml:${o.line} — target "${o.target}"\n    ${o.cmd}`).join('\n'),
    ).toEqual([])
  })

  it('no eslint invocation adds a flag that silently shrinks its checked surface', () => {
    const offenders = eslintInvocationLines(ciYaml())
      .map((v) => ({ ...v, reasons: scopeViolations(v.cmd) }))
      .filter((v) => v.reasons.length > 0)
    expect(
      offenders,
      'A Lint step narrows what eslint actually checks (breaks the full-`src` CI gate):\n' +
        offenders.map((o) => `  ci.yml:${o.line} — ${o.reasons.join('; ')}\n    ${o.cmd}`).join('\n'),
    ).toEqual([])
  })
})
