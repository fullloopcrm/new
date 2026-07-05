// One-off local verification of the competitor scan (real engine, real Serper,
// real prod DB). Run: npx tsx --env-file=.env.local src/scripts/scan-competitors.ts [propertyLimit]
import { runCompetitorScan } from '@/lib/seo/competitors'

const limit = Number(process.argv[2]) || 1
runCompetitorScan({ propertyLimit: limit })
  .then((r) => {
    console.log(JSON.stringify(r, null, 2))
    process.exit(0)
  })
  .catch((e) => {
    console.error('SCAN ERROR:', e)
    process.exit(1)
  })
