import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * admin-contacts.ts (13 call sites) is the tenant-aware notification-routing
 * module: it resolves who gets emailed/texted as "the admin" for a tenant
 * (tenant_members with role owner/admin -> tenant.email/phone -> platform env),
 * and had zero direct test coverage before this file. Its own docstring calls
 * out the reason it exists: it's a from-scratch tenant-aware replacement for
 * nycmaid's admin-contacts.ts specifically "so the multi-tenant boundary is
 * never violated" -- every lookup is scoped by tenant_id.
 *
 * Two properties matter most and get dedicated wrong-tenant probes:
 *   1. getAdminContacts' tenant_members query is scoped by tenant_id -- a
 *      member row belonging to a different tenant must never be returned.
 *   2. loadTenant re-hydration only fetches by the caller-supplied id -- a
 *      partial tenant object can't be used to smuggle another tenant's data.
 */

type Eqs = Record<string, unknown>
type Handler = (ctx: { eqs: Eqs; inVals: unknown[] }) => unknown

let handlers: Record<string, Handler> = {}
let insertCalls: Record<string, unknown[]> = {}
let insertShouldThrow = false

function builder(table: string) {
  const eqs: Eqs = {}
  let inVals: unknown[] = []
  const resolveRow = () => {
    const handler = handlers[table]
    if (!handler) throw new Error(`no mock handler configured for table "${table}"`)
    return handler({ eqs, inVals })
  }
  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    in: (col: string, vals: unknown[]) => {
      eqs[col] = vals
      inVals = vals
      return chain
    },
    single: async () => ({ data: resolveRow() }),
    insert: async (rows: unknown[]) => {
      insertCalls[table] = [...(insertCalls[table] || []), ...rows]
      if (insertShouldThrow) throw new Error('email_type column does not exist')
      return { data: null, error: null }
    },
    then: (onFulfilled: (v: { data: unknown; error: null }) => unknown) =>
      Promise.resolve({ data: resolveRow(), error: null }).then(onFulfilled),
  }
  return chain
}

vi.mock('./supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

const sendEmail = vi.fn().mockResolvedValue({ id: 'email-1' })
const tenantSender = vi.fn((t: { name?: string | null; slug?: string | null }) => `${t?.name} <${t?.slug}@fullloopcrm.com>`)
vi.mock('./email', () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...args),
  tenantSender: (t: { name?: string | null; slug?: string | null }) => tenantSender(t),
}))

const sendSMS = vi.fn().mockResolvedValue({ id: 'sms-1' })
vi.mock('./sms', () => ({
  sendSMS: (...args: unknown[]) => sendSMS(...args),
}))

import {
  getAdminContacts,
  getOwnerContacts,
  emailAdmins,
  smsAdmins,
  getOwnerBccEmails,
} from './admin-contacts'

const FULL_TENANT = {
  id: 't-1',
  name: 'Acme Cleaning',
  slug: 'acme',
  email: 'owner@acme.com',
  phone: '5551234567',
  resend_api_key: 'resend-key',
  telnyx_api_key: 'telnyx-key',
  telnyx_phone: '+15559998888',
  email_from: null,
}

beforeEach(() => {
  handlers = {}
  insertCalls = {}
  insertShouldThrow = false
  sendEmail.mockClear()
  tenantSender.mockClear()
  sendSMS.mockClear()
  delete process.env.ADMIN_EMAIL
  delete process.env.ADMIN_FORWARD_PHONE
  // sms-credentials.ts's resolveTenantSmsCredentials() falls back to the
  // platform's shared Telnyx account by default — clear it so the "no
  // Telnyx credentials configured" tests below stay deterministic
  // regardless of the ambient shell/CI env.
  delete process.env.TELNYX_API_KEY
  delete process.env.TELNYX_PHONE
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('getAdminContacts', () => {
  it('returns [] when the tenant does not exist', async () => {
    handlers.tenants = () => null
    const contacts = await getAdminContacts('missing-tenant')
    expect(contacts).toEqual([])
  })

  it('loads the tenant by id when given a string, then scopes tenant_members by tenant_id', async () => {
    handlers.tenants = ({ eqs }) => (eqs.id === 't-1' ? FULL_TENANT : null)
    handlers.tenant_members = ({ eqs }) =>
      eqs.tenant_id === 't-1' ? [{ email: 'a@acme.com', phone: null, name: 'Alice', role: 'owner' }] : []

    const contacts = await getAdminContacts('t-1')
    expect(contacts).toEqual([{ email: 'a@acme.com', phone: null, name: 'Alice', role: 'owner' }])
  })

  it('WRONG-TENANT PROBE: a tenant_members row belonging to a different tenant is never returned', async () => {
    handlers.tenants = () => FULL_TENANT
    // Inverted on purpose: the fake DB returns t-1's real (empty) member list
    // ONLY when the query is correctly scoped by tenant_id='t-1'; any other
    // (or missing) tenant_id scope returns t-OTHER's leaked admin instead.
    // This fails loudly if the .eq('tenant_id', ...) filter is ever dropped,
    // unlike a probe whose "no leak" case is indistinguishable from "no
    // filter at all".
    handlers.tenant_members = ({ eqs }) =>
      eqs.tenant_id === 't-1' ? [] : [{ email: 'leaked@other.com', phone: null, name: 'Eve', role: 'owner' }]

    const contacts = await getAdminContacts('t-1')
    expect(contacts.some((c) => c.email === 'leaked@other.com')).toBe(false)
    // Falls through to the tenant-record synthesis since no members matched.
    expect(contacts).toEqual([{ email: FULL_TENANT.email, phone: FULL_TENANT.phone, name: null, role: 'owner' }])
  })

  it('filters tenant_members by the roles array passed by the caller', async () => {
    handlers.tenants = () => FULL_TENANT
    handlers.tenant_members = ({ inVals }) => (inVals.includes('manager') ? [{ email: 'm@acme.com', phone: null, name: 'Mo', role: 'manager' }] : [])

    const contacts = await getAdminContacts('t-1', ['manager'])
    expect(contacts).toEqual([{ email: 'm@acme.com', phone: null, name: 'Mo', role: 'manager' }])
  })

  it('defaults role fallback to "admin" when a member row has no role', async () => {
    handlers.tenants = () => FULL_TENANT
    handlers.tenant_members = () => [{ email: 'x@acme.com', phone: null, name: null, role: null }]

    const contacts = await getAdminContacts('t-1')
    expect(contacts[0].role).toBe('admin')
  })

  it('synthesizes a single contact from tenant.email/phone when no members match', async () => {
    handlers.tenants = () => FULL_TENANT
    handlers.tenant_members = () => []

    const contacts = await getAdminContacts('t-1')
    expect(contacts).toEqual([{ email: FULL_TENANT.email, phone: FULL_TENANT.phone, name: null, role: 'owner' }])
  })

  it('returns [] when there are no members AND the tenant has no email/phone', async () => {
    handlers.tenants = () => ({ ...FULL_TENANT, email: null, phone: null })
    handlers.tenant_members = () => []

    const contacts = await getAdminContacts('t-1')
    expect(contacts).toEqual([])
  })

  it('does not re-fetch the tenant when given a fully-hydrated tenant object (avoids a redundant query)', async () => {
    handlers.tenants = () => {
      throw new Error('should not query tenants table for a fully-hydrated object')
    }
    handlers.tenant_members = () => []

    await expect(getAdminContacts(FULL_TENANT)).resolves.toEqual([
      { email: FULL_TENANT.email, phone: FULL_TENANT.phone, name: null, role: 'owner' },
    ])
  })

  it('re-hydrates when given a partial tenant object missing key fields (e.g. just {id})', async () => {
    handlers.tenants = ({ eqs }) => (eqs.id === 't-1' ? FULL_TENANT : null)
    handlers.tenant_members = () => []

    const contacts = await getAdminContacts({ id: 't-1' })
    expect(contacts).toEqual([{ email: FULL_TENANT.email, phone: FULL_TENANT.phone, name: null, role: 'owner' }])
  })
})

describe('getOwnerContacts', () => {
  it('delegates to getAdminContacts scoped to the owner role only', async () => {
    handlers.tenants = () => FULL_TENANT
    handlers.tenant_members = ({ inVals }) => {
      expect(inVals).toEqual(['owner'])
      return [{ email: 'owner@acme.com', phone: null, name: 'Owner', role: 'owner' }]
    }

    const contacts = await getOwnerContacts('t-1')
    expect(contacts).toEqual([{ email: 'owner@acme.com', phone: null, name: 'Owner', role: 'owner' }])
  })
})

describe('emailAdmins', () => {
  it('no-ops when the tenant does not exist', async () => {
    handlers.tenants = () => null
    await emailAdmins('missing', 'Subject', '<p>body</p>')
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('emails every admin contact with an email, using the tenant sender + resend key', async () => {
    handlers.tenants = () => FULL_TENANT
    handlers.tenant_members = () => [
      { email: 'a@acme.com', phone: null, name: 'Alice', role: 'owner' },
      { email: 'b@acme.com', phone: null, name: 'Bob', role: 'admin' },
    ]

    await emailAdmins(FULL_TENANT, 'Subject', '<p>body</p>')

    expect(sendEmail).toHaveBeenCalledTimes(2)
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'a@acme.com', subject: 'Subject', resendApiKey: 'resend-key' }),
    )
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'b@acme.com', subject: 'Subject', resendApiKey: 'resend-key' }),
    )
    expect(insertCalls.email_logs).toHaveLength(2)
  })

  it('skips contacts with a blank email', async () => {
    handlers.tenants = () => FULL_TENANT
    handlers.tenant_members = () => [{ email: '   ', phone: null, name: 'Blank', role: 'owner' }]

    await emailAdmins(FULL_TENANT, 'Subject', '<p>body</p>')
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('falls back to ADMIN_EMAIL env when no admin contact has an email', async () => {
    process.env.ADMIN_EMAIL = 'platform-fallback@fullloopcrm.com'
    handlers.tenants = () => ({ ...FULL_TENANT, email: null, phone: null })
    handlers.tenant_members = () => []

    // A bare id string (not the pre-hydrated object) so loadTenant actually
    // re-fetches and picks up the overridden email:null/phone:null.
    await emailAdmins('t-1', 'Subject', '<p>body</p>')

    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'platform-fallback@fullloopcrm.com' }))
  })

  it('sends nothing when there are no admin emails and ADMIN_EMAIL is unset', async () => {
    handlers.tenants = () => ({ ...FULL_TENANT, email: null, phone: null })
    handlers.tenant_members = () => []

    await emailAdmins('t-1', 'Subject', '<p>body</p>')
    expect(sendEmail).not.toHaveBeenCalled()
    expect(insertCalls.email_logs).toBeUndefined()
  })

  it('swallows an email_logs insert failure without throwing back to the caller', async () => {
    handlers.tenants = () => FULL_TENANT
    handlers.tenant_members = () => [{ email: 'a@acme.com', phone: null, name: 'Alice', role: 'owner' }]
    insertShouldThrow = true

    await expect(emailAdmins(FULL_TENANT, 'Subject', '<p>body</p>')).resolves.toBeUndefined()
    expect(sendEmail).toHaveBeenCalledTimes(1)
  })
})

describe('smsAdmins', () => {
  it('no-ops when the tenant does not exist', async () => {
    handlers.tenants = () => null
    await smsAdmins('missing', 'text')
    expect(sendSMS).not.toHaveBeenCalled()
  })

  it('no-ops when the tenant has no Telnyx credentials configured', async () => {
    handlers.tenants = () => ({ ...FULL_TENANT, telnyx_api_key: null, telnyx_phone: null })
    await smsAdmins({ ...FULL_TENANT, telnyx_api_key: null, telnyx_phone: null }, 'text')
    expect(sendSMS).not.toHaveBeenCalled()
  })

  it('texts every admin contact with a phone, normalizing to E.164', async () => {
    handlers.tenants = () => FULL_TENANT
    handlers.tenant_members = () => [
      { email: null, phone: '(555) 123-4567', name: 'Alice', role: 'owner' },
      { email: null, phone: '15559876543', name: 'Bob', role: 'admin' },
    ]

    await smsAdmins(FULL_TENANT, 'text')

    expect(sendSMS).toHaveBeenCalledTimes(2)
    expect(sendSMS).toHaveBeenCalledWith(expect.objectContaining({ to: '+15551234567' }))
    expect(sendSMS).toHaveBeenCalledWith(expect.objectContaining({ to: '+15559876543' }))
  })

  it('falls back to ADMIN_FORWARD_PHONE when no admin contact has a phone', async () => {
    process.env.ADMIN_FORWARD_PHONE = '5550001111'
    handlers.tenants = () => ({ ...FULL_TENANT, email: null, phone: null })
    handlers.tenant_members = () => []

    // A bare id string so loadTenant re-fetches and picks up phone:null.
    await smsAdmins('t-1', 'text')

    expect(sendSMS).toHaveBeenCalledTimes(1)
    expect(sendSMS).toHaveBeenCalledWith(expect.objectContaining({ to: '+15550001111' }))
  })

  it('sends nothing when there are no admin phones and ADMIN_FORWARD_PHONE is unset', async () => {
    handlers.tenants = () => ({ ...FULL_TENANT, email: null, phone: null })
    handlers.tenant_members = () => []

    await smsAdmins('t-1', 'text')
    expect(sendSMS).not.toHaveBeenCalled()
  })
})

describe('getOwnerBccEmails', () => {
  it('returns owner emails only, dropping owners with no email', async () => {
    handlers.tenants = () => FULL_TENANT
    handlers.tenant_members = ({ inVals }) => {
      expect(inVals).toEqual(['owner'])
      return [
        { email: 'owner1@acme.com', phone: null, name: 'O1', role: 'owner' },
        { email: null, phone: '5551112222', name: 'O2', role: 'owner' },
      ]
    }

    const emails = await getOwnerBccEmails('t-1')
    expect(emails).toEqual(['owner1@acme.com'])
  })
})
