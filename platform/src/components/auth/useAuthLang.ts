'use client'

import { useCallback, useEffect, useState } from 'react'

export type Lang = 'en' | 'es'

const LANG_KEY = 'fl_auth_lang'

/**
 * Shared EN/ES preference for every pre-auth login screen (Team, Client,
 * Sales, Referral). One storage key across all four -- a visitor who picks
 * Spanish on one portal's login almost certainly wants it on the others too.
 * Post-login, each portal's own layout (e.g. team/layout.tsx) keeps its own
 * richer lang state for the authenticated app; this only covers the login
 * screen itself, which previously had no visible way to switch language at
 * all before signing in.
 */
export function useAuthLang() {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LANG_KEY)
      if (stored === 'en' || stored === 'es') setLangState(stored)
    } catch { /* ignore */ }
  }, [])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try { localStorage.setItem(LANG_KEY, l) } catch { /* ignore */ }
  }, [])

  const t = useCallback((en: string, es: string) => (lang === 'es' ? es : en), [lang])

  return { lang, setLang, t }
}
