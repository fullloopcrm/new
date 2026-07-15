import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * /terms (P6): platform-wide Terms of Service with a per-tenant
 * customization hook. Anonymous visitors and tenants without a negotiated
 * addendum must see ONLY the base platform terms. A tenant with an active
 * addendum sees it appended, addressed to them by name. Wrong-tenant probe:
 * rendering the page under tenant A's resolved context must never surface
 * tenant B's addendum (or vice versa) -- a leak here would mean one
 * partner's negotiated pricing/clauses showing up on another partner's
 * session.
 */

const { getCurrentTenant } = vi.hoisted(() => ({ getCurrentTenant: vi.fn() }))
vi.mock('@/lib/tenant', () => ({ getCurrentTenant }))

const { getTenantTermsAddendum } = vi.hoisted(() => ({ getTenantTermsAddendum: vi.fn() }))
vi.mock('@/lib/legal/tenant-terms-addendum', () => ({ getTenantTermsAddendum }))

import TermsPage from './page'

const TENANT_A = { id: 'tid-a', name: 'Acme Cleaning Co' }
const TENANT_B = { id: 'tid-b', name: 'Bright Star Maids' }

const ADDENDUM_A = {
  id: 'addendum-a',
  tenant_id: 'tid-a',
  active: true,
  effective_date: '2026-01-01',
  monthly_rate_override: 1800,
  setup_fee_override: 15000,
  custom_clauses: 'Acme gets a 90-day trial period.',
  notes: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const ADDENDUM_B = {
  id: 'addendum-b',
  tenant_id: 'tid-b',
  active: true,
  effective_date: '2026-02-01',
  monthly_rate_override: 2200,
  setup_fee_override: null,
  custom_clauses: 'Bright Star has a custom SLA clause.',
  notes: null,
  created_at: '2026-02-01T00:00:00Z',
  updated_at: '2026-02-01T00:00:00Z',
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('(marketing)/terms page', () => {
  it('renders only the base platform terms for an anonymous visitor', async () => {
    getCurrentTenant.mockResolvedValue(null)

    render(await TermsPage())

    expect(screen.getByText('Terms of Service')).toBeInTheDocument()
    expect(screen.getByText(/1\. Acceptance of Terms/)).toBeInTheDocument()
    expect(getTenantTermsAddendum).not.toHaveBeenCalled()
    expect(screen.queryByText(/Partnership Addendum/)).not.toBeInTheDocument()
  })

  it('renders only the base terms for a resolved tenant with no addendum on file', async () => {
    getCurrentTenant.mockResolvedValue(TENANT_A)
    getTenantTermsAddendum.mockResolvedValue(null)

    render(await TermsPage())

    expect(getTenantTermsAddendum).toHaveBeenCalledWith('tid-a')
    expect(screen.queryByText(/Partnership Addendum/)).not.toBeInTheDocument()
  })

  it("renders tenant A's addendum, addressed to tenant A, when one is active", async () => {
    getCurrentTenant.mockResolvedValue(TENANT_A)
    getTenantTermsAddendum.mockResolvedValue(ADDENDUM_A)

    render(await TermsPage())

    expect(screen.getByText(/Partnership Addendum — Acme Cleaning Co/)).toBeInTheDocument()
    expect(screen.getByText(/Acme gets a 90-day trial period\./)).toBeInTheDocument()
    expect(screen.getByText(/Negotiated monthly rate: \$1,800/)).toBeInTheDocument()
    expect(screen.getByText(/Negotiated setup fee: \$15,000/)).toBeInTheDocument()
  })

  it("wrong-tenant probe: tenant A's session never renders tenant B's addendum content", async () => {
    getCurrentTenant.mockResolvedValue(TENANT_A)
    getTenantTermsAddendum.mockResolvedValue(ADDENDUM_A)

    render(await TermsPage())

    expect(screen.queryByText(/Bright Star/)).not.toBeInTheDocument()
    expect(screen.queryByText(/custom SLA clause/)).not.toBeInTheDocument()
    expect(screen.queryByText(/\$2,200/)).not.toBeInTheDocument()
  })

  it("wrong-tenant probe: tenant B's session never renders tenant A's addendum content", async () => {
    getCurrentTenant.mockResolvedValue(TENANT_B)
    getTenantTermsAddendum.mockResolvedValue(ADDENDUM_B)

    render(await TermsPage())

    expect(screen.getByText(/Partnership Addendum — Bright Star Maids/)).toBeInTheDocument()
    expect(screen.queryByText(/Acme/)).not.toBeInTheDocument()
    expect(screen.queryByText(/90-day trial/)).not.toBeInTheDocument()
    expect(screen.queryByText(/\$1,800/)).not.toBeInTheDocument()
  })
})
