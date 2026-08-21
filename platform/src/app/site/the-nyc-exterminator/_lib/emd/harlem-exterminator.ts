import type { NeighborhoodMicrositeConfig } from './types'

export const harlemExterminatorConfig: NeighborhoodMicrositeConfig = {
  domain: 'harlemexterminator.com',
  slug: 'harlem-exterminator',
  brandName: 'Harlem Exterminator',
  neighborhoodName: 'Harlem',
  borough: 'Manhattan',
  metaTitle: 'Harlem Exterminator | Harlem Pest Control | NYC Exterminator & Pest Control Services',
  metaDescription: 'Harlem Exterminator — licensed Harlem pest control for brownstones, prewar apartments & rentals at a flat $199/hr. Cockroach, rat, mouse & bed bug extermination. Part of The NYC Exterminator. Call/text (212) 202-8545, free inspection, 24/7 booking.',
  geo: { lat: '40.8116', lng: '-73.9465' },
  introParagraphs: [
    "Harlem Exterminator is the Harlem pest control team behind The NYC Exterminator, covering the historic brownstones, prewar rental buildings, and busy commercial corridors from Central Harlem to Sugar Hill. Whether you searched 'Harlem exterminator' or 'Harlem pest control,' this is the same licensed, flat-rate team as every NYC Exterminator job — dedicated to this neighborhood.",
    "Harlem's building stock spans some of the city's oldest housing — 19th-century brownstones, early-1900s prewar apartment buildings, and larger postwar rental complexes — each with distinct pest-entry patterns. Harlem Exterminator's technicians know the difference between treating a single-family brownstone basement and coordinating rodent control across a large multi-unit rental building.",
    "Whether you're a tenant on a rent-stabilized lease dealing with a landlord slow to act, a brownstone owner near Marcus Garvey Park, or a restaurant owner on 125th Street, Harlem Exterminator offers a free inspection, written estimate, and one flat $199/hr rate — plus documentation if you need to demonstrate landlord non-compliance.",
  ],
  neighborhoodChallenges: [
    { title: 'Historic Brownstone Basements', body: "Harlem's 19th-century brownstones often have original basement and cellar spaces prone to moisture and cracks in the foundation, ideal conditions for American cockroaches, centipedes, and rodent entry." },
    { title: 'Prewar Rental Building Coordination', body: 'Large prewar rental buildings need coordinated, building-wide pest treatment — spot-treating a single tenant unit rarely resolves an infestation moving through shared walls and risers.' },
    { title: 'Landlord Compliance Documentation', body: "NYC landlords are legally required to provide pest control under the Housing Maintenance Code. We provide the written documentation tenants need if a landlord is slow to respond to an active infestation." },
    { title: '125th Street Commercial Corridor', body: 'The retail and restaurant density along 125th Street brings regular DOH inspection pressure. We provide documented, compliant commercial treatment for Harlem businesses.' },
  ],
  localFaqs: [
    { question: 'My landlord is slow to respond to a pest problem — can you help?', answer: "Yes. Harlem Exterminator provides written documentation of an inspection and treatment that Harlem tenants can use to support a landlord complaint or HPD filing, since NYC landlords are legally required to provide pest control." },
    { question: 'Do you treat brownstone basements and cellars?', answer: "Yes — basement and cellar treatment is standard for Harlem's brownstones, particularly for American cockroaches and rodent entry points in older foundations." },
    { question: 'Do you coordinate treatment across a whole rental building?', answer: 'Yes, we regularly coordinate building-wide treatment for Harlem prewar rental buildings when pests are moving between units through shared walls or risers.' },
  ],
}
