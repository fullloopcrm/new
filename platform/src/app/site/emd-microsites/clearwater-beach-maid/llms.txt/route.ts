import { generateEmdLlmsTxt } from '@/app/site/the-florida-maid/_lib/emd/llms-txt'
import { clearwaterBeachMaidConfig as config } from '@/app/site/the-florida-maid/_lib/emd/clearwater-beach-maid'

export function GET() {
  return new Response(generateEmdLlmsTxt(config), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
