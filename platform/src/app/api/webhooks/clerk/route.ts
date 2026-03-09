import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Sync Clerk user events to platform
export async function POST(request: Request) {
  const body = await request.json()
  const { type, data } = body

  switch (type) {
    case 'user.created': {
      // New user registered — no action needed beyond Clerk's own tracking
      break
    }

    case 'user.updated': {
      // Sync email/name changes to tenant_members if they exist
      const email = data.email_addresses?.[0]?.email_address
      const firstName = data.first_name || ''
      const lastName = data.last_name || ''
      const fullName = `${firstName} ${lastName}`.trim()

      if (email) {
        // Update any tenant_members records that reference this Clerk user
        const { data: members } = await supabaseAdmin
          .from('tenant_members')
          .select('id')
          .eq('clerk_user_id', data.id)

        if (members && members.length > 0) {
          await supabaseAdmin
            .from('tenant_members')
            .update({
              email,
              ...(fullName && { name: fullName }),
            })
            .eq('clerk_user_id', data.id)
        }
      }
      break
    }

    case 'user.deleted': {
      // Deactivate tenant memberships for deleted users
      await supabaseAdmin
        .from('tenant_members')
        .update({ status: 'inactive' })
        .eq('clerk_user_id', data.id)

      // User deleted — memberships deactivated above
      break
    }

    case 'session.created': {
      // Could track login events here
      break
    }
  }

  return NextResponse.json({ received: true })
}
