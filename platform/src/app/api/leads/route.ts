import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'

const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'jeff@consortiumnyc.com'

// Public endpoint — lead capture from onboarding page
export async function POST(request: Request) {
  const body = await request.json()
  const { name, email, phone, business_name, industry, message } = body

  if (!name || !email || !business_name) {
    return NextResponse.json({ error: 'Name, email, and business name required' }, { status: 400 })
  }

  const { data: lead, error } = await supabaseAdmin
    .from('leads')
    .insert({
      name,
      email: email.toLowerCase(),
      phone: phone || null,
      business_name,
      industry: industry || null,
      message: message || null,
      status: 'new',
    })
    .select()
    .single()

  if (error) {
    // If leads table doesn't exist yet, still notify admin
    console.error('Lead insert error:', error.message)
  }

  // Notify admin
  try {
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `[FL] New Lead: ${business_name}`,
      html: `
        <h2>New Lead Request</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
        <p><strong>Business:</strong> ${business_name}</p>
        <p><strong>Industry:</strong> ${industry || 'Not specified'}</p>
        ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
        <br>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.homeservicesbusinesscrm.com'}/admin">View in Admin</a></p>
      `,
    })
  } catch {
    // Don't fail the request if email fails
  }

  return NextResponse.json({ ok: true, lead: lead || null })
}
