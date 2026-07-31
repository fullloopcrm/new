import { supabaseAdmin } from '@/lib/supabase'

// ComHub inbound auto-translation. Uses MyMemory (api.mymemory.translated.net)
// — a free, no-API-key translation service — instead of a metered LLM call.
// Zero cost per translation, no Anthropic key required. Auto-detects the
// source language via MyMemory's `autodetect` langpair option.
const LANGUAGE_NAMES: Record<string, string> = {
  es: 'Spanish', fr: 'French', pt: 'Portuguese', de: 'German', it: 'Italian',
  zh: 'Chinese', 'zh-cn': 'Chinese', ru: 'Russian', ar: 'Arabic', ko: 'Korean',
  ja: 'Japanese', vi: 'Vietnamese', ht: 'Haitian Creole', pl: 'Polish',
  tl: 'Tagalog', bn: 'Bengali', ur: 'Urdu', hi: 'Hindi', el: 'Greek',
}

async function detectAndTranslateToEnglish(
  text: string,
): Promise<{ language: string | null; translated: string | null }> {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect%7Cen`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return { language: null, translated: null }
    const json = await res.json() as {
      responseStatus?: number | string
      responseData?: { translatedText?: string; detectedLanguage?: string }
    }
    const status = Number(json.responseStatus)
    // MyMemory errors with "PLEASE SELECT TWO DISTINCT LANGUAGES" (403) when
    // autodetect resolves to English — that IS the "already English" signal,
    // not a failure.
    if (status && status !== 200) return { language: 'en', translated: null }

    const detected = json.responseData?.detectedLanguage?.toLowerCase() || null
    const translated = json.responseData?.translatedText || null
    // MyMemory's free tier has a daily quota — once exhausted it returns
    // HTTP 200 with a "MYMEMORY WARNING: YOU USED ALL AVAILABLE..." string
    // in place of a real translation, not an error status. Caught here
    // explicitly rather than relying on `!detected` happening to also be
    // true in that response shape (found 2026-07-31: a 1,414-message
    // backfill exhausted the day's quota outright).
    if (translated?.toUpperCase().includes('MYMEMORY WARNING')) return { language: null, translated: null }
    if (!detected || detected === 'en') return { language: 'en', translated: null }
    // Short/ambiguous text (names, single words, a lone digit) makes
    // MyMemory's auto-detect unreliable — it'll confidently call "Melanie"
    // Portuguese or "5" Latvian. If the "translation" comes back identical
    // to the original, there's nothing worth showing regardless of what
    // language got detected. Found via a 2026-07-31 backfill: 6 of 9
    // "translations" were this exact false-positive pattern.
    if (translated && translated.trim().toLowerCase() === text.trim().toLowerCase()) {
      return { language: 'en', translated: null }
    }
    return { language: LANGUAGE_NAMES[detected] || detected, translated }
  } catch (err) {
    console.error('[comhub-translate] failed:', err)
  }
  // Fail-open: a translation outage must never block message logging — the
  // row just keeps showing the original text with no translation beneath it.
  return { language: null, translated: null }
}

/**
 * Fire-and-forget: detects the language of an already-saved inbound
 * comhub_messages row and, if it isn't English, stores an English
 * translation on the same row. Never awaited by callers — logging the
 * inbound message must never wait on the translation call.
 */
export function translateInboundComhubMessage(messageId: string, body: string): void {
  if (!body?.trim()) return
  void (async () => {
    const { language, translated } = await detectAndTranslateToEnglish(body)
    if (!translated) return
    await supabaseAdmin
      .from('comhub_messages')
      .update({ detected_language: language, translated_body: translated })
      .eq('id', messageId)
  })().catch((err) => console.error('[comhub-translate] background update failed:', err))
}
