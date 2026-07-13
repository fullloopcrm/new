import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminErrorsPage from './page'

/**
 * Parity: nycmaid's (app)/admin/errors is a working, self-contained error-log
 * viewer wired to a nycmaid-tenant audit trail. FL already ported the backend
 * (/api/admin/errors, requireAdmin-gated, cross-tenant by design) but had no
 * page consuming it. This proves the page renders the API's error rows and
 * that "Resolve" calls the resolve endpoint on the right error id.
 */

const ERROR_ROW = {
  id: 'err-1',
  created_at: '2026-07-10T12:00:00Z',
  route: '/api/bookings',
  action: '/api/bookings',
  message: 'Booking create failed',
  stack: null,
  severity: 'high',
  tenant_id: 'tenant-nycmaid',
  resolved: false,
  resolved_at: null,
  resolution_notes: null,
  metadata: null,
}

describe('AdminErrorsPage', () => {
  beforeEach(() => {
    global.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      if (String(url).startsWith('/api/admin/errors') && init?.method === 'PATCH') {
        return { ok: true, json: async () => ({ success: true }) } as Response
      }
      if (String(url).startsWith('/api/admin/errors')) {
        return {
          ok: true,
          json: async () => ({
            summary: { unresolvedErrors: 1, failedNotifications: 0, retriedSuccessfully: 0, timeRange: '24h' },
            errors: [ERROR_ROW],
          }),
        } as Response
      }
      throw new Error(`unexpected fetch: ${url}`)
    }) as unknown as typeof fetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the unresolved error row from the API', async () => {
    render(<AdminErrorsPage />)
    await waitFor(() => expect(screen.getByText('Booking create failed')).toBeInTheDocument())
    expect(screen.getByText('high')).toBeInTheDocument()
  })

  it('Resolve button PATCHes the error id', async () => {
    render(<AdminErrorsPage />)
    await waitFor(() => expect(screen.getByText('Booking create failed')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Resolve'))

    await waitFor(() => {
      const patchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
        (c: unknown[]) => c[1] && (c[1] as RequestInit).method === 'PATCH',
      )
      expect(patchCall).toBeTruthy()
      const body = JSON.parse((patchCall![1] as RequestInit).body as string)
      expect(body.errorId).toBe('err-1')
    })
  })
})
