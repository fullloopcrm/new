import { createContext, useContext } from 'react'

// Split out of layout.tsx — Next.js layout files may only export a default
// component (and a few config values), so usePortalAuth can't live there.
export type Lang = 'en' | 'es'
export type PortalAuth = {
  token: string
  client: { id: string; name: string }
  tenant: { id: string; name: string; agent_name: string | null; primary_color: string; logo_url: string | null; payment_link: string | null }
} | null

export const PortalContext = createContext<{
  auth: PortalAuth
  setAuth: (a: PortalAuth) => void
  lang: Lang
  setLang: (l: Lang) => void
  t: (en: string, es: string) => string
}>({ auth: null, setAuth: () => {}, lang: 'en', setLang: () => {}, t: (en) => en })

export const usePortalAuth = () => useContext(PortalContext)
