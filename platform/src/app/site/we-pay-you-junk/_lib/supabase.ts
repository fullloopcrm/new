import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Public anon client — used client-side only to push booking-form photos/videos
// straight to Supabase Storage via a short-lived signed upload URL. Bytes never
// pass through the Vercel function, so its 4.5 MB request-body cap never applies.
const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase: SupabaseClient = publicUrl && anonKey
  ? createClient(publicUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : (null as unknown as SupabaseClient);

let serverClient: SupabaseClient | null = null;

export function getSupabaseServer(): SupabaseClient | null {
  if (serverClient) return serverClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) return null;

  serverClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return serverClient;
}
