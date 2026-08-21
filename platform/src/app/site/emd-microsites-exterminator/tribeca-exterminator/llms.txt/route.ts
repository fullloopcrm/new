import { generateNeighborhoodLlmsTxt } from '@/app/site/the-nyc-exterminator/_lib/emd/llms-txt'
import { tribecaExterminatorConfig as config } from '@/app/site/the-nyc-exterminator/_lib/emd/tribeca-exterminator'

export function GET() {
  return new Response(generateNeighborhoodLlmsTxt(config), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
