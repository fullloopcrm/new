import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { STEPS, summarize } from '../../scripts/preflight-check.mjs'

// Codifies the Section-Q pre-flight gate (15:07 LEADER->ALL item 5): a single
// command any worker/leader runs before reporting DONE. Pins the pass/fail
// logic independent of actually spawning tsc/vitest/audit-*.

describe('STEPS', () => {
  it('marks typecheck, unit tests, and the tenant-isolation gate as required', () => {
    const required = STEPS.filter((s) => s.required).map((s) => s.name)
    expect(required).toContain('typecheck (tsc --noEmit)')
    expect(required).toContain('unit tests (vitest)')
    expect(required).toContain('tenant-isolation gate')
  })

  it('marks the token-gated funnel-mode audit as non-required', () => {
    const funnelStep = STEPS.find((s) => s.name === 'funnel-mode audit')
    expect(funnelStep?.required).toBe(false)
  })

  // Was caught missing: the doc comment above STEPS in preflight-check.mjs has
  // always claimed "Mirrors the `verify` job in .github/workflows/ci.yml minus
  // install/lint", but STEPS itself was a hand-maintained copy of ci.yml's step
  // commands with nothing enforcing they actually matched — the protected-tenant
  // guard (scripts/verify-protected-tenants.mjs), a REQUIRED, gating step in
  // ci.yml's verify job, was simply absent from STEPS. A worker running
  // `node scripts/preflight-check.mjs` and seeing "PASSED — required gates
  // green" would not have run that gate at all, while CI's real verify job
  // would still catch (and block on) a broken protected tenant — the local
  // mirror silently claiming green on a condition it never actually checked.
  // PURE SOURCE-READING of the workflow YAML (no YAML lib), matching the
  // convention reconcile-gate-wiring.test.ts already established for pinning
  // workflow content. vitest runs with the platform package root as cwd, so
  // ci.yml lives one level up.
  it('mirrors every REQUIRED step ci.yml\'s verify job runs (minus install/lint, per the doc comment)', () => {
    const ciYaml = readFileSync(join(process.cwd(), '..', '.github', 'workflows', 'ci.yml'), 'utf8')
    // Extract the verify job's single-line `run:` commands, stopping before
    // the notify-failure job so a command in that unrelated job (e.g. curl)
    // is never mistaken for a verify-job step.
    const verifyJobEnd = ciYaml.indexOf('notify-failure:')
    const verifyJobYaml = verifyJobEnd === -1 ? ciYaml : ciYaml.slice(0, verifyJobEnd)
    // `[ \t]+` (not `\s+`) after the colon is deliberate: `\s` matches
    // newlines too, so a bare `run:` block header (e.g. this same file's own
    // `defaults: / run: / working-directory: platform`) would let `\s*`
    // swallow the line break and capture the FOLLOWING line's unrelated text
    // as a fake "command" — `[ \t]+` forces a real same-line `run: <cmd>`.
    const singleLineCommands = [...verifyJobYaml.matchAll(/^[ \t]*run:[ \t]+(\S.*)$/gm)]
      .map((m) => m[1].trim())
      // A bare YAML block-scalar indicator (`run: |`, `run: |-`, `run: >`, …)
      // is not itself a command — it's the header introducing a MULTI-line
      // run block on the following lines. Without this filter, item (244)'s
      // "Identify which step failed" step (a non-required, if: failure()
      // step that enriches the Telegram alert — not a gate ci.yml's verify
      // job actually requires, so it was never meant to be mirrored here)
      // gets mis-captured as the literal fake command "|", which then fails
      // direction 1 below since no REQUIRED STEPS entry can ever match it.
      .filter((cmd) => !/^[|>][-+]?$/.test(cmd))
      // install (npm ci) and lint (eslint) are excluded by this file's own
      // doc comment ("minus install/lint") — not a mirroring gap.
      .filter((cmd) => cmd !== 'npm ci' && !cmd.startsWith('npx eslint'))

    // Item (247): the Tenant-isolation guard and Protected-tenant guard steps
    // moved from a single-line `run: <cmd>` to a multi-line `run: |` block,
    // piped through `tee` so identify-failed-step can tell a real gate
    // finding apart from a script crash (see ci.yml's own comments on those
    // two steps). The invocation line inside such a block carries no `run:`
    // prefix at all, so the single-line regex above never captures it — this
    // second pass finds a bare `node scripts/<x>.mjs` invocation line
    // directly and strips the trailing `| tee <file>` capture (alert
    // plumbing, not part of the command STEPS mirrors) before comparing.
    const blockInvocationCommands = [...verifyJobYaml.matchAll(/^[ \t]*(node[ \t]+scripts\/\S+\.mjs)\b.*$/gm)].map(
      (m) => m[1],
    )
    const ciCommands = [...singleLineCommands, ...blockInvocationCommands]

    expect(ciCommands.length).toBeGreaterThan(0) // sanity: the extraction itself must find real commands

    const requiredStepCommands = STEPS.filter((s) => s.required).map((s) => `${s.cmd} ${s.args.join(' ')}`)

    // Direction 1: every command ci.yml's verify job actually runs (that this
    // file claims to mirror) has a matching REQUIRED entry in STEPS — this is
    // the exact direction that missed the protected-tenant guard.
    for (const ciCmd of ciCommands) {
      expect(
        requiredStepCommands,
        `ci.yml's verify job runs \`${ciCmd}\` but no REQUIRED STEPS entry in ` +
          `preflight-check.mjs matches it — a worker running preflight locally ` +
          `would get a false PASSED while this real CI gate could still fail.`,
      ).toContain(ciCmd)
    }

    // Direction 2: every REQUIRED STEPS command actually exists in ci.yml's
    // verify job — catches STEPS drifting to assert a gate CI no longer runs
    // (a false sense of extra coverage, and a wasted/misleading local check).
    for (const stepCmd of requiredStepCommands) {
      expect(
        ciCommands,
        `preflight-check.mjs's STEPS marks \`${stepCmd}\` as REQUIRED but ci.yml's ` +
          `verify job does not run it — STEPS no longer mirrors a real CI gate.`,
      ).toContain(stepCmd)
    }
  })
})

describe('summarize', () => {
  it('is not a hard failure when every required step passes', () => {
    const { hardFailure } = summarize([
      { name: 'typecheck', required: true, passed: true },
      { name: 'vitest', required: true, passed: true },
      { name: 'funnel-mode audit', required: false, passed: false },
    ])
    expect(hardFailure).toBe(false)
  })

  it('is a hard failure when any required step fails', () => {
    const { hardFailure } = summarize([
      { name: 'typecheck', required: true, passed: false },
      { name: 'vitest', required: true, passed: true },
    ])
    expect(hardFailure).toBe(true)
  })

  it('is not a hard failure when only a non-required step fails', () => {
    const { hardFailure } = summarize([
      { name: 'typecheck', required: true, passed: true },
      { name: 'funnel-mode audit', required: false, passed: false },
    ])
    expect(hardFailure).toBe(false)
  })

  it('labels non-required failures as SKIP/FAIL (non-blocking)', () => {
    const { lines } = summarize([{ name: 'funnel-mode audit', required: false, passed: false }])
    expect(lines[0]).toContain('SKIP/FAIL (non-blocking)')
    expect(lines[0]).toContain('funnel-mode audit')
  })

  it('labels required failures as FAIL', () => {
    const { lines } = summarize([{ name: 'typecheck', required: true, passed: false }])
    expect(lines[0]).toContain('[FAIL] typecheck')
  })

  it('labels passing steps as PASS', () => {
    const { lines } = summarize([{ name: 'typecheck', required: true, passed: true }])
    expect(lines[0]).toContain('[PASS] typecheck')
  })
})
