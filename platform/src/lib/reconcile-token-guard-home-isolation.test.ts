import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard (W3 lane: CI wiring under .github/workflows). New
// fresh-ground surface, item (217).
//
// tenant-config-reconcile.yml's "Verify token-guard skips clean without a
// secret" step forces `SUPABASE_ACCESS_TOKEN_FULLLOOP: ''` AND resets `HOME`
// to a fresh `mktemp -d` directory before invoking
// scripts/reconcile-tenant-config.mjs — the step's own comment states why:
// "so the ~/.env.local fallback cannot find one either". reconcile-tenant-
// config.mjs's `loadToken()` cascades env var -> `~/.env.local` -> null (see
// its own unit coverage in reconcile-tenant-config.test.ts, "loadToken —
// local dev fallback"). Forcing the env var empty only exercises the FIRST
// half of that cascade; without also resetting HOME, this verification step
// would fall through to whatever `~/.env.local` happens to exist at the real
// runner HOME (normally absent on a fresh GitHub-hosted runner, but not
// something this step's own correctness should depend on).
//
// reconcile-gate-wiring.test.ts's "still verifies the token-guard clean-skip
// contract" check only pins the asserted marker string (`skipping (exit 0)`)
// -- which appears in the step's own `grep -q` command regardless of whether
// HOME is actually reset. Grepping every guard test file in this lane for
// `mktemp` or `HOME=` turned up nothing. This is the same "close the
// currently-inert other half" shape as items (210)/(216): not a live exploit
// today (GitHub-hosted runners don't ship a `~/.env.local`), but a plausible
// "this line looks redundant, drop it" cleanup edit would silently make the
// verification step's own correctness depend on host state again, with
// nothing catching the regression.
//
// Mutation-verified before writing the fix: deleted the
// `export HOME="$(mktemp -d)"` line from the step's run script (leaving the
// forced-empty `SUPABASE_ACCESS_TOKEN_FULLLOOP: ''` env override untouched)
// -- the full 479-file / 2394-test vitest suite stayed 100% green. Restore
// left `git diff --stat .github/workflows/` empty afterward.
//
// PURE SOURCE-READING of the workflow YAML -- no YAML lib, no runner -- same
// approach as every other guard in this lane. vitest runs with the platform
// package root as cwd, so the workflows live one level up.

const WORKFLOWS_DIR = join(process.cwd(), '..', '.github', 'workflows')
const RECONCILE_WORKFLOW = join(WORKFLOWS_DIR, 'tenant-config-reconcile.yml')

function reconcileYaml(): string {
  return readFileSync(RECONCILE_WORKFLOW, 'utf8')
}

function verifyStepBlock(yaml: string): string | null {
  const m = yaml.match(
    /- name:\s*Verify token-guard skips clean without a secret[\s\S]*?(?=\n\s*- name:|\n\s*notify-failure:|\n*$)/,
  )
  return m ? m[0] : null
}

describe('CI invariant — reconcile token-guard verification step isolates HOME from the real runner', () => {
  it('the reconcile workflow exists where the guard expects it', () => {
    expect(existsSync(RECONCILE_WORKFLOW), `no reconcile workflow at ${RECONCILE_WORKFLOW}`).toBe(true)
  })

  it('the "Verify token-guard skips clean" step still exists (the surface it protects is not deleted)', () => {
    expect(
      verifyStepBlock(reconcileYaml()),
      'tenant-config-reconcile.yml no longer has a "Verify token-guard skips clean without a secret" step',
    ).not.toBeNull()
  })

  it('the step still forces an empty SUPABASE_ACCESS_TOKEN_FULLLOOP', () => {
    const block = verifyStepBlock(reconcileYaml())
    expect(block).not.toBeNull()
    expect(
      /SUPABASE_ACCESS_TOKEN_FULLLOOP:\s*''/.test(block!),
      'the token-guard verification step no longer forces SUPABASE_ACCESS_TOKEN_FULLLOOP to an empty ' +
        'string — the clean-skip contract can no longer be reliably exercised.',
    ).toBe(true)
  })

  it('the step still resets HOME to a fresh mktemp directory before invoking the script', () => {
    const block = verifyStepBlock(reconcileYaml())
    expect(block).not.toBeNull()
    expect(
      /export\s+HOME="\$\(mktemp -d\)"/.test(block!),
      'the token-guard verification step no longer resets HOME via `export HOME="$(mktemp -d)"` — ' +
        'the clean-skip assertion now depends on whether the real runner HOME happens to contain a ' +
        '~/.env.local, instead of being isolated from host state.',
    ).toBe(true)
  })

  it('HOME is reset BEFORE the script invocation, not after (ordering matters — env must be set before the fallback path is exercised)', () => {
    const block = verifyStepBlock(reconcileYaml())
    expect(block).not.toBeNull()
    const homeLine = block!.search(/export\s+HOME="\$\(mktemp -d\)"/)
    const invokeLine = block!.search(/node scripts\/reconcile-tenant-config\.mjs/)
    expect(homeLine, 'could not find the HOME reset line in the step block').toBeGreaterThan(-1)
    expect(invokeLine, 'could not find the script invocation in the step block').toBeGreaterThan(-1)
    expect(
      homeLine < invokeLine,
      'the HOME reset no longer runs before the script invocation — a HOME reset that happens ' +
        'after the script has already read process.env would not isolate anything.',
    ).toBe(true)
  })
})
