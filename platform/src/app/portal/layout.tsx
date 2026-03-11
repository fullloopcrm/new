'use client'

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Lang = 'en' | 'es'
type PortalAuth = {
  token: string
  client: { id: string; name: string }
  tenant: { id: string; name: string; primary_color: string; logo_url: string | null }
} | null

const STORAGE_KEY = 'portal_auth'
const LANG_KEY = 'portal_lang'

const PortalContext = createContext<{
  auth: PortalAuth
  setAuth: (a: PortalAuth) => void
  lang: Lang
  setLang: (l: Lang) => void
  t: (en: string, es: string) => string
}>({ auth: null, setAuth: () => {}, lang: 'en', setLang: () => {}, t: (en) => en })

export const usePortalAuth = () => useContext(PortalContext)

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const [auth, setAuthState] = useState<PortalAuth>(null)
  const [lang, setLangState] = useState<Lang>('en')
  const pathname = usePathname()

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setAuthState(JSON.parse(stored))
    } catch { /* ignore */ }
    try {
      const storedLang = localStorage.getItem(LANG_KEY)
      if (storedLang === 'en' || storedLang === 'es') setLangState(storedLang)
    } catch { /* ignore */ }
  }, [])

  const setAuth = useCallback((a: PortalAuth) => {
    setAuthState(a)
    if (a) localStorage.setItem(STORAGE_KEY, JSON.stringify(a))
    else localStorage.removeItem(STORAGE_KEY)
  }, [])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    localStorage.setItem(LANG_KEY, l)
  }, [])

  const t = (en: string, es: string) => (lang === 'es' ? es : en)

  const navItems = [
    { href: '/portal', icon: '◻', label: t('Home', 'Inicio') },
    { href: '/portal/book', icon: '+', label: t('Book', 'Reservar') },
    { href: '/portal/feedback', icon: '★', label: t('Feedback', 'Opinión') },
  ]

  return (
    <PortalContext value={{ auth, setAuth, lang, setLang, t }}>
      <div className="min-h-screen bg-gray-50">
        {auth && (
          <header
            className="px-4 py-3 flex items-center justify-between sticky top-0 z-10"
            style={{ backgroundColor: auth.tenant.primary_color || '#111' }}
          >
            <div className="flex items-center gap-3">
              {auth.tenant.logo_url && (
                <img src={auth.tenant.logo_url} alt="" className="h-8 w-8 rounded" />
              )}
              <span className="text-white font-bold text-sm">{auth.tenant.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
                className="text-xs bg-white/20 px-2 py-1 rounded font-medium text-white"
              >
                {lang === 'en' ? 'ES' : 'EN'}
              </button>
              <span className="text-white/70 text-xs">{auth.client.name}</span>
              <button onClick={() => setAuth(null)} className="text-white/50 text-xs hover:text-white">
                {t('Logout', 'Salir')}
              </button>
            </div>
          </header>
        )}
        <main className="max-w-lg mx-auto px-4 py-6">
          {children}
        </main>
        {auth && (
          <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-10">
            <div className="max-w-lg mx-auto flex justify-around">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex flex-col items-center text-xs py-1 ${
                      isActive ? 'text-slate-800 font-semibold' : 'text-slate-400'
                    }`}
                  >
                    <span className="text-lg mb-0.5">{item.icon}</span>
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </nav>
        )}
      </div>
    </PortalContext>
  )
}
