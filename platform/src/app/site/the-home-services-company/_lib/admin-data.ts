// @ts-nocheck
import { getSupabaseServer } from "./supabase";

export interface Lead {
  id: string;
  created_at: string;
  type: "booking" | "contact" | "job-application" | "partnership";
  name: string | null;
  phone: string | null;
  email: string | null;
  zip: string | null;
  city: string | null;
  state: string | null;
  when_needed: string | null;
  details: string | null;
  has_license: string | null;
  can_lift: string | null;
  availability: string | null;
  about: string | null;
  source: string | null;
  business_name: string | null;
  trade: string | null;
  service: string | null;
  admin_notes: string | null;
  status: "new" | "contacted" | "quoted" | "booked" | "completed" | "lost";
  updated_at: string | null;
}

export async function fetchLeadsByType(type: Lead["type"] | Lead["type"][], limit = 200): Promise<Lead[]> {
  const client = getSupabaseServer();
  if (!client) return [];
  const types = Array.isArray(type) ? type : [type];
  const { data, error } = await client
    .from("leads")
    .select("*")
    .in("type", types)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[admin] fetchLeadsByType", error);
    return [];
  }
  return (data || []) as Lead[];
}

export async function fetchLeadCounts(): Promise<Record<Lead["type"], number>> {
  const counts: Record<Lead["type"], number> = {
    booking: 0,
    contact: 0,
    "job-application": 0,
    partnership: 0,
  };
  const client = getSupabaseServer();
  if (!client) return counts;
  const { data, error } = await client.from("leads").select("type");
  if (error || !data) return counts;
  for (const row of data) {
    const t = row.type as Lead["type"];
    if (t in counts) counts[t] += 1;
  }
  return counts;
}

export async function updateLeadStatus(id: string, status: Lead["status"]): Promise<boolean> {
  const client = getSupabaseServer();
  if (!client) return false;
  const { error } = await client.from("leads").update({ status }).eq("id", id);
  return !error;
}

export async function updateLeadNotes(id: string, notes: string): Promise<boolean> {
  const client = getSupabaseServer();
  if (!client) return false;
  const { error } = await client.from("leads").update({ admin_notes: notes }).eq("id", id);
  return !error;
}
