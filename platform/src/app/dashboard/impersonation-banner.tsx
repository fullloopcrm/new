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
    <div
      className="px-4 py-2 flex items-center justify-between"
      style={{ background: 'var(--color-loop-ink)', color: 'var(--color-loop-canvas)', fontFamily: 'var(--mono)', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase' }}
    >
      <span>Viewing as <strong style={{ fontFamily: 'var(--display)', fontStyle: 'italic', textTransform: 'none', fontSize: '13px' }}>{tenantName}</strong></span>
      <button
        onClick={exitImpersonation}
        disabled={exiting}
        className="px-3 py-1 disabled:opacity-50"
        style={{ background: 'var(--color-loop-canvas)', color: 'var(--color-loop-ink)', fontFamily: 'var(--mono)', fontSize: '10.5px', letterSpacing: '0.04em', borderRadius: '3px' }}
      >
        {exiting ? 'Exiting...' : '← Exit to Admin'}
      </button>
    </div>
  )
}
