/**
 * Per-tenant Deepgram client resolution — mirrors anthropic-client.ts exactly:
 * the tenant's own key if they've set one, otherwise the platform-billed key
 * from DEEPGRAM_API_KEY.
 */
import { DeepgramClient } from '@deepgram/sdk'
import { supabaseAdmin } from './supabase'
import { decryptSecret } from './secret-crypto'

export async function resolveDeepgramKey(tenantId: string): Promise<string | null> {
  if (!tenantId) return null
  const { data } = await supabaseAdmin.from('tenants').select('deepgram_api_key').eq('id', tenantId).single()
  const stored = data?.deepgram_api_key as string | null | undefined
  return stored ? decryptSecret(stored) : null
}

export async function resolveDeepgram(tenantId: string): Promise<DeepgramClient> {
  const apiKey = await resolveDeepgramKey(tenantId)
  // Unlike @anthropic-ai/sdk, @deepgram/sdk does NOT auto-read an API-key env
  // var for a zero-arg client (confirmed against the SDK source — it only
  // auto-reads DEEPGRAM_ACCESS_TOKEN, a different auth mode). The platform-key
  // fallback must pass DEEPGRAM_API_KEY explicitly or auth silently has nothing.
  return new DeepgramClient({ apiKey: apiKey || process.env.DEEPGRAM_API_KEY })
}
