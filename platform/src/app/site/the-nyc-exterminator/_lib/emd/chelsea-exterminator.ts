import type { NeighborhoodMicrositeConfig } from './types'

export const chelseaExterminatorConfig: NeighborhoodMicrositeConfig = {
  domain: 'chelseaexterminator.com',
  slug: 'chelsea-exterminator',
  brandName: 'Chelsea Exterminator',
  neighborhoodName: 'Chelsea',
  borough: 'Manhattan',
  metaTitle: 'Chelsea Exterminator | Chelsea Pest Control | NYC Exterminator & Pest Control Services',
  metaDescription: 'Chelsea Exterminator — licensed Chelsea pest control for high-rises, galleries, and rowhouses at a flat $199/hr. Cockroach, bed bug & rat extermination near the High Line. Part of The NYC Exterminator. Call/text (212) 202-8545, free inspection, 24/7 booking.',
  geo: { lat: '40.7465', lng: '-74.0014' },
  introParagraphs: [
    "Chelsea Exterminator is the Chelsea pest control team behind The NYC Exterminator, covering everything from the High Line's converted warehouse galleries to the historic rowhouses west of Eighth Avenue and the newer high-rise towers along the Hudson. If you searched 'Chelsea exterminator' or 'Chelsea pest control,' this is the same licensed, flat-rate team as The NYC Exterminator — just dedicated to this neighborhood.",
    "Chelsea's building stock is genuinely mixed: 19th-century rowhouses, converted industrial buildings now housing galleries and offices, mid-century apartment towers, and brand-new luxury high-rises along the waterfront. Chelsea Exterminator's technicians train across all of it, because a rowhouse basement and a 40-story doorman building need very different treatment approaches.",
    "Whether you manage a gallery near the High Line dealing with rodent activity from nearby construction, live in a Chelsea rowhouse with an old cellar, or run building operations for a high-rise on Eleventh Avenue, Chelsea Exterminator provides a free inspection, written estimate, and one flat $199/hr rate — no contracts, no surprises.",
  ],
  neighborhoodChallenges: [
    { title: 'High Line Construction Pest Displacement', body: 'Ongoing development along the High Line corridor regularly displaces rodent populations into neighboring buildings. We monitor and treat proactively for buildings near active construction sites.' },
    { title: 'Converted Warehouse Galleries', body: 'Chelsea\'s gallery district occupies converted industrial buildings with large open floor plans, loading docks, and freight elevators — entry points a typical residential treatment plan is not built to address.' },
    { title: 'Historic Rowhouse Cellars', body: 'Rowhouses west of Eighth Avenue often have original cellar spaces with dirt floors or aging foundations, prime conditions for American cockroaches and centipedes. We target these areas specifically.' },
    { title: 'High-Rise Waterfront Towers', body: 'Newer high-rises along Eleventh Avenue and the Hudson waterfront see different pest pressure — mostly building-entry via loading docks, parking garages, and mechanical floors rather than through individual units.' },
  ],
  localFaqs: [
    { question: 'Do you treat gallery and commercial spaces in Chelsea?', answer: 'Yes — Chelsea Exterminator provides commercial pest control for galleries, offices, and retail throughout the Chelsea arts district, including converted warehouse spaces.' },
    { question: 'Do you service buildings near active construction on the High Line?', answer: 'Yes. Construction nearby is one of the most common triggers for sudden rodent activity in Chelsea, and we specifically account for it in our inspection and treatment plan.' },
    { question: 'Can you treat a rowhouse cellar or basement?', answer: 'Yes, cellar and basement treatment is standard for Chelsea rowhouses, especially for American cockroaches and centipedes that thrive in older foundation spaces.' },
  ],
}
