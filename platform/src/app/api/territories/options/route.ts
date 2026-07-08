/**
 * PUBLIC territory options for the lead form (and, later, the public map).
 * Status-only, NO tenant PII — safe to expose unauthenticated.
 */
import { NextResponse } from 'next/server'
import { getCategories, getTerritories } from '@/lib/territories/data'

export const revalidate = 3600

export async function GET() {
  const [categories, territories] = await Promise.all([getCategories(), getTerritories()])
  return NextResponse.json({
    categories: categories.map((c) => ({ id: c.id, name: c.name })),
    territories: territories.map((t) => ({
      id: t.id,
      name: t.name,
      state: t.state_abbr,
      kind: t.kind,
    })),
  })
}
