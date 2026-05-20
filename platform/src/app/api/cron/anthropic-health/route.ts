import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { protectCronAPI } from '@/lib/nycmaid/auth'
import { notifyOwnerOnTelegram } from '@/lib/telegram'

export const maxDuration = 30

// Periodic ping to the Anthropic API. Catches credit-low / auth / rate-limit
// failures BEFORE the next live customer message hits Yinez and gets silently
// dropped. Platform-wide (the API key is shared across tenants), so alerts go
// to the platform owner via Telegram rather than per-tenant admins.
export async function GET(request: Request) {
  const authError = protectCronAPI(request)
  if (authError) return authError

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'ping' }],
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const isCreditError = /credit balance is too low/i.test(msg)
    const isAuthError = /invalid x-api-key|authentication/i.test(msg)
    const isRateLimit = /rate.?limit|429/i.test(msg)

    if (isCreditError || isAuthError || isRateLimit) {
      const title = isCreditError
        ? 'URGENT: Yinez OUT OF CREDITS — Anthropic API'
        : isAuthError
          ? 'URGENT: Yinez Anthropic API auth failing'
          : 'WARN: Yinez Anthropic rate limited'
      const body = isCreditError
        ? 'Yinez is silent across every tenant. Top up at console.anthropic.com.'
        : `Anthropic error: ${msg.slice(0, 300)}`
      await notifyOwnerOnTelegram(`${title}\n\n${body}`).catch(() => {})
    }

    return NextResponse.json(
      { ok: false, error: msg.slice(0, 500) },
      { status: 500 },
    )
  }
}
