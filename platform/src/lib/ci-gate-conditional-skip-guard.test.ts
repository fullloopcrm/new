import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard (W3 lane: CI wiring under .github/workflows). Sibling to
// item (204) (ci-gate-neutering-guard.test.ts) in
// EMERGENCY-24-7-ARCHETYPE-GAPS-AND-FRICTION-2026-07-16.md (item 205) — item
// (204) pinned that a gating step/job can't be made to RUN and self-report
// fake success (`continue-on-error: true` / trailing `|| true`). This test
// pins the orthogonal bypass: a gating step or job that never RUNS AT ALL,
// via a YAML `if:` conditional that evaluates false at runtime.
//
// Why this is a distinct, real bypass and not a duplicate of item (204): a
// step or job skipped via `if:` reports GitHub Actions status "skipped", not
// "failure" — and a skipped run is NOT a failed run. For a required status
// check under branch protection, GitHub's default behavior treats a check
// that reports "skipped" the same as one that reports "success": the PR is
// mergeable. So `if: github.event_name == 'pull_request' && false` (or any
// condition an attacker/careless-refactor can make permanently false) added
// to the `verify` job, or to any one gating step inside it, would make that
// gate silently vanish from every PR — no red X, not even a visible skipped
// run most reviewers would think to check — while `continue-on-error` at
// least still shows the step ran and its logs. This is the quieter of the
// two bypasses, which is exactly why it needs its own pin rather than being
// assumed covered by (204).
//
// Today none of the three workflows put an `if:` on any gating step or job —
// verified by grep before writing this guard. The only `if:` conditionals in
// this lane are the three "Alert on failure" / notify-failure steps and jobs,
// which intentionally only fire `if: failure()` (the parent gate has already
// failed by the time they'd run, so their own conditional skip is
// inconsequential — same carve-out ci-gate-neutering-guard.test.ts makes for
// their `|| true`). This test CODIFIES that no gating step or job going
// forward can carry ANY `if:` key, so a silently-always-false condition on a
// real gate fails CI instead of relying on a reviewer noticing one added line
// with no visible red status to tip them off.
//
// PURE SOURCE-READING of the workflow YAML — no YAML lib, no runner — same
// approach as ci-gate-neutering-guard.test.ts, whose step/job block parsers
// this mirrors exactly (same indent-anchored job-id assumption: 2-space job
// ids under `jobs:`, keys inside a step start at 6/8-space, so a job-level
// `if:` sits at the shallower 4-space sibling-of-`runs-on:` position).

const WORKFLOWS_DIR = join(process.cwd(), '..', '.github', 'workflows')

const ALERT_STEP_NAME_RE = /alert|telegram/i
const NOTIFY_JOB_ID_RE = /notify-failure/i

function workflowFiles(): string[] {
  return readdirSync(WORKFLOWS_DIR).filter((f) => /\.ya?ml$/.test(f))
}

function allJobBlocks(file: string, yaml: string): Array<{ file: string; id: string; body: string }> {
  const jobsIdx = yaml.indexOf('\njobs:')
  if (jobsIdx === -1) return []
  const jobsSection = yaml.slice(jobsIdx)
  const ID_RE = /^ {2}([a-zA-Z0-9_-]+):\s*$/gm
  const starts: Array<{ id: string; index: number }> = []
  let m: RegExpExecArray | null
  while ((m = ID_RE.exec(jobsSection))) {
    starts.push({ id: m[1], index: m.index })
  }
  return starts.map((s, i) => {
    const end = i + 1 < starts.length ? starts[i + 1].index : jobsSection.length
    return { file, id: s.id, body: jobsSection.slice(s.index, end) }
  })
}

function gatingJobs(): Array<{ file: string; id: string; body: string }> {
  const out: Array<{ file: string; id: string; body: string }> = []
  for (const file of workflowFiles()) {
    const yaml = readFileSync(join(WORKFLOWS_DIR, file), 'utf8')
    for (const job of allJobBlocks(file, yaml)) {
      if (NOTIFY_JOB_ID_RE.test(job.id)) continue
      out.push(job)
    }
  }
  return out
}

// Step boundaries are found WITHIN each job's own (already job-bounded) body
// slice, not across the whole file. Finding step starts against the raw file
// text would let a job's LAST step's body run past that job's own end and
// bleed into the next job's header (`needs:` / `if:` / `runs-on:`) — which is
// exactly the kind of false positive that would make a clean gating step look
// like it carries an `if:` conditional it does not actually have.
function allStepBlocks(file: string, yaml: string): Array<{ file: string; name: string; body: string }> {
  const NAME_RE = /^\s*- name:\s*(.+)$/gm
  const out: Array<{ file: string; name: string; body: string }> = []
  for (const job of allJobBlocks(file, yaml)) {
    const starts: Array<{ name: string; index: number }> = []
    let m: RegExpExecArray | null
    NAME_RE.lastIndex = 0
    while ((m = NAME_RE.exec(job.body))) {
      starts.push({ name: m[1].trim(), index: m.index })
    }
    starts.forEach((s, i) => {
      const end = i + 1 < starts.length ? starts[i + 1].index : job.body.length
      out.push({ file, name: s.name, body: job.body.slice(s.index, end) })
    })
  }
  return out
}

function gatingSteps(): Array<{ file: string; name: string; body: string }> {
  const out: Array<{ file: string; name: string; body: string }> = []
  for (const file of workflowFiles()) {
    const yaml = readFileSync(join(WORKFLOWS_DIR, file), 'utf8')
    for (const step of allStepBlocks(file, yaml)) {
      if (ALERT_STEP_NAME_RE.test(step.name)) continue
      out.push(step)
    }
  }
  return out
}

// A YAML `if:` key line — `if:` immediately followed by whitespace/EOL, not a
// bash `if [ ... ]; then` inside a `run:` script (which has no colon right
// after `if`). Anchored to line-start (plus leading whitespace) so it only
// matches the key position, not the word "if" appearing mid-line.
const IF_KEY_RE = /^\s*if:\s*\S/m

describe('CI invariant — no gating step or job can be silently SKIPPED via an `if:` conditional', () => {
  it('the workflows directory exists where the guard expects it', () => {
    expect(existsSync(WORKFLOWS_DIR), `no workflows dir at ${WORKFLOWS_DIR}`).toBe(true)
  })

  it('finds gating steps to check across the workflows (the guard has something to verify)', () => {
    expect(
      gatingSteps().length,
      'no non-alert steps found in any workflow — the step parser or the workflows themselves may be broken',
    ).toBeGreaterThan(0)
  })

  it('finds the real gating jobs across the workflows (verify / reconcile / backup)', () => {
    const ids = gatingJobs().map((j) => `${j.file}:${j.id}`)
    expect(ids).toEqual(
      expect.arrayContaining(['ci.yml:verify', 'tenant-config-reconcile.yml:reconcile', 'db-backup.yml:backup']),
    )
  })

  it('the alert/notify-failure exemptions each match a real step and a real job (proves the exclusion filters do real work, not silently matching nothing)', () => {
    const matchedStep = workflowFiles().some((file) => {
      const yaml = readFileSync(join(WORKFLOWS_DIR, file), 'utf8')
      return allStepBlocks(file, yaml).some((s) => ALERT_STEP_NAME_RE.test(s.name))
    })
    const matchedJob = workflowFiles().some((file) => {
      const yaml = readFileSync(join(WORKFLOWS_DIR, file), 'utf8')
      return allJobBlocks(file, yaml).some((j) => NOTIFY_JOB_ID_RE.test(j.id))
    })
    expect(matchedStep, 'no step matched the alert/telegram exemption').toBe(true)
    expect(matchedJob, 'no job matched the notify-failure exemption').toBe(true)
  })

  it('the excluded alert/notify-failure steps and jobs are exactly the ones that DO carry `if:` today (proves this guard would have something to catch if it didn\'t exempt them)', () => {
    const alertStepsWithIf = workflowFiles().flatMap((file) => {
      const yaml = readFileSync(join(WORKFLOWS_DIR, file), 'utf8')
      return allStepBlocks(file, yaml).filter((s) => ALERT_STEP_NAME_RE.test(s.name) && IF_KEY_RE.test(s.body))
    })
    const notifyJobsWithIf = workflowFiles().flatMap((file) => {
      const yaml = readFileSync(join(WORKFLOWS_DIR, file), 'utf8')
      return allJobBlocks(file, yaml).filter((j) => NOTIFY_JOB_ID_RE.test(j.id) && IF_KEY_RE.test(j.body))
    })
    expect(alertStepsWithIf.length, 'expected at least one alert step with if: failure() today').toBeGreaterThan(0)
    expect(notifyJobsWithIf.length, 'expected at least one notify-failure job with if: failure() today').toBeGreaterThan(0)
  })

  it('no gating step carries an `if:` conditional (would let it be silently skipped instead of running)', () => {
    const offenders = gatingSteps().filter((s) => IF_KEY_RE.test(s.body))
    expect(
      offenders,
      offenders
        .map((o) => `${o.file} — "${o.name}" has an if: conditional — if it ever evaluates false this step never runs at all, reporting "skipped" rather than "failure", which does not fail a required status check`)
        .join('\n'),
    ).toEqual([])
  })

  it('no gating job carries an `if:` conditional at the JOB level (would let the WHOLE job be silently skipped)', () => {
    const offenders = gatingJobs().filter((j) => /^ {4}if:\s*\S/m.test(j.body))
    expect(
      offenders,
      offenders
        .map((o) => `${o.file} — job "${o.id}" has an if: conditional — if it ever evaluates false the ENTIRE job never runs, reporting "skipped" rather than "failure", which does not fail a required status check for any step in it`)
        .join('\n'),
    ).toEqual([])
  })
})
