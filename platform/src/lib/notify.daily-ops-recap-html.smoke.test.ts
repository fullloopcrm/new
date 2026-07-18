import { describe, it, expect } from 'vitest'
import { dailyOpsRecapEmail, notificationDigestEmail } from './email-templates'

describe('daily_ops_recap / daily_digest HTML templates', () => {
  it('dailyOpsRecapEmail renders branded HTML, not plain text', () => {
    const html = dailyOpsRecapEmail({
      tenantName: 'Acme Cleaning',
      primaryColor: '#111827',
      todayDate: 'Friday, July 18',
      tomorrowDate: 'Saturday, July 19',
      todayJobs: [{ clientName: 'Jane Doe', teamMemberName: 'Sam', time: '9:00 AM – 11:00 AM', revenue: '$150', paymentStatus: 'paid' }],
      tomorrowJobs: [{ clientName: 'John Roe', teamMemberName: 'Alex', time: '1:00 PM – 3:00 PM', revenue: '$200' }],
      todayRevenue: '$150',
      todayJobCount: 1,
      tomorrowJobCount: 1,
      todayPaid: 1,
      todayUnpaid: 0,
    })
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('Fraunces')
    expect(html).toContain('Jane Doe')
    expect(html).toContain('Acme Cleaning')
  })

  it('notificationDigestEmail renders branded HTML, not plain text', () => {
    const html = notificationDigestEmail({
      tenantName: 'Acme Cleaning',
      primaryColor: '#111827',
      date: 'Friday, July 18',
      emailCount: 3,
      smsCount: 2,
      entries: [{ type: 'Booking Confirmed', recipient: 'client', time: '9:00 AM', channel: 'email' }],
    })
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('Fraunces')
    expect(html).toContain('Booking Confirmed')
  })
})
