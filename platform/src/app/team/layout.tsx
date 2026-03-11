'use client'

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Lang = 'en' | 'es'
type AuthState = {
  token: string
  member: { id: string; name: string; language: string; pay_rate?: number | null; avatar_url?: string | null }
  tenant: { id: string; name: string; phone?: string | null }
} | null

const AUTH_KEY = 'team_auth'
const LANG_KEY = 'team_lang'

const AuthContext = createContext<{
  auth: AuthState
  setAuth: (a: AuthState) => void
  lang: Lang
  setLang: (l: Lang) => void
  t: (en: string, es: string) => string
}>({
  auth: null,
  setAuth: () => {},
  lang: 'en',
  setLang: () => {},
  t: (en) => en,
})

export const useTeamAuth = () => useContext(AuthContext)

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  const [auth, setAuthState] = useState<AuthState>(null)
  const [lang, setLangState] = useState<Lang>('en')
  const [unreadCount, setUnreadCount] = useState(0)
  const pathname = usePathname()

  useEffect(() => {
    try {
      const storedAuth = localStorage.getItem(AUTH_KEY)
      if (storedAuth) setAuthState(JSON.parse(storedAuth))
    } catch { /* ignore */ }
    try {
      const storedLang = localStorage.getItem(LANG_KEY)
      if (storedLang === 'en' || storedLang === 'es') setLangState(storedLang)
    } catch { /* ignore */ }
  }, [])

  // Poll notification count
  useEffect(() => {
    if (!auth) return
    function fetchCount() {
      fetch('/api/team-portal/notifications', { headers: { Authorization: `Bearer ${auth!.token}` } })
        .then((r) => r.json())
        .then((data) => {
          const notifs = data.notifications || []
          setUnreadCount(notifs.filter((n: { read: boolean }) => !n.read).length)
        })
        .catch(() => {})
    }
    fetchCount()
    const interval = setInterval(fetchCount, 60000)
    return () => clearInterval(interval)
  }, [auth])

  const setAuth = useCallback((a: AuthState) => {
    setAuthState(a)
    if (a) localStorage.setItem(AUTH_KEY, JSON.stringify(a))
    else localStorage.removeItem(AUTH_KEY)
  }, [])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    localStorage.setItem(LANG_KEY, l)
  }, [])

  const t = (en: string, es: string) => (lang === 'es' ? es : en)

  const navItems = [
    { href: '/team', icon: '◻', label: t('Jobs', 'Trabajos') },
    { href: '/team/earnings', icon: '$', label: t('Earnings', 'Ganancias') },
    { href: '/team/availability', icon: '◈', label: t('Schedule', 'Horario') },
    { href: '/team/jobs', icon: '!', label: t('Open', 'Abierto') },
  ]

  return (
    <AuthContext value={{ auth, setAuth, lang, setLang, t }}>
      <div className="min-h-screen bg-gray-50">
        {auth && (
          <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
            <div className="max-w-lg mx-auto flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-slate-800 truncate">{auth.tenant.name}</p>
                <p className="text-xs text-slate-400 truncate">{auth.member.name}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
                  className="text-xs bg-gray-100 px-2 py-1 rounded font-medium text-slate-500"
                >
                  {lang === 'en' ? 'ES' : 'EN'}
                </button>
                <Link href="/team/rules" className="text-xs bg-gray-100 px-2 py-1 rounded font-medium text-slate-500">
                  {t('Rules', 'Reglas')}
                </Link>
                <Link href="/team/notifications" className="relative p-1">
                  <span className="text-lg">🔔</span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold px-1 py-0.5 rounded-full min-w-[16px] text-center leading-none">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
                <button onClick={() => setAuth(null)} className="text-xs text-red-500 font-medium">
                  {t('Logout', 'Salir')}
                </button>
              </div>
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
                      isActive ? 'text-green-600 font-semibold' : 'text-slate-400'
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
    </AuthContext>
  )
}
