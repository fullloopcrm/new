/**
 * Fresh-ground fix, item (108)'s flagged follow-up: like decline before it,
 * a document reaching all-signers-signed never told the tenant admin either
 * — unlike quotes/public/[token]/accept/route.ts's notify()+ownerAlert()
 * pair on its own positive-outcome event. sendCompletionCopies (untouched)
 * only reaches the *signers*; notifyOwnerDocumentCompleted is the separate
 * admin-facing signal, called from the sign route's allDone branch.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const notifyMock = vi.fn(async (..._args: unknown[]) => ({ success: true }))
vi.mock('@/lib/notify', () => ({ notify: (...args: unknown[]) => notifyMock(...args) }))

const ownerAlertMock = vi.fn(async (..._args: unknown[]) => {})
vi.mock('@/lib/messaging/owner-alerts', () => ({ ownerAlert: (...args: unknown[]) => ownerAlertMock(...args) }))

beforeEach(() => {
  notifyMock.mockClear()
  ownerAlertMock.mockClear()
})

describe('notifyOwnerDocumentCompleted — owner notified when a document finishes signing', () => {
  it('fires notify(document_completed) + ownerAlert with the signer roster and title', async () => {
    const { notifyOwnerDocumentCompleted } = await import('./route')
    const doc = { id: 'doc-1', tenant_id: 'tenant-A', title: 'Service Agreement' }
    const signers = [
      { id: 's1', name: 'Alex Rivera', email: 'alex@example.com' },
      { id: 's2', name: 'Jamie Lee', email: null },
    ]

    await notifyOwnerDocumentCompleted(doc, signers)

    expect(notifyMock).toHaveBeenCalledTimes(1)
    expect(notifyMock.mock.calls[0][0]).toMatchObject({
      type: 'document_completed',
      tenantId: 'tenant-A',
      recipientType: 'admin',
    })
    expect((notifyMock.mock.calls[0][0] as { message: string }).message).toContain('Alex Rivera')

    expect(ownerAlertMock).toHaveBeenCalledTimes(1)
    const alertArg = ownerAlertMock.mock.calls[0][0] as { tenantId: string; bodyHtml: string; subject: string }
    expect(alertArg).toMatchObject({ tenantId: 'tenant-A' })
    expect(alertArg.subject).toContain('Service Agreement')
    expect(alertArg.bodyHtml).toContain('Alex Rivera')
    expect(alertArg.bodyHtml).toContain('Jamie Lee')
  })

  it('still fires both alerts (with a generic "All parties signed" message) when no signer has a name', async () => {
    const { notifyOwnerDocumentCompleted } = await import('./route')
    const doc = { id: 'doc-2', tenant_id: 'tenant-B', title: 'NDA' }

    await notifyOwnerDocumentCompleted(doc, [])

    expect(notifyMock).toHaveBeenCalledTimes(1)
    expect((notifyMock.mock.calls[0][0] as { message: string }).message).toBe('All parties signed')
    expect(ownerAlertMock).toHaveBeenCalledTimes(1)
  })

  // The two tests above only prove the function itself works in isolation —
  // pdf-lib/storage/email make a full POST integration test impractical
  // (heaviest route in this family, per its own top-of-file comment). This
  // source-reading guard is what actually catches the gap this fix closes:
  // it fails if a future edit removes the call site and drops the function
  // back to dead, uncalled code, same technique as middleware-domain-lookup
  // .test.ts's isPublicRoute guards.
  it('is actually called from the allDone branch of POST', () => {
    const src = readFileSync(join(__dirname, 'route.ts'), 'utf8')
    const allDoneStart = src.indexOf('if (allDone) {')
    const allDoneEnd = src.indexOf('\n    } else {', allDoneStart)
    expect(allDoneStart).toBeGreaterThan(-1)
    expect(allDoneEnd).toBeGreaterThan(allDoneStart)
    const allDoneBlock = src.slice(allDoneStart, allDoneEnd)
    expect(
      allDoneBlock.includes('notifyOwnerDocumentCompleted('),
      'sign/route.ts\'s allDone branch no longer calls notifyOwnerDocumentCompleted — the tenant admin will stop hearing about completed documents again.',
    ).toBe(true)
  })
})
