'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function ImpersonationBanner({ tenantName }: { tenantName: string }) {
  const router = useRouter()
  const [exiting, setExiting] = useState(false)

  async function exitImpersonation() {
    setExiting(true)
    await fetch('/api/admin/impersonate', { method: 'DELETE' })
    router.push('/admin')
  }

  return (
    <div className="bg-yellow-400 text-yellow-900 px-4 py-2 flex items-center justify-between text-sm font-medium">
      <span>Viewing as <strong>{tenantName}</strong></span>
      <button
        onClick={exitImpersonation}
        disabled={exiting}
        className="bg-yellow-900 text-yellow-100 px-3 py-1 rounded text-xs font-medium hover:bg-yellow-800 disabled:opacity-50"
      >
        {exiting ? 'Exiting...' : 'Exit to Admin'}
      </button>
    </div>
  )
}
