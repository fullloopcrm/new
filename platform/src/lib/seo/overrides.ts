// ---------------------------------------------------------------------------
// SIGNAL apply layer — per-URL title/meta overrides.
//
// Read side: generateMetadata calls getSeoOverride(url) and prefers the override
// over the template default. Write side: applyOverride() upserts a row (the
// "apply" step for a Tier-1 title/meta fix) — instant, reversible, no deploy.
// ---------------------------------------------------------------------------
import { supabaseAdmin } from '@/lib/supabase'

export type SeoOverride = { title?: string | null; description?: string | null }

/** Active override for a URL, or null. Called from generateMetadata (ISR-cached). */
export async function getSeoOverride(url: string): Promise<SeoOverride | null> {
  const { data } = await supabaseAdmin
    .from('seo_overrides')
    .select('title,description')
    .eq('url', url)
    .eq('active', true)
    .maybeSingle()
  if (!data) return null
  return { title: data.title as string | null, description: data.description as string | null }
}

/**
 * Apply a title/meta fix for a URL: upsert the override and mark the source
 * seo_changes rows applied. This IS the apply step for template pages — no git.
 */
export async function applyOverride(
  url: string,
  fields: { title?: string | null; description?: string | null },
  changeIds: string[] = [],
  appliedBy: 'admin' | 'autopilot' = 'admin',
): Promise<void> {
  await supabaseAdmin.from('seo_overrides').upsert(
    {
      url,
      title: fields.title ?? null,
      description: fields.description ?? null,
      active: true,
      source: 'signal',
      change_id: changeIds[0] ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'url' },
  )
  if (changeIds.length) {
    await supabaseAdmin
      .from('seo_changes')
      .update({ status: 'applied', applied_at: new Date().toISOString(), applied_by: appliedBy })
      .in('id', changeIds)
  }
}

/** Revert an applied override (rollback). */
export async function revertOverride(url: string): Promise<void> {
  await supabaseAdmin.from('seo_overrides').update({ active: false }).eq('url', url)
}
