import { createContext, useContext } from 'react'

// Split out of layout.tsx — Next.js layout files may only export a default
// component (and a few config values), so useTeamAuth can't live there.
export type Lang = 'en' | 'es'
export type AuthState = {
  token: string
  member: { id: string; name: string; language: string; pay_rate?: number | null; avatar_url?: string | null; role?: string | null }
  tenant: { id: string; name: string; phone?: string | null }
} | null

export const AuthContext = createContext<{
  auth: AuthState
  authLoaded: boolean
  setAuth: (a: AuthState) => void
  lang: Lang
  setLang: (l: Lang) => void
  t: (en: string, es: string) => string
}>({
  auth: null,
  authLoaded: false,
  setAuth: () => {},
  lang: 'en',
  setLang: () => {},
  t: (en) => en,
})

export const useTeamAuth = () => useContext(AuthContext)
