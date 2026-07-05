import { supabaseAdmin } from '@/app/site/wash-and-fold-nyc/_lib/supabase'
import { sendPushToAll } from '@/app/site/wash-and-fold-nyc/_lib/push'

interface NotifyOptions {
  type: string
  title: string
  message: string
  booking_id?: string
  url?: string
}

/**
 * Insert a dashboard notification AND send push notification.
 * Use this instead of raw supabase.from('notifications').insert().
 */
export async function notify({ type, title, message, booking_id, url }: NotifyOptions) {
  try {
    const { error } = await supabaseAdmin.from('notifications').insert({
      type,
      title,
      message,
      booking_id: booking_id || null
    })
    if (error) console.error('notify insert failed:', error)
  } catch (err) {
    console.error('notify insert exception:', err)
  }

  try {
    await sendPushToAll(title, message, url)
  } catch (err) {
    console.error('notify push failed:', err)
  }
}
