// Stub: scaffold-only. Re-export the shared admin client.
import { supabaseAdmin } from '@/lib/supabase'
export { supabaseAdmin as supabaseServer }
export function getSupabaseAdmin() { return supabaseAdmin }
