import { generateNeighborhoodLlmsTxt } from '@/app/site/the-nyc-exterminator/_lib/emd/llms-txt'
import { sohoExterminatorConfig as config } from '@/app/site/the-nyc-exterminator/_lib/emd/soho-exterminator'

export function GET() {
  return new Response(generateNeighborhoodLlmsTxt(config), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
