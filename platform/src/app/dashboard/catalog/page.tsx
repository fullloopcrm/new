import Link from 'next/link'
import CatalogTab from '../sales/CatalogTab'
import '../sales/sales.css'

// Master Catalog — its own page under Sales in the main menu. Every service,
// project, and product the business sells lives here; proposal creation picks
// its line items from this list.
export default function CatalogPage() {
  return (
    <div className="sl-scope">
      <Link href="/dashboard/sales" className="text-xs text-slate-500 hover:underline">← Sales</Link>
      <CatalogTab />
    </div>
  )
}
