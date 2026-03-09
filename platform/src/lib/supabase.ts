import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'

// Public client — used for client-side queries (respects RLS)
export const supabase = createClient(url, anonKey)

// Admin client — used for server-side operations (bypasses RLS)
export const supabaseAdmin = createClient(url, serviceKey)
