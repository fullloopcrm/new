'use client'

import { useState, useEffect, useCallback, createContext, useContext } from 'react'

type PortalAuth = {
  token: string
  client: { id: string; name: string }
  tenant: { id: string; name: string; primary_color: string; logo_url: string | null }
} | null

const STORAGE_KEY = 'portal_auth'

const PortalContext = createContext<{
  auth: PortalAuth
  setAuth: (a: PortalAuth) => void
}>({ auth: null, setAuth: () => {} })

export const usePortalAuth = () => useContext(PortalContext)

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const [auth, setAuthState] = useState<PortalAuth>(null)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setAuthState(JSON.parse(stored))
      }
    } catch {
      // ignore parse errors
    }
  }, [])

  // Wrapper that syncs to localStorage
  const setAuth = useCallback((a: PortalAuth) => {
    setAuthState(a)
    if (a) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(a))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  return (
    <PortalContext value={{ auth, setAuth }}>
      <div className="min-h-screen bg-gray-50">
        {auth && (
          <header
            className="px-4 py-3 flex items-center justify-between"
            style={{ backgroundColor: auth.tenant.primary_color || '#111' }}
          >
            <div className="flex items-center gap-3">
              {auth.tenant.logo_url && (
                <img src={auth.tenant.logo_url} alt="" className="h-8 w-8 rounded" />
              )}
              <span className="text-white font-bold text-sm">{auth.tenant.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white/70 text-xs">{auth.client.name}</span>
              <button onClick={() => setAuth(null)} className="text-white/50 text-xs hover:text-white">
                Logout
              </button>
            </div>
          </header>
        )}
        <main className="max-w-lg mx-auto px-4 py-6">
          {children}
        </main>
      </div>
    </PortalContext>
  )
}
