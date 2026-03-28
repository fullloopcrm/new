import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { verifyToken } from '../auth/route'

const MAX_SIZE = 150 * 1024 * 1024 // 150MB
const ALLOWED_MIMES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp', 'video/x-m4v']

// GET — generate signed upload URL (bypasses Vercel 4.5MB body limit)
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const auth = verifyToken(token)
    if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const bookingId = req.nextUrl.searchParams.get('booking_id')
    const type = req.nextUrl.searchParams.get('type') as 'walkthrough' | 'final'
    const filename = req.nextUrl.searchParams.get('filename') || 'video.mp4'
    const contentType = req.nextUrl.searchParams.get('content_type') || 'video/mp4'

    if (!bookingId || !type) {
      return NextResponse.json({ error: 'booking_id and type required' }, { status: 400 })
    }

    if (!ALLOWED_MIMES.includes(contentType)) {
      return NextResponse.json({ error: 'Video must be MP4, MOV, WebM, M4V, or 3GP' }, { status: 400 })
    }

    // Validate booking exists and belongs to this tenant + team member
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('id', bookingId)
      .eq('tenant_id', auth.tid)
      .single()
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    const ext = (filename.split('.').pop() || 'mp4').toLowerCase()
    const safeExt = ['mp4', 'mov', 'webm', '3gp', 'm4v'].includes(ext) ? ext : 'mp4'
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 8)
    const path = `${auth.tid}/job-videos/${bookingId}/${type}-${timestamp}-${randomId}.${safeExt}`

    const { data, error } = await supabaseAdmin.storage
      .from('uploads')
      .createSignedUploadUrl(path)

    if (error) {
      console.error('Signed URL error:', error)
      return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('uploads')
      .getPublicUrl(path)

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path,
      publicUrl: urlData.publicUrl,
    })
  } catch (err) {
    console.error('Signed URL error:', err)
    return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
  }
}

// POST — save video reference after signed URL upload, or legacy direct upload
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const auth = verifyToken(token)
    if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const contentType = req.headers.get('content-type') || ''

    // JSON body = signed URL flow (save reference after upload)
    if (contentType.includes('application/json')) {
      const { booking_id, type, url } = await req.json()
      if (!booking_id || !type || !url) {
        return NextResponse.json({ error: 'booking_id, type, and url required' }, { status: 400 })
      }

      const { data: booking } = await supabaseAdmin
        .from('bookings')
        .select('id, team_member_id, start_time, service_type, clients(name), team_members(name)')
        .eq('id', booking_id)
        .eq('tenant_id', auth.tid)
        .single()
      if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

      const field = type === 'walkthrough' ? 'walkthrough_video_url' : 'final_video_url'
      await supabaseAdmin.from('bookings').update({
        [field]: url,
        [`${field}_uploaded_at`]: new Date().toISOString(),
      }).eq('id', booking_id).eq('tenant_id', auth.tid)

      const clientName = (booking.clients as unknown as { name: string })?.name || 'Client'
      const teamMemberName = (booking.team_members as unknown as { name: string })?.name || 'Team Member'
      const videoLabel = type === 'walkthrough' ? 'Walkthrough' : 'Final'
      const jobDate = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

      await notify({
        tenantId: auth.tid,
        type: 'check_in',
        title: `New ${videoLabel} Video Uploaded`,
        message: `${teamMemberName} uploaded ${videoLabel.toLowerCase()} video for ${clientName}'s ${booking.service_type || 'job'} on ${jobDate}`,
        bookingId: booking_id,
      }).catch(() => {})

      return NextResponse.json({ success: true, url })
    }

    // FormData = legacy direct upload (for small files under 4.5MB)
    const formData = await req.formData()
    const file = formData.get('file') as File
    const bookingId = formData.get('booking_id') as string
    const type = formData.get('type') as 'walkthrough' | 'final'

    if (!file || !bookingId || !type) {
      return NextResponse.json({ error: 'file, booking_id, and type required' }, { status: 400 })
    }

    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('id, team_member_id, start_time, service_type, clients(name), team_members(name)')
      .eq('id', bookingId)
      .eq('tenant_id', auth.tid)
      .single()

    if (!booking || booking.team_member_id !== auth.id) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (!ALLOWED_MIMES.includes(file.type)) {
      return NextResponse.json({ error: 'Video must be MP4, MOV, WebM, or 3GP' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Video must be under 150MB' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4'
    const safeExt = ['mp4', 'mov', 'webm', '3gp', 'm4v'].includes(ext) ? ext : 'mp4'
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 8)
    const path = `${auth.tid}/job-videos/${bookingId}/${type}-${timestamp}-${randomId}.${safeExt}`

    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabaseAdmin.storage
      .from('uploads')
      .upload(path, buffer, { contentType: file.type, upsert: false })

    if (uploadError) {
      console.error('Video upload error:', uploadError)
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('uploads')
      .getPublicUrl(path)

    const videoUrl = urlData.publicUrl
    const field = type === 'walkthrough' ? 'walkthrough_video_url' : 'final_video_url'
    await supabaseAdmin.from('bookings').update({
      [field]: videoUrl,
      [`${field}_uploaded_at`]: new Date().toISOString(),
    }).eq('id', bookingId).eq('tenant_id', auth.tid)

    const clientName = (booking.clients as unknown as { name: string })?.name || 'Client'
    const teamMemberName = (booking.team_members as unknown as { name: string })?.name || 'Team Member'
    const videoLabel = type === 'walkthrough' ? 'Walkthrough' : 'Final'
    const jobDate = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

    await notify({
      tenantId: auth.tid,
      type: 'check_in',
      title: `New ${videoLabel} Video Uploaded`,
      message: `${teamMemberName} uploaded ${videoLabel.toLowerCase()} video for ${clientName}'s ${booking.service_type || 'job'} on ${jobDate}`,
      bookingId,
    }).catch(() => {})

    return NextResponse.json({ success: true, url: videoUrl })
  } catch (err) {
    console.error('Video upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
