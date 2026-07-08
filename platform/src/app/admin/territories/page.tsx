/**
 * Admin › Territories — interactive USA map of the one-tenant-per-category-
 * per-territory exclusivity grid. Auth is enforced by the admin layout.
 */
import {
  getCategories,
  getTerritories,
  getCountyToTerritory,
  getTenantPins,
  getTenantsLite,
} from '@/lib/territories/data'
import TerritoryClient from './TerritoryClient'

export const dynamic = 'force-dynamic'

export default async function TerritoriesPage() {
  const [categories, territories, countyToTerritory, pins, tenants] = await Promise.all([
    getCategories(),
    getTerritories(),
    getCountyToTerritory(),
    getTenantPins(),
    getTenantsLite(),
  ])

  return (
    <div>
      <h1 className="text-xl font-semibold text-zinc-100 mb-1">Territories</h1>
      <p className="text-sm text-zinc-500 mb-4">
        {territories.length} territories · {categories.length} categories · one tenant per
        category per territory
      </p>
      <TerritoryClient
        categories={categories}
        territories={territories}
        countyToTerritory={countyToTerritory}
        pins={pins}
        tenants={tenants}
      />
    </div>
  )
}
