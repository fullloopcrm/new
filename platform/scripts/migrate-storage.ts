/**
 * Copy storage buckets from nycmaid → fullloop and update photo_url references.
 *
 *   - nycmaid `cleaner-photo`  → fullloop `team-photos`
 *   - nycmaid `finance`        → fullloop `finance`
 *
 * Then rewrites team_members.photo_url to point at fullloop's bucket.
 */
import { createClient } from '@supabase/supabase-js'

const fullloop = createClient(
  process.env.FULLLOOP_SUPABASE_URL!,
  process.env.FULLLOOP_SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)
const nycmaid = createClient(
  process.env.NYCMAID_SUPABASE_URL!,
  process.env.NYCMAID_SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const TENANT_ID = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'
const FULLLOOP_HOST = process.env.FULLLOOP_SUPABASE_URL!
const NYCMAID_HOST = process.env.NYCMAID_SUPABASE_URL!

async function ensureBucket(name: string, isPublic: boolean) {
  const { data: existing } = await fullloop.storage.getBucket(name)
  if (existing) {
    console.log(`  bucket ${name} already exists`)
    return
  }
  const { error } = await fullloop.storage.createBucket(name, { public: isPublic })
  if (error) throw new Error(`createBucket ${name}: ${error.message}`)
  console.log(`  ✓ created bucket ${name}`)
}

async function copyBucket(srcBucket: string, dstBucket: string) {
  console.log(`--- copying ${srcBucket} → ${dstBucket} ---`)

  // List all files (paginated)
  const allFiles: string[] = []
  async function listDir(prefix: string) {
    const { data, error } = await nycmaid.storage.from(srcBucket).list(prefix, { limit: 1000, sortBy: { column: 'name', order: 'asc' } })
    if (error) throw new Error(`list ${srcBucket}/${prefix}: ${error.message}`)
    for (const item of data || []) {
      const path = prefix ? `${prefix}/${item.name}` : item.name
      // Folder if no metadata, file if has metadata
      if (item.metadata) {
        allFiles.push(path)
      } else {
        await listDir(path)
      }
    }
  }
  await listDir('')
  console.log(`  found ${allFiles.length} files`)

  let copied = 0
  let skipped = 0
  for (const path of allFiles) {
    // Check if already in dest
    const dirPath = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : ''
    const fileName = path.split('/').pop()!
    const { data: dst } = await fullloop.storage.from(dstBucket).list(dirPath, { search: fileName })
    if (dst && dst.some(f => f.name === fileName)) {
      skipped++
      continue
    }

    // Download from nycmaid
    const { data: blob, error: dlErr } = await nycmaid.storage.from(srcBucket).download(path)
    if (dlErr) {
      console.error(`  ✗ download ${path}: ${dlErr.message}`)
      continue
    }
    if (!blob) continue

    // Upload to fullloop
    const buf = Buffer.from(await blob.arrayBuffer())
    const { error: upErr } = await fullloop.storage.from(dstBucket).upload(path, buf, { upsert: true, contentType: blob.type || 'application/octet-stream' })
    if (upErr) {
      console.error(`  ✗ upload ${path}: ${upErr.message}`)
      continue
    }
    copied++
    if (copied % 10 === 0) console.log(`  copied ${copied}/${allFiles.length}`)
  }
  console.log(`  done: ${copied} copied, ${skipped} already existed`)
}

async function rewritePhotoUrls() {
  console.log('--- rewriting team_members.photo_url ---')
  const { data: members, error } = await fullloop
    .from('team_members')
    .select('id, photo_url')
    .eq('tenant_id', TENANT_ID)
    .not('photo_url', 'is', null)
  if (error) throw new Error(`fetch team_members: ${error.message}`)

  let updated = 0
  for (const m of members || []) {
    const oldUrl = m.photo_url as string
    if (!oldUrl.includes(NYCMAID_HOST)) continue

    // Old: https://nycmaid.supabase.co/storage/v1/object/public/cleaner-photo/<path>
    // New: https://fullloop.supabase.co/storage/v1/object/public/team-photos/<path>
    let newUrl = oldUrl
      .replace(NYCMAID_HOST, FULLLOOP_HOST)
      .replace('/cleaner-photo/', '/team-photos/')

    const { error: upErr } = await fullloop
      .from('team_members')
      .update({ photo_url: newUrl })
      .eq('id', m.id)
      .eq('tenant_id', TENANT_ID)
    if (upErr) {
      console.error(`  ✗ update ${m.id}: ${upErr.message}`)
      continue
    }
    updated++
  }
  console.log(`  ✓ updated ${updated} photo_urls`)
}

async function main() {
  console.log('=== STORAGE MIGRATION ===\n')

  console.log('--- ensuring fullloop buckets ---')
  await ensureBucket('team-photos', true)
  await ensureBucket('finance', true)
  console.log('')

  await copyBucket('cleaner-photo', 'team-photos')
  console.log('')
  await copyBucket('finance', 'finance')
  console.log('')

  await rewritePhotoUrls()
  console.log('')
  console.log('done. photos now point at fullloop storage.')
}

main().catch(err => {
  console.error('[FATAL]', err)
  process.exit(1)
})
