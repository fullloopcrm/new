'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import './finance.css'

// The finance PROCESS, left→right — one connected hub. Rendered at the top
// of every page in this hub (Overview + the 7 linked-out surfaces) so you
// can jump straight between tabs instead of hitting "← Finance" then
// picking a different tab — no back-button round trip required.
export const PROCESS: Array<{ letter: string; label: string; href: string }> = [
  { letter: 'A', label: 'Overview', href: '/dashboard/finance' },
  { letter: 'B', label: 'Transactions', href: '/dashboard/finance/transactions' },
  { letter: 'C', label: 'Expenses', href: '/dashboard/finance/receipts' },
  { letter: 'D', label: 'Ledger & Payroll', href: '/dashboard/books' },
  { letter: 'E', label: 'Reconcile', href: '/dashboard/finance/reconcile' },
  { letter: 'F', label: 'Reports', href: '/dashboard/finance/reports' },
  { letter: 'G', label: 'Close', href: '/dashboard/finance/close' },
  { letter: 'H', label: 'Accountant', href: '/dashboard/finance/cpa-access' },
]

// Assumes it's rendered inside a `.fin-scope` ancestor (every page in this
// hub already wraps its content in one) — doesn't add its own.
export default function FinanceTabs() {
  const pathname = usePathname()

  return (
    <div className="fin-tabs">
      {PROCESS.map((t) => {
        const isActive = t.href === '/dashboard/finance' ? pathname === '/dashboard/finance' : pathname?.startsWith(t.href)
        return isActive ? (
          <span key={t.label} className="fin-tab active">
            <span className="fin-tab-letter">{t.letter}</span>
            {t.label}
          </span>
        ) : (
          <Link key={t.label} href={t.href} className="fin-tab">
            <span className="fin-tab-letter">{t.letter}</span>
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}
