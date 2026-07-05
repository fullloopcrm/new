import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Public client (anon key) — for form submissions
export const supabase: SupabaseClient = url && anonKey
  ? createClient(url, anonKey)
  : (null as unknown as SupabaseClient);

// Admin client (service role key) — for admin panel reads, bypasses RLS
export const supabaseAdmin: SupabaseClient = url && serviceKey
  ? createClient(url, serviceKey)
  : (null as unknown as SupabaseClient);
