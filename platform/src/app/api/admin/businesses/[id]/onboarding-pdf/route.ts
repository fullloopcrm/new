/**
 * Signed URL to the latest onboarding-completed-form PDF for a tenant —
 * the human-readable copy of the immutable snapshot in
 * tenant_onboarding_submissions (see lib/onboarding-snapshot.ts).
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { ONBOARDING_SNAPSHOTS_BUCKET } from '@/lib/onboarding-snapshot'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await params
  const { data: submission } = await supabaseAdmin
    .from('tenant_onboarding_submissions')
    .select('id, submitted_at, pdf_path')
    .eq('tenant_id', id)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!submission) return NextResponse.json({ error: 'No onboarding submission on file' }, { status: 404 })
  if (!submission.pdf_path) return NextResponse.json({ error: 'Submission recorded, but the PDF failed to render' }, { status: 404 })

  const { data: signed, error } = await supabaseAdmin.storage
    .from(ONBOARDING_SNAPSHOTS_BUCKET)
    .createSignedUrl(submission.pdf_path, 3600)
  if (error || !signed) return NextResponse.json({ error: error?.message || 'Failed to sign URL' }, { status: 500 })

  return NextResponse.json({ url: signed.signedUrl, submitted_at: submission.submitted_at })
}
