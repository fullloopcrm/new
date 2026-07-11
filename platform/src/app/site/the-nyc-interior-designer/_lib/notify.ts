import { supabaseAdmin } from '@/app/site/the-nyc-interior-designer/_lib/supabase'

interface NotifyOptions {
  type: string
  title: string
  message: string
  project_id?: string
  url?: string
}

export async function notify({ type, title, message, project_id }: NotifyOptions) {
  try {
    const { error } = await supabaseAdmin.from('notifications').insert({ // tenant-scope-ok: single bespoke tenant (the-nyc-interior-designer); retires with cutover
      type,
      title,
      message,
      project_id: project_id || null
    })
    if (error) console.error('notify insert failed:', error)
  } catch (err) {
    console.error('notify insert exception:', err)
  }
}
