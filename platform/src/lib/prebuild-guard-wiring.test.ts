import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI/build invariant guard — package.json's npm `prebuild` lifecycle script
// (W3 lane: reconcile gate + CI wiring, PR9).
//
// verify-protected-tenants.mjs's own header comment states: "It runs
// automatically as the npm `prebuild` step (see package.json), so `next
// build` — and therefore every Vercel deploy — will not proceed while a
// protected tenant is broken." That is the ORIGINAL defense line for the
// 2026-07-08 outage class, and the only one that fires on every Vercel
// deploy directly (not just on a GitHub Actions PR/push run) — npm
// automatically runs a `pre<script>` script immediately before `<script>`,
// so `npm run build` (Vercel's default zero-config build invocation for a
// Next.js project, confirmed via the absence of a `buildCommand` override in
// vercel.json) runs `prebuild` before `next build` with no wiring beyond the
// script's name.
//
// ci.yml's OWN copy of this same guard (added later, because ci.yml never
// calls `next build` and so never triggered the npm lifecycle hook) is
// already pinned by protected-tenant-guard-wiring.test.ts. But that test
// only reads ci.yml — nothing in this suite reads package.json itself, so a
// PR that renames/removes the `prebuild` script (e.g. during a build-tooling
// or npm-scripts cleanup) would go completely undetected: tsc, the full
// vitest suite, the tenant-isolation guard, ci.yml's own protected-tenant
// step (which reads ci.yml, not package.json, and is unaffected by a
// package.json edit), and eslint would all stay green, while every Vercel
// deploy silently stopped running the guard that exists specifically to stop
// a protected tenant's site from silently disappearing. This test CODIFIES
// that wiring so a de-wiring edit fails CI instead of relying on a reviewer
// noticing a diff to package.json's scripts block — same approach as
// protected-tenant-guard-wiring.test.ts / reconcile-gate-wiring.test.ts.
//
// PURE SOURCE-READING of package.json (JSON.parse, no runtime execution).
// vitest runs with the platform package root as cwd, so package.json is
// right here.

const PACKAGE_JSON = join(process.cwd(), 'package.json')

function scripts(): Record<string, string> {
  const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8'))
  return pkg.scripts || {}
}

describe('CI/build invariant — package.json prebuild wiring is intact', () => {
  it('package.json exists where the guard expects it', () => {
    expect(existsSync(PACKAGE_JSON), `no package.json at ${PACKAGE_JSON}`).toBe(true)
  })

  it('still defines a "build" script (required for npm to auto-run "prebuild" at all)', () => {
    // npm only runs a `pre<name>` lifecycle script automatically when `<name>`
    // itself is a defined script that gets invoked (`npm run build`). If
    // "build" were renamed or removed, "prebuild" would never fire even if
    // its own definition were untouched.
    expect(
      typeof scripts().build,
      '"build" is no longer a defined npm script — npm would never auto-run ' +
        '"prebuild" (and therefore never run the protected-tenant guard) even ' +
        'if "prebuild" itself is still defined correctly.',
    ).toBe('string')
  })

  it('still runs the protected-tenant guard as "prebuild" (the guard that gates every Vercel deploy)', () => {
    expect(
      scripts().prebuild,
      '"prebuild" no longer runs `node scripts/verify-protected-tenants.mjs` ' +
        '— the ORIGINAL 2026-07-08-outage-class backstop (the one that fires ' +
        'on every Vercel deploy via the npm lifecycle hook, independent of ' +
        'ci.yml) is gone or was changed. ci.yml\'s own copy of this guard ' +
        '(see protected-tenant-guard-wiring.test.ts) still runs on PRs, but a ' +
        'deploy that reaches `next build` without going through that exact ' +
        'ci.yml job would silently skip the guard entirely.',
    ).toBe('node scripts/verify-protected-tenants.mjs')
  })
})
