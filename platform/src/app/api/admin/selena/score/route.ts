/**
 * Selena scoring API — ported from nycmaid.
 * GET — recent scored conversations + averages.
 * POST — manual rescoring of one or many conversations.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimitDb } from '@/lib/rate-limit-db'
import {
  scoreConversation,
  selfReviewConversation,
  scoreRecentConversations,
} from '@/lib/conversation-scorer'

export async function GET(_req: NextRequest) {
  const { tenant, error: authError } = await requirePermission('settings.view')
  if (authError) return authError

  try {
    const { tenantId } = tenant

    const { data: scored } = await supabaseAdmin
      .from('sms_conversations')
      .select('id, name, outcome, quality_score, quality_issues, completed_at, summary')
      .eq('tenant_id', tenantId)
      .not('quality_score', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(50)

    const scores = (scored || []).map(c => c.quality_score as number).filter((s): s is number => typeof s === 'number')
    const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

    // Aggregate top issues
    const issueCount: Record<string, number> = {}
    for (const c of scored || []) {
      const issues = (c.quality_issues as string[] | null) || []
      for (const i of issues) issueCount[i] = (issueCount[i] || 0) + 1
    }
    const topIssues = Object.entries(issueCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([issue, count]) => ({ issue, count }))

    return NextResponse.json({
      conversations: scored,
      average_score: avg,
      total_scored: scores.length,
      top_issues: topIssues,
    })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { tenant, error: authError } = await requirePermission('settings.view')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const body = await req.json()
    const conversationId = body.conversation_id as string | undefined
    const useAi = body.ai_review === true

    if (conversationId) {
      const ruleScore = await scoreConversation(tenantId, conversationId)
      let aiResult = null
      if (useAi) {
        // ai_review triggers a real Anthropic call (selfReviewConversation);
        // this route is gated on settings.view (held by manager, not just
        // admin/owner) with no other cost control — cap per-tenant volume
        // so a scripted caller can't run up unbounded API spend, matching
        // the admin/translate convention for the same risk shape.
        const rl = await rateLimitDb(`admin-selena-score:${tenantId}`, 30, 10 * 60 * 1000)
        if (!rl.allowed) {
          return NextResponse.json({ error: 'Too many AI review requests. Try again shortly.' }, { status: 429 })
        }
        aiResult = await selfReviewConversation(tenantId, conversationId)
      }
      return NextResponse.json({ rule_based: ruleScore, ai_review: aiResult })
    }

    // No id — score all unscored
    const result = await scoreRecentConversations(tenantId)
    return NextResponse.json(result)
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 })
  }
}
