import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard (W3 lane: CI wiring under .github/workflows). Codifies a
// fix to db-backup.yml's failure-alert step: GitHub Actions does NOT expose a
// step's own `env:` block to that same step's `if:` conditional — the `if:`
// is evaluated before the step's env is applied. The alert step used to read
// `if: failure() && env.TG_TOKEN != ''` while defining TG_TOKEN in its own
// `env:` map, so the condition always saw an unset var and evaluated false —
// the nightly DB-backup failure alert would silently NEVER fire, secrets or
// not. Fixed by moving the empty-check into the run script (bash), matching
// the pattern already used by ci.yml / tenant-scope.yml /
// tenant-config-reconcile.yml's notify-failure steps. This test pins both:
// the step's `if:` must not gate on that step's own env, and the run script
// must still guard on empty TG_TOKEN/TG_CHAT before calling the Telegram API.
//
// PURE SOURCE-READING of the workflow YAML — no YAML lib, no runner — same
// approach as reconcile-gate-wiring.test.ts / ci-full-suite-guard.test.ts.
// vitest runs with the platform package root as cwd, so workflows live one
// level up.

const WORKFLOWS_DIR = join(process.cwd(), '..', '.github', 'workflows')
const DB_BACKUP_WORKFLOW = join(WORKFLOWS_DIR, 'db-backup.yml')

function dbBackupYaml(): string {
  return readFileSync(DB_BACKUP_WORKFLOW, 'utf8')
}

describe('CI invariant — db-backup.yml alert step cannot self-gate on its own env', () => {
  it('the db-backup workflow exists where the guard expects it', () => {
    expect(existsSync(DB_BACKUP_WORKFLOW), `no db-backup workflow at ${DB_BACKUP_WORKFLOW}`).toBe(true)
  })

  it('still has an "Alert on failure" step wired to failure()', () => {
    const yaml = dbBackupYaml()
    const stepMatch = yaml.match(/- name:\s*Alert on failure[\s\S]*?(?=\n\s*- name:|\n*$)/)
    expect(stepMatch, 'could not locate the "Alert on failure" step block').not.toBeNull()
    const ifLine = stepMatch![0].match(/^\s*if:.*$/m)
    expect(
      ifLine && /failure\(\)/.test(ifLine[0]),
      'db-backup.yml no longer has an "Alert on failure" step gated on failure() ' +
        '— a failed nightly backup could go unnoticed with no Telegram alert.',
    ).toBe(true)
  })

  it('the alert step\'s if: does not reference env (a step cannot see its own env in if:)', () => {
    const yaml = dbBackupYaml()
    const stepMatch = yaml.match(/- name:\s*Alert on failure[\s\S]*?(?=\n\s*- name:|\n*$)/)
    expect(stepMatch, 'could not locate the "Alert on failure" step block').not.toBeNull()
    const ifLine = stepMatch![0].match(/^\s*if:.*$/m)
    expect(ifLine, 'the "Alert on failure" step has no if: line').not.toBeNull()
    expect(
      /env\./.test(ifLine![0]),
      `the "Alert on failure" step's if: references env (${ifLine![0].trim()}) — GitHub ` +
        "Actions does not expose a step's own env: block to that step's own if: " +
        'conditional, so this would always evaluate to the same (wrong) result ' +
        'regardless of whether the secret is actually configured.',
    ).toBe(false)
  })

  it('the alert step guards on empty TG_TOKEN/TG_CHAT inside the run script instead', () => {
    const yaml = dbBackupYaml()
    const stepMatch = yaml.match(/- name:\s*Alert on failure[\s\S]*?(?=\n\s*- name:|\n*$)/)
    expect(stepMatch).not.toBeNull()
    const body = stepMatch![0]
    expect(
      /\[\s*-z\s*"\$TG_TOKEN"\s*\]/.test(body) && /\[\s*-z\s*"\$TG_CHAT"\s*\]/.test(body),
      'the "Alert on failure" run script no longer bash-guards on empty ' +
        'TG_TOKEN/TG_CHAT before calling the Telegram API — a repo/fork without ' +
        'those secrets configured would fail this step instead of skipping clean.',
    ).toBe(true)
  })
})
