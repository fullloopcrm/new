import { anthropicFromStoredKey } from '@/lib/anthropic-client'

// Loop Connect auto-translation. Every message is translated into BOTH
// languages at send time so each side always renders in its own language
// regardless of which one the sender actually typed in: admin dashboard
// shows body_en, the team-portal Connect view shows body_es. Reuses the
// same Claude call pattern as the existing manual /api/admin/translate.
// The Anthropic SDK's default per-request timeout is 10 minutes (confirmed
// via node_modules/@anthropic-ai/sdk/client.js: DEFAULT_TIMEOUT = 600000).
// None of this function's 7 real callers (Loop Connect send routes) set an
// explicit `maxDuration`, so they run under Vercel's platform-level function
// timeout, which is far shorter. The try/catch fail-open below only protects
// against the awaited call throwing or returning something unparseable — it
// does NOT protect against the call simply being slow: a platform-level
// function timeout kills the whole request (including the message send
// itself) before this catch block ever runs, which would defeat the entire
// "translation failure must never block a send" design goal. Bounding this
// specific call well under any realistic platform timeout makes a slow
// Anthropic response fail fast into the existing fail-open path instead
// (verified 2026-07-31, ai-04 re-check: SDK default timeout + all 7 real
// call sites' maxDuration confirmed absent via direct code read).
const TRANSLATE_TIMEOUT_MS = 8000

export async function translateToEnEs(
  text: string,
  anthropicApiKey?: string | null,
): Promise<{ en: string; es: string }> {
  try {
    const client = anthropicFromStoredKey(anthropicApiKey || undefined)
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You will receive one chat message written in either English or Spanish. Return ONLY a JSON object with exactly two keys, "en" and "es" — the message in English and in Spanish. Whichever language the input is already in, that key must be the original text unchanged (do not paraphrase it); translate to produce the other key. Keep the same tone and formatting. Message:\n\n${text}`,
      }],
    }, { timeout: TRANSLATE_TIMEOUT_MS })
    const block = message.content[0]
    const raw = block?.type === 'text' ? block.text : ''
    const match = raw.match(/\{[\s\S]*\}/)
    const parsed = match ? JSON.parse(match[0]) : null
    if (parsed?.en && parsed?.es) return { en: String(parsed.en), es: String(parsed.es) }
  } catch (err) {
    console.error('[connect-translate] failed:', err)
  }
  // Fail-open: a translation outage must never block a message send — both
  // sides just see the original text until translation is available again.
  return { en: text, es: text }
}
