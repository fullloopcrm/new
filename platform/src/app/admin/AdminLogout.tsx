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
      className="block w-full text-left px-5 py-2.5 text-[15px] font-heading font-semibold text-white/50 hover:text-white hover:bg-white/10 transition-colors"
    >
      Logout
    </button>
  )
}
