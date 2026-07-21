/**
 * Shared upload path for job-site photos. All three capture surfaces
 * (office dashboard, crew team-portal, client portal) call this after their
 * own auth check — this is where the storage write + row insert + activity
 * log actually happens, so a fix here fixes all three at once.
 */
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { logJobEvent } from '@/lib/jobs'

export const MAX_JOB_PHOTO_SIZE = 8 * 1024 * 1024
export const ALLOWED_JOB_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
export const JOB_PHOTO_TYPES = ['before', 'after', 'progress'] as const
export type JobPhotoType = (typeof JOB_PHOTO_TYPES)[number]

export function normalizePhotoType(raw: unknown): JobPhotoType {
  return (JOB_PHOTO_TYPES as readonly string[]).includes(raw as string) ? (raw as JobPhotoType) : 'progress'
}

export interface SaveJobPhotoInput {
  tenantId: string
  jobId: string | null
  bookingId: string | null
  file: File
  photoType?: string
  pairId?: string | null
  source: 'crew' | 'client'
  teamMemberId?: string | null
  uploadedBy?: string | null
  caption?: string | null
  lat?: number | null
  lng?: number | null
}

export class JobPhotoError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

/** Validates, uploads to storage, inserts the row, and logs a job_events entry when jobId is set. */
export async function saveJobPhoto(input: SaveJobPhotoInput) {
  const { tenantId, jobId, bookingId, file } = input

  if (!jobId && !bookingId) throw new JobPhotoError('job_id or booking_id required')
  if (file.size > MAX_JOB_PHOTO_SIZE) throw new JobPhotoError('File too large (max 8MB)')
  if (!ALLOWED_JOB_PHOTO_TYPES.includes(file.type)) throw new JobPhotoError('File type not allowed')

  const rawExt = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const ext = rawExt.replace(/[^a-z0-9]/g, '').slice(0, 8) || 'jpg'
  const scopeId = jobId || bookingId
  const storagePath = `${tenantId}/job-photos/${scopeId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: uploadError } = await supabaseAdmin.storage
    .from('uploads')
    .upload(storagePath, buffer, { contentType: file.type, upsert: false })
  if (uploadError) throw new JobPhotoError(uploadError.message, 500)

  const { data: urlData } = supabaseAdmin.storage.from('uploads').getPublicUrl(storagePath)

  const db = tenantDb(tenantId)
  const { data: photo, error } = await db
    .from('job_photos')
    .insert({
      tenant_id: tenantId,
      job_id: jobId,
      booking_id: bookingId,
      url: urlData.publicUrl,
      storage_path: storagePath,
      photo_type: normalizePhotoType(input.photoType),
      pair_id: input.pairId ?? null,
      source: input.source,
      team_member_id: input.teamMemberId ?? null,
      uploaded_by: input.uploadedBy ?? null,
      caption: input.caption ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
    })
    .select('*')
    .single()
  if (error || !photo) throw new JobPhotoError('Failed to save photo', 500)

  if (jobId) {
    await logJobEvent({
      tenant_id: tenantId,
      job_id: jobId,
      event_type: 'photo_added',
      detail: { photo_id: photo.id, photo_type: photo.photo_type, source: input.source },
    })
  }

  return photo
}
