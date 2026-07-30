/**
 * First-pass AI content suggestions, drafted once at activation so a new
 * tenant's site isn't generic on day one. Deliberately a SUGGESTION, not an
 * auto-applied change — writes to tenant_notes (author: 'selena-ai') for a
 * human to review and apply, same as any other internal note. Never
 * overwrites tagline/business_description directly; an AI-rewritten brand
 * voice without review is a worse failure mode than a generic default.
 */
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from './supabase'

let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic()
  return _client
}

export async function draftInitialSiteContent(tenantId: string): Promise<void> {
  const [{ data: tenant }, { data: services }] = await Promise.all([
    supabaseAdmin.from('tenants').select('name, industry, tagline, selena_config').eq('id', tenantId).single(),
    supabaseAdmin.from('service_types').select('name').eq('tenant_id', tenantId).eq('active', true).limit(10),
  ])
  if (!tenant) return

  const selena = (tenant.selena_config as Record<string, unknown>) || {}
  if (selena.business_description) return // already has real content, nothing to suggest

  const serviceList = (services || []).map((s) => s.name).join(', ') || tenant.industry || 'general services'

  try {
    const resp = await getClient().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `Business name: ${tenant.name}\nIndustry: ${tenant.industry || 'unknown'}\nServices: ${serviceList}\nCurrent tagline: ${tenant.tagline || '(none)'}\n\nSuggest, in this exact format:\nTAGLINE: <one line, under 60 chars>\nDESCRIPTION: <2-3 sentences for the homepage, plain, no marketing fluff>`,
      }],
    })
    const text = resp.content.find((b) => b.type === 'text')?.text || ''
    if (!text.trim()) return

    await supabaseAdmin.from('tenant_notes').insert({
      tenant_id: tenantId,
      author: 'selena-ai',
      body: `Suggested first-pass site content (review before applying):\n\n${text.trim()}`,
    })
  } catch (e) {
    console.error('draftInitialSiteContent failed', e)
  }
}
