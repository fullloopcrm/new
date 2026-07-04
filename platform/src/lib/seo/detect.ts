// ---------------------------------------------------------------------------
// SIGNAL detection — thin wrapper over the DB-side detection function.
//
// The classification logic lives in Postgres (seo_run_detection, see migration
// 2026_07_04_seo_detection_fn.sql) so it runs set-based in ~1s instead of
// paging 200k+ rows through the app layer (which timed out). It reads the
// materialized seo_page_rollup — refreshed by the ingest cron — and rewrites
// the open issue queue: value-ranked (demand x commercial intent), with the
// winner freeze (any page ranking <= 5 for any query is excluded).
// ---------------------------------------------------------------------------
import { supabaseAdmin } from '@/lib/supabase'

export async function detectAllProperties(): Promise<{ issues: number }> {
  const { data, error } = await supabaseAdmin.rpc('seo_run_detection')
  if (error) throw new Error(error.message)
  return { issues: typeof data === 'number' ? data : 0 }
}
