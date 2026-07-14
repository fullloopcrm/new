import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { tenantDb } from '@/lib/tenant-db'
import { TEST_MODE, TEST_APPLICANT_NAME_SUBSTRING, BROADCAST_CAP, type EligibleApplicant } from '../constants'

// Preview who an applicant broadcast would reach. Ported from nycmaid,
// tenant-scoped for FullLoop (cleaner_applications filtered by tenant_id).
// Safety gates (TEST_MODE, TEST_APPLICANT_NAME_SUBSTRING, BROADCAST_CAP) and the
// EligibleApplicant type live in ./constants — see feedback_no_mass_sms.

// FL cleaner_applications status enum is ('pending','reviewed','accepted','rejected').
// "New / un-hired" = not yet accepted (hired) and not rejected.
const EXCLUDED_STATUSES = ['accepted', 'rejected']

// NOTE: nycmaid also enforces a 7-day recency floor via cleaner_applications
// .last_contacted_at — that column does NOT exist on FL's table yet, so the
// recency floor is omitted here. TEST_MODE + the per-send cap + phone dedup are
// the active safety gates. Add last_contacted_at + the floor before flipping
// TEST_MODE off for real broadcasts (see feedback_no_mass_sms).

type ApplicantRow = {
  id: string
  name: string | null
  phone: string | null
  status: string | null
  created_at: string
}

export async function POST() {
  let tenantId: string
  try {
    ({ tenantId } = await getTenantForRequest())
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: applicants, error } = await tenantDb(tenantId)
    .from('cleaner_applications')
    .select('id, name, phone, status, created_at')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const evaluated: EligibleApplicant[] = (applicants as ApplicantRow[] || []).map((a) => {
    const reasons: string[] = []
    const name = a.name || 'Applicant'

    if (a.status && EXCLUDED_STATUSES.includes(a.status)) {
      reasons.push(a.status === 'accepted' ? 'Already hired' : 'Rejected')
    }
    if (!a.phone) {
      reasons.push('No phone on file')
    }
    if (TEST_MODE && !name.toLowerCase().includes(TEST_APPLICANT_NAME_SUBSTRING)) {
      reasons.push('TEST MODE — only the test applicant is messaged')
    }

    return {
      id: a.id,
      name,
      phone: a.phone,
      status: a.status,
      created_at: a.created_at,
      reasons_excluded: reasons,
      eligible: reasons.length === 0,
    }
  })

  // Dedupe by last-10 digits of phone — never text the same number twice in one blast.
  const seenPhones = new Set<string>()
  const eligible: EligibleApplicant[] = []
  const duplicates: EligibleApplicant[] = []
  for (const a of evaluated.filter((x) => x.eligible)) {
    const last10 = (a.phone || '').replace(/\D/g, '').slice(-10)
    if (last10 && seenPhones.has(last10)) {
      duplicates.push({ ...a, eligible: false, reasons_excluded: ['Duplicate phone'] })
      continue
    }
    if (last10) seenPhones.add(last10)
    eligible.push(a)
  }

  const excluded = [...evaluated.filter((x) => !x.eligible), ...duplicates]

  return NextResponse.json({
    test_mode: TEST_MODE,
    cap: BROADCAST_CAP,
    eligible,
    excluded,
  })
}
