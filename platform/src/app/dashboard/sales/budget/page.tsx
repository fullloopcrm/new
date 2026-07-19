import Link from 'next/link'
import BudgetTab from '../BudgetTab'
import '../sales.css'

// Master Budget — its own page under Sales in the main menu. Per-proposal
// labor/materials/other budget + target margin, set at proposal time and
// compared against manually-logged actuals once work starts.
export default function BudgetPage() {
  return (
    <div className="sl-scope">
      <Link href="/dashboard/sales" className="text-xs text-slate-500 hover:underline">← Sales</Link>
      <BudgetTab />
    </div>
  )
}
