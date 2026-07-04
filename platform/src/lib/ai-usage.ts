/**
 * Per-tenant Anthropic usage logging + cost estimation.
 *
 * Best-effort: logging must NEVER throw into an AI response path. Instrumented
 * at the high-volume brains (selena-legacy, selena/agent); low-volume dashboard
 * routes are intentionally not logged.
 *
 * Attribution of "platform vs own key" spend is derived in the admin view from
 * the tenant's current anthropic_api_key, not stored per row.
 */
import { supabaseAdmin } from './supabase'

interface AnthropicUsageLike {
  input_tokens?: number
  output_tokens?: number
}

export async function logAnthropicUsage(params: {
  tenantId: string
  model: string
  channel?: string | null
  usage: AnthropicUsageLike | null | undefined
}): Promise<void> {
  try {
    const { tenantId, model, channel, usage } = params
    if (!tenantId || !usage) return
    await supabaseAdmin.from('ai_usage').insert({
      tenant_id: tenantId,
      model,
      channel: channel ?? null,
      input_tokens: usage.input_tokens ?? 0,
      output_tokens: usage.output_tokens ?? 0,
    })
  } catch (e) {
    console.error('[ai-usage] log failed (non-fatal):', e)
  }
}

// Approximate Sonnet-tier list pricing (USD per million tokens). This is an
// ESTIMATE for internal visibility — authoritative billing lives on the
// Anthropic account. Update if the model/pricing changes.
export const AI_RATES_PER_MTOK = { input: 3, output: 15 } as const

export function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1_000_000) * AI_RATES_PER_MTOK.input
       + (outputTokens / 1_000_000) * AI_RATES_PER_MTOK.output
}
