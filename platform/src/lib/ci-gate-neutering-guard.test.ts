import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard (W3 lane: CI wiring under .github/workflows). Sibling to
// items (198)-(203) in EMERGENCY-24-7-ARCHETYPE-GAPS-AND-FRICTION-2026-07-16.md
// (item 204) — every prior guard in this lane pins that a GATE STEP's own
// internal fail-closed logic stays intact (its exit-1 branch, its ordering,
// its pinned artifact path). None of them pin the one thing that bypasses
// ALL of that logic at once, from outside the script entirely: GitHub
// Actions' own `continue-on-error: true` key (settable on either a STEP or an
// entire JOB), or a shell-level trailing `|| true` appended to a step's run
// script.
//
// Any of these makes a step — or, at job level, the WHOLE JOB — report
// success to the job runner NO MATTER WHAT ITS SCRIPT DOES — a failing
// `tsc`, a red vitest suite, a live cross-tenant query caught by the
// Tenant-isolation guard, a broken protected tenant, an eslint error, a
// gating CRIT drift finding, or a failed/undersized/unencrypted nightly DB
// dump would all still show green. It requires no edit to the script itself
// (which db-backup-encryption-fail-closed.test.ts,
// db-backup-dump-size-sanity-gate.test.ts, and reconcile-gate-*.test.ts all
// read) — just one line added to the step's OR the job's YAML, the kind of
// change a "make CI less flaky" PR could plausibly make to something someone
// believes is occasionally flaky, without realizing it silences a real
// security/correctness gate forever. The job-level form is the wider blast
// radius of the two: `jobs.<id>.continue-on-error: true` neuters every step
// in that job at once, not just one.
//
// Today's workflows contain none of these patterns on any gating step or
// job (only the three "Alert on failure" / Telegram notify steps
// intentionally end their curl call in `|| true`, so a transient Telegram
// API hiccup can't fail the already-failed job's own failure-notification
// step — that exception is deliberately carved out below, at both the step
// and job level). This test CODIFIES that so any of these patterns landing
// on a real gate fails CI instead of relying on a reviewer noticing one
// added line in a YAML diff.
//
// PURE SOURCE-READING of the workflow YAML — no YAML lib, no runner — same
// approach as actions-sha-pin-guard.test.ts / ci-full-suite-guard.test.ts.
// vitest runs with the platform package root as cwd, so workflows live one
// level up.

const WORKFLOWS_DIR = join(process.cwd(), '..', '.github', 'workflows')

// Steps whose job IS the failure notification — these intentionally swallow
// their own curl's exit code (`|| true`) so a flaky Telegram API call can't
// fail the notify-failure job that is already reporting a failure. No other
// step is exempt.
const ALERT_STEP_NAME_RE = /alert|telegram/i

function workflowFiles(): string[] {
  return readdirSync(WORKFLOWS_DIR).filter((f) => /\.ya?ml$/.test(f))
}

// Step boundaries are found WITHIN each job's own (already job-bounded) body
// slice, not against the whole file. Finding step starts against the raw
// file text lets a job's LAST step's body run past that job's own end and
// bleed into the next job's header (`needs:` / `if:` / `runs-on:`) — a real
// false-positive risk found while building ci-gate-conditional-skip-guard.
// test.ts (item 205): that guard's `if:` check on the last gating step
// (ci.yml's "Lint") was tripping on notify-failure's job-level `if:
// failure()` bleeding in through this exact seam. Harmless for THIS file's
// own assertions today (no notify-failure job header line matches
// `continue-on-error:` or a trailing `|| true`), but it is the identical
// structural bug, so it gets the identical fix as its own continuation
// rather than leaving a silent landmine for the next pattern added here.
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

// Job-level `continue-on-error: true` is the wider-blast-radius sibling of
// the step-level pattern above — it neuters EVERY step in the job at once,
// not just one. Job ids sit at a fixed 2-space indent directly under
// `jobs:`; a job-level `continue-on-error:` key (sibling to `runs-on:` /
// `steps:`) sits at a fixed 4-space indent — one level shallower than any
// key inside a step (which starts at 6-space for the `- name:`/`- uses:`
// list item, 8-space for that step's own keys). This repo's workflow YAML
// is consistently 2-space indented, so a plain indent-anchored regex is
// enough — no YAML parser needed, same approach as the rest of this file.
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

// notify-failure jobs are not gates — nothing `needs:` them, so their own
// job-level continue-on-error would be inconsequential (unlike a gating
// job's, which other jobs/branch-protection rules depend on).
const NOTIFY_JOB_ID_RE = /notify-failure/i

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

describe('CI invariant — no gating step can be silently neutered (continue-on-error / trailing || true)', () => {
  it('the workflows directory exists where the guard expects it', () => {
    expect(existsSync(WORKFLOWS_DIR), `no workflows dir at ${WORKFLOWS_DIR}`).toBe(true)
  })

  it('finds gating steps to check across the workflows (the guard has something to verify)', () => {
    expect(
      gatingSteps().length,
      'no non-alert steps found in any workflow — the step parser or the workflows themselves may be broken',
    ).toBeGreaterThan(0)
  })

  it('the alert-step exemption pattern matches at least one real step (proves the exclusion filter is doing real work)', () => {
    const matched = workflowFiles().some((file) => {
      const yaml = readFileSync(join(WORKFLOWS_DIR, file), 'utf8')
      return allStepBlocks(file, yaml).some((s) => ALERT_STEP_NAME_RE.test(s.name))
    })
    expect(matched, 'no step in any workflow matched the alert/telegram exemption — the exemption may be silently matching nothing').toBe(true)
  })

  it('no gating step sets continue-on-error: true', () => {
    const offenders = gatingSteps().filter((s) => /continue-on-error:\s*true\b/i.test(s.body))
    expect(
      offenders,
      offenders
        .map((o) => `${o.file} — "${o.name}" has continue-on-error: true — this step now reports success to the job runner regardless of its script's real exit code, silently defeating whatever gate it runs`)
        .join('\n'),
    ).toEqual([])
  })

  it('no gating step\'s run script ends a line in a bare `|| true` (or `|| exit 0`) that swallows its real exit code', () => {
    const offenders: Array<{ file: string; name: string; line: string }> = []
    for (const step of gatingSteps()) {
      const lines = step.body.split('\n')
      for (const raw of lines) {
        const line = raw.trim()
        if (/\|\|\s*(true|exit\s+0)\s*$/.test(line)) {
          offenders.push({ file: step.file, name: step.name, line })
        }
      }
    }
    expect(
      offenders,
      offenders
        .map((o) => `${o.file} — "${o.name}" — line ends in a suppressed exit code: ${o.line}`)
        .join('\n'),
    ).toEqual([])
  })

  it('finds the real gating jobs across the workflows (verify / reconcile / backup — the job parser is reading real job ids, not silently matching nothing)', () => {
    const ids = gatingJobs().map((j) => `${j.file}:${j.id}`)
    expect(ids).toEqual(
      expect.arrayContaining(['ci.yml:verify', 'tenant-config-reconcile.yml:reconcile', 'db-backup.yml:backup']),
    )
  })

  it('the notify-failure job exemption matches a real job (proves the job-level exclusion filter is doing real work)', () => {
    const matched = workflowFiles().some((file) => {
      const yaml = readFileSync(join(WORKFLOWS_DIR, file), 'utf8')
      return allJobBlocks(file, yaml).some((j) => NOTIFY_JOB_ID_RE.test(j.id))
    })
    expect(matched, 'no job in any workflow matched the notify-failure exemption — the exemption may be silently matching nothing').toBe(true)
  })

  it('no gating job sets continue-on-error: true at the JOB level (would neuter every step in that job at once)', () => {
    const offenders = gatingJobs().filter((j) => /^ {4}continue-on-error:\s*true\b/m.test(j.body))
    expect(
      offenders,
      offenders
        .map((o) => `${o.file} — job "${o.id}" has continue-on-error: true — EVERY step in this job now reports success to the job runner regardless of its real exit code, silently defeating every gate the job runs, not just one`)
        .join('\n'),
    ).toEqual([])
  })
})
