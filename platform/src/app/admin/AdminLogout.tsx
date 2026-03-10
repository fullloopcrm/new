'use client'

import { useRouter } from 'next/navigation'

export default function AdminLogout() {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/admin-auth/logout', { method: 'POST' })
    router.push('/admin-login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-red-900/30 hover:text-red-400 transition-all duration-150"
    >
      <span className="opacity-60">⏻</span>
      <span className="font-medium">Logout</span>
    </button>
  )
}
