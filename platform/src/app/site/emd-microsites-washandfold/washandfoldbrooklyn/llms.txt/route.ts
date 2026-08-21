import { generateWashFoldLlmsTxt } from '@/app/site/wash-and-fold-nyc/_lib/emd/llms-txt'
import { washAndFoldBrooklynConfig as config } from '@/app/site/wash-and-fold-nyc/_lib/emd/washandfoldbrooklyn'

export function GET() {
  return new Response(generateWashFoldLlmsTxt(config), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
