import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'

let _resend: Resend | null = null

async function logEmailFailure(to: string, subject: string, error: unknown) {
  try {
    const errMsg = typeof error === 'string' ? error : (error as any)?.message || JSON.stringify(error)
    const truncated = (errMsg || 'unknown error').slice(0, 400)
    await supabaseAdmin.from('notifications').insert({
      type: 'comms_fail',
      title: 'Email send failed',
      message: `email to ${to} | subject=${subject.slice(0, 80)} | error=${truncated}`,
    })
  } catch {
    // never throw from the logger
  }
}
function getResend() {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY?.replace(/\s/g, '')
    if (!key) throw new Error('RESEND_API_KEY not set')
    _resend = new Resend(key)
  }
  return _resend
}

// Emails sent TO these domains are admin emails — don't BCC owner on those
const ADMIN_DOMAINS = ['thenycmaid.com', 'thenycmaid.gmail.com']

function isAdminEmail(email: string): boolean {
  return ADMIN_DOMAINS.some(d => email.toLowerCase().endsWith(`@${d}`) || email.toLowerCase().includes('thenycmaid'))
}

export async function sendEmail(to: string, subject: string, html: string, attachments?: any[], options?: { bcc?: string | string[]; skipOwnerBcc?: boolean }) {
  const maxRetries = 3
  const delays = [1000, 2000, 4000]

  // Auto-BCC owner on all outbound emails to clients/cleaners (not admin-to-admin)
  let bcc = options?.bcc
  if (!options?.skipOwnerBcc && !isAdminEmail(to)) {
    const ownerBcc = process.env.OWNER_BCC_EMAIL
    if (ownerBcc) {
      const existing = bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : []
      bcc = [...existing, ownerBcc]
    }
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { data, error } = await getResend().emails.send({
        from: 'The NYC Maid <hi@thenycmaid.com>',
        to,
        subject,
        html,
        attachments,
        ...(bcc ? { bcc } : {}),
      })
      if (error) {
        // Don't retry validation errors (bad email, etc)
        if (error.message?.includes('validation') || error.message?.includes('invalid')) {
          console.error('Email validation error:', error)
          await logEmailFailure(to, subject, error)
          return { success: false, error }
        }
        if (attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, delays[attempt]))
          continue
        }
        console.error('Email error after retries:', error)
        await logEmailFailure(to, subject, error)
        return { success: false, error }
      }
      return { success: true, data }
    } catch (err) {
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, delays[attempt]))
        continue
      }
      console.error('Email exception after retries:', err)
      await logEmailFailure(to, subject, err)
      return { success: false, error: err }
    }
  }
  await logEmailFailure(to, subject, 'Max retries exceeded')
  return { success: false, error: 'Max retries exceeded' }
}
