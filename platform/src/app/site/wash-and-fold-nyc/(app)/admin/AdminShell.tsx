// @ts-nocheck
'use client'
import { useState, useEffect } from 'react'
import AdminSidebar from '@/app/site/wash-and-fold-nyc/_components/AdminSidebar'
import AiAssistant from '@/app/site/wash-and-fold-nyc/_components/AiAssistant'

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    checkAuth()
    const handler = () => checkAuth()
    window.addEventListener('admin-auth-change', handler)
    return () => window.removeEventListener('admin-auth-change', handler)
  }, [])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/notifications?limit=1')
      setAuthed(res.ok)
    } catch {
      setAuthed(false)
    }
  }

  if (authed === null) {
    return <div className="min-h-screen bg-white">{children}</div>
  }

  if (!authed) {
    return <div className="min-h-screen bg-white">{children}</div>
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto bg-white pt-14 md:pt-0 pb-20">
        {children}
      </main>
      <AiAssistant />
    </div>
  )
}
