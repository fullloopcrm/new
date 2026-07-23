import { describe, it, expect } from 'vitest'
import { closeOutUpdateRoute } from './closeout-update-route'

/**
 * p1-w1 queue: BookingsAdmin.tsx's close-out quick actions (Mark Paid,
 * payment-method buttons, Mark Team Paid) PUT to the generic
 * /api/bookings/[id] endpoint, whose pick() allow-list silently drops
 * payment_status/payment_method -- clicking "Paid" flips the checkbox in
 * local state for a moment but nothing persists; a reload shows it unpaid
 * again. This proves the fix: any payment-related field routes to the
 * dedicated PATCH /api/bookings/[id]/payment endpoint instead.
 */

describe('closeOutUpdateRoute', () => {
  it('routes payment_status/payment_method (Mark Paid, payment method buttons) to the payment endpoint', () => {
    expect(closeOutUpdateRoute('bk-1', { payment_status: 'paid' })).toEqual({ url: '/api/bookings/bk-1/payment', method: 'PATCH' })
    expect(closeOutUpdateRoute('bk-1', { payment_method: 'zelle', payment_status: 'paid' })).toEqual({ url: '/api/bookings/bk-1/payment', method: 'PATCH' })
    expect(closeOutUpdateRoute('bk-1', { payment_status: 'pending', payment_method: null })).toEqual({ url: '/api/bookings/bk-1/payment', method: 'PATCH' })
  })

  it('routes team_member_paid (Mark Team Paid) to the payment endpoint', () => {
    expect(closeOutUpdateRoute('bk-1', { team_member_paid: true })).toEqual({ url: '/api/bookings/bk-1/payment', method: 'PATCH' })
  })

  it('routes a plain status change to the generic booking endpoint', () => {
    expect(closeOutUpdateRoute('bk-1', { status: 'in_progress' })).toEqual({ url: '/api/bookings/bk-1', method: 'PUT' })
  })
})
