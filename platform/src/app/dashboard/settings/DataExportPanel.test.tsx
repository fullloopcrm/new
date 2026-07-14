import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DataExportPanel from './DataExportPanel'

describe('DataExportPanel', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:mock'),
      revokeObjectURL: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('requests the P1 GDPR export endpoint with the chosen format and downloads the blob', async () => {
    const blob = new Blob(['{}'], { type: 'application/json' })
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => blob,
    })
    vi.stubGlobal('fetch', fetchMock)
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(<DataExportPanel />)
    fireEvent.click(screen.getByRole('button', { name: /request full export \(json\)/i }))

    await waitFor(() => expect(screen.getByText('Export downloaded')).toBeInTheDocument())

    expect(fetchMock).toHaveBeenCalledWith('/api/gdpr/export?format=json')
    expect(clickSpy).toHaveBeenCalled()
  })

  it('shows a permission-denied message on a 403 without attempting a download', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 403 })
    vi.stubGlobal('fetch', fetchMock)

    render(<DataExportPanel />)
    fireEvent.click(screen.getByRole('button', { name: /request full export \(zip\)/i }))

    await waitFor(() =>
      expect(screen.getByText(/don't have permission to export tenant data/i)).toBeInTheDocument(),
    )
    expect(screen.queryByText('Export downloaded')).not.toBeInTheDocument()
  })

  it('surfaces a server-provided error message on failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Export collector threw' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<DataExportPanel />)
    fireEvent.click(screen.getByRole('button', { name: /request full export \(json\)/i }))

    await waitFor(() => expect(screen.getByText('Export collector threw')).toBeInTheDocument())
  })
})
