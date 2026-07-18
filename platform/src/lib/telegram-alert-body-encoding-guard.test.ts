import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard (W3 lane: CI wiring under .github/workflows). New
// fresh-ground surface, item (225) -- ci.yml's and tenant-config-
// reconcile.yml's notify-failure "Telegram alert" steps both build a
// multi-line `TEXT` var (failure headline + branch + commit + run URL) and
// POST it with `curl --data-urlencode text="$TEXT" -d
// disable_web_page_preview=true`, and NEITHER flag has ANY regression
// coverage anywhere in this lane.
//
// telegram-alert-secret-name-guard.test.ts already covers the TG_TOKEN/
// TG_CHAT secret names on these same steps; ci-notify-failure-wiring-guard
// .test.ts and reconcile-gate-wiring.test.ts cover the job-level `needs:` +
// `if: failure()` wiring. None of those read past the `curl` line itself.
// Grepping every guard test file in this lane for "data-urlencode" or
// "disable_web_page_preview" turned up nothing.
//
// Why it matters: `--data-urlencode` is what makes curl percent-encode
// `$TEXT` into a valid `application/x-www-form-urlencoded` body. TEXT is
// built from a heredoc-style multi-line assignment (literal embedded
// newlines) and interpolates `${{ github.ref_name }}` / a repo/run URL --
// values not fully in this job's control. If `--data-urlencode text="$TEXT"`
// were weakened to the sibling-looking `-d text="$TEXT"` (a plausible "match
// the other -d flags on this line" edit), curl would stop encoding the
// value: the literal embedded newlines and any `&`/`=` bytes in TEXT would
// be sent raw inside a form body that Telegram's API does not parse that
// way, corrupting or truncating the alert. This step's own `|| true` at the
// end of the curl pipeline swallows curl's exit code unconditionally, so a
// garbled or rejected alert produces NO red anywhere -- the notify-failure
// job (whose only visible purpose already succeeded or failed independent of
// this) still reports its own success, and the mangled alert is only
// noticed the next time someone actually needs the Telegram ping and it
// never arrives (or arrives unreadable) during a real CRIT/CI failure --
// exactly the moment the alert exists to cover.
//
// `disable_web_page_preview=true` is a distinct, independently droppable
// knob: without it, Telegram renders a large embedded preview card for the
// GitHub Actions run URL in the message, burying the actual failure text
// (branch/commit/reason) under GitHub's OG-image card in the chat -- still
// "delivered", but degraded exactly when a fast, scannable alert matters
// most.
//
// Mutation-verified before writing the fix, two independent regressions per
// file (ci.yml and tenant-config-reconcile.yml each tested), each restored
// before the next:
//   1. `--data-urlencode text="$TEXT"` -> `-d text="$TEXT"` (encoding
//      dropped, chat_id/disable_web_page_preview lines untouched) -- full
//      suite green.
//   2. `-d disable_web_page_preview=true` line deleted entirely (curl call
//      left with just chat_id + text) -- full suite green.
// All four mutations (2 regressions x 2 files) restored with `git diff
// --stat .github/workflows/` empty afterward.
//
// PURE SOURCE-READING of the workflow YAML -- no YAML lib, no runner -- same
// approach as every other guard in this lane. vitest runs with the platform
// package root as cwd, so the workflows live one level up.

const WORKFLOWS_DIR = join(process.cwd(), '..', '.github', 'workflows')
const CI_WORKFLOW = join(WORKFLOWS_DIR, 'ci.yml')
const RECONCILE_WORKFLOW = join(WORKFLOWS_DIR, 'tenant-config-reconcile.yml')

function yamlOf(path: string): string {
  return readFileSync(path, 'utf8')
}

// Isolate the Telegram alert step's body, from its `run: |` block up to the
// next step or the next top-level job key -- same "walk to the next `- name:`
// or job header" approach as reconcile-gate-exit-code-preservation.test.ts.
function telegramStepBlock(yaml: string, stepName: string, file: string): string {
  const re = new RegExp(
    `- name:\\s*${stepName}[\\s\\S]*?(?=\\n\\s*- name:|\\n\\S|\\n*$)`,
  )
  const m = yaml.match(re)
  expect(m, `could not locate the "${stepName}" step block in ${file}`).not.toBeNull()
  return m![0]
}

describe.each([
  ['ci.yml', CI_WORKFLOW, 'Telegram alert on CI failure'],
  ['tenant-config-reconcile.yml', RECONCILE_WORKFLOW, 'Telegram alert on reconcile failure'],
])('CI invariant — %s\'s Telegram alert body stays correctly encoded', (name, path, stepName) => {
  it(`${name} exists where the guard expects it`, () => {
    expect(existsSync(path), `no workflow at ${path}`).toBe(true)
  })

  it(`${name}'s "${stepName}" step still exists (the surface it protects is not deleted)`, () => {
    telegramStepBlock(yamlOf(path), stepName, name)
  })

  it(`${name} still URL-encodes the multi-line TEXT body via --data-urlencode (not a bare -d)`, () => {
    const block = telegramStepBlock(yamlOf(path), stepName, name)
    expect(
      /--data-urlencode text="\$TEXT"/.test(block),
      `${name}'s "${stepName}" step no longer sends TEXT via ` +
        '\`--data-urlencode text="$TEXT"\` -- curl would stop percent-encoding the ' +
        "multi-line alert body, corrupting or truncating it in Telegram's API on the " +
        'exact failure this alert exists to report, with no red anywhere ' +
        '(the curl call ends in `|| true`).',
    ).toBe(true)
  })

  it(`${name} still disables the link preview card (disable_web_page_preview=true)`, () => {
    const block = telegramStepBlock(yamlOf(path), stepName, name)
    expect(
      /-d disable_web_page_preview=true/.test(block),
      `${name}'s "${stepName}" step no longer sets ` +
        '\`disable_web_page_preview=true\` -- Telegram would render a large embedded ' +
        'preview card for the run URL, burying the actual failure text.',
    ).toBe(true)
  })
})

// A regex that matches EITHER file's exact text is only useful if the two
// files' Telegram alert bodies actually still share this shape -- pin that
// assumption directly so a future divergence (one file encoded, the other
// not) is itself a visible finding rather than a silent asymmetry.
describe('CI invariant — ci.yml and tenant-config-reconcile.yml stay consistent on Telegram body encoding', () => {
  it('both files use the identical --data-urlencode + disable_web_page_preview pair (no silent asymmetry)', () => {
    const ciBlock = telegramStepBlock(yamlOf(CI_WORKFLOW), 'Telegram alert on CI failure', 'ci.yml')
    const reconcileBlock = telegramStepBlock(
      yamlOf(RECONCILE_WORKFLOW),
      'Telegram alert on reconcile failure',
      'tenant-config-reconcile.yml',
    )
    const encodeRx = /--data-urlencode text="\$TEXT"/
    const previewRx = /-d disable_web_page_preview=true/
    expect(encodeRx.test(ciBlock)).toBe(true)
    expect(encodeRx.test(reconcileBlock)).toBe(true)
    expect(previewRx.test(ciBlock)).toBe(true)
    expect(previewRx.test(reconcileBlock)).toBe(true)
  })
})
