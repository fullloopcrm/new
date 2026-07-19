// Shared constants for job-site video capture (photos + video, CompanyCam-style).
// Mirrors /api/team-portal/video-upload's size cap; video always goes through
// the signed-upload-url flow since it routinely exceeds the ~4.5MB Vercel
// serverless body limit a multipart POST would hit.
export const VIDEO_MAX_SIZE = 150 * 1024 * 1024 // 150MB
export const VIDEO_MIMES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp', 'video/x-m4v']
export const VIDEO_UPLOAD_CONFIG = { mimes: VIDEO_MIMES, maxSize: VIDEO_MAX_SIZE }
// Client-reported cap, checked against the file's own metadata before upload
// starts. Not re-verified server-side — probing an uploaded video's duration
// needs a media-processing step this app doesn't have.
export const MAX_VIDEO_DURATION_SECONDS = 180
