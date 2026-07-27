import { supabaseAdmin } from './supabase'
import { isCommEnabled } from './comms-prefs'
import { sendSMS } from './sms'
import { smsAdmins } from './admin-contacts'
import { sendPushToTeamMember, sendPushToTenantAdmins } from './push'

function preview(body: string): string {
  return body.length > 140 ? body.slice(0, 137) + '...' : body
}

/**
 * Fire push + gated SMS for a new Connect DM. Best-effort — a delivery
 * failure never blocks the message send that triggered it.
 */
export async function notifyConnectDM(params: {
  tenantId: string
  direction: 'to_team' | 'to_owner'
  teamMemberId: string
  senderName: string
  body: string
}): Promise<void> {
  const msg = preview(params.body)

  if (params.direction === 'to_team') {
    await sendPushToTeamMember(params.teamMemberId, `New message from ${params.senderName}`, msg, '/team/dashboard/connect')
      .catch(err => console.error('[connect-notify] team push failed:', err))

    if (await isCommEnabled(params.tenantId, 'team_new_message', 'sms')) {
      const [{ data: member }, { data: tenant }] = await Promise.all([
        supabaseAdmin.from('team_members').select('phone').eq('id', params.teamMemberId).single(),
        supabaseAdmin.from('tenants').select('telnyx_api_key, telnyx_phone, sms_from_number').eq('id', params.tenantId).single(),
      ])
      const telnyxPhone = tenant?.sms_from_number || tenant?.telnyx_phone
      if (member?.phone && tenant?.telnyx_api_key && telnyxPhone) {
        await sendSMS({
          to: member.phone,
          body: `${params.senderName} (Loop Connect): ${msg}`,
          telnyxApiKey: tenant.telnyx_api_key,
          telnyxPhone,
        }).catch(err => console.error('[connect-notify] team SMS failed:', err))
      }
    }
  } else {
    await sendPushToTenantAdmins(params.tenantId, `New message from ${params.senderName}`, msg, '/dashboard/connect')
      .catch(err => console.error('[connect-notify] owner push failed:', err))

    if (await isCommEnabled(params.tenantId, 'owner_new_message', 'sms')) {
      await smsAdmins(params.tenantId, `${params.senderName} (Loop Connect): ${msg}`)
        .catch(err => console.error('[connect-notify] owner SMS failed:', err))
    }
  }
}
