import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { logSecurityEvent } from '@/lib/security'
import { clearSettingsCache } from '@/lib/settings'
import { audit } from '@/lib/audit'
import { encryptTenantSecrets } from '@/lib/secret-crypto'
import { getPrimaryTenantDomain, findDomainOwner } from '@/lib/domains'

// Fields the settings UI has zero read-back consumers for (grepped
// dashboard/**, no component reads these) — stripped even for authorized
// viewers, same as GET /api/social/accounts stripping its access_token.
// Deliberately NOT included: stripe_api_key/resend_api_key/imap_pass/
// anthropic_api_key/indexnow_key — settings/page.tsx prefills these into
// editable inputs (form.X || '') so operators can see/update an existing
// key without retyping it; stripping them would blank the field on load
// and risk wiping the stored key on the next save.
const NEVER_RETURNED_FIELDS = ['google_tokens', 'telegram_bot_token', 'telegram_webhook_secret'] as const

export async function GET() {
  try {
    const { tenant, error: authError } = await requirePermission('settings.view')
    if (authError) return authError

    const safeTenant = { ...tenant.tenant }
    for (const field of NEVER_RETURNED_FIELDS) {
      delete (safeTenant as Record<string, unknown>)[field]
    }

    // Resolved primary domain (tenant_domains PRIMARY row first, same
    // precedence as tenantSiteUrl()/resolveOrigin()'s other callers) —
    // dashboard/websites/page.tsx's "Domain configured" status check needs
    // the tenant's actual effective domain, not just the legacy
    // tenant.domain/domain_name columns this route already returns raw
    // (those stay raw for the settings-edit forms, which write them
    // directly). Without this, a tenant whose custom domain lives only in
    // tenant_domains (added via admin/websites) shows "No domain set" on
    // its own Website status page despite having a live custom domain.
    const primaryDomain = tenant.tenantId ? await getPrimaryTenantDomain(tenant.tenantId) : null

    return NextResponse.json({ tenant: safeTenant, primaryDomain })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function PUT(request: Request) {
  const { tenant, error: authError } = await requirePermission('settings.edit')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const body = await request.json()

    // Don't allow updating id, status, or slug through settings. slug is the
    // subdomain-routing key (getTenantBySlug in tenant-lookup.ts, UNIQUE NOT
    // NULL at the DB level per supabase/schema.sql) and — like id/status — is
    // treated as immutable everywhere else in the app: NEITHER admin PUT
    // route (admin/businesses/[id], admin/tenants/[id]) includes `slug` in
    // its allowlist, so nothing anywhere else ever mutates it post-creation.
    // This route is the odd one out (a BLOCKLIST, not an ALLOWLIST — see the
    // `domain` collision-guard fix below for the sibling gap), so without
    // this it would sail straight into the blind tenants UPDATE below: every
    // normal save round-trips the full tenant row through `form` (dashboard/
    // settings/page.tsx's saveTenant() sends `JSON.stringify(form)`, seeded
    // from GET's unfiltered response), so `slug` is present on every request
    // — a crafted request changing it would silently repoint the tenant's
    // live subdomain with none of the upkeep a real slug-change would need
    // (busting tenant-lookup.ts's slugCache for both the old AND newly-
    // claimed slug, updating shared links, SEO redirects, etc.).
    delete body.id
    delete body.status
    delete body.slug

    // Block system-managed fields — only set via OAuth flows or internal processes
    const systemOnlyFields = ['google_tokens', 'google_business', 'stripe_account_id']
    for (const f of systemOnlyFields) {
      delete body[f]
    }

    // Normalize + collision-guard `domain` — this route is a BLOCKLIST (delete
    // body.id/status/systemOnlyFields, everything else flows straight into the
    // blind tenants UPDATE below), unlike the ALLOWLIST-based admin routes
    // (admin/businesses POST, admin/businesses/[id] PUT, admin/tenants/[id]
    // PUT) that already special-case `domain` with this same normalize +
    // findDomainOwner guard (see domains.ts's findDomainOwner doc comment).
    // Being a blocklist, `domain` was never special-cased here and sailed
    // through raw and uncollision-checked. Worse than the admin routes: this
    // one is reachable by any TENANT owner/admin via their own dashboard
    // (requirePermission('settings.edit') — no platform-admin gate), so any
    // tenant could set its own `domain` to a host already claimed by ANOTHER
    // tenant (via tenant_domains or that tenant's legacy tenants.domain),
    // tripping the resolver's TRANSITION ASSERT-AND-REFUSE divergence guard on
    // the very next request to that host and darkening the OTHER,
    // already-live tenant's site. `domain_name` is left raw, same as the
    // admin routes — it's the display/registrar-facing field, not what the
    // resolver queries.
    if (typeof body.domain === 'string') {
      const cleanDomain = body.domain
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '')
        .replace(/^www\./, '')
      body.domain = cleanDomain || null
    }
    if (body.domain) {
      const owner = await findDomainOwner(body.domain as string, tenantId)
      if (owner) {
        return NextResponse.json(
          { error: `${body.domain} is already registered to ${owner.tenantName}. Remove it there first, or reassign it, before adding it here.` },
          { status: 409 },
        )
      }
    }

    // Track sensitive field changes for security audit log
    const sensitiveFields = ['resend_api_key', 'telnyx_api_key', 'telnyx_phone', 'stripe_api_key', 'stripe_account_id', 'imap_pass', 'anthropic_api_key', 'indexnow_key']
    const changedSensitive = sensitiveFields.filter((f) => body[f] !== undefined)

    // selena_config: merge atomically (Postgres `||`) instead of folding it
    // into the blind tenants UPDATE below. The dashboard's Selena tab
    // (saveSelenaConfig() in dashboard/settings/page.tsx) round-trips the
    // WHOLE config object it loaded at page-open time — a blind replace here
    // silently reverts any key written by a concurrent save since then: the
    // admin backend's service_areas edit (PUT /api/admin/businesses/[id],
    // itself fixed for the same reason — see
    // migrations/2026_07_16_tenant_jsonb_merge_atomic.sql), or a second
    // dashboard tab saving a different Selena section. Every field this page
    // writes is a concrete set-to-value (grepped dashboard/settings/page.tsx —
    // no `delete`/undefined writes), so an additive `||` merge is behaviorally
    // identical to the intended replace for every value the UI can produce,
    // while no longer able to drop a key it doesn't know about.
    const selenaConfigTouched = body.selena_config !== undefined
    const selenaConfigPatch = body.selena_config
    delete body.selena_config

    // Encrypt vendor secrets at rest (anthropic/telnyx/resend/stripe/etc.).
    // Non-destructive: empty/null values pass through so a tenant can clear a
    // key (e.g. blank Anthropic key => fall back to the platform key).
    const updatePayload = encryptTenantSecrets(body)

    // The dashboard's dedicated Selena-tab save sends ONLY selena_config, so
    // updatePayload can legitimately be empty here — an empty PATCH body is
    // rejected elsewhere in this codebase (see jobs/[id]/route.ts's own
    // "Nothing to update" guard), so skip the main UPDATE entirely rather
    // than call it with {}.
    let data: Record<string, unknown> | null = null
    if (Object.keys(updatePayload).length > 0) {
      const { data: updated, error } = await supabaseAdmin
        .from('tenants')
        .update(updatePayload)
        .eq('id', tenantId)
        .select()
        .single()
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      data = updated
    }

    let mergedSelenaConfig: unknown
    if (selenaConfigTouched && selenaConfigPatch && typeof selenaConfigPatch === 'object') {
      const { data: merged, error: scErr } = await supabaseAdmin.rpc('merge_tenant_selena_config', {
        p_tenant_id: tenantId, p_patch: selenaConfigPatch,
      })
      if (scErr) return NextResponse.json({ error: scErr.message }, { status: 500 })
      mergedSelenaConfig = merged
    }

    if (!data) {
      const { data: fresh, error: fetchErr } = await supabaseAdmin.from('tenants').select('*').eq('id', tenantId).single()
      if (fetchErr || !fresh) return NextResponse.json({ error: fetchErr?.message || 'Not found' }, { status: 500 })
      data = fresh
    }
    if (mergedSelenaConfig !== undefined) {
      data = { ...data, selena_config: mergedSelenaConfig }
    }

    // Bust per-tenant settings cache so getSettings() reflects the change immediately.
    clearSettingsCache(tenantId)

    // Bust middleware's edge-cached slug/domain entries when `domain` changed
    // — same fix already applied to the admin PUT route for this exact class
    // of gap (tenant-lookup.ts's own 5-min-TTL cache). Without this, the new
    // domain (or a stale negative-cache entry from a pre-save probe) keeps
    // resolving through a warm edge isolate for up to the rest of the TTL.
    if (body.domain !== undefined) {
      const { invalidateTenantCache, invalidateDomainCache } = await import('@/lib/tenant-lookup')
      invalidateTenantCache(tenantId)
      if (body.domain) invalidateDomainCache(body.domain as string)
    }

    // Bust Selena config cache if selena_config was touched so persona/
    // config changes take effect immediately (default cache TTL is 5 min).
    if (selenaConfigTouched) {
      const { clearSelenaConfigCache } = await import('@/lib/selena-legacy')
      clearSelenaConfigCache(tenantId)
    }

    // Log security events for sensitive changes. Non-fatal — DB write already
    // succeeded, a missing Resend domain (dev env) shouldn't 500 the save.
    for (const field of changedSensitive) {
      try {
        await logSecurityEvent({
          tenantId,
          type: 'api_key_change',
          description: `Integration key updated: ${field.replace(/_/g, ' ')}`,
        })
      } catch (err) {
        console.error('[settings PUT] logSecurityEvent failed:', err)
      }
    }

    const auditedFields = selenaConfigTouched ? [...Object.keys(body), 'selena_config'] : Object.keys(body)
    await audit({ tenantId, action: 'settings.updated', entityType: 'settings', entityId: tenantId, details: { fields: auditedFields, sensitiveChanged: changedSensitive } })

    // Same NEVER_RETURNED_FIELDS strip as GET above — the update response is
    // a full select('*') row (either straight off .update().select() or the
    // fallback re-fetch), so without this the PUT response leaks
    // google_tokens/telegram_bot_token/telegram_webhook_secret even though
    // GET on this same route already guards against it.
    const safeData = { ...data }
    for (const field of NEVER_RETURNED_FIELDS) {
      delete (safeData as Record<string, unknown>)[field]
    }

    return NextResponse.json({ tenant: safeData })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
