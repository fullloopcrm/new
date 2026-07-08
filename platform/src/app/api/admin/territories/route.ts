/**
 * Admin territory map API.
 *   GET                      -> base data (categories, territories, county->territory, tenant pins)
 *   GET ?category=<id>       -> active claims for that category (recolor without refetching base)
 *   POST {action, ...}       -> claim | release a (territory, category)
 * Auth: super-admin only.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import {
  getCategories,
  getTerritories,
  getCountyToTerritory,
  getClaimsForCategory,
  getTenantPins,
  getTenantsLite,
  searchTerritories,
  claimTerritory,
  releaseTerritory,
} from '@/lib/territories/data'

export async function GET(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const searchQ = req.nextUrl.searchParams.get('q')
  if (searchQ !== null) {
    const results = await searchTerritories(searchQ)
    return NextResponse.json({ results })
  }

  const categoryId = req.nextUrl.searchParams.get('category')

  if (categoryId) {
    const claims = await getClaimsForCategory(categoryId)
    return NextResponse.json({ claims })
  }

  const [categories, territories, countyToTerritory, pins, tenants] = await Promise.all([
    getCategories(),
    getTerritories(),
    getCountyToTerritory(),
    getTenantPins(),
    getTenantsLite(),
  ])
  return NextResponse.json({ categories, territories, countyToTerritory, pins, tenants })
}

export async function POST(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  let body: {
    action?: string
    territoryId?: string
    categoryId?: string
    tenantId?: string | null
    status?: 'pending' | 'claimed'
    notes?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action, territoryId, categoryId } = body
  if (!territoryId || !categoryId) {
    return NextResponse.json({ error: 'territoryId and categoryId are required' }, { status: 400 })
  }

  if (action === 'release') {
    const res = await releaseTerritory(territoryId, categoryId)
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'claim') {
    const res = await claimTerritory({
      territoryId,
      categoryId,
      tenantId: body.tenantId ?? null,
      status: body.status ?? 'claimed',
      notes: body.notes ?? null,
    })
    if (!res.ok) {
      return NextResponse.json({ error: res.error }, { status: res.conflict ? 409 : 500 })
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
