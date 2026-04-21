/**
 * Natural-language finance Q&A. Loads precomputed snapshot + asks
 * Claude to answer. Not a full agent loop — just one-shot on stats.
 */
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { entityIdFromUrl } from '@/lib/entity'
import { decryptSecret } from '@/lib/secret-crypto'
import { buildTrialBalance } from '@/lib/finance-export'

export async function POST(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const url = new URL(request.url)
    const entityId = entityIdFromUrl(url)
    const body = await request.json()
    const question = String(body.question || '').slice(0, 500)
    if (!question) return NextResponse.json({ error: 'question required' }, { status: 400 })

    const now = new Date()
    const yearStart = `${now.getUTCFullYear()}-01-01`
    const today = now.toISOString().slice(0, 10)

    const [tb, { data: tenant }] = await Promise.all([
      buildTrialBalance(tenantId, entityId, today),
      supabaseAdmin.from('tenants').select('name, industry, anthropic_api_key').eq('id', tenantId).single(),
    ])

    const tbSummary = tb.slice(0, 50).map(r => {
      const balCents = r.debits - r.credits
      return `${r.coa_code} ${r.coa_name} (${r.coa_type}): debits $${(r.debits/100).toFixed(0)}, credits $${(r.credits/100).toFixed(0)}, balance $${(balCents/100).toFixed(0)}`
    }).join('\n')

    const apiKey = tenant?.anthropic_api_key ? decryptSecret(tenant.anthropic_api_key as string) : null
    const client = apiKey ? new Anthropic({ apiKey }) : new Anthropic()

    const resp = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `You are a finance assistant for ${tenant?.name || 'this business'} (${tenant?.industry || 'home services'}).

Year-to-date (${yearStart} through ${today}) trial balance:
${tbSummary}

Question: ${question}

Answer concisely. Use dollar amounts. If the data isn't sufficient, say so and suggest which report to check.`,
      }],
    })

    const answer = resp.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
      .map(b => b.text).join('').trim()

    return NextResponse.json({ answer, context: { trial_balance_rows: tb.length, period: `${yearStart} → ${today}` } })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/finance/ai-ask', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
