import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// Regression guard for the W3 XSS sweep: every JSON-LD sink must serialize via
// safeJsonLd() (which escapes `<` -> `<`), NOT a bare JSON.stringify().
// A bare JSON.stringify() inside dangerouslySetInnerHTML lets a `</script>`
// sequence in any string value break out of the <script> element — the JSON-LD
// XSS vector. This test fails if anyone reintroduces that pattern anywhere under
// src, keeping the whole tree latent-XSS-proof for future user/tenant-sourced schema.
// vitest runs with the platform package root as cwd.
const SRC_ROOT = join(process.cwd(), 'src')
const UNSAFE_SINK = /__html:\s*JSON\.stringify\(/

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next') continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...walk(full))
    } else if (/\.(tsx?|jsx?)$/.test(entry) && !/\.test\.(tsx?|jsx?)$/.test(entry)) {
      out.push(full)
    }
  }
  return out
}

describe('JSON-LD sink guard', () => {
  it('has no bare `__html: JSON.stringify(` sinks under src', () => {
    const offenders = walk(SRC_ROOT)
      .filter((f) => UNSAFE_SINK.test(readFileSync(f, 'utf8')))
      .map((f) => relative(SRC_ROOT, f))
    expect(offenders).toEqual([])
  })
})
