import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * PostgREST .or() injection regression [fix fef4642].
 *
 * User-supplied search terms were interpolated raw into supabase `.or()` filter
 * strings, where `, ( ) " \` are structural. sanitizePostgrestValue() strips
 * those, and the fix wired it into 10 routes. postgrest-safe.test.ts already
 * proves the sanitizer neutralizes payloads; the gap this file closes is that
 * each ROUTE actually calls it — a route reverting to `${raw}` passes every
 * existing test but is exploitable again.
 *
 * Part A drives the 6 routes whose `.or()` is reachable from the exported
 * handler against a capturing DB fake and asserts the injection metacharacters
 * `"` and `\` (which never occur in any legitimate template here) never reach
 * the filter string. Part B is a source-invariant sweep over all 10 routes
 * (incl. the 4 whose `.or()` sits behind an Anthropic tool-loop / deep finance
 * preconditions) proving every `.or()` interpolation is sanitize-sourced.
 */

// A payload packed with every structural metacharacter, plus a marker that
// survives sanitization so we can confirm the value still flows through.
const PAYLOAD = 'PWN",(evil)x\\z'

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  tenant: { id: 'tenant-A', industry: 'cleaning', plan: 'pro' } as Record<string, unknown>,
  orCalls: [] as string[],
}))

function makeClient() {
  const chain: Record<string, unknown> = {}
  const passthrough = () => chain
  Object.assign(chain, {
    from: passthrough,
    select: passthrough,
    eq: passthrough,
    neq: passthrough,
    gt: passthrough,
    gte: passthrough,
    lt: passthrough,
    lte: passthrough,
    is: passthrough,
    in: passthrough,
    not: passthrough,
    order: passthrough,
    range: passthrough,
    limit: passthrough,
    contains: passthrough,
    or: (filter: string) => {
      h.orCalls.push(filter)
      return chain
    },
    single: () => Promise.resolve({ data: null, count: 0, error: null }),
    maybeSingle: () => Promise.resolve({ data: null, count: 0, error: null }),
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve({ data: [], count: 0, error: null }).then(resolve, reject),
  })
  return chain
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeClient(), supabase: makeClient() }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: h.tenantId, tenant: h.tenant }),
  AuthError: class AuthError extends Error {
    status = 401
  },
}))
vi.mock('@/lib/tenant', () => ({ getCurrentTenantId: async () => h.tenantId }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: async () => null }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: h.tenantId }, error: null }),
}))
// Imported by the clients route but unused on the GET path — stub so module load can't throw.
vi.mock('@/lib/validate', () => ({ validate: () => ({}) }))
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))
vi.mock('@/lib/settings', () => ({ getSettings: async () => ({}) }))

import { GET as clientsGET } from '@/app/api/clients/route'
import { GET as adminClientsGET } from '@/app/api/admin/clients/route'
import { GET as activityGET } from '@/app/api/admin/activity/route'
import { GET as recipientsGET } from '@/app/api/admin/comhub/search-recipients/route'
import { GET as templatesGET } from '@/app/api/admin/comhub/templates/route'
import { GET as announcementsGET } from '@/app/api/announcements/unread/route'

// The handlers only touch request.nextUrl / request.url, so a light fake suffices.
const req = (qs: string) => {
  const url = `http://x/api/test?${qs}`
  return { nextUrl: new URL(url), url } as unknown as import('next/server').NextRequest
}

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.tenant = { id: 'tenant-A', industry: 'cleaning', plan: 'pro' }
  h.orCalls = []
})

type RouteCase = { name: string; run: () => Promise<unknown> }

const behavioralRoutes: RouteCase[] = [
  { name: 'api/clients (search box)', run: () => clientsGET(req(`search=${encodeURIComponent(PAYLOAD)}`)) },
  { name: 'api/admin/clients (search box)', run: () => adminClientsGET(req(`search=${encodeURIComponent(PAYLOAD)}`)) },
  { name: 'api/admin/activity (audit q)', run: () => activityGET(req(`q=${encodeURIComponent(PAYLOAD)}`)) },
  { name: 'api/admin/comhub/search-recipients (recipient q)', run: () => recipientsGET(req(`q=${encodeURIComponent(PAYLOAD)}`)) },
  { name: 'api/admin/comhub/templates (channel)', run: () => templatesGET(req(`channel=${encodeURIComponent(PAYLOAD)}`)) },
  {
    name: 'api/announcements/unread (tenant targeting)',
    run: () => {
      // Here the injected value is the tenant's own targeting fields, not a query param.
      h.tenant = { id: PAYLOAD, industry: PAYLOAD, plan: PAYLOAD }
      return announcementsGET()
    },
  },
]

describe('.or() injection is neutralized in each route (mocked DB)', () => {
  for (const rc of behavioralRoutes) {
    it(`neutralizes injection in ${rc.name}`, async () => {
      await rc.run()
      expect(h.orCalls.length, 'route must build at least one .or() filter').toBeGreaterThan(0)
      for (const filter of h.orCalls) {
        // `"` and `\` are impossible in any legitimate template here — their
        // presence proves raw user input reached the filter string.
        expect(filter, filter).not.toContain('"')
        expect(filter, filter).not.toContain('\\')
        // The injected paren fragment must not survive intact either.
        expect(filter, filter).not.toContain('(evil)')
        // ...but the value did flow through (search still works, not dropped).
        expect(filter, filter).toContain('PWN')
      }
    })
  }

  it('positive control: a legitimate email search term passes through unmodified', async () => {
    h.orCalls = []
    await clientsGET(req(`search=${encodeURIComponent('john.doe@example.com')}`))
    expect(h.orCalls.length).toBeGreaterThan(0)
    expect(h.orCalls[0]).toContain('john.doe@example.com')
  })
})

/**
 * Part B — source invariant across ALL 10 routes.
 *
 * Guarantees every `${...}` inside every `.or()` template literal is sourced
 * from sanitizePostgrestValue() — either inline, or via a variable assigned
 * from it in the same file. Catches the 4 routes Part A can't cheaply drive.
 */
const ALL_TEN_ROUTES = [
  'src/app/api/clients/route.ts',
  'src/app/api/admin/clients/route.ts',
  'src/app/api/admin/activity/route.ts',
  'src/app/api/admin/comhub/search-recipients/route.ts',
  'src/app/api/admin/comhub/templates/route.ts',
  'src/app/api/admin/ai-chat/route.ts',
  'src/app/api/ai/assistant/route.ts',
  'src/app/api/announcements/unread/route.ts',
  'src/app/api/finance/bank-transactions/[id]/match/route.ts',
  'src/app/api/cron/recurring-expenses/route.ts',
]

// Identifiers assigned from an expression containing sanitizePostgrestValue(...)
// e.g. `const s = sanitizePostgrestValue(x)`, `const ql = \`%${sanitizePostgrestValue(q)}%\``
function sanitizedIdentifiers(src: string): Set<string> {
  const set = new Set<string>()
  const re = /\b(\w+)\s*=\s*[^;\n]*sanitizePostgrestValue\s*\(/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) set.add(m[1])
  return set
}

function orTemplateLiterals(src: string): string[] {
  const out: string[] = []
  const re = /\.or\(\s*`([^`]*)`/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) out.push(m[1])
  return out
}

function interpolationExprs(tpl: string): string[] {
  const out: string[] = []
  const re = /\$\{([^}]*)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(tpl))) out.push(m[1].trim())
  return out
}

describe('source invariant: every .or() interpolation is sanitize-sourced (all 10 routes)', () => {
  for (const rel of ALL_TEN_ROUTES) {
    it(rel, () => {
      const src = readFileSync(path.resolve(process.cwd(), rel), 'utf8')
      expect(src, 'route must import the sanitizer').toContain('sanitizePostgrestValue')

      const sanitized = sanitizedIdentifiers(src)
      const templates = orTemplateLiterals(src)
      const interpolated = templates.filter((t) => interpolationExprs(t).length > 0)
      expect(interpolated.length, 'route must have at least one interpolated .or()').toBeGreaterThan(0)

      for (const tpl of templates) {
        for (const expr of interpolationExprs(tpl)) {
          const inline = expr.includes('sanitizePostgrestValue(')
          const base = expr.match(/^(\w+)/)?.[1]
          const viaVar = base != null && sanitized.has(base)
          expect(
            inline || viaVar,
            `unsanitized .or() interpolation \`\${${expr}}\` in ${rel}`,
          ).toBe(true)
        }
      }
    })
  }
})
