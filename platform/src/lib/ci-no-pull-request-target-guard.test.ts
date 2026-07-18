import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard — item (215) fresh ground. Every existing guard in this
// lane (reconcile-gate-wiring.test.ts, ci-gate-conditional-skip-guard.test.ts,
// tenant-scope-workflow-consolidation.test.ts) confirms `pull_request:` is
// PRESENT on ci.yml / tenant-config-reconcile.yml, but none of them confirm
// `pull_request_target:` is ABSENT. Those are not the same check: a workflow
// edit that ADDS `pull_request_target:` alongside the existing `pull_request:`
// trigger (rather than replacing it) sails past every current test, because
// every current test only asserts "pull_request still triggers this workflow"
// — it never asserts "pull_request_target does not".
//
// Why it matters (the "pwn request" class, a well-known GitHub Actions
// vulnerability pattern): `pull_request` runs with a read-only GITHUB_TOKEN
// and NO access to repo secrets when the head is a fork — safe even though
// ci.yml executes untrusted code from that fork (`npm ci` runs arbitrary
// postinstall scripts from the PR's package-lock.json; `npx vitest run` /
// `npx eslint` execute the PR's own test/lint config). `pull_request_target`
// instead runs in the BASE repo's context: a write-scoped GITHUB_TOKEN and
// full access to every configured secret (TELEGRAM_BOT_TOKEN,
// SUPABASE_ACCESS_TOKEN_FULLLOOP on the sibling reconcile workflow) — while
// still checking out and executing that same untrusted fork code. Adding
// `pull_request_target` here, even innocently (e.g. "so status checks also
// post from forks"), would let any external fork PR exfiltrate every secret
// this lane's workflows use, via a malicious postinstall script or test file.
//
// Mutation-verified before writing this file: added `pull_request_target: {}`
// as an EXTRA trigger alongside the existing `pull_request:` block in both
// ci.yml and tenant-config-reconcile.yml (independently) — the full 477-file /
// 2383-test vitest suite stayed green both times. db-backup.yml is checked
// too for symmetry, though it has no pull_request trigger at all today (it
// only runs on schedule/workflow_dispatch and never checks out the repo), so
// adding pull_request_target there would be an even more obviously wrong edit
// — but "obviously wrong" and "caught by a test" are not the same thing.
//
// PURE SOURCE-READING of the workflow YAML — no YAML lib, no runner — matching
// every other guard in this lane. vitest runs with the platform package root
// as cwd, so the workflows live one level up.

const WORKFLOWS_DIR = join(process.cwd(), '..', '.github', 'workflows')
const WORKFLOW_FILES = ['ci.yml', 'tenant-config-reconcile.yml', 'db-backup.yml']

function workflowYaml(name: string): string {
  return readFileSync(join(WORKFLOWS_DIR, name), 'utf8')
}

describe('CI invariant — no workflow in this lane ever triggers on pull_request_target', () => {
  it('the workflows directory exists where the guard expects it', () => {
    expect(existsSync(WORKFLOWS_DIR), `no workflows directory at ${WORKFLOWS_DIR}`).toBe(true)
  })

  it('finds all three workflow files (the guard has something to check)', () => {
    for (const file of WORKFLOW_FILES) {
      expect(existsSync(join(WORKFLOWS_DIR, file)), `missing workflow file: ${file}`).toBe(true)
    }
  })

  it('ci.yml still triggers on plain pull_request (the trigger this guard distinguishes from is real)', () => {
    const yaml = workflowYaml('ci.yml')
    expect(/^\s*pull_request\s*:?\s*$/m.test(yaml), 'ci.yml no longer triggers on pull_request').toBe(true)
  })

  it.each(WORKFLOW_FILES)('%s never declares a pull_request_target trigger', (file) => {
    const yaml = workflowYaml(file)
    expect(
      yaml.includes('pull_request_target'),
      `${file} declares \`pull_request_target\` — this runs untrusted fork-PR code ` +
        '(npm ci postinstall scripts, test/lint config) with a write-scoped ' +
        'GITHUB_TOKEN and full secret access instead of the safe read-only, ' +
        'no-secrets context that plain `pull_request` provides. Any fork PR could ' +
        'exfiltrate this lane\'s secrets (TELEGRAM_BOT_TOKEN, ' +
        'SUPABASE_ACCESS_TOKEN_FULLLOOP, SUPABASE_DB_URL, BACKUP_ENCRYPTION_KEY) via ' +
        'a malicious script.',
    ).toBe(false)
  })
})
