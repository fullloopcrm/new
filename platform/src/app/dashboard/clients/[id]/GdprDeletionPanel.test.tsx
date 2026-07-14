import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import GdprDeletionPanel from './GdprDeletionPanel'

type OnChangeFields = { deletion_requested_at: string | null; deletion_purge_at: string | null }

describe('GdprDeletionPanel', () => {
  const clientId = 'client-1'
  let onChange: ReturnType<typeof vi.fn<(fields: OnChangeFields) => void>>

  beforeEach(() => {
    onChange = vi.fn<(fields: OnChangeFields) => void>()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('shows a request button when there is no pending or completed deletion', () => {
    render(
      <GdprDeletionPanel
        clientId={clientId}
        deletionRequestedAt={null}
        deletionPurgeAt={null}
        deletedAt={null}
        onChange={onChange}
      />
    )
    expect(screen.getByRole('button', { name: /request data deletion/i })).toBeInTheDocument()
  })

  it('requires an explicit confirmation before calling the API', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(
      <GdprDeletionPanel
        clientId={clientId}
        deletionRequestedAt={null}
        deletionPurgeAt={null}
        deletedAt={null}
        onChange={onChange}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /request data deletion/i }))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /confirm request/i })).toBeInTheDocument()
  })

  it('POSTs to the gdpr endpoint on confirm and surfaces the returned grace window', async () => {
    const purgeAt = '2026-08-13T00:00:00.000Z'
    const requestedAt = '2026-07-14T00:00:00.000Z'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        request: { requested_at: requestedAt, purge_at: purgeAt },
        alreadyPending: false,
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <GdprDeletionPanel
        clientId={clientId}
        deletionRequestedAt={null}
        deletionPurgeAt={null}
        deletedAt={null}
        onChange={onChange}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /request data deletion/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirm request/i }))

    await waitFor(() => expect(onChange).toHaveBeenCalledWith({
      deletion_requested_at: requestedAt,
      deletion_purge_at: purgeAt,
    }))
    expect(fetchMock).toHaveBeenCalledWith(`/api/clients/${clientId}/gdpr`, { method: 'POST' })
  })

  it('shows the pending state with a cancel action when a request is already open', () => {
    render(
      <GdprDeletionPanel
        clientId={clientId}
        deletionRequestedAt="2026-07-14T00:00:00.000Z"
        deletionPurgeAt="2026-08-13T00:00:00.000Z"
        deletedAt={null}
        onChange={onChange}
      />
    )
    expect(screen.getByText(/deletion requested/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel deletion request/i })).toBeInTheDocument()
  })

  it('DELETEs the gdpr endpoint on cancel and clears the pending state', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ cancelled: true }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <GdprDeletionPanel
        clientId={clientId}
        deletionRequestedAt="2026-07-14T00:00:00.000Z"
        deletionPurgeAt="2026-08-13T00:00:00.000Z"
        deletedAt={null}
        onChange={onChange}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /cancel deletion request/i }))

    await waitFor(() => expect(onChange).toHaveBeenCalledWith({
      deletion_requested_at: null,
      deletion_purge_at: null,
    }))
    expect(fetchMock).toHaveBeenCalledWith(`/api/clients/${clientId}/gdpr`, { method: 'DELETE' })
  })

  it('surfaces an API error instead of silently failing', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Forbidden' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <GdprDeletionPanel
        clientId={clientId}
        deletionRequestedAt={null}
        deletionPurgeAt={null}
        deletedAt={null}
        onChange={onChange}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /request data deletion/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirm request/i }))

    await waitFor(() => expect(screen.getByText('Forbidden')).toBeInTheDocument())
    expect(onChange).not.toHaveBeenCalled()
  })

  it('shows the anonymized state once deletedAt is set, with no actions available', () => {
    render(
      <GdprDeletionPanel
        clientId={clientId}
        deletionRequestedAt={null}
        deletionPurgeAt={null}
        deletedAt="2026-08-13T00:00:00.000Z"
        onChange={onChange}
      />
    )
    expect(screen.getByText(/permanently anonymized/i)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
