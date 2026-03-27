import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { validate } from '@/lib/validate'
import { sendEmail } from '@/lib/email'
import { requireAdmin } from '@/lib/require-admin'

/*
  SQL to create the partner_requests table:

  CREATE TABLE partner_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    website TEXT,
    service_category TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    years_in_business TEXT,
    team_size TEXT,
    monthly_revenue TEXT,
    current_system TEXT,
    referral_source TEXT,
    pitch TEXT,
    status TEXT DEFAULT 'pending',
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT
  );
  CREATE INDEX idx_partner_requests_status ON partner_requests(status);
  CREATE INDEX idx_partner_requests_email ON partner_requests(email);
  CREATE INDEX idx_partner_requests_city ON partner_requests(city, service_category);
*/

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // If requesting filtered list by status, require super admin auth
    if (status) {
      const authError = await requireAdmin()
      if (authError) return authError

      const { data, error } = await supabaseAdmin
        .from('partner_requests')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ requests: data, total: data?.length ?? 0 })
    }

    // Public: return count of approved partnerships
    const { count, error } = await supabaseAdmin
      .from('partner_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')

    if (error) {
      return NextResponse.json({ total: 0 })
    }

    return NextResponse.json({ total: count ?? 0 })
  } catch {
    return NextResponse.json({ total: 0 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const { data: fields, error: vError } = validate(body, {
      business_name: { type: 'string', required: true, max: 200 },
      contact_name: { type: 'string', required: true, max: 200 },
      email: { type: 'email', required: true },
      phone: { type: 'phone' },
      website: { type: 'url' },
      service_category: { type: 'string', required: true, max: 100 },
      city: { type: 'string', required: true, max: 100 },
      state: { type: 'string', required: true, max: 2 },
      years_in_business: { type: 'string', required: true, max: 20 },
      team_size: { type: 'string', required: true, max: 20 },
      monthly_revenue: { type: 'string', required: true, max: 20 },
      current_system: { type: 'string', max: 50 },
      referral_source: { type: 'string', max: 50 },
      pitch: { type: 'string', required: true, max: 2000 },
    })

    if (vError) {
      return NextResponse.json({ error: vError }, { status: 400 })
    }

    const validated = fields as Record<string, unknown>

    // Rate limit: check if same email submitted in last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recentSubmission } = await supabaseAdmin
      .from('partner_requests')
      .select('id')
      .eq('email', validated.email)
      .gte('created_at', twentyFourHoursAgo)
      .limit(1)
      .single()

    if (recentSubmission) {
      return NextResponse.json(
        { error: 'An application with this email was already submitted in the last 24 hours. Please try again later.' },
        { status: 429 }
      )
    }

    // Insert the partner request
    const { data, error } = await supabaseAdmin
      .from('partner_requests')
      .insert({
        business_name: validated.business_name,
        contact_name: validated.contact_name,
        email: validated.email,
        phone: validated.phone,
        website: validated.website,
        service_category: validated.service_category,
        city: validated.city,
        state: validated.state,
        years_in_business: validated.years_in_business,
        team_size: validated.team_size,
        monthly_revenue: validated.monthly_revenue,
        current_system: validated.current_system,
        referral_source: validated.referral_source,
        pitch: validated.pitch,
        status: 'pending',
      })
      .select('id')
      .single()

    if (error) {
      console.error('Partner request insert error:', error)
      return NextResponse.json({ error: 'Failed to submit application. Please try again.' }, { status: 500 })
    }

    // Send email notification to admin (non-blocking)
    sendEmail({
      to: 'jeff@consortiumnyc.com',
      subject: `[New Request] ${validated.business_name} — ${validated.service_category} in ${validated.city}, ${validated.state}`,
      html: generateRequestEmailHtml({
        business_name: validated.business_name as string,
        contact_name: validated.contact_name as string,
        email: validated.email as string,
        phone: validated.phone as string | undefined,
        service_category: validated.service_category as string,
        city: validated.city as string,
        state: validated.state as string,
        years_in_business: validated.years_in_business as string,
        team_size: validated.team_size as string,
        monthly_revenue: validated.monthly_revenue as string,
        current_system: validated.current_system as string | undefined,
        referral_source: validated.referral_source as string | undefined,
        pitch: validated.pitch as string,
        created_at: new Date().toISOString(),
      }),
    }).catch((err) => {
      console.error('Failed to send partner request email notification:', err)
    })

    return NextResponse.json({ success: true, id: data.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

function generateRequestEmailHtml({
  business_name,
  contact_name,
  email,
  phone,
  service_category,
  city,
  state,
  years_in_business,
  team_size,
  monthly_revenue,
  current_system,
  referral_source,
  pitch,
  created_at,
}: {
  business_name: string
  contact_name: string
  email: string
  phone?: string
  service_category: string
  city: string
  state: string
  years_in_business: string
  team_size: string
  monthly_revenue: string
  current_system?: string
  referral_source?: string
  pitch: string
  created_at: string
}): string {
  const timestamp = new Date(created_at).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/New_York',
  })

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 600;">New Partner Request</h1>
      <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">${timestamp}</p>
    </div>

    <!-- Main Content -->
    <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">

      <!-- Business Info Section -->
      <div style="margin-bottom: 30px;">
        <h2 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 600; color: #667eea; text-transform: uppercase; letter-spacing: 0.5px;">Business Information</h2>
        <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #667eea;">
          <p style="margin: 0 0 12px 0;"><strong>Business Name:</strong> ${escapeHtml(business_name)}</p>
          <p style="margin: 0 0 12px 0;"><strong>Service Category:</strong> ${escapeHtml(service_category)}</p>
          <p style="margin: 0 0 12px 0;"><strong>Location:</strong> ${escapeHtml(city)}, ${escapeHtml(state)}</p>
          <p style="margin: 0;"><strong>Years in Business:</strong> ${escapeHtml(years_in_business)}</p>
        </div>
      </div>

      <!-- Contact Info Section -->
      <div style="margin-bottom: 30px;">
        <h2 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 600; color: #667eea; text-transform: uppercase; letter-spacing: 0.5px;">Contact Information</h2>
        <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #667eea;">
          <p style="margin: 0 0 12px 0;"><strong>Contact Name:</strong> ${escapeHtml(contact_name)}</p>
          <p style="margin: 0 0 12px 0;"><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}" style="color: #667eea; text-decoration: none;">${escapeHtml(email)}</a></p>
          ${phone ? `<p style="margin: 0;"><strong>Phone:</strong> ${escapeHtml(phone)}</p>` : ''}
        </div>
      </div>

      <!-- Company Details Section -->
      <div style="margin-bottom: 30px;">
        <h2 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 600; color: #667eea; text-transform: uppercase; letter-spacing: 0.5px;">Company Details</h2>
        <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #667eea;">
          <p style="margin: 0 0 12px 0;"><strong>Team Size:</strong> ${escapeHtml(team_size)}</p>
          <p style="margin: 0 0 12px 0;"><strong>Monthly Revenue:</strong> ${escapeHtml(monthly_revenue)}</p>
          ${current_system ? `<p style="margin: 0 0 12px 0;"><strong>Current System:</strong> ${escapeHtml(current_system)}</p>` : ''}
          ${referral_source ? `<p style="margin: 0;"><strong>How They Heard:</strong> ${escapeHtml(referral_source)}</p>` : ''}
        </div>
      </div>

      <!-- Pitch Section -->
      <div style="margin-bottom: 30px;">
        <h2 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 600; color: #667eea; text-transform: uppercase; letter-spacing: 0.5px;">Their Pitch</h2>
        <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #667eea;">
          <p style="margin: 0; white-space: pre-wrap; word-wrap: break-word;">${escapeHtml(pitch)}</p>
        </div>
      </div>

      <!-- CTA -->
      <div style="text-align: center; margin-top: 30px;">
        <a href="https://homeservicesbusinesscrm.com/admin/requests" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">View in Admin Dashboard</a>
      </div>

    </div>

    <!-- Footer -->
    <div style="background: #f3f4f6; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; text-align: center; font-size: 12px; color: #666;">
      <p style="margin: 0;">Full Loop CRM Partner Request</p>
      <p style="margin: 5px 0 0 0; color: #999;">This is an automated notification from your partner request system.</p>
    </div>

  </div>
</body>
</html>
  `.trim()
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (char) => map[char])
}
