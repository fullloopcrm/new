import { anthropicFromStoredKey } from '@/lib/anthropic-client'

// Loop Connect auto-translation. Every message is translated into BOTH
// languages at send time so each side always renders in its own language
// regardless of which one the sender actually typed in: admin dashboard
// shows body_en, the team-portal Connect view shows body_es. Reuses the
// same Claude call pattern as the existing manual /api/admin/translate.
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
    })
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
