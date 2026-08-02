import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'

// ComHub inbound auto-translation. Uses MyMemory (api.mymemory.translated.net)
// — a free, no-API-key translation service — as the primary path (zero cost
// per translation). MyMemory's free daily quota (5,000 words/day anonymous)
// exhausts mid-day under real volume — confirmed 2026-07-31 (a 1,414-message
// backfill blew through it) and again 2026-08-01 (later-in-the-day messages
// silently stopped translating while earlier ones worked). The `de=` email
// param below raises that to 50,000 words/day, and a Claude Haiku fallback
// covers whatever MyMemory still misses, so translation no longer silently
// degrades as the day goes on.
const LANGUAGE_NAMES: Record<string, string> = {
  es: 'Spanish', fr: 'French', pt: 'Portuguese', de: 'German', it: 'Italian',
  zh: 'Chinese', 'zh-cn': 'Chinese', ru: 'Russian', ar: 'Arabic', ko: 'Korean',
  ja: 'Japanese', vi: 'Vietnamese', ht: 'Haitian Creole', pl: 'Polish',
  tl: 'Tagalog', bn: 'Bengali', ur: 'Urdu', hi: 'Hindi', el: 'Greek',
}

// Registering *some* email with MyMemory (doesn't need to be verified) lifts
// the anonymous 5,000 words/day cap to 50,000/day per their published limits.
const MYMEMORY_EMAIL = process.env.MYMEMORY_EMAIL || process.env.SUPPORT_EMAIL || ''

async function translateViaMyMemory(
  text: string,
): Promise<{ language: string | null; translated: string | null }> {
  try {
    const deParam = MYMEMORY_EMAIL ? `&de=${encodeURIComponent(MYMEMORY_EMAIL)}` : ''
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect%7Cen${deParam}`
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
    // backfill exhausted the day's quota outright). Treated as "unknown", not
    // "already English" — this is what triggers the Haiku fallback below.
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
    console.error('[comhub-translate] MyMemory failed:', err)
  }
  return { language: null, translated: null }
}

// Fallback for whatever MyMemory can't handle (quota exhausted, timeout,
// network error) — a cheap Haiku call against the platform Anthropic key.
// Only invoked when MyMemory comes back with no verdict at all (language
// null), never for its confident "this is already English" result, so this
// never runs on the common case.
async function translateViaHaiku(text: string): Promise<{ language: string | null; translated: string | null }> {
  try {
    const client = new Anthropic()
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: 'You detect language and translate to English. Reply with ONLY a JSON object: {"language":"<English name of source language, or \\"en\\" if already English>","translated":"<English translation, or null if already English>"}. No markdown, no commentary.',
      messages: [{ role: 'user', content: text }],
    })
    const block = msg.content[0]
    const raw = block?.type === 'text' ? block.text.trim() : ''
    const parsed = JSON.parse(raw) as { language?: string; translated?: string | null }
    if (!parsed.translated || parsed.language === 'en') return { language: 'en', translated: null }
    return { language: parsed.language || null, translated: parsed.translated }
  } catch (err) {
    console.error('[comhub-translate] Haiku fallback failed:', err)
    return { language: null, translated: null }
  }
}

async function detectAndTranslateToEnglish(
  text: string,
): Promise<{ language: string | null; translated: string | null }> {
  const primary = await translateViaMyMemory(text)
  if (primary.language !== null) return primary
  return translateViaHaiku(text)
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
