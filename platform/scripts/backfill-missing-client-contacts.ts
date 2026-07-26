/**
 * Backfill: create a primary client_contacts row for every client that has
 * zero contact rows today.
 *
 * Root cause: createPrimaryContact() dropped tenant_id on insert (a NOT NULL
 * column) from the 07-22 FullLoop cutover until the fix in 5e23110a6 landed
 * 07-23 21:29 — every insert in that window silently failed. No backfill ran
 * after the fix, so those clients (and anyone else who slipped through
 * before client_contacts existed) still get zero SMS/email confirmations.
 *
 * Dry run by default — prints per-tenant counts, writes nothing. Pass
 * --execute to actually insert.
 *
 *   npx tsx --env-file=.env.local scripts/backfill-missing-client-contacts.ts            (dry run)
 *   npx tsx --env-file=.env.local scripts/backfill-missing-client-contacts.ts --execute   (writes)
 */
import { supabaseAdmin } from '../src/lib/supabase'
import { createPrimaryContact } from '../src/lib/client-contacts'

const EXECUTE = process.argv.includes('--execute')

type ClientRow = { id: string; tenant_id: string; name: string | null; phone: string | null; email: string | null }

// PostgREST caps an unbounded select at 1000 rows — this platform has 1000+
// clients, so a plain .select() silently truncates. Page through explicitly.
async function fetchAll<T>(table: string, columns: string): Promise<T[]> {
  const PAGE = 1000
  const all: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabaseAdmin.from(table).select(columns).range(from, from + PAGE - 1)
    if (error) { console.error(`Failed to load ${table}:`, error.message); process.exit(1) }
    all.push(...((data || []) as T[]))
    if (!data || data.length < PAGE) break
  }
  return all
}

async function main() {
  const clients = await fetchAll<ClientRow>('clients', 'id, tenant_id, name, phone, email')
  const existingContacts = await fetchAll<{ client_id: string }>('client_contacts', 'client_id')

  const hasContact = new Set(existingContacts.map((c) => c.client_id))
  const missing = (clients || []).filter((c) => !hasContact.has(c.id) && (c.phone || c.email))

  if (missing.length === 0) {
    console.log('No clients missing client_contacts rows. Nothing to do.')
    return
  }

  const byTenant = new Map<string, number>()
  for (const c of missing) {
    byTenant.set(c.tenant_id, (byTenant.get(c.tenant_id) || 0) + 1)
  }

  console.log(`${EXECUTE ? 'EXECUTING' : 'DRY RUN'} — ${missing.length} client(s) missing a primary contact:`)
  for (const [tenantId, count] of byTenant) {
    console.log(`  tenant ${tenantId}: ${count}`)
  }

  if (!EXECUTE) {
    console.log('\nDry run only — no writes made. Re-run with --execute to apply.')
    return
  }

  let created = 0
  for (const c of missing) {
    await createPrimaryContact(c.tenant_id, c.id, { name: c.name, phone: c.phone, email: c.email })
    created++
    process.stdout.write(`\r  [${created}/${missing.length}]`)
  }
  console.log(`\n[backfill] created ${created} primary contact rows`)
}

main().catch((err) => { console.error(err); process.exit(1) })
