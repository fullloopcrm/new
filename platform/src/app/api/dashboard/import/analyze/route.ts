/**
 * Smart-import brain. Given the columns + a few sample rows from ANY uploaded
 * table (CSV/TSV/pasted/JSON — format handling lives client-side), the tenant's
 * own Claude proposes a column→field mapping AND per-field cleaning transforms.
 * The tenant confirms before anything is written — the AI guesses, it never
 * blind-imports onto a live business.
 */
import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { resolveAnthropic } from '@/lib/anthropic-client'

// Target schemas per import kind. Keep in sync with the import APIs.
const SCHEMAS: Record<string, { field: string; desc: string }[]> = {
  clients: [
    { field: 'name', desc: 'full customer name (combine first+last if separate)' },
    { field: 'phone', desc: 'phone number' },
    { field: 'email', desc: 'email address' },
    { field: 'address', desc: 'full street address (combine parts if separate)' },
    { field: 'source', desc: 'lead source / how they found the business' },
    { field: 'notes', desc: 'freeform notes' },
    { field: 'status', desc: 'active/lead/at_risk/churned/inactive' },
  ],
  schedules: [
    { field: 'client_name', desc: 'customer name for this appointment' },
    { field: 'client_phone', desc: 'customer phone (best match key)' },
    { field: 'start', desc: 'appointment date/time for one-time jobs' },
    { field: 'duration_hours', desc: 'length in hours' },
    { field: 'service_type', desc: 'service/job type' },
    { field: 'price', desc: 'price/amount' },
    { field: 'staff_name', desc: 'assigned worker/cleaner/tech' },
    { field: 'recurring_type', desc: 'weekly/biweekly/monthly if it repeats' },
    { field: 'day_of_week', desc: 'day for recurring' },
    { field: 'preferred_time', desc: 'time for recurring' },
    { field: 'notes', desc: 'freeform notes' },
  ],
}

// Transforms the importer can apply per mapped field.
const TRANSFORMS = ['none', 'combine_name', 'phone', 'date', 'price', 'split_address', 'title_case'] as const

type AiMapping = {
  mapping: Record<string, number | number[] | null>
  transforms: Record<string, string>
  notes: string
  confidence: 'high' | 'medium' | 'low'
}

function extractJson(text: string): AiMapping | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = (fenced ? fenced[1] : text).trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1) return null
  try {
    return JSON.parse(raw.slice(start, end + 1)) as AiMapping
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const body = (await request.json().catch(() => ({}))) as { kind?: string; columns?: string[]; samples?: string[][] }
    const kind = body.kind || 'clients'
    const schema = SCHEMAS[kind]
    if (!schema) return NextResponse.json({ error: 'Unknown import kind' }, { status: 400 })
    const columns = (body.columns || []).map((c) => String(c ?? ''))
    if (columns.length === 0) return NextResponse.json({ error: 'No columns provided' }, { status: 400 })
    const samples = (body.samples || []).slice(0, 8)

    const prompt = `You map messy spreadsheet columns to a fixed schema so a business's data can be imported into a CRM. Be precise — a wrong map corrupts live records.

TARGET FIELDS (${kind}):
${schema.map((s) => `- ${s.field}: ${s.desc}`).join('\n')}

SOURCE COLUMNS (0-indexed):
${columns.map((c, i) => `[${i}] ${c || '(blank header)'}`).join('\n')}

SAMPLE ROWS (values by column index):
${samples.map((r) => JSON.stringify(r)).join('\n')}

Return ONLY JSON, no prose:
{
  "mapping": { "<field>": <columnIndex, or array of indexes to combine, or null if absent> },
  "transforms": { "<field>": one of ${JSON.stringify(TRANSFORMS)} },
  "confidence": "high" | "medium" | "low",
  "notes": "one sentence on anything the human should double-check"
}
Rules: only map a field if a column clearly fits (else null). Use combine_name when first/last are separate; split_address when one column holds the whole address; phone/date/price to normalize those. Omit transforms that are "none".`

    const client = await resolveAnthropic(tenantId)
    const msg = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
    const parsed = extractJson(text)
    if (!parsed) return NextResponse.json({ error: 'Could not read the AI mapping — map columns manually.' }, { status: 502 })

    return NextResponse.json(parsed)
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/dashboard/import/analyze', err)
    return NextResponse.json({ error: 'Analyze failed — you can still map columns manually.' }, { status: 500 })
  }
}
