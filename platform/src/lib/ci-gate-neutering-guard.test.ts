import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard (W3 lane: CI wiring under .github/workflows). Sibling to
// items (198)-(203) in EMERGENCY-24-7-ARCHETYPE-GAPS-AND-FRICTION-2026-07-16.md
// (item 204) — every prior guard in this lane pins that a GATE STEP's own
// internal fail-closed logic stays intact (its exit-1 branch, its ordering,
// its pinned artifact path). None of them pin the one thing that bypasses
// ALL of that logic at once, from outside the script entirely: GitHub
// Actions' own `continue-on-error: true` step key, or a shell-level trailing
// `|| true` appended to a step's run script.
//
// Either one makes a step report success to the job runner NO MATTER WHAT ITS
// SCRIPT DOES — a failing `tsc`, a red vitest suite, a live cross-tenant
// query caught by the Tenant-isolation guard, a broken protected tenant, an
// eslint error, a gating CRIT drift finding, or a failed/undersized/
// unencrypted nightly DB dump would all still show green. It requires no
// edit to the script itself (which db-backup-encryption-fail-closed.test.ts,
// db-backup-dump-size-sanity-gate.test.ts, and reconcile-gate-*.test.ts all
// read) — just one line added to the step's YAML, the kind of change a
// "make CI less flaky" PR could plausibly make to a step someone believes is
// occasionally flaky, without realizing it silences a real security/
// correctness gate forever.
//
// Today's workflows contain neither pattern on any gating step (only the
// three "Alert on failure" / Telegram notify steps intentionally end their
// curl call in `|| true`, so a transient Telegram API hiccup can't fail the
// already-failed job's own failure-notification step — that exception is
// deliberately carved out below). This test CODIFIES that so either pattern
// landing on a real gate fails CI instead of relying on a reviewer noticing
// one added line in a YAML diff.
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

function allStepBlocks(file: string, yaml: string): Array<{ file: string; name: string; body: string }> {
  const NAME_RE = /^\s*- name:\s*(.+)$/gm
  const starts: Array<{ name: string; index: number }> = []
  let m: RegExpExecArray | null
  while ((m = NAME_RE.exec(yaml))) {
    starts.push({ name: m[1].trim(), index: m.index })
  }
  return starts.map((s, i) => {
    const end = i + 1 < starts.length ? starts[i + 1].index : yaml.length
    return { file, name: s.name, body: yaml.slice(s.index, end) }
  })
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
})
