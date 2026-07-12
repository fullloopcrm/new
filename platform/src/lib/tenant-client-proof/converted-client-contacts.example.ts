/**
 * PROOF OF CONVERSION — client contacts — NOT WIRED, REVERSIBLE.
 *
 * Low-risk GET read converted to the scoped client:
 *   - src/app/api/clients/[id]/contacts/route.ts  (GET: list a client's contact rows)
 *
 * What this route adds over prior proofs: a REQUIRED filter sourced from a DYNAMIC ROUTE
 * SEGMENT. booking-notes already proved a required non-tenant filter (`booking_id`), but
 * that value arrived from a query string. Here the second `.eq('client_id', clientId)`
 * comes from the `[id]` path segment (the live route resolves it via `await params`), so
 * the converted function takes `clientId` as an explicit argument and the proof pins that
 * BOTH scoping keys survive the swap: the tenant scope `.eq('tenant_id', tenantId)` AND
 * the route-param scope `.eq('client_id', clientId)`. The client swap changes only WHO
 * fetches; both filters are copied verbatim.
 *
 * Secondary NEW variant: DUAL ORDER with mixed direction — `is_primary` DESC then
 * `created_at` ASC (`.order('is_primary', {ascending:false}).order('created_at', {ascending:true})`).
 * Kept verbatim so the swap is proven orthogonal to a primary-first, oldest-next sort.
 *
 * SENSITIVITY: `client_contacts` holds contact PII (name/phone_e164/email + consent
 * timestamps). This is exactly the data RLS must fence per tenant, which is why the proof
 * asserts the tenant scope is never dropped.
 *
 * NO CROSS-TABLE DEPENDENCY: single table `client_contacts`, no embed, no join. Floor
 * case for RLS cutover — needs only `client_contacts` to have its own policy; nothing
 * else is load-bearing, no tier-ordering hold. (The `client_id` filter references a
 * `clients` row but does NOT embed it, so `clients`' policy is not required for THIS read
 * to return rows.)
 *
 * Auth entry is unchanged: the live GET authenticates via `requirePermission('clients.view')`,
 * which yields `tenant.tenantId`. This proof takes `tenantId` and `clientId` directly so
 * the isolation test exercises both scoping keys and the dual order without standing up
 * the permission layer.
 *
 * The live route is UNCHANGED. Deleting this directory reverts the proof with zero impact.
 */
import { tenantClient } from '../tenant-client'

/** The columns the live route selects (order preserved for a faithful proof). */
const CONTACT_COLUMNS =
  'id, tenant_id, client_id, name, role, phone_e164, email, is_primary, receives_sms, receives_email, sms_consent_at, email_consent_at, sms_opted_out_at, email_opted_out_at, created_at'

/**
 * Converted read path of GET /api/clients/[id]/contacts. Fetches the client's contact
 * rows through the scoped client, keeping BOTH the tenant scope and the route-param
 * `client_id` scope, plus the primary-first / oldest-next ordering. Returns the bare row
 * array (matching the live route's `NextResponse.json(data)` shape); surfaces the DB
 * error instead of swallowing it to `[]`.
 */
export async function listClientContactsConverted(tenantId: string, clientId: string) {
  const db = tenantClient(tenantId) // was: supabaseAdmin — both filters + ordering unchanged
  const { data, error } = await db
    .from('client_contacts')
    .select(CONTACT_COLUMNS)
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}
