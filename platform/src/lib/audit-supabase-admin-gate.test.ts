import { describe, it, expect, afterEach } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

// Exercises the real CI script (scripts/audit-supabase-admin-gate.mjs)
// against a throwaway fixture tree, via the AUDIT_ROOT/AUDIT_BASELINE_FILE
// env overrides it supports for exactly this purpose.
const PLATFORM_ROOT = path.resolve(__dirname, '../..')
const SCRIPT = path.join(PLATFORM_ROOT, 'scripts/audit-supabase-admin-gate.mjs')

function runGuard(auditRoot: string, baselineFile: string) {
  return spawnSync('node', [SCRIPT], {
    cwd: PLATFORM_ROOT,
    env: { ...process.env, AUDIT_ROOT: auditRoot, AUDIT_BASELINE_FILE: baselineFile },
    encoding: 'utf8',
  })
}

function writeRoute(dir: string, relPath: string, contents: string) {
  const full = path.join(dir, relPath)
  mkdirSync(path.dirname(full), { recursive: true })
  writeFileSync(full, contents)
}

describe('audit-supabase-admin-gate guard', () => {
  let fixtureDir: string

  afterEach(() => {
    if (fixtureDir) rmSync(fixtureDir, { recursive: true, force: true })
  })

  it('fails when a route calls supabaseAdmin with no tenant/permission gate', () => {
    fixtureDir = mkdtempSync(path.join(tmpdir(), 'supabase-admin-gate-'))
    writeRoute(
      fixtureDir,
      'src/app/api/leaky/route.ts',
      `import { supabaseAdmin } from '@/lib/supabase'\n\nexport async function GET() {\n  return supabaseAdmin.from('clients').select('*')\n}\n`
    )
    const baselineFile = path.join(fixtureDir, 'baseline.json')

    const result = runGuard(fixtureDir, baselineFile)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('leaky/route.ts')
    expect(result.stderr).toContain('supabaseAdmin')
  })

  it('passes when the route goes through requirePermission()', () => {
    fixtureDir = mkdtempSync(path.join(tmpdir(), 'supabase-admin-gate-'))
    writeRoute(
      fixtureDir,
      'src/app/api/safe/route.ts',
      `import { supabaseAdmin } from '@/lib/supabase'\nimport { requirePermission } from '@/lib/require-permission'\n\nexport async function GET() {\n  const { tenant, error } = await requirePermission('clients:read')\n  if (error) return error\n  return supabaseAdmin.from('clients').select('*').eq('tenant_id', tenant.tenantId)\n}\n`
    )
    const baselineFile = path.join(fixtureDir, 'baseline.json')

    const result = runGuard(fixtureDir, baselineFile)

    expect(result.status).toBe(0)
  })

  it('passes when the route has a documented supabase-admin-ok escape hatch', () => {
    fixtureDir = mkdtempSync(path.join(tmpdir(), 'supabase-admin-gate-'))
    writeRoute(
      fixtureDir,
      'src/app/api/bootstrap/route.ts',
      `import { supabaseAdmin } from '@/lib/supabase'\n\n// supabase-admin-ok: auth bootstrap endpoint, no session exists yet to gate on\nexport async function POST() {\n  return supabaseAdmin.from('tenants').select('*')\n}\n`
    )
    const baselineFile = path.join(fixtureDir, 'baseline.json')

    const result = runGuard(fixtureDir, baselineFile)

    expect(result.status).toBe(0)
  })

  it('passes when the violation is already accepted in the baseline file', () => {
    fixtureDir = mkdtempSync(path.join(tmpdir(), 'supabase-admin-gate-'))
    writeRoute(
      fixtureDir,
      'src/app/api/legacy/route.ts',
      `import { supabaseAdmin } from '@/lib/supabase'\n\nexport async function GET() {\n  return supabaseAdmin.from('clients').select('*')\n}\n`
    )
    const baselineFile = path.join(fixtureDir, 'baseline.json')
    writeFileSync(baselineFile, JSON.stringify([path.join(fixtureDir, 'src/app/api/legacy/route.ts')]))

    const result = runGuard(fixtureDir, baselineFile)

    expect(result.status).toBe(0)
  })
})
