import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard (W3 lane: CI wiring under .github/workflows). Item (196)
// found and fixed a live bug: db-backup.yml's failure-alert step read
// TG_CHAT from `secrets.TELEGRAM_NOTIFY_CHAT_ID`, a secret that has never
// existed in this repo (confirmed via `gh secret list` — only
// TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID are configured), silently no-op'ing
// the nightly-backup-failure Telegram alert since the workflow was
// introduced. The fix aligned it to `secrets.TELEGRAM_CHAT_ID`, the same
// secret ci.yml and tenant-config-reconcile.yml's own notify-failure steps
// already alert through successfully.
//
// That fix has ZERO regression coverage: db-backup-alert-guard.test.ts pins
// the "if: cannot reference its own step's env" bug (a DIFFERENT defect on
// the same step) and asserts the run script bash-guards on empty
// TG_TOKEN/TG_CHAT — but never checks which secret those bash variables are
// actually assigned FROM in the step's own `env:` block. Same story for
// reconcile-gate-wiring.test.ts (checks the notify-failure job exists and is
// wired to `needs: reconcile` / `if: failure()`, never the secret name) and
// ci.yml's own notify-failure job (no wiring test references it at all). A
// future edit to ANY of these three alert steps — a bad merge, a copy-paste
// from an old branch, a typo — could silently reintroduce
// TELEGRAM_NOTIFY_CHAT_ID (or any other wrong secret name) and every
// existing guard would stay green, because none of them read the `env:`
// block's right-hand side. This test closes that gap: it scans every
// workflow YAML for the TG_TOKEN/TG_CHAT env-assignment pattern (not just
// today's three known instances, so a FUTURE workflow reusing this alert
// pattern is covered automatically too) and pins the secret name on the
// right of `secrets.` for each.
//
// PURE SOURCE-READING of the workflow YAML — no YAML lib, no runner — same
// approach as ci-full-suite-guard.test.ts (which also scans every workflow
// file rather than naming them individually) and reconcile-gate-wiring.test.ts.
// vitest runs with the platform package root as cwd, so workflows live one
// level up.

const WORKFLOWS_DIR = join(process.cwd(), '..', '.github', 'workflows')

function workflowFiles(): string[] {
  return readdirSync(WORKFLOWS_DIR).filter((f) => /\.ya?ml$/.test(f))
}

// Every `TG_TOKEN: ${{ secrets.<NAME> }}` / `TG_CHAT: ${{ secrets.<NAME> }}`
// assignment across every workflow file, with the captured secret name.
function telegramSecretAssignments(): Array<{ file: string; line: number; varName: string; secretName: string }> {
  const out: Array<{ file: string; line: number; varName: string; secretName: string }> = []
  for (const file of workflowFiles()) {
    const src = readFileSync(join(WORKFLOWS_DIR, file), 'utf8')
    src.split('\n').forEach((raw, i) => {
      const m = raw.match(/^\s*(TG_TOKEN|TG_CHAT):\s*\$\{\{\s*secrets\.([A-Za-z0-9_]+)\s*\}\}\s*$/)
      if (m) out.push({ file, line: i + 1, varName: m[1], secretName: m[2] })
    })
  }
  return out
}

describe('CI invariant — Telegram alert steps read the actual configured secret names', () => {
  it('the workflows directory exists where the guard expects it', () => {
    expect(existsSync(WORKFLOWS_DIR), `no workflows dir at ${WORKFLOWS_DIR}`).toBe(true)
  })

  it('finds at least one TG_TOKEN/TG_CHAT assignment (the check is not vacuous)', () => {
    expect(
      telegramSecretAssignments().length,
      'no workflow assigns TG_TOKEN/TG_CHAT from secrets.* — either every Telegram ' +
        'alert step was removed (check ci.yml/tenant-config-reconcile.yml/db-backup.yml) ' +
        'or this guard\'s pattern no longer matches the real YAML shape and needs updating.',
    ).toBeGreaterThan(0)
  })

  it('every TG_TOKEN assignment reads secrets.TELEGRAM_BOT_TOKEN', () => {
    const offenders = telegramSecretAssignments().filter((a) => a.varName === 'TG_TOKEN' && a.secretName !== 'TELEGRAM_BOT_TOKEN')
    expect(
      offenders,
      'a TG_TOKEN assignment reads a secret other than TELEGRAM_BOT_TOKEN — the only bot ' +
        'token secret actually configured in this repo (per `gh secret list`):\n' +
        offenders.map((o) => `  ${o.file}:${o.line} — secrets.${o.secretName}`).join('\n'),
    ).toEqual([])
  })

  it('every TG_CHAT assignment reads secrets.TELEGRAM_CHAT_ID (item (196)\'s exact regression class)', () => {
    const offenders = telegramSecretAssignments().filter((a) => a.varName === 'TG_CHAT' && a.secretName !== 'TELEGRAM_CHAT_ID')
    expect(
      offenders,
      'a TG_CHAT assignment reads a secret other than TELEGRAM_CHAT_ID — the only chat-id ' +
        'secret actually configured in this repo (per `gh secret list`). This is the exact ' +
        'shape of bug item (196) found and fixed in db-backup.yml (it read the never-' +
        'configured TELEGRAM_NOTIFY_CHAT_ID, silently no-op\'ing every nightly-backup-' +
        'failure alert):\n' +
        offenders.map((o) => `  ${o.file}:${o.line} — secrets.${o.secretName}`).join('\n'),
    ).toEqual([])
  })
})
