import { generateEmdLlmsTxt } from '@/app/site/the-florida-maid/_lib/emd/llms-txt'
import { carrollwoodMaidConfig as config } from '@/app/site/the-florida-maid/_lib/emd/carrollwood-maid'

export function GET() {
  return new Response(generateEmdLlmsTxt(config), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
