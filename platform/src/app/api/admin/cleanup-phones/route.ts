/**
 * Strip bidi/zero-width chars from phone columns — tenant-scoped.
 * Ported from nycmaid. Auth: requires settings.edit permission.
 */
import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'

const BIDI_RE = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g

export async function POST(_req: NextRequest) {
  const { tenant, error: authError } = await requirePermission('settings.edit')
  if (authError) return authError

  const tenantId = tenant.tenantId
  const db = tenantDb(tenantId)
  const fixed: { table: string; id: string; before: string; after: string }[] = []

  const { data: clients } = await db.from('clients').select('id, phone')
  for (const c of clients || []) {
    if (c.phone && BIDI_RE.test(c.phone)) {
      const cleaned = c.phone.replace(BIDI_RE, '')
      await db.from('clients').update({ phone: cleaned }).eq('id', c.id)
      fixed.push({ table: 'clients', id: c.id, before: JSON.stringify(c.phone), after: cleaned })
    }
  }

  const { data: members } = await db.from('team_members').select('id, phone')
  for (const m of members || []) {
    if (m.phone && BIDI_RE.test(m.phone)) {
      const cleaned = m.phone.replace(BIDI_RE, '')
      await db.from('team_members').update({ phone: cleaned }).eq('id', m.id)
      fixed.push({ table: 'team_members', id: m.id, before: JSON.stringify(m.phone), after: cleaned })
    }
  }

  const { data: convos } = await db.from('sms_conversations').select('id, phone')
  for (const c of convos || []) {
    if (c.phone && BIDI_RE.test(c.phone)) {
      const cleaned = c.phone.replace(BIDI_RE, '')
      await db.from('sms_conversations').update({ phone: cleaned }).eq('id', c.id)
      fixed.push({ table: 'sms_conversations', id: c.id, before: JSON.stringify(c.phone), after: cleaned })
    }
  }

  return NextResponse.json({ success: true, fixedCount: fixed.length, fixed })
}
