import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard — item (216), continuing item (215)'s trigger-safety
// surface (step 2 of the queue: closing the OTHER half of the same exploit
// combo). Item (215) pinned that none of this lane's workflows declare
// `pull_request_target`. That guard stops the trigger half of the classic
// "pwn request" pattern, but says nothing about the checkout half: under
// `pull_request_target`, the DEFAULT checkout is the safe base-branch ref —
// the vulnerability only exists when a step ALSO explicitly overrides
// `ref:` to the fork PR's own head (`github.event.pull_request.head.sha` or
// `.ref`), which is what actually pulls the untrusted code into the
// elevated, secret-bearing context.
//
// This guard is defense-in-depth, not a currently-live exploit path: today
// every checkout step here uses the default ref under a plain
// `pull_request` trigger (already read-only, no secrets, so an explicit
// fork-head ref there would be a no-op on the security posture). It closes
// the guard gap for the actual combo — if `pull_request_target` were ever
// reintroduced (item (215) regresses or is bypassed some other way) or a
// second pull_request_target-triggered workflow is added later to this
// directory, an explicit fork-head ref override on ITS checkout step would
// be the trigger for real secret exfiltration, and nothing today would catch
// that override being added. Same "symmetric, currently-inert" shape as item
// (210)'s Protected-tenant-guard trailing-flags check.
//
// Mutation-verified before writing this file: added
// `ref: ${{ github.event.pull_request.head.sha }}` under ci.yml's checkout
// step's existing `with:` block (alongside `persist-credentials: false`) —
// the full 478-file / 2389-test vitest suite stayed green.
//
// PURE SOURCE-READING of the workflow YAML — no YAML lib, no runner — matching
// every other guard in this lane. vitest runs with the platform package root
// as cwd, so the workflows live one level up.

const WORKFLOWS_DIR = join(process.cwd(), '..', '.github', 'workflows')
const WORKFLOW_FILES = ['ci.yml', 'tenant-config-reconcile.yml', 'db-backup.yml']

function workflowYaml(name: string): string {
  return readFileSync(join(WORKFLOWS_DIR, name), 'utf8')
}

function checkoutStepBlocks(yaml: string): string[] {
  const matches = yaml.match(/- uses:\s*actions\/checkout@[^\n]*\n(?:[ \t]+\S.*\n?)*/g)
  return matches ?? []
}

describe('CI invariant — no checkout step in this lane pins ref to a fork PR head', () => {
  it('the workflows directory exists where the guard expects it', () => {
    expect(existsSync(WORKFLOWS_DIR), `no workflows directory at ${WORKFLOWS_DIR}`).toBe(true)
  })

  it('finds at least one actions/checkout step across the workflows (the guard has something to verify)', () => {
    const total = WORKFLOW_FILES.reduce((sum, file) => sum + checkoutStepBlocks(workflowYaml(file)).length, 0)
    expect(total, 'found zero actions/checkout steps across ci.yml/tenant-config-reconcile.yml/db-backup.yml').toBeGreaterThan(0)
  })

  it.each(WORKFLOW_FILES)('%s has no checkout step that overrides ref to the fork PR head', (file) => {
    const yaml = workflowYaml(file)
    for (const block of checkoutStepBlocks(yaml)) {
      expect(
        /ref:\s*.*pull_request\.head/.test(block),
        `${file} has an actions/checkout step whose \`ref:\` points at ` +
          '`github.event.pull_request.head.*` — combined with a `pull_request_target` ' +
          'trigger (guarded absent by ci-no-pull-request-target-guard.test.ts, but not ' +
          'by this test), this is the checkout half of the "pwn request" pattern: it ' +
          'pulls the untrusted fork PR\'s own code into a job that runs with a ' +
          'write-scoped GITHUB_TOKEN and full secret access.',
      ).toBe(false)
    }
  })
})
