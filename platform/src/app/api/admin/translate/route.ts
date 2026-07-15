/**
 * Quick translation via Claude. Defaults to Spanish (matches nycmaid's bilingual
 * team flow); body can override `target` to translate to another language.
 */
import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { anthropicFromStoredKey } from '@/lib/anthropic-client'
import { rateLimitDb } from '@/lib/rate-limit-db'

const MAX_TEXT_LENGTH = 5000

export async function POST(request: Request) {
  try {
    const { tenantId, tenant } = await getTenantForRequest()
    const { text, target = 'Spanish' } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json({ error: `Text is too long (max ${MAX_TEXT_LENGTH} characters)` }, { status: 400 })
    }
    if (!tenant.anthropic_api_key && !process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
    }

    // Any authenticated tenant member can trigger this paid Anthropic call with
    // no cost control; cap per-tenant volume so a scripted caller can't run up
    // unbounded API spend against the tenant's stored key.
    const rl = await rateLimitDb(`admin-translate:${tenantId}`, 30, 10 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many translation requests. Try again shortly.' }, { status: 429 })
    }

    const client = anthropicFromStoredKey(tenant.anthropic_api_key)
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `Translate the following text to ${target}. Keep the same formatting, line breaks, numbering, and structure. Use direct, professional language appropriate for a service business. Only return the translation, nothing else.\n\n${text}`,
      }],
    })

    const block = message.content[0]
    const translation = block?.type === 'text' ? block.text : ''
    return NextResponse.json({ translation })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    const e = err as { message?: string }
    console.error('Translation error:', e.message || err)
    return NextResponse.json({ error: e.message || 'Translation failed' }, { status: 500 })
  }
}
