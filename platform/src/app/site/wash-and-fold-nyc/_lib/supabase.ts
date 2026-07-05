import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Server-side admin client — bypasses RLS, use only in API routes
// Lazy-initialized to avoid crash during Next.js build when env var isn't available
// Falls back to anon key if service role key is missing (keeps site running)
let _supabaseAdmin: SupabaseClient | null = null

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_supabaseAdmin) {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/\s/g, '')
      if (!serviceKey) {
        console.warn('SUPABASE_SERVICE_ROLE_KEY not set — falling back to anon key')
      }
      _supabaseAdmin = createClient(supabaseUrl, serviceKey || supabaseKey)
    }
    return (_supabaseAdmin as any)[prop]
  }
})
