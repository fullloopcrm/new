import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI full-suite guard (W3 deploy-prep sweep). Executable companion to
// deploy-prep/ci-full-suite-gate-note.md, which confirmed the PR gate runs the
// COMPLETE vitest suite via a single unfiltered `npx vitest run` (ci.yml:46) and
// left this standing caveat:
//
//   "The full-suite guarantee holds only as long as the vitest step stays
//    unfiltered. If anyone later adds --changed, --shard, or a path arg to
//    ci.yml:46 to speed CI up, this guarantee breaks — flag any such change in
//    review."
//
// A review-time flag is easy to miss. This test CODIFIES the guarantee so a
// narrowed suite fails CI instead of relying on a human noticing the diff:
//   * If someone adds --shard / --changed / --project / --dir / a positional
//     test path or -t name filter to the vitest step in ANY workflow, this fails.
//   * If the vitest gate is deleted from ci.yml entirely, this fails (a guard
//     that passed when the suite it protects is gone would be worthless).
//
// PURE SOURCE-READING of the workflow YAML — no YAML lib, no runner — matching
// the sibling SEO guards (sitemap-presence.test.ts et al). vitest runs with the
// platform package root as cwd, so the workflows live one level up.

const WORKFLOWS_DIR = join(process.cwd(), '..', '.github', 'workflows')
const CI_WORKFLOW = join(WORKFLOWS_DIR, 'ci.yml')

// Flags/args that NARROW which tests run. Any of these on a vitest command means
// the invocation is no longer the whole suite. `--coverage`, `--reporter`,
// `--silent`, `--bail` etc. are intentionally NOT here — they don't subset tests.
const NARROWING_FLAG_PATTERNS: Array<{ re: RegExp; why: string }> = [
  { re: /--shard(\b|=)/, why: '--shard (splits the suite across runners)' },
  { re: /--changed(\b|=)/, why: '--changed (runs only tests for changed files)' },
  { re: /--project(\b|=)/, why: '--project (runs only a named project)' },
  { re: /--dir(\b|=)/, why: '--dir (restricts the root scan directory)' },
  {
    re: /--testNamePattern(\b|=)|(^|\s)-t(\s|=)/,
    why: '-t / --testNamePattern (runs only name-matching tests)',
  },
  { re: /--include(\b|=)/, why: '--include (overrides the config test glob)' },
]

// A token after `vitest run` that looks like a test path or glob (contains a
// path separator, a *, or ends in .ts/.tsx, or is a *.test* file) is a
// positional filter that narrows the suite. Flag VALUES like `json` or
// `verbose` (e.g. `--reporter json`) don't match, so they're allowed.
function positionalPathFilter(afterRun: string): string | null {
  for (const tok of afterRun.split(/\s+/).filter(Boolean)) {
    if (tok.startsWith('-')) continue // a flag, not a positional
    if (/[/*]|\.tsx?$|\.test\b/.test(tok)) return tok
  }
  return null
}

// Reasons a single vitest command line is NOT a full-suite invocation. Empty
// array => it's an unfiltered full run.
function narrowingViolations(cmd: string): string[] {
  const reasons: string[] = []
  for (const { re, why } of NARROWING_FLAG_PATTERNS) {
    if (re.test(cmd)) reasons.push(why)
  }
  const runMatch = cmd.match(/vitest\s+run\b(.*)$/)
  if (runMatch) {
    const path = positionalPathFilter(runMatch[1])
    if (path) reasons.push(`positional path/glob filter "${path}"`)
  }
  return reasons
}

// Every line across all workflow files that invokes vitest (as a shell run step).
// Format today is single-line `run: npx vitest run`; scanning line-by-line keeps
// the guard robust to added flags without needing a YAML parser.
function vitestInvocationLines(): Array<{ file: string; line: number; cmd: string }> {
  const out: Array<{ file: string; line: number; cmd: string }> = []
  const files = readdirSync(WORKFLOWS_DIR).filter((f) => /\.ya?ml$/.test(f))
  for (const file of files) {
    const src = readFileSync(join(WORKFLOWS_DIR, file), 'utf8')
    src.split('\n').forEach((raw, i) => {
      // Only lines that actually shell out to vitest — skip the step's `- name:`
      // label ("Unit tests (vitest)") so a rename can't trip the guard.
      if (/\bvitest\b/.test(raw) && /\brun:/.test(raw)) {
        out.push({ file, line: i + 1, cmd: raw.trim() })
      }
    })
  }
  return out
}

describe('CI full-suite guard (vitest gate stays unfiltered)', () => {
  it('the workflows directory and ci.yml exist where the guard expects them', () => {
    // If this fails the workflows moved/renamed — update the paths above rather
    // than letting the guard silently pass on a directory it can no longer read.
    expect(existsSync(WORKFLOWS_DIR), `no workflows dir at ${WORKFLOWS_DIR}`).toBe(true)
    expect(existsSync(CI_WORKFLOW), `no ci.yml at ${CI_WORKFLOW}`).toBe(true)
  })

  it('ci.yml still contains a vitest gate (the suite it protects is not deleted)', () => {
    const ciVitest = vitestInvocationLines().filter((v) => v.file === 'ci.yml')
    expect(
      ciVitest.length,
      'ci.yml has no `run: … vitest …` step — the full-suite PR gate is gone',
    ).toBeGreaterThan(0)
  })

  it('no vitest invocation in any workflow narrows the suite', () => {
    const offenders = vitestInvocationLines()
      .map((v) => ({ ...v, reasons: narrowingViolations(v.cmd) }))
      .filter((v) => v.reasons.length > 0)
    expect(
      offenders,
      'A vitest step narrows the test suite (breaks the full-suite CI gate — ' +
        'see deploy-prep/ci-full-suite-gate-note.md):\n' +
        offenders
          .map((o) => `  ${o.file}:${o.line} — ${o.reasons.join('; ')}\n    ${o.cmd}`)
          .join('\n'),
    ).toEqual([])
  })
})
