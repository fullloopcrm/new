import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Guard: NO production API route contains a DEBUG-TIER `console.*` call.
 *
 * Why this test exists: `console.log`/`console.debug`/`console.trace` and friends
 * are debugging leftovers, not logging. In a serverless API route they (a) ship
 * whatever was being debugged — often request bodies, tokens, or PII — straight to
 * the platform log stream, and (b) signal that a debug session was never cleaned
 * up. The house rule (typescript/coding-style.md) is "no console.log in production
 * code." This scan turns that rule into a red CI signal the moment a new debug
 * statement lands in any `src/app/api/**\/route.ts`.
 *
 * SCOPE — what is BANNED (debug tier):
 *   log, debug, trace, dir, dirxml, table, count, countReset,
 *   time, timeLog, timeEnd, group, groupCollapsed, groupEnd, profile, profileEnd
 *
 * SCOPE — what is ALLOWED (leveled server-side logging, legitimate on the server):
 *   console.error, console.warn, console.info
 *   Vercel captures stderr/stdout; error/warn/info are how routes surface real
 *   operational conditions. Banning the ~374 `console.error` calls would be noise,
 *   not signal — this guard deliberately does NOT touch them.
 *
 * SCOPE — deliberate NON-goals (honest limits):
 *   • Static, string/comment-aware scan over DIRECT `console.<method>(` calls. A
 *     call routed through an aliased binding (`const c = console; c.log(...)`) would
 *     slip past. No such indirection exists today.
 *   • It scans API routes only (`src/app/api`), the untrusted request surface —
 *     not lib/ or components. That is where a debug leak reaches a caller's data.
 *
 * ALLOWLIST: exactly one pre-existing, reviewed operational `console.log` is
 * allowed (see ALLOWED below). It is NOT a debug leftover — it logs deploy-hook
 * re-alias results on an internal, token-gated operational endpoint. The allowlist
 * is asserted non-stale: if that line is removed, the "no stale allowlist" test
 * goes red so the entry gets cleaned up too.
 */

const API_DIR = path.join(process.cwd(), 'src', 'app', 'api')

/** Debug-tier console methods that must not appear in an API route. */
const BANNED_METHODS: readonly string[] = [
  'log', 'debug', 'trace', 'dir', 'dirxml', 'table',
  'count', 'countReset', 'time', 'timeLog', 'timeEnd',
  'group', 'groupCollapsed', 'groupEnd', 'profile', 'profileEnd',
]

/** Leveled loggers that are intentionally NOT flagged (allowed on the server). */
const ALLOWED_METHODS: readonly string[] = ['error', 'warn', 'info']

/**
 * Reviewed, accepted exceptions. An offender is allowed iff its file + method match
 * AND the original source line contains `contains`. Keeping `contains` specific to
 * the exact call means a *different* console.log added to the same file is still
 * caught — the allowlist authorizes one line, not the whole file.
 */
interface AllowEntry {
  readonly file: string // repo-relative to process.cwd() (platform/)
  readonly method: string
  readonly contains: string
  readonly why: string
}
const ALLOWED: readonly AllowEntry[] = [
  {
    file: 'src/app/api/internal/deploy-hook/route.ts',
    method: 'log',
    contains: 're-aliased',
    why: 'Operational log of domain re-alias results on an internal token-gated deploy hook; not a debug leftover, not on a request-data path.',
  },
]

const BANNED_RE = new RegExp(String.raw`\bconsole\s*\.\s*(${BANNED_METHODS.join('|')})\s*\(`, 'g')

/**
 * Replace the contents of string literals and comments with spaces, preserving
 * length and newlines (so match offsets → line numbers stay accurate). This keeps
 * a `console.log` that lives inside a string or a comment from counting as a call.
 */
function blankStringsAndComments(src: string): string {
  const out = src.split('')
  type Mode = 'code' | 'sq' | 'dq' | 'tpl' | 'line' | 'block'
  let mode: Mode = 'code'
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    const n = src[i + 1]
    switch (mode) {
      case 'code':
        if (c === "'") { mode = 'sq' }
        else if (c === '"') { mode = 'dq' }
        else if (c === '`') { mode = 'tpl' }
        else if (c === '/' && n === '/') { mode = 'line'; out[i] = ' ' }
        else if (c === '/' && n === '*') { mode = 'block'; out[i] = ' ' }
        break
      case 'sq': if (c === '\\') { i++ } else if (c === "'") { mode = 'code' } else if (c !== '\n') out[i] = ' '; break
      case 'dq': if (c === '\\') { i++ } else if (c === '"') { mode = 'code' } else if (c !== '\n') out[i] = ' '; break
      case 'tpl': if (c === '\\') { i++ } else if (c === '`') { mode = 'code' } else if (c !== '\n') out[i] = ' '; break
      case 'line': if (c === '\n') { mode = 'code' } else out[i] = ' '; break
      case 'block': if (c === '*' && n === '/') { mode = 'code'; out[i] = ' '; out[i + 1] = ' '; i++ } else if (c !== '\n') out[i] = ' '; break
    }
  }
  return out.join('')
}

interface Offender {
  readonly file: string // repo-relative
  readonly method: string
  readonly line: number
  readonly text: string
}

/** All debug-tier console calls in one source, comment/string-aware, with line info. */
function findConsoleOffenders(relFile: string, src: string): Offender[] {
  const cleaned = blankStringsAndComments(src)
  const lines = src.split('\n')
  const offenders: Offender[] = []
  BANNED_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = BANNED_RE.exec(cleaned)) !== null) {
    const lineIdx = cleaned.slice(0, m.index).split('\n').length - 1
    offenders.push({
      file: relFile,
      method: m[1],
      line: lineIdx + 1,
      text: (lines[lineIdx] ?? '').trim(),
    })
  }
  return offenders
}

function isAllowed(o: Offender): boolean {
  return ALLOWED.some((a) => a.file === o.file && a.method === o.method && o.text.includes(a.contains))
}

function walkRouteFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walkRouteFiles(full))
    else if (entry.name === 'route.ts' || entry.name === 'route.tsx') out.push(full)
  }
  return out
}

describe('console-leak guard — no debug-tier console.* in API routes', () => {
  const files = fs.existsSync(API_DIR) ? walkRouteFiles(API_DIR) : []
  const allOffenders = files.flatMap((file) =>
    findConsoleOffenders(path.relative(process.cwd(), file), fs.readFileSync(file, 'utf8')),
  )

  it('actually found the API route files to scan (guards against a vacuous pass)', () => {
    expect(fs.existsSync(API_DIR), `expected API dir at ${API_DIR}`).toBe(true)
    expect(files.length).toBeGreaterThan(100)
  })

  it('scanner sanity: flags debug-tier calls, ignores leveled loggers', () => {
    const planted = [
      'console.log("hi")',
      'console.debug(x)',
      'console.trace()',
      'console . table (rows)',
    ].join('\n')
    const flagged = findConsoleOffenders('planted.ts', planted).map((o) => o.method)
    expect(flagged.sort()).toEqual(['debug', 'log', 'table', 'trace'])

    const leveled = 'console.error(e)\nconsole.warn(w)\nconsole.info(i)'
    expect(findConsoleOffenders('leveled.ts', leveled)).toEqual([])
  })

  it('scanner sanity: does NOT flag console.log inside a comment or a string', () => {
    const src = [
      '// console.log("commented out")',
      '/* console.debug(block) */',
      'const s = "console.log(fake)"',
      'const t = `console.trace(${x})`',
    ].join('\n')
    expect(findConsoleOffenders('quoted.ts', src)).toEqual([])
  })

  it('allowlist is not stale: every ALLOWED entry still matches a real occurrence', () => {
    for (const entry of ALLOWED) {
      const matches = allOffenders.filter(
        (o) => o.file === entry.file && o.method === entry.method && o.text.includes(entry.contains),
      )
      expect(
        matches.length,
        `stale allowlist entry (no longer present — remove it): ${entry.file} console.${entry.method} ~ "${entry.contains}"`,
      ).toBeGreaterThanOrEqual(1)
    }
  })

  it('no API route contains a non-allowlisted debug-tier console.* call', () => {
    const violations = allOffenders
      .filter((o) => !isAllowed(o))
      .map((o) => `${o.file}:${o.line} — console.${o.method}  ⟶  ${o.text}`)
    expect(
      violations,
      `Debug-tier console.* is banned in API routes (allowed: ${ALLOWED_METHODS.join('/')}). ` +
        `Remove these or use a leveled logger:\n${violations.join('\n')}`,
    ).toEqual([])
  })
})
