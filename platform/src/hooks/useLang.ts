'use client'

import { useState, useEffect, useCallback } from 'react'

export type Lang = 'en' | 'es'

const LANG_KEY = 'loopcam_lang'

export function useLang() {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    const stored = window.localStorage.getItem(LANG_KEY)
    if (stored === 'en' || stored === 'es') setLangState(stored)
  }, [])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    window.localStorage.setItem(LANG_KEY, l)
  }, [])

  const t = useCallback((en: string, es: string) => (lang === 'es' ? es : en), [lang])

  return { lang, setLang, t }
}
