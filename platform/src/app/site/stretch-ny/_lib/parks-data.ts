// @ts-nocheck
import type { Park } from "./siteData";

export const allParks: Park[] = [
  // ============================================================
  // MANHATTAN (40+ parks)
  // ============================================================
  {
    name: "Central Park - Sheep Meadow",
    slug: "central-park-sheep-meadow",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "The iconic 15-acre Sheep Meadow is one of the most popular open lawns in the world. Surrounded by towering elms and skyline views, it offers a perfect flat surface for stretching and mobility work year-round.",
    bestSpot:
      "The southwest corner near the 66th Street entrance where the grass is lush and foot traffic is lighter in the mornings.",
    touristRating: 5,
    nearbyAttractions: [
      "Tavern on the Green",
      "Bethesda Fountain",
      "Columbus Circle",
    ],
  },
  {
    name: "Central Park - Great Lawn",
    slug: "central-park-great-lawn",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "The Great Lawn spans 55 acres in the heart of Central Park and is one of the most spacious stretching locations in the city. With views of Belvedere Castle and the surrounding treeline, it is ideal for group stretch sessions.",
    bestSpot:
      "The northern edge near the reservoir path where you can combine a warm-up jog with a full stretch routine.",
    touristRating: 5,
    nearbyAttractions: [
      "Belvedere Castle",
      "Delacorte Theater",
      "Metropolitan Museum of Art",
    ],
  },
  {
    name: "Central Park - Harlem Meer",
    slug: "central-park-harlem-meer",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "Harlem Meer is the serene 11-acre lake at the northern end of Central Park. Far less crowded than the southern sections, it offers peaceful waterside stretching with stunning reflections and birdsong.",
    bestSpot:
      "The grassy bank on the eastern shore near the Charles A. Dana Discovery Center.",
    touristRating: 3,
    nearbyAttractions: [
      "Charles A. Dana Discovery Center",
      "Conservatory Garden",
      "Lasker Rink & Pool",
    ],
  },
  {
    name: "Central Park - North Meadow",
    slug: "central-park-north-meadow",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "North Meadow is a sprawling 23-acre recreation area with wide open fields that feel almost rural. It is one of the least crowded spots in Central Park, making it perfect for uninterrupted stretching.",
    bestSpot:
      "The flat fields near the North Meadow Recreation Center where personal trainers often set up outdoor sessions.",
    touristRating: 2,
    nearbyAttractions: [
      "Central Park Pool",
      "East Meadow",
      "Conservatory Garden",
    ],
  },
  {
    name: "Central Park - Strawberry Fields",
    slug: "central-park-strawberry-fields",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "This tranquil 2.5-acre landscaped section dedicated to John Lennon offers shaded pathways and a contemplative atmosphere. The gentle slopes and soft ground make it a unique spot for mindful stretching.",
    bestSpot:
      "The grassy hillside just west of the Imagine mosaic where mature elms provide shade.",
    touristRating: 5,
    nearbyAttractions: [
      "The Dakota Building",
      "Bow Bridge",
      "American Museum of Natural History",
    ],
  },
  {
    name: "Central Park - Conservatory Garden",
    slug: "central-park-conservatory-garden",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "The only formal garden in Central Park, this six-acre space features manicured lawns, seasonal blooms, and elegant fountains. Its calm, structured setting is perfect for focused stretching and breathwork.",
    bestSpot:
      "The central lawn of the Italian Garden where the symmetrical hedgerows create a natural outdoor studio.",
    touristRating: 4,
    nearbyAttractions: [
      "Museum Mile",
      "El Museo del Barrio",
      "Harlem Meer",
    ],
  },
  {
    name: "The High Line",
    slug: "the-high-line",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "Built on a historic elevated rail line, the High Line is a 1.45-mile linear park with plantings, art installations, and Hudson River views. Its unique elevated perspective makes stretching here a memorable urban experience.",
    bestSpot:
      "The sundeck between 14th and 15th Streets where wooden lounge chairs and open space invite you to stretch above the city.",
    touristRating: 5,
    nearbyAttractions: [
      "Chelsea Market",
      "Whitney Museum of American Art",
      "Hudson Yards",
    ],
  },
  {
    name: "Battery Park",
    slug: "battery-park",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "At the southern tip of Manhattan, Battery Park offers 25 acres of gardens, monuments, and waterfront promenades with unobstructed views of the Statue of Liberty and New York Harbor.",
    bestSpot:
      "The open lawn near Castle Clinton where harbor breezes and Liberty views create an unbeatable backdrop.",
    touristRating: 5,
    nearbyAttractions: [
      "Statue of Liberty Ferry",
      "Castle Clinton",
      "National Museum of the American Indian",
    ],
  },
  {
    name: "Washington Square Park",
    slug: "washington-square-park",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "This beloved Greenwich Village gathering place centers around its iconic arch and fountain. Surrounded by NYU buildings and tree-lined paths, it pulses with creative energy that makes every stretch feel inspired.",
    bestSpot:
      "The northwest corner lawn area where shade from mature trees provides relief on warm days.",
    touristRating: 5,
    nearbyAttractions: [
      "Washington Square Arch",
      "NYU Campus",
      "MacDougal Street",
    ],
  },
  {
    name: "Bryant Park",
    slug: "bryant-park",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "Nestled behind the New York Public Library in Midtown, Bryant Park is a pristine green oasis with a manicured lawn, reading room, and seasonal activities. It is one of the most well-maintained parks in the city.",
    bestSpot:
      "The central lawn where the flat, well-kept grass provides an ideal surface for morning stretch sessions before the lunch crowd arrives.",
    touristRating: 5,
    nearbyAttractions: [
      "New York Public Library",
      "Times Square",
      "Grand Central Terminal",
    ],
  },
  {
    name: "Hudson River Park - Pier 46",
    slug: "hudson-river-park-pier-46",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "Pier 46 is a spacious waterfront park along the Hudson River Greenway with wide lawns, river views, and a relaxed West Village atmosphere. The open design and sunset views make it a favorite for outdoor fitness.",
    bestSpot:
      "The large grass area at the end of the pier where river breezes and unobstructed views create a natural outdoor gym.",
    touristRating: 4,
    nearbyAttractions: [
      "Hudson River Greenway",
      "West Village",
      "Christopher Street Pier",
    ],
  },
  {
    name: "Little Island",
    slug: "little-island",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "Rising from the Hudson River on sculptural concrete pots, Little Island is a 2.4-acre public park with rolling lawns, gardens, and performance spaces. Its futuristic design makes stretching here feel otherworldly.",
    bestSpot:
      "The Glade, a grassy hilltop area with panoramic views of the river and Meatpacking District.",
    touristRating: 5,
    nearbyAttractions: [
      "The High Line",
      "Meatpacking District",
      "Whitney Museum of American Art",
    ],
  },
  {
    name: "Riverside Park",
    slug: "riverside-park",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "Stretching four miles along the Hudson from 72nd to 158th Street, Riverside Park is a Frederick Law Olmsted masterpiece with wooded paths, waterfront promenades, and peaceful hillside lawns.",
    bestSpot:
      "The 91st Street Garden and adjacent lawns where mature trees and river views set a calming scene for deep stretching.",
    touristRating: 3,
    nearbyAttractions: [
      "Soldiers and Sailors Monument",
      "Boat Basin Cafe",
      "Grant's Tomb",
    ],
  },
  {
    name: "Madison Square Park",
    slug: "madison-square-park",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "This elegant Flatiron District park features sculpture installations, towering trees, and views of the Flatiron Building. Its central location and clean lawns make it a convenient stretching spot for Midtown workers.",
    bestSpot:
      "The oval lawn in the center of the park, surrounded by benches and mature London plane trees.",
    touristRating: 4,
    nearbyAttractions: [
      "Flatiron Building",
      "Shake Shack (original)",
      "Museum of Mathematics",
    ],
  },
  {
    name: "Union Square Park",
    slug: "union-square-park",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "Union Square is a vibrant crossroads of downtown Manhattan known for its Greenmarket farmers market and lively atmosphere. The north end offers quieter spaces ideal for stretching amid the urban buzz.",
    bestSpot:
      "The north plaza near the Gandhi statue where open pavement and morning calm provide space before the market opens.",
    touristRating: 4,
    nearbyAttractions: [
      "Union Square Greenmarket",
      "Strand Bookstore",
      "Irving Plaza",
    ],
  },
  {
    name: "Carl Schurz Park",
    slug: "carl-schurz-park",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "Perched along the East River on the Upper East Side, Carl Schurz Park surrounds Gracie Mansion and offers a shaded promenade with views of the river and Roosevelt Island. It is a refined neighborhood gem.",
    bestSpot:
      "The John Finley Walk esplanade along the river where flat pavement and morning sun create a serene stretch corridor.",
    touristRating: 3,
    nearbyAttractions: [
      "Gracie Mansion",
      "East River Esplanade",
      "Yorkville restaurants",
    ],
  },
  {
    name: "Stuyvesant Cove Park",
    slug: "stuyvesant-cove-park",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "A hidden waterfront park along the East River between 18th and 23rd Streets, Stuyvesant Cove features native plantings, a solar-powered educational center, and quiet pathways ideal for stretching.",
    bestSpot:
      "The open area near the environmental classroom where native grasses frame river views.",
    touristRating: 2,
    nearbyAttractions: [
      "Stuyvesant Town",
      "Peter Cooper Village",
      "East River Ferry",
    ],
  },
  {
    name: "South Street Seaport",
    slug: "south-street-seaport",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "The revitalized Seaport district offers cobblestone streets, waterfront plazas, and dramatic views of the Brooklyn Bridge. Its open pier areas provide unique stretching locations with maritime character.",
    bestSpot:
      "Pier 17 rooftop or the open plaza along the waterfront where Brooklyn Bridge views dominate the skyline.",
    touristRating: 4,
    nearbyAttractions: [
      "Brooklyn Bridge",
      "Pier 17",
      "Tin Building by Jean-Georges",
    ],
  },
  {
    name: "Roosevelt Island - FDR Four Freedoms Park",
    slug: "fdr-four-freedoms-park",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "At the southern tip of Roosevelt Island, this Louis Kahn-designed memorial park offers striking geometric lawns, river views on three sides, and a powerful sense of openness that elevates any stretching session.",
    bestSpot:
      "The central triangular lawn where the symmetrical design and river panorama create a meditative environment.",
    touristRating: 4,
    nearbyAttractions: [
      "Roosevelt Island Tramway",
      "Smallpox Hospital Ruins",
      "Cornell Tech Campus",
    ],
  },
  {
    name: "Inwood Hill Park",
    slug: "inwood-hill-park",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "The last natural forest in Manhattan, Inwood Hill Park contains old-growth tulip trees, salt marshes, and glacial caves. Its wild terrain offers a stretching experience that feels miles from the city.",
    bestSpot:
      "The flat fields near the Dyckman Street entrance where soccer players warm up and open grass invites morning routines.",
    touristRating: 2,
    nearbyAttractions: [
      "The Cloisters Museum",
      "Dyckman Farmhouse Museum",
      "Henry Hudson Bridge",
    ],
  },
  {
    name: "Fort Tryon Park",
    slug: "fort-tryon-park",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "Home to The Cloisters museum, Fort Tryon Park features dramatic Hudson River vistas, terraced gardens, and winding paths through 67 acres of landscaped hillside in upper Manhattan.",
    bestSpot:
      "The Heather Garden terrace overlooking the Hudson, where tiered lawns and spectacular views create an elevated stretch experience.",
    touristRating: 4,
    nearbyAttractions: [
      "The Cloisters",
      "New Leaf Restaurant",
      "Margaret Corbin Plaza",
    ],
  },
  {
    name: "Morningside Park",
    slug: "morningside-park",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "A steep, dramatic park carved into the cliff between Morningside Heights and Harlem, Morningside Park features cascading landscapes, a pond, and quiet terraces sheltered by mature trees.",
    bestSpot:
      "The flat area near the 110th Street entrance at the base of the park where the pond and waterfall provide a tranquil backdrop.",
    touristRating: 2,
    nearbyAttractions: [
      "Columbia University",
      "Cathedral of St. John the Divine",
      "Tom's Restaurant",
    ],
  },
  {
    name: "St. Nicholas Park",
    slug: "st-nicholas-park",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "Running along the St. Nicholas Terrace bluff in Harlem, this hilly park offers secluded pathways, rock outcroppings, and shaded clearings that feel refreshingly removed from the city grid.",
    bestSpot:
      "The flat terrace near the 135th Street dog run where open space and morning shade are plentiful.",
    touristRating: 1,
    nearbyAttractions: [
      "Hamilton Grange",
      "City College of New York",
      "Harlem Hospital murals",
    ],
  },
  {
    name: "Marcus Garvey Park",
    slug: "marcus-garvey-park",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "Anchoring central Harlem, Marcus Garvey Park is built around a massive rock outcropping topped with the last remaining fire watchtower in the city. Its terraced design offers surprising variety for stretching.",
    bestSpot:
      "The Pelham Fritz Recreation Center lawn where flat ground and community energy make for a welcoming session.",
    touristRating: 2,
    nearbyAttractions: [
      "Historic Fire Watchtower",
      "Studio Museum in Harlem",
      "125th Street shopping",
    ],
  },
  {
    name: "Tompkins Square Park",
    slug: "tompkins-square-park",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "The heart of the East Village, Tompkins Square Park is a 10-acre gathering place with towering American elms, a dog run, and the creative energy of one of NYC's most storied neighborhoods.",
    bestSpot:
      "The open lawn on the west side of the park where the iconic elm canopy provides shade for morning stretches.",
    touristRating: 3,
    nearbyAttractions: [
      "St. Marks Place",
      "Veselka Restaurant",
      "East Village galleries",
    ],
  },
  {
    name: "Sara D. Roosevelt Park",
    slug: "sara-d-roosevelt-park",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "This narrow linear park runs through the Lower East Side from Houston to Canal Street, featuring basketball courts, playgrounds, and open areas that serve the diverse surrounding community.",
    bestSpot:
      "The open area near the Stanton Street entrance where morning light fills the corridor between buildings.",
    touristRating: 2,
    nearbyAttractions: [
      "Lower East Side Tenement Museum",
      "Katz's Delicatessen",
      "New Museum",
    ],
  },
  {
    name: "East River Park",
    slug: "east-river-park",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "Running along the East River from Montgomery Street to 12th Street, this waterfront park offers running tracks, sports fields, and open riverfront space with views of Brooklyn and the Williamsburg Bridge.",
    bestSpot:
      "The amphitheater area near the Delancey Street entrance where river views and open ground converge.",
    touristRating: 2,
    nearbyAttractions: [
      "Williamsburg Bridge",
      "Lower East Side",
      "East River Greenway",
    ],
  },
  {
    name: "Pier 25",
    slug: "pier-25",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "The longest pier in Hudson River Park, Pier 25 features a mini golf course, sand volleyball courts, a skate park, and wide-open waterfront space in Tribeca. Its size makes it ideal for active stretching.",
    bestSpot:
      "The grassy area along the pier's south edge where the open Hudson River view and river breezes keep you cool.",
    touristRating: 3,
    nearbyAttractions: [
      "Tribeca restaurants",
      "Hudson River Greenway",
      "One World Trade Center",
    ],
  },
  {
    name: "Pier 26",
    slug: "pier-26",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "Recently renovated with native tidal plantings and educational displays, Pier 26 is an eco-focused waterfront park in Tribeca that connects visitors to the Hudson River's natural ecology.",
    bestSpot:
      "The open lawn and tide deck area where the ecological garden and river create a calming atmosphere for stretching.",
    touristRating: 3,
    nearbyAttractions: [
      "Tribeca waterfront",
      "Pier 25",
      "City Vineyard restaurant",
    ],
  },
  {
    name: "Chelsea Waterside Park",
    slug: "chelsea-waterside-park",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "A compact but well-designed waterfront park along the Hudson in Chelsea, featuring playgrounds, a dog run, sports courts, and landscaped paths. Its West Side location draws a fitness-minded crowd.",
    bestSpot:
      "The open turf area near the basketball courts where morning light and the river breeze create a refreshing stretch environment.",
    touristRating: 2,
    nearbyAttractions: [
      "Chelsea Piers",
      "The High Line",
      "Hudson River Greenway",
    ],
  },
  {
    name: "DeWitt Clinton Park",
    slug: "dewitt-clinton-park",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "A historic Hell's Kitchen park with mature trees, open lawns, and a community garden. It provides a quiet respite in one of Midtown West's most vibrant neighborhoods.",
    bestSpot:
      "The central lawn area shaded by mature London plane trees, perfect for a mid-morning stretch.",
    touristRating: 1,
    nearbyAttractions: [
      "Hell's Kitchen restaurants",
      "Intrepid Sea, Air & Space Museum",
      "Hudson Yards",
    ],
  },
  {
    name: "Sakura Park",
    slug: "sakura-park",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "A small hillside park in Morningside Heights named for its Japanese cherry trees, Sakura Park offers stunning spring blossoms and year-round views of the Hudson River and Grant's Tomb.",
    bestSpot:
      "The terraced lawn overlooking Riverside Drive where cherry trees frame the river below.",
    touristRating: 3,
    nearbyAttractions: [
      "Grant's Tomb",
      "Riverside Church",
      "Columbia University",
    ],
  },
  {
    name: "Collect Pond Park",
    slug: "collect-pond-park",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "Built over the site of historic Collect Pond in Lower Manhattan, this modern park features a reflecting pool, stone seating, and open plaza space surrounded by courthouses and civic buildings.",
    bestSpot:
      "The flat plaza near the reflecting pool where the open design allows for uninterrupted morning stretching.",
    touristRating: 2,
    nearbyAttractions: [
      "African Burial Ground Memorial",
      "Chinatown",
      "City Hall",
    ],
  },
  {
    name: "City Hall Park",
    slug: "city-hall-park",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "Surrounding the historic New York City Hall, this triangular park in Lower Manhattan features a grand fountain, winding paths, and manicured gardens. It has been a public gathering place since the 1700s.",
    bestSpot:
      "The southern lawn near the fountain where morning commuters have not yet filled the benches.",
    touristRating: 4,
    nearbyAttractions: [
      "City Hall",
      "Brooklyn Bridge pedestrian entrance",
      "Woolworth Building",
    ],
  },
  {
    name: "Bowling Green",
    slug: "bowling-green",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "The oldest public park in New York City, Bowling Green is a small oval at the foot of Broadway near Wall Street. Home to the Charging Bull sculpture, it carries centuries of history in a compact space.",
    bestSpot:
      "The perimeter path around the central fountain area where early morning offers a rare moment of quiet in the Financial District.",
    touristRating: 5,
    nearbyAttractions: [
      "Charging Bull statue",
      "National Museum of the American Indian",
      "Battery Park",
    ],
  },
  {
    name: "The Vessel at Hudson Yards",
    slug: "the-vessel-hudson-yards",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "The public plaza surrounding the Vessel at Hudson Yards offers a dramatic modern backdrop with wide-open hardscape, seasonal plantings, and views of the towering honeycomb structure.",
    bestSpot:
      "The landscaped terraces on the west side of the plaza where morning sun and open space are abundant.",
    touristRating: 5,
    nearbyAttractions: [
      "Hudson Yards shopping",
      "The High Line",
      "The Shed arts center",
    ],
  },
  {
    name: "Governors Island",
    slug: "governors-island",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "A 172-acre island in New York Harbor accessible by free ferry, Governors Island features rolling hills, historic forts, hammock groves, and some of the most expansive views of the harbor and skyline anywhere in the city.",
    bestSpot:
      "The Hills on the south end of the island where sculpted grassy mounds provide 360-degree views and soft terrain for stretching.",
    touristRating: 5,
    nearbyAttractions: [
      "Castle Williams",
      "Fort Jay",
      "Statue of Liberty views",
    ],
  },
  {
    name: "Teardrop Park",
    slug: "teardrop-park",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "A hidden gem in Battery Park City, Teardrop Park features dramatic rock walls, a wildflower meadow, and a surprisingly lush landscape nestled between residential towers along the Hudson River.",
    bestSpot:
      "The bluestone lawn area framed by glacier-cut rock walls that create a natural amphitheater for stretching.",
    touristRating: 2,
    nearbyAttractions: [
      "Battery Park City Esplanade",
      "Brookfield Place",
      "One World Trade Center",
    ],
  },
  {
    name: "Highbridge Park",
    slug: "highbridge-park",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "Spanning from 155th to Dyckman Street along the Harlem River, Highbridge Park is named for the historic High Bridge aqueduct. Its rugged terrain and river overlooks offer a wild stretching experience.",
    bestSpot:
      "The flat recreation area near the swimming pool at Amsterdam Avenue and 173rd Street.",
    touristRating: 2,
    nearbyAttractions: [
      "High Bridge (oldest bridge in NYC)",
      "Harlem River",
      "Morris-Jumel Mansion",
    ],
  },
  {
    name: "Riverside Park South",
    slug: "riverside-park-south",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "The southern extension of Riverside Park from 72nd Street down to 59th Street features restored waterfront lawns, community gardens, and wide promenades along the Hudson River.",
    bestSpot:
      "The open lawn at Pier I near 70th Street where the river and sunset views are exceptional.",
    touristRating: 3,
    nearbyAttractions: [
      "Lincoln Center",
      "Pier I Cafe",
      "Hudson River Greenway",
    ],
  },
  {
    name: "Randalls Island Park",
    slug: "randalls-island-park",
    borough: "Manhattan",
    boroughSlug: "manhattan",
    description:
      "An expansive island park between Manhattan, the Bronx, and Queens, Randalls Island offers over 60 athletic fields, waterfront paths, and the Urban Farm. It is a fitness destination with room to spare.",
    bestSpot:
      "The waterfront esplanade along the Harlem River where flat paths and open grass stretch for hundreds of yards.",
    touristRating: 2,
    nearbyAttractions: [
      "Icahn Stadium",
      "Randalls Island Urban Farm",
      "Hell Gate Bridge views",
    ],
  },

  // ============================================================
  // BROOKLYN (35+ parks)
  // ============================================================
  {
    name: "Brooklyn Bridge Park",
    slug: "brooklyn-bridge-park",
    borough: "Brooklyn",
    boroughSlug: "brooklyn",
    description:
      "An 85-acre waterfront park stretching 1.3 miles along the East River, Brooklyn Bridge Park features lawns, playgrounds, sports facilities, and jaw-dropping views of the Manhattan skyline and Brooklyn Bridge.",
    bestSpot:
      "Pier 1 lawn where sweeping Manhattan skyline and bridge views create the most iconic stretch backdrop in Brooklyn.",
    touristRating: 5,
    nearbyAttractions: [
      "Brooklyn Bridge",
      "Jane's Carousel",
      "Time Out Market",
    ],
  },
  {
    name: "Prospect Park - Long Meadow",
    slug: "prospect-park-long-meadow",
    borough: "Brooklyn",
    boroughSlug: "brooklyn",
    description:
      "At nearly a mile long, Long Meadow is the longest unbroken meadow in any U.S. urban park. Designed by Olmsted and Vaux, it offers endless green space rimmed by mature forest, ideal for group stretching.",
    bestSpot:
      "The gentle slope near the Picnic House where the meadow is widest and morning fog rolls across the grass.",
    touristRating: 4,
    nearbyAttractions: [
      "Prospect Park Bandshell",
      "Litchfield Villa",
      "Grand Army Plaza",
    ],
  },
  {
    name: "Prospect Park - Nethermead",
    slug: "prospect-park-nethermead",
    borough: "Brooklyn",
    boroughSlug: "brooklyn",
    description:
      "The Nethermead is a 28-acre meadow tucked inside Prospect Park, surrounded by woodland and less visited than Long Meadow. Its secluded feel makes it one of the best spots in Brooklyn for quiet outdoor stretching.",
    bestSpot:
      "The central field accessible from the Nethermead Arches where the surrounding tree canopy creates a bowl of green.",
    touristRating: 3,
    nearbyAttractions: [
      "Prospect Park Zoo",
      "LeFrak Center at Lakeside",
      "The Boathouse",
    ],
  },
  {
    name: "Domino Park",
    slug: "domino-park",
    borough: "Brooklyn",
    boroughSlug: "brooklyn",
    description:
      "Built on the site of the former Domino Sugar Factory in Williamsburg, this waterfront park features industrial relics, a taco stand, and stunning East River views of the Manhattan skyline.",
    bestSpot:
      "The elevated walkway and adjacent lawn where reclaimed industrial artifacts and river views make stretching visually dynamic.",
    touristRating: 4,
    nearbyAttractions: [
      "Williamsburg waterfront",
      "Smorgasburg",
      "Bedford Avenue shops",
    ],
  },
  {
    name: "Fort Greene Park",
    slug: "fort-greene-park",
    borough: "Brooklyn",
    boroughSlug: "brooklyn",
    description:
      "One of Brooklyn's oldest parks, Fort Greene Park features a hilltop Prison Ship Martyrs Monument, winding paths, and mature trees in the heart of the culturally rich Fort Greene neighborhood.",
    bestSpot:
      "The hilltop lawn around the monument where elevated views and open grass reward the short climb.",
    touristRating: 3,
    nearbyAttractions: [
      "BAM (Brooklyn Academy of Music)",
      "Fort Greene restaurants",
      "Brooklyn Flea",
    ],
  },
  {
    name: "Green-Wood Cemetery",
    slug: "green-wood-cemetery",
    borough: "Brooklyn",
    boroughSlug: "brooklyn",
    description:
      "A National Historic Landmark, Green-Wood is a 478-acre Victorian-era cemetery with rolling hills, glacial ponds, and sweeping views. Its manicured paths and serene atmosphere make it a unique stretch destination.",
    bestSpot:
      "The hilltop near Battle Hill, the highest point in Brooklyn, where panoramic views extend to the harbor.",
    touristRating: 4,
    nearbyAttractions: [
      "Sunset Park Chinatown",
      "Industry City",
      "Bush Terminal Park",
    ],
  },
  {
    name: "Coney Island Boardwalk",
    slug: "coney-island-boardwalk",
    borough: "Brooklyn",
    boroughSlug: "brooklyn",
    description:
      "The legendary 2.7-mile Riegelmann Boardwalk stretches along the Atlantic Ocean with beach access, amusement parks, and the energy of one of America's most iconic seaside destinations.",
    bestSpot:
      "The beach area near the Parachute Jump where the wide sandy expanse provides soft ground for ocean-side stretching.",
    touristRating: 5,
    nearbyAttractions: [
      "Luna Park",
      "New York Aquarium",
      "Nathan's Famous",
    ],
  },
  {
    name: "DUMBO Pebble Beach",
    slug: "dumbo-pebble-beach",
    borough: "Brooklyn",
    boroughSlug: "brooklyn",
    description:
      "A small but photogenic waterfront spot beneath the Manhattan Bridge in DUMBO, Pebble Beach offers up-close bridge views, cobblestone streets, and the iconic Washington Street framing shot of the bridge.",
    bestSpot:
      "The rocky shore area where the Manhattan Bridge towers directly overhead and the skyline sparkles across the river.",
    touristRating: 5,
    nearbyAttractions: [
      "Manhattan Bridge",
      "Brooklyn Bridge",
      "DUMBO galleries",
    ],
  },
  {
    name: "McCarren Park",
    slug: "mccarren-park",
    borough: "Brooklyn",
    boroughSlug: "brooklyn",
    description:
      "Straddling the Williamsburg-Greenpoint border, McCarren Park is a 35-acre community hub with a popular public pool, running track, sports fields, and a year-round farmers market.",
    bestSpot:
      "The track and field area where the rubberized surface and open field are perfect for dynamic stretching and warm-ups.",
    touristRating: 3,
    nearbyAttractions: [
      "Williamsburg nightlife",
      "Greenpoint cafes",
      "McCarren Pool",
    ],
  },
  {
    name: "Sunset Park",
    slug: "sunset-park",
    borough: "Brooklyn",
    boroughSlug: "brooklyn",
    description:
      "Perched on a hilltop with panoramic views of the Manhattan skyline, Statue of Liberty, and Verrazano Bridge, Sunset Park is a beloved neighborhood green space with one of the best vistas in Brooklyn.",
    bestSpot:
      "The summit of the hill where 360-degree views and constant breezes create an unmatched stretching environment.",
    touristRating: 3,
    nearbyAttractions: [
      "Sunset Park Chinatown",
      "Industry City",
      "Green-Wood Cemetery",
    ],
  },
  {
    name: "Bush Terminal Park",
    slug: "bush-terminal-park",
    borough: "Brooklyn",
    boroughSlug: "brooklyn",
    description:
      "A reclaimed industrial waterfront park on the Sunset Park shore, Bush Terminal Park features pebble beaches, native plantings, and harbor views in one of Brooklyn's most underrated outdoor spaces.",
    bestSpot:
      "The waterfront lawn overlooking the harbor where Statue of Liberty views accompany your stretching routine.",
    touristRating: 2,
    nearbyAttractions: [
      "Industry City",
      "Sunset Park",
      "Green-Wood Cemetery",
    ],
  },
  {
    name: "Owl's Head Park",
    slug: "owls-head-park",
    borough: "Brooklyn",
    boroughSlug: "brooklyn",
    description:
      "A 27-acre Bay Ridge park on a bluff above the Narrows, Owl's Head Park offers sweeping views of the Verrazano Bridge, a skate park, dog run, and hilly terrain that adds challenge to any stretch session.",
    bestSpot:
      "The hilltop overlook where the Verrazano Bridge fills the horizon and the grass slopes gently downhill.",
    touristRating: 2,
    nearbyAttractions: [
      "Verrazano Bridge",
      "Bay Ridge restaurants",
      "Shore Road Park",
    ],
  },
  {
    name: "Shore Road Park",
    slug: "shore-road-park",
    borough: "Brooklyn",
    boroughSlug: "brooklyn",
    description:
      "A long waterfront greenway in Bay Ridge running beneath the Verrazano Bridge, Shore Road Park provides a paved path, benches, and harbor views along the Narrows strait.",
    bestSpot:
      "The grassy area directly beneath the Verrazano Bridge where the scale of the bridge overhead is awe-inspiring.",
    touristRating: 2,
    nearbyAttractions: [
      "Verrazano Bridge",
      "Owl's Head Park",
      "Bay Ridge Promenade",
    ],
  },
  {
    name: "Valentino Pier",
    slug: "valentino-pier",
    borough: "Brooklyn",
    boroughSlug: "brooklyn",
    description:
      "A small Red Hook waterfront park with an expansive pier jutting into the harbor, Valentino Pier offers unobstructed views of the Statue of Liberty, Governors Island, and the Lower Manhattan skyline.",
    bestSpot:
      "The end of the pier where you are surrounded by water on three sides with the Statue of Liberty directly ahead.",
    touristRating: 4,
    nearbyAttractions: [
      "Red Hook restaurants",
      "IKEA Brooklyn",
      "Statue of Liberty views",
    ],
  },
  {
    name: "Pier 6 - Brooklyn Bridge Park",
    slug: "pier-6-brooklyn-bridge-park",
    borough: "Brooklyn",
    boroughSlug: "brooklyn",
    description:
      "The southernmost pier of Brooklyn Bridge Park, Pier 6 features flower gardens, volleyball courts, playgrounds, and a waterfront lawn. The harbor views and Atlantic Avenue access make it highly convenient.",
    bestSpot:
      "The lawn area facing the harbor where the Statue of Liberty and Governors Island are visible across the water.",
    touristRating: 4,
    nearbyAttractions: [
      "Atlantic Avenue shops",
      "Brooklyn Heights Promenade",
      "Governors Island Ferry",
    ],
  },
  {
    name: "Brooklyn Botanic Garden",
    slug: "brooklyn-botanic-garden",
    borough: "Brooklyn",
    boroughSlug: "brooklyn",
    description:
      "A 52-acre living museum adjacent to Prospect Park, the Brooklyn Botanic Garden features specialty gardens, a cherry blossom esplanade, and manicured lawns. Its curated beauty makes stretching here feel luxurious.",
    bestSpot:
      "The Cherry Esplanade lawn where in spring hundreds of cherry trees create a canopy of pink, and year-round the open lawn is pristine.",
    touristRating: 5,
    nearbyAttractions: [
      "Brooklyn Museum",
      "Prospect Park",
      "Eastern Parkway",
    ],
  },
  {
    name: "Coffey Park",
    slug: "coffey-park",
    borough: "Brooklyn",
    boroughSlug: "brooklyn",
    description:
      "The green heart of Red Hook, Coffey Park is a neighborhood recreation space with ball fields, a pool, and open lawn areas surrounded by the low-rise charm of this waterfront community.",
    bestSpot:
      "The open grass area on the west side of the park where shade from perimeter trees edges the sunny lawn.",
    touristRating: 1,
    nearbyAttractions: [
      "Red Hook Ball Fields food vendors",
      "Pioneer Works",
      "Valentino Pier",
    ],
  },
  {
    name: "Herbert Von King Park",
    slug: "herbert-von-king-park",
    borough: "Brooklyn",
    boroughSlug: "brooklyn",
    description:
      "A historic Bed-Stuy park featuring a cultural amphitheater, playgrounds, and basketball courts, Herbert Von King Park is a community gathering place with a vibrant neighborhood feel.",
    bestSpot:
      "The amphitheater lawn where the gentle grade and open sky make for a comfortable stretching area.",
    touristRating: 1,
    nearbyAttractions: [
      "Bed-Stuy restaurants",
      "Restoration Plaza",
      "Fulton Street shopping",
    ],
  },
  {
    name: "Brower Park",
    slug: "brower-park",
    borough: "Brooklyn",
    boroughSlug: "brooklyn",
    description:
      "Located in Crown Heights adjacent to the Brooklyn Children's Museum, Brower Park offers shaded walking paths, a playground, and community green space in a culturally vibrant neighborhood.",
    bestSpot:
      "The open lawn near the museum entrance where mature trees provide dappled morning shade.",
    touristRating: 1,
    nearbyAttractions: [
      "Brooklyn Children's Museum",
      "Crown Heights restaurants",
      "Weeksville Heritage Center",
    ],
  },
  {
    name: "Lincoln Terrace Park",
    slug: "lincoln-terrace-park",
    borough: "Brooklyn",
    boroughSlug: "brooklyn",
    description:
      "Also known as Arthur S. Somers Park, this Crown Heights park features tennis courts, a playground, and terraced landscaping. Its elevated position offers neighborhood views and a community-focused atmosphere.",
    bestSpot:
      "The upper terrace near the tennis courts where flat ground and morning quiet set the tone for focused stretching.",
    touristRating: 1,
    nearbyAttractions: [
      "Crown Heights",
      "Brooklyn Children's Museum",
      "Eastern Parkway",
    ],
  },
  {
    name: "Commodore Barry Park",
    slug: "commodore-barry-park",
    borough: "Brooklyn",
    boroughSlug: "brooklyn",
    description:
      "A Fort Greene neighborhood park named for the father of the American Navy, Commodore Barry Park features basketball courts, playgrounds, and a central lawn surrounded by brownstone-lined streets.",
    bestSpot:
      "The central lawn area where the enclosed park layout creates a sheltered environment for stretching.",
    touristRating: 1,
    nearbyAttractions: [
      "Brooklyn Navy Yard",
      "DUMBO",
      "Fort Greene restaurants",
    ],
  },
  {
    name: "Grand Ferry Park",
    slug: "grand-ferry-park",
    borough: "Brooklyn",
    boroughSlug: "brooklyn",
    description:
      "A tiny waterfront park at the end of Grand Street in Williamsburg, Grand Ferry Park offers a sliver of East River beach, Manhattan views, and a peaceful escape from the busy neighborhood streets.",
    bestSpot:
      "The small sandy beach and adjacent lawn where the intimate scale and river sounds create a focused stretching environment.",
    touristRating: 2,
    nearbyAttractions: [
      "Williamsburg waterfront",
      "Bedford Avenue",
      "East River Ferry",
    ],
  },
  {
    name: "Transmitter Park",
    slug: "transmitter-park",
    borough: "Brooklyn",
    boroughSlug: "brooklyn",
    description:
      "Named for a WNYC radio transmitter that once stood here, this Greenpoint waterfront park features a lawn, pier, and direct views of the Manhattan skyline across the East River.",
    bestSpot:
      "The pier and adjacent lawn where the Manhattan skyline from Midtown to Downtown unfolds before you.",
    touristRating: 3,
    nearbyAttractions: [
      "Greenpoint waterfront",
      "WNYC Transmitter Park pier",
      "Manhattan Avenue shops",
    ],
  },
  {
    name: "Marsha P. Johnson State Park",
    slug: "marsha-p-johnson-state-park",
    borough: "Brooklyn",
    boroughSlug: "brooklyn",
    description:
      "Formerly East River State Park, this Williamsburg waterfront park was renamed to honor transgender rights activist Marsha P. Johnson. It offers expansive river views and hosts the popular Smorgasburg market.",
    bestSpot:
      "The waterfront lawn where the wide-open space and Manhattan skyline create a striking stretch backdrop.",
    touristRating: 4,
    nearbyAttractions: [
      "Smorgasburg (seasonal)",
      "Williamsburg Bridge",
      "North Brooklyn waterfront",
    ],
  },
  {
    name: "Bushwick Inlet Park",
    slug: "bushwick-inlet-park",
    borough: "Brooklyn",
    boroughSlug: "brooklyn",
    description:
      "An evolving waterfront park in North Williamsburg, Bushwick Inlet Park features sports fields, waterfront access, and views across the East River. Its development continues to add new green space to the area.",
    bestSpot:
      "The turf field area where the synthetic surface provides cushioned ground for dynamic stretching routines.",
    touristRating: 2,
    nearbyAttractions: [
      "McCarren Park",
      "Williamsburg waterfront",
      "Greenpoint",
    ],
  },
  {
    name: "Marine Park",
    slug: "marine-park",
    borough: "Brooklyn",
    boroughSlug: "brooklyn",
    description:
      "One of Brooklyn's largest parks at over 500 acres, Marine Park features salt marshes, ball fields, a golf course, and the Gerritsen Creek nature trail. Its vast scale ensures you can always find quiet space.",
    bestSpot:
      "The open fields along Avenue U where the flat expanse and low-key neighborhood atmosphere feel almost suburban.",
    touristRating: 1,
    nearbyAttractions: [
      "Salt Marsh Nature Center",
      "Marine Park Golf Course",
      "Gerritsen Beach",
    ],
  },
  {
    name: "Cadman Plaza Park",
    slug: "cadman-plaza-park",
    borough: "Brooklyn",
    boroughSlug: "brooklyn",
    description:
      "A formal tree-lined park in Brooklyn Heights near the Borough Hall civic center, Cadman Plaza features war memorials, a central lawn, and a farmers market. Its polished setting bridges Downtown Brooklyn and the Heights.",
    bestSpot:
      "The central lawn between the war memorial and the courthouse where flat ground and mature trees create a dignified stretch space.",
    touristRating: 3,
    nearbyAttractions: [
      "Brooklyn Heights Promenade",
      "Brooklyn Bridge",
      "Brooklyn Borough Hall",
    ],
  },

  // ============================================================
  // QUEENS (25+ parks)
  // ============================================================
  {
    name: "Gantry Plaza State Park",
    slug: "gantry-plaza-state-park",
    borough: "Queens",
    boroughSlug: "queens",
    description:
      "A beautifully designed waterfront park in Long Island City with restored gantry cranes, manicured gardens, and some of the best Manhattan skyline views in all of New York City.",
    bestSpot:
      "The central lawn between the two gantry cranes where the Empire State Building and Chrysler Building line up across the river.",
    touristRating: 5,
    nearbyAttractions: [
      "MoMA PS1",
      "Long Island City waterfront",
      "Hunters Point South Park",
    ],
  },
  {
    name: "Flushing Meadows-Corona Park",
    slug: "flushing-meadows-corona-park",
    borough: "Queens",
    boroughSlug: "queens",
    description:
      "Site of two World's Fairs, this 897-acre park features the Unisphere, a science museum, an art museum, a zoo, and vast open meadows. It is Queens' answer to Central Park in both scale and ambition.",
    bestSpot:
      "The Great Lawn near the Unisphere where the iconic globe sculpture towers overhead and flat grass extends in every direction.",
    touristRating: 5,
    nearbyAttractions: [
      "The Unisphere",
      "Queens Museum",
      "New York Hall of Science",
    ],
  },
  {
    name: "Socrates Sculpture Park",
    slug: "socrates-sculpture-park",
    borough: "Queens",
    boroughSlug: "queens",
    description:
      "An outdoor sculpture museum and public park on the Astoria waterfront, Socrates Sculpture Park transforms a former landfill into a vibrant space for art and recreation with Manhattan skyline views.",
    bestSpot:
      "The waterfront lawn among the rotating sculpture installations where art and river views merge into a creative stretch environment.",
    touristRating: 4,
    nearbyAttractions: [
      "Noguchi Museum",
      "Astoria waterfront",
      "Rainey Park",
    ],
  },
  {
    name: "Astoria Park",
    slug: "astoria-park",
    borough: "Queens",
    boroughSlug: "queens",
    description:
      "A 60-acre park beneath the Hell Gate and RFK Bridges, Astoria Park features the city's oldest and largest public pool, waterfront paths, and dramatic bridge views along the East River.",
    bestSpot:
      "The hilltop lawn near the pool where the Hell Gate Bridge arcs overhead and Randalls Island sits across the water.",
    touristRating: 3,
    nearbyAttractions: [
      "Astoria Pool",
      "Hell Gate Bridge",
      "Museum of the Moving Image",
    ],
  },
  {
    name: "Hunters Point South Park",
    slug: "hunters-point-south-park",
    borough: "Queens",
    boroughSlug: "queens",
    description:
      "A modern waterfront park in Long Island City with innovative landscaping, a playground, and direct East River access. It offers Manhattan skyline views that rival Gantry Plaza next door.",
    bestSpot:
      "The curved waterfront lawn where the park sweeps along the river and the UN Building glows in the morning light.",
    touristRating: 4,
    nearbyAttractions: [
      "Gantry Plaza State Park",
      "LIC Landing",
      "Long Island City galleries",
    ],
  },
  {
    name: "Cunningham Park",
    slug: "cunningham-park",
    borough: "Queens",
    boroughSlug: "queens",
    description:
      "A 358-acre park in Fresh Meadows with forests, playing fields, barbecue areas, and mountain biking trails. It is one of Queens' largest parks and a favorite for outdoor fitness activities.",
    bestSpot:
      "The central playing fields near the main parking area where flat grass and surrounding forest create a natural gym.",
    touristRating: 1,
    nearbyAttractions: [
      "Alley Pond Park",
      "Queens Botanical Garden",
      "Fresh Meadows",
    ],
  },
  {
    name: "Forest Park",
    slug: "forest-park",
    borough: "Queens",
    boroughSlug: "queens",
    description:
      "A 538-acre park in Woodhaven featuring dense oak forests, a golf course, horseback riding trails, and a bandshell. Its woodland character makes it one of the wildest parks in Queens.",
    bestSpot:
      "The Victory Field area where open lawns border the forest edge, combining space for stretching with a woodland backdrop.",
    touristRating: 2,
    nearbyAttractions: [
      "Forest Park Golf Course",
      "Forest Park Carousel",
      "Woodhaven Boulevard",
    ],
  },
  {
    name: "Juniper Valley Park",
    slug: "juniper-valley-park",
    borough: "Queens",
    boroughSlug: "queens",
    description:
      "A well-maintained 55-acre park in Middle Village with a running track, sports fields, playgrounds, and a popular dog run. It is the fitness hub of central Queens.",
    bestSpot:
      "The running track perimeter where the rubberized surface and adjacent grass provide ideal surfaces for stretching.",
    touristRating: 1,
    nearbyAttractions: [
      "Middle Village shops",
      "Juniper Valley restaurants",
      "Lutheran All Faiths Cemetery",
    ],
  },
  {
    name: "Kissena Park",
    slug: "kissena-park",
    borough: "Queens",
    boroughSlug: "queens",
    description:
      "A 235-acre Flushing park with a lake, velodrome, nature trails, and historic tree plantings from the original Parsons Nursery. Its diverse landscapes offer varied terrain for stretching.",
    bestSpot:
      "The lakeside meadow where water views and mature trees create a peaceful setting away from Flushing's bustle.",
    touristRating: 2,
    nearbyAttractions: [
      "Flushing Chinatown",
      "Queens Botanical Garden",
      "Kissena Velodrome",
    ],
  },
  {
    name: "Alley Pond Park",
    slug: "alley-pond-park",
    borough: "Queens",
    boroughSlug: "queens",
    description:
      "One of the largest parks in Queens at 655 acres, Alley Pond Park encompasses wetlands, forests, playing fields, and an environmental center. It is home to the Queens Giant, the city's oldest living tree.",
    bestSpot:
      "The recreation area near the environmental center where flat fields and nature trails offer diverse stretching terrain.",
    touristRating: 2,
    nearbyAttractions: [
      "Alley Pond Environmental Center",
      "Oakland Lake",
      "Queens Giant tulip tree",
    ],
  },
  {
    name: "Roy Wilkins Park",
    slug: "roy-wilkins-park",
    borough: "Queens",
    boroughSlug: "queens",
    description:
      "A 53-acre park in southeastern Queens named for civil rights leader Roy Wilkins, featuring a recreation center, sports fields, a pool, and a bandshell. It serves as a community sports and fitness center.",
    bestSpot:
      "The open fields near the recreation center where morning use is light and the grounds are well maintained.",
    touristRating: 1,
    nearbyAttractions: [
      "Roy Wilkins Recreation Center",
      "Merrick Boulevard",
      "Jamaica Bay",
    ],
  },
  {
    name: "Baisley Pond Park",
    slug: "baisley-pond-park",
    borough: "Queens",
    boroughSlug: "queens",
    description:
      "Centered around the largest freshwater lake in Queens, Baisley Pond Park offers waterside paths, playing fields, and a serene atmosphere in the Jamaica neighborhood.",
    bestSpot:
      "The lakeside path on the western shore where the water and mature willows set a calm scene for morning stretching.",
    touristRating: 1,
    nearbyAttractions: [
      "Baisley Pond",
      "Jamaica Center",
      "Sutphin Boulevard",
    ],
  },
  {
    name: "Rockaway Beach Boardwalk",
    slug: "rockaway-beach-boardwalk",
    borough: "Queens",
    boroughSlug: "queens",
    description:
      "The Rockaways boardwalk stretches for miles along the Atlantic Ocean, offering beach access, surf culture, and an ocean breeze that makes outdoor stretching feel like a coastal retreat.",
    bestSpot:
      "The beach near Beach 86th Street where the surf community gathers and the wide sandy beach provides soft terrain.",
    touristRating: 4,
    nearbyAttractions: [
      "Rockaway Beach surf spots",
      "Tacoway Beach",
      "Riis Park",
    ],
  },
  {
    name: "Jacob Riis Park",
    slug: "jacob-riis-park",
    borough: "Queens",
    boroughSlug: "queens",
    description:
      "A federal beach park on the Rockaway peninsula with an Art Deco bathhouse, wide sandy beaches, and a quieter atmosphere than nearby Rockaway Beach. It is a hidden gem for beachside stretching.",
    bestSpot:
      "The grassy area behind the bathhouse where the Art Deco architecture and ocean views combine.",
    touristRating: 3,
    nearbyAttractions: [
      "Fort Tilden",
      "Rockaway Beach",
      "Marine Parkway Bridge",
    ],
  },
  {
    name: "Fort Totten Park",
    slug: "fort-totten-park",
    borough: "Queens",
    boroughSlug: "queens",
    description:
      "A former Civil War-era military fort on a peninsula in Bayside, Fort Totten Park features historic stone batteries, waterfront paths, and views across Little Neck Bay to the Throgs Neck Bridge.",
    bestSpot:
      "The waterfront lawn near the Officers' Club where views of the bay and bridge extend to the horizon.",
    touristRating: 2,
    nearbyAttractions: [
      "Bayside Marina",
      "Little Neck Bay",
      "Throgs Neck Bridge",
    ],
  },
  {
    name: "Bowne Park",
    slug: "bowne-park",
    borough: "Queens",
    boroughSlug: "queens",
    description:
      "A quiet 11-acre neighborhood park in Flushing with a pond, mature trees, and gentle slopes. Its residential setting and well-maintained grounds make it a reliable local stretching spot.",
    bestSpot:
      "The lawn near the pond where ducks, willows, and morning stillness create a neighborhood oasis.",
    touristRating: 1,
    nearbyAttractions: [
      "Flushing restaurants",
      "Bowne House",
      "Main Street Flushing",
    ],
  },
  {
    name: "Rainey Park",
    slug: "rainey-park",
    borough: "Queens",
    boroughSlug: "queens",
    description:
      "A waterfront park in Astoria with a running track, basketball courts, and East River views. Its proximity to Socrates Sculpture Park makes it easy to combine art and stretching in one visit.",
    bestSpot:
      "The waterfront area along the running track where the river and Randalls Island views provide motivation.",
    touristRating: 2,
    nearbyAttractions: [
      "Socrates Sculpture Park",
      "Noguchi Museum",
      "Astoria restaurants",
    ],
  },
  {
    name: "Queensbridge Park",
    slug: "queensbridge-park",
    borough: "Queens",
    boroughSlug: "queens",
    description:
      "Sitting beneath the Queensboro Bridge in Long Island City, this waterfront park offers dramatic bridge views, sports facilities, and a connection to the East River Greenway.",
    bestSpot:
      "The lawn beneath the bridge where the massive steel structure overhead creates a cathedral-like canopy.",
    touristRating: 3,
    nearbyAttractions: [
      "Queensboro Bridge",
      "Silvercup Studios",
      "Long Island City",
    ],
  },
  {
    name: "Highland Park",
    slug: "highland-park",
    borough: "Queens",
    boroughSlug: "queens",
    description:
      "Straddling the Brooklyn-Queens border, Highland Park features the Ridgewood Reservoir, wooded paths, and one of the best hilltop views in the outer boroughs, extending to Manhattan on clear days.",
    bestSpot:
      "The summit near the reservoir where the panoramic view and open sky create a mountaintop stretching experience.",
    touristRating: 2,
    nearbyAttractions: [
      "Ridgewood Reservoir",
      "Cypress Hills",
      "Jackie Robinson Parkway",
    ],
  },
  {
    name: "Sunnyside Gardens Park",
    slug: "sunnyside-gardens-park",
    borough: "Queens",
    boroughSlug: "queens",
    description:
      "A private community park in the heart of the Sunnyside Gardens Historic District, this park features lush gardens, lawns, and a pool. Its enclosed, members-only character keeps it uncrowded.",
    bestSpot:
      "The central lawn where the enclosed garden setting provides privacy and calm for focused stretching.",
    touristRating: 1,
    nearbyAttractions: [
      "Sunnyside Gardens Historic District",
      "Queens Boulevard",
      "Skillman Avenue restaurants",
    ],
  },
  {
    name: "Travers Park",
    slug: "travers-park",
    borough: "Queens",
    boroughSlug: "queens",
    description:
      "A revitalized Jackson Heights park with a playground, basketball courts, and tree-shaded paths. It serves the diverse surrounding community and hosts neighborhood events year-round.",
    bestSpot:
      "The open area near the 34th Avenue entrance where recent renovations have created clean, flat surfaces for stretching.",
    touristRating: 1,
    nearbyAttractions: [
      "Jackson Heights food scene",
      "74th Street bazaar",
      "Diversity Plaza",
    ],
  },

  // ============================================================
  // BRONX (25+ parks)
  // ============================================================
  {
    name: "Pelham Bay Park",
    slug: "pelham-bay-park",
    borough: "Bronx",
    boroughSlug: "bronx",
    description:
      "At 2,772 acres, Pelham Bay Park is the largest park in New York City, more than three times the size of Central Park. It features forests, salt marshes, a beach, a golf course, and miles of trails.",
    bestSpot:
      "The open fields near the Pelham Bay Park playground where the vast scale of the park provides room for any stretching routine.",
    touristRating: 3,
    nearbyAttractions: [
      "Orchard Beach",
      "Bartow-Pell Mansion Museum",
      "City Island",
    ],
  },
  {
    name: "Van Cortlandt Park",
    slug: "van-cortlandt-park",
    borough: "Bronx",
    boroughSlug: "bronx",
    description:
      "The third largest park in NYC at 1,146 acres, Van Cortlandt Park is famous for its cross-country running course, the city's oldest public golf course, and extensive forest and wetland trails.",
    bestSpot:
      "The Parade Ground, a massive flat field used for cricket and soccer, where early morning stretching is a pre-game ritual.",
    touristRating: 3,
    nearbyAttractions: [
      "Van Cortlandt House Museum",
      "Van Cortlandt Golf Course",
      "Northwest Forest trails",
    ],
  },
  {
    name: "Wave Hill",
    slug: "wave-hill",
    borough: "Bronx",
    boroughSlug: "bronx",
    description:
      "A 28-acre public garden and cultural center in Riverdale overlooking the Hudson River and Palisades. Its manicured gardens, greenhouses, and sweeping river views make it one of the most beautiful outdoor spaces in the city.",
    bestSpot:
      "The Great Lawn where panoramic Palisades and Hudson River views create a stretching experience that feels like an escape to the countryside.",
    touristRating: 4,
    nearbyAttractions: [
      "Hudson River Palisades views",
      "Riverdale neighborhood",
      "Wave Hill House",
    ],
  },
  {
    name: "Bronx Zoo Grounds",
    slug: "bronx-zoo-grounds",
    borough: "Bronx",
    boroughSlug: "bronx",
    description:
      "The grounds surrounding the Bronx Zoo encompass the Bronx River corridor and parkland that connects to the Bronx Park system. The park areas outside the zoo gates offer wooded paths and open spaces.",
    bestSpot:
      "The open areas along the Bronx River near the zoo's southern entrance where the river and tree canopy set a natural tone.",
    touristRating: 4,
    nearbyAttractions: [
      "Bronx Zoo",
      "Bronx River",
      "New York Botanical Garden",
    ],
  },
  {
    name: "New York Botanical Garden",
    slug: "new-york-botanical-garden",
    borough: "Bronx",
    boroughSlug: "bronx",
    description:
      "A 250-acre National Historic Landmark, the NYBG features 50 specialty gardens, a 50-acre old-growth forest, and the Enid A. Haupt Conservatory. Its landscapes provide stunning backdrops for mindful stretching.",
    bestSpot:
      "The Daffodil Hill meadow in spring or the open lawn near the conservatory year-round, where curated beauty surrounds you.",
    touristRating: 5,
    nearbyAttractions: [
      "Enid A. Haupt Conservatory",
      "Bronx Zoo",
      "Bronx River Forest",
    ],
  },
  {
    name: "St. Mary's Park",
    slug: "st-marys-park",
    borough: "Bronx",
    boroughSlug: "bronx",
    description:
      "The oldest park in the Bronx, St. Mary's Park sits on a hill in Mott Haven with recreation facilities, a pool, and elevated views of the Harlem River. Its hilltop design offers breezy stretching spots.",
    bestSpot:
      "The hilltop lawn where views extend over the rooftops of Mott Haven and across to Randalls Island.",
    touristRating: 1,
    nearbyAttractions: [
      "Mott Haven restaurants",
      "Harlem River",
      "The Hub shopping district",
    ],
  },
  {
    name: "Crotona Park",
    slug: "crotona-park",
    borough: "Bronx",
    boroughSlug: "bronx",
    description:
      "A 127-acre park in the heart of the South Bronx featuring a lake, running track, sports fields, and a pool. Indian Lake at its center provides a scenic focus for waterside stretching.",
    bestSpot:
      "The lakeside path around Indian Lake where the water and surrounding trees create a calm environment for stretching.",
    touristRating: 1,
    nearbyAttractions: [
      "Indian Lake",
      "Crotona Pool",
      "Charlotte Street neighborhood",
    ],
  },
  {
    name: "Bronx Park",
    slug: "bronx-park",
    borough: "Bronx",
    boroughSlug: "bronx",
    description:
      "The 718-acre park system that encompasses both the Bronx Zoo and the New York Botanical Garden, connected by the Bronx River. The surrounding parkland offers river walks and forest paths.",
    bestSpot:
      "The Bronx River pathway between the zoo and botanical garden where the river's sound accompanies your stretching routine.",
    touristRating: 3,
    nearbyAttractions: [
      "Bronx Zoo",
      "New York Botanical Garden",
      "Bronx River Alliance",
    ],
  },
  {
    name: "Claremont Park",
    slug: "claremont-park",
    borough: "Bronx",
    boroughSlug: "bronx",
    description:
      "A hilly 38-acre park in the Claremont section of the Bronx with sports facilities, picnic areas, and winding paths through wooded sections. Its varied terrain adds natural resistance to stretching.",
    bestSpot:
      "The open lawn near the playground where the hilltop position catches morning breezes and sunlight.",
    touristRating: 1,
    nearbyAttractions: [
      "Morris Avenue",
      "Claremont neighborhood",
      "Cross Bronx Expressway overlook",
    ],
  },
  {
    name: "Joyce Kilmer Park",
    slug: "joyce-kilmer-park",
    borough: "Bronx",
    boroughSlug: "bronx",
    description:
      "A triangular park in the Concourse neighborhood dedicated to poet Joyce Kilmer, featuring the Lorelei Fountain and tree-lined paths. Its formal layout creates a dignified setting adjacent to the Grand Concourse.",
    bestSpot:
      "The paved area near the Lorelei Fountain where the formal design and morning shade provide a structured stretch environment.",
    touristRating: 2,
    nearbyAttractions: [
      "Grand Concourse",
      "Yankee Stadium",
      "Bronx Museum of the Arts",
    ],
  },
  {
    name: "Franz Sigel Park",
    slug: "franz-sigel-park",
    borough: "Bronx",
    boroughSlug: "bronx",
    description:
      "A steep hillside park near Yankee Stadium offering dramatic elevation changes and views over the Harlem River. Its terraced design provides multiple levels for stretching with different perspectives.",
    bestSpot:
      "The upper terrace where views over the Harlem River and Washington Heights provide a panoramic backdrop.",
    touristRating: 1,
    nearbyAttractions: [
      "Yankee Stadium",
      "Macombs Dam Bridge",
      "Grand Concourse",
    ],
  },
  {
    name: "Poe Park",
    slug: "poe-park",
    borough: "Bronx",
    boroughSlug: "bronx",
    description:
      "Home to the Edgar Allan Poe Cottage where the poet spent his final years, Poe Park in the Fordham section features a bandshell, playground, and literary history in a compact neighborhood setting.",
    bestSpot:
      "The lawn near the bandshell where the literary heritage and neighborhood energy create a character-filled stretch spot.",
    touristRating: 3,
    nearbyAttractions: [
      "Edgar Allan Poe Cottage",
      "Fordham University",
      "Arthur Avenue (Little Italy)",
    ],
  },
  {
    name: "Roberto Clemente State Park",
    slug: "roberto-clemente-state-park",
    borough: "Bronx",
    boroughSlug: "bronx",
    description:
      "A state park along the Harlem River in the Bronx featuring an Olympic-sized pool, athletic fields, and waterfront access. Named for the legendary baseball player, it is a community fitness destination.",
    bestSpot:
      "The riverfront lawn where Harlem River views and open space provide room for full-body stretching routines.",
    touristRating: 2,
    nearbyAttractions: [
      "Harlem River",
      "High Bridge",
      "University Heights",
    ],
  },
  {
    name: "Soundview Park",
    slug: "soundview-park",
    borough: "Bronx",
    boroughSlug: "bronx",
    description:
      "A 205-acre waterfront park at the confluence of the Bronx River and East River, Soundview Park features salt marshes, sports fields, and newly restored wetlands along the Bronx River Greenway.",
    bestSpot:
      "The restored waterfront area along the Bronx River where tidal marshes and open lawn meet.",
    touristRating: 1,
    nearbyAttractions: [
      "Bronx River Greenway",
      "Soundview neighborhood",
      "Clason Point",
    ],
  },
  {
    name: "Barretto Point Park",
    slug: "barretto-point-park",
    borough: "Bronx",
    boroughSlug: "bronx",
    description:
      "A waterfront park in Hunts Point with wide lawns, a fishing pier, and views across the East River to Rikers Island and LaGuardia Airport. It represents the revitalization of the Bronx waterfront.",
    bestSpot:
      "The expansive waterfront lawn where the river view and open sky make for a breezy, spacious stretch session.",
    touristRating: 1,
    nearbyAttractions: [
      "Hunts Point",
      "Concrete Plant Park",
      "Hunts Point Riverside Park",
    ],
  },
  {
    name: "Hunts Point Riverside Park",
    slug: "hunts-point-riverside-park",
    borough: "Bronx",
    boroughSlug: "bronx",
    description:
      "A community-built waterfront park on the Bronx River in Hunts Point, this park features kayak launches, native plantings, and river views. It is a testament to grassroots environmental activism.",
    bestSpot:
      "The riverfront lawn where the Bronx River widens into the East River and morning kayakers pass by.",
    touristRating: 1,
    nearbyAttractions: [
      "Bronx River",
      "Hunts Point Fish Market",
      "Barretto Point Park",
    ],
  },
  {
    name: "Orchard Beach",
    slug: "orchard-beach",
    borough: "Bronx",
    boroughSlug: "bronx",
    description:
      "Known as the Bronx Riviera, Orchard Beach is a crescent-shaped public beach on Long Island Sound within Pelham Bay Park. Its wide promenade and sandy beach draw crowds all summer.",
    bestSpot:
      "The northern end of the beach where the crowd thins out and the crescent shoreline provides soft sand for stretching.",
    touristRating: 3,
    nearbyAttractions: [
      "Pelham Bay Park",
      "City Island",
      "Kazimiroff Nature Trail",
    ],
  },
  {
    name: "Pugsley Creek Park",
    slug: "pugsley-creek-park",
    borough: "Bronx",
    boroughSlug: "bronx",
    description:
      "A restored wetland park in the Soundview neighborhood, Pugsley Creek Park features native plantings, walking paths, and tidal marsh views. It is a quiet ecological oasis in the South Bronx.",
    bestSpot:
      "The elevated boardwalk area overlooking the tidal marsh where birds and water create a meditative stretch backdrop.",
    touristRating: 1,
    nearbyAttractions: [
      "Soundview Park",
      "Bronx River Greenway",
      "Castle Hill neighborhood",
    ],
  },
  {
    name: "Starlight Park",
    slug: "starlight-park",
    borough: "Bronx",
    boroughSlug: "bronx",
    description:
      "A new waterfront park along the Bronx River between the Cross Bronx Expressway and Westchester Avenue, Starlight Park features a boat launch, amphitheater, and landscaped riverfront paths.",
    bestSpot:
      "The amphitheater lawn near the river where the stepped seating area and water views create a natural stretch amphitheater.",
    touristRating: 1,
    nearbyAttractions: [
      "Bronx River",
      "West Farms",
      "Bronx Zoo (nearby)",
    ],
  },
  {
    name: "Macombs Dam Park",
    slug: "macombs-dam-park",
    borough: "Bronx",
    boroughSlug: "bronx",
    description:
      "Directly adjacent to Yankee Stadium, Macombs Dam Park features playing fields, a track, and pre-game energy on game days. It is the gateway to the Bronx's most famous landmark.",
    bestSpot:
      "The running track area where the rubberized surface and open infield provide a proper warm-up and stretch space.",
    touristRating: 3,
    nearbyAttractions: [
      "Yankee Stadium",
      "Grand Concourse",
      "Harlem River waterfront",
    ],
  },
  {
    name: "Pelham Bay Park - Hunter Island",
    slug: "pelham-bay-park-hunter-island",
    borough: "Bronx",
    boroughSlug: "bronx",
    description:
      "The Hunter Island section of Pelham Bay Park features a rocky shoreline, old-growth forest, and a lagoon. Connected to the mainland by a land bridge, it feels like a wilderness escape within the city.",
    bestSpot:
      "The meadow near the Twin Islands where Long Island Sound views and coastal breezes enhance any stretch routine.",
    touristRating: 2,
    nearbyAttractions: [
      "Orchard Beach",
      "Kazimiroff Nature Trail",
      "Long Island Sound shoreline",
    ],
  },
  {
    name: "Bronx River Forest",
    slug: "bronx-river-forest",
    borough: "Bronx",
    boroughSlug: "bronx",
    description:
      "A 50-acre old-growth forest within the New York Botanical Garden, the Bronx River Forest is one of the last remnants of the forest that once covered all of New York City.",
    bestSpot:
      "The clearings along the Bronx River trail where dappled light filters through the ancient canopy.",
    touristRating: 3,
    nearbyAttractions: [
      "New York Botanical Garden",
      "Bronx River",
      "Bronx Zoo",
    ],
  },

  // ============================================================
  // STATEN ISLAND (20+ parks)
  // ============================================================
  {
    name: "Snug Harbor Cultural Center",
    slug: "snug-harbor-cultural-center",
    borough: "Staten Island",
    boroughSlug: "staten-island",
    description:
      "An 83-acre former sailors' retirement home turned cultural campus, Snug Harbor features botanical gardens, museums, performance spaces, and some of the most beautiful grounds on Staten Island.",
    bestSpot:
      "The Tuscan Garden and adjacent lawns where formal landscaping and the historic Greek Revival buildings create an elegant stretch setting.",
    touristRating: 4,
    nearbyAttractions: [
      "Staten Island Botanical Garden",
      "Noble Maritime Collection",
      "Newhouse Center for Contemporary Art",
    ],
  },
  {
    name: "Conference House Park",
    slug: "conference-house-park",
    borough: "Staten Island",
    boroughSlug: "staten-island",
    description:
      "At the southernmost tip of New York State, Conference House Park features the 1680 Billopp House where a failed peace conference with Benjamin Franklin took place. Its beaches face Raritan Bay and New Jersey.",
    bestSpot:
      "The waterfront lawn overlooking Raritan Bay where you can stretch at the very bottom of New York with views to New Jersey.",
    touristRating: 3,
    nearbyAttractions: [
      "Conference House (Billopp House)",
      "Raritan Bay shoreline",
      "Tottenville neighborhood",
    ],
  },
  {
    name: "Clove Lakes Park",
    slug: "clove-lakes-park",
    borough: "Staten Island",
    boroughSlug: "staten-island",
    description:
      "A 198-acre park with three lakes, mature forests, and the oldest living thing in New York City, a 300-year-old tulip tree. Its hilly terrain and lakeside paths make it ideal for varied stretching.",
    bestSpot:
      "The lawn near Clove Lake where the water, surrounding forest, and gentle hills provide a naturally varied stretch environment.",
    touristRating: 2,
    nearbyAttractions: [
      "Clove Lakes",
      "Staten Island Zoo",
      "Victory Boulevard restaurants",
    ],
  },
  {
    name: "Fort Wadsworth",
    slug: "fort-wadsworth",
    borough: "Staten Island",
    boroughSlug: "staten-island",
    description:
      "One of the oldest military installations in the country, Fort Wadsworth sits at the foot of the Verrazano Bridge with commanding views of the Narrows, the harbor, and the Manhattan skyline.",
    bestSpot:
      "The overlook area near Battery Weed where the Verrazano Bridge soars overhead and ships pass through the Narrows below.",
    touristRating: 4,
    nearbyAttractions: [
      "Verrazano-Narrows Bridge",
      "Battery Weed",
      "Fort Tompkins",
    ],
  },
  {
    name: "FDR Boardwalk",
    slug: "fdr-boardwalk",
    borough: "Staten Island",
    boroughSlug: "staten-island",
    description:
      "A 2.5-mile boardwalk along the eastern shore of Staten Island from Fort Wadsworth to Miller Field, the FDR Boardwalk offers ocean views, beach access, and a flat walking and stretching surface.",
    bestSpot:
      "The boardwalk section near Midland Beach where the wide platform and ocean breeze create a refreshing stretch corridor.",
    touristRating: 3,
    nearbyAttractions: [
      "Midland Beach",
      "South Beach",
      "Fort Wadsworth",
    ],
  },
  {
    name: "Willowbrook Park",
    slug: "willowbrook-park",
    borough: "Staten Island",
    boroughSlug: "staten-island",
    description:
      "A 164-acre park in the center of Staten Island featuring a lake, carousel, dog run, and nature trails. Its central location and varied terrain make it a versatile outdoor fitness destination.",
    bestSpot:
      "The open lawn near Willowbrook Lake where the water and surrounding willows create a classically peaceful stretch spot.",
    touristRating: 1,
    nearbyAttractions: [
      "Willowbrook Lake",
      "Carousel for All Children",
      "College of Staten Island",
    ],
  },
  {
    name: "Silver Lake Park",
    slug: "silver-lake-park",
    borough: "Staten Island",
    boroughSlug: "staten-island",
    description:
      "A hilly park surrounding the Silver Lake reservoir, this park features a golf course, nature trails, and elevated views of the harbor. Its wooded paths and open lawns offer a secluded feel.",
    bestSpot:
      "The hilltop near the reservoir where views of the Verrazano Bridge and harbor emerge through the treetops.",
    touristRating: 1,
    nearbyAttractions: [
      "Silver Lake Golf Course",
      "Silver Lake Reservoir",
      "Forest Avenue shops",
    ],
  },
  {
    name: "Greenbelt Nature Center",
    slug: "greenbelt-nature-center",
    borough: "Staten Island",
    boroughSlug: "staten-island",
    description:
      "The gateway to Staten Island's 2,800-acre Greenbelt, the Nature Center provides trail access to the largest continuous tract of forest in the city. Over 35 miles of trails wind through varied terrain.",
    bestSpot:
      "The lawn and trailhead area near the nature center where forest trails and open sky meet.",
    touristRating: 2,
    nearbyAttractions: [
      "Staten Island Greenbelt trails",
      "High Rock Park",
      "Todt Hill",
    ],
  },
  {
    name: "Blue Heron Park",
    slug: "blue-heron-park",
    borough: "Staten Island",
    boroughSlug: "staten-island",
    description:
      "A 222-acre nature preserve in Annadale featuring ponds, swamps, meadows, and forest. Named for the great blue herons that nest here, it is one of the most ecologically diverse parks on Staten Island.",
    bestSpot:
      "The meadow near the park entrance where open grassland borders the wetland and birdsong fills the morning air.",
    touristRating: 1,
    nearbyAttractions: [
      "Blue Heron Pond",
      "Spring Pond",
      "Annadale neighborhood",
    ],
  },
  {
    name: "Wolfe's Pond Park",
    slug: "wolfes-pond-park",
    borough: "Staten Island",
    boroughSlug: "staten-island",
    description:
      "A 312-acre park on the southern shore of Staten Island where a freshwater pond meets Raritan Bay. It features beach access, forested trails, and a tranquil pond setting.",
    bestSpot:
      "The beach area where the pond outlet meets Raritan Bay, offering both sand stretching and water views.",
    touristRating: 1,
    nearbyAttractions: [
      "Raritan Bay beach",
      "Prince's Bay",
      "Lemon Creek Park",
    ],
  },
  {
    name: "Great Kills Park",
    slug: "great-kills-park",
    borough: "Staten Island",
    boroughSlug: "staten-island",
    description:
      "Part of the Gateway National Recreation Area, Great Kills Park offers beaches, a marina, nature trails, and wide-open spaces on the eastern shore of Staten Island facing Lower New York Bay.",
    bestSpot:
      "The beach and adjacent meadow where the bay stretches to the horizon and sea breezes keep the air fresh.",
    touristRating: 2,
    nearbyAttractions: [
      "Great Kills Harbor",
      "Crooke's Point",
      "Gateway National Recreation Area",
    ],
  },
  {
    name: "Midland Beach",
    slug: "midland-beach",
    borough: "Staten Island",
    boroughSlug: "staten-island",
    description:
      "A neighborhood beach along the FDR Boardwalk, Midland Beach offers sandy shores, a playground, and community amenities. Its local character makes it a relaxed spot for beachside stretching.",
    bestSpot:
      "The sandy beach near the playground where morning light and low tide create a wide, flat stretch surface.",
    touristRating: 2,
    nearbyAttractions: [
      "FDR Boardwalk",
      "Midland Beach community",
      "Father Capodanno Boulevard",
    ],
  },
  {
    name: "South Beach",
    slug: "south-beach",
    borough: "Staten Island",
    boroughSlug: "staten-island",
    description:
      "Connected to the FDR Boardwalk with views of the Verrazano Bridge, South Beach offers a wide sandy shoreline and the Ocean Breeze Athletic Complex nearby. It blends beach relaxation with fitness infrastructure.",
    bestSpot:
      "The beach near the boardwalk entrance where the Verrazano Bridge frames the northern horizon.",
    touristRating: 2,
    nearbyAttractions: [
      "Ocean Breeze Athletic Complex",
      "FDR Boardwalk",
      "Verrazano Bridge views",
    ],
  },
  {
    name: "Miller Field",
    slug: "miller-field",
    borough: "Staten Island",
    boroughSlug: "staten-island",
    description:
      "A former Army airfield in New Dorp Beach that is now part of Gateway National Recreation Area, Miller Field features wide-open playing fields, a community garden, and beach access.",
    bestSpot:
      "The expansive grass fields where the former runway scale provides room for any type of stretching or movement practice.",
    touristRating: 1,
    nearbyAttractions: [
      "New Dorp Beach",
      "Gateway National Recreation Area",
      "Historic Richmond Town",
    ],
  },
  {
    name: "Clay Pit Ponds State Park Preserve",
    slug: "clay-pit-ponds-state-park-preserve",
    borough: "Staten Island",
    boroughSlug: "staten-island",
    description:
      "The only state park preserve in New York City, Clay Pit Ponds protects a unique ecosystem of sandy barrens, ponds, and wetlands in Charleston. Its trails offer a wilderness stretching experience.",
    bestSpot:
      "The meadow near the park office where the sandy soil and pine barrens create a unique natural environment for stretching.",
    touristRating: 1,
    nearbyAttractions: [
      "Charleston neighborhood",
      "Conference House Park",
      "Outerbridge Crossing",
    ],
  },
  {
    name: "Freshkills Park",
    slug: "freshkills-park",
    borough: "Staten Island",
    boroughSlug: "staten-island",
    description:
      "Built atop the former Fresh Kills Landfill, Freshkills Park is being transformed into a 2,200-acre park, nearly three times the size of Central Park. It represents one of the most ambitious urban reclamation projects in the world.",
    bestSpot:
      "The North Park area where restored meadows and creek views showcase the transformation from landfill to park.",
    touristRating: 2,
    nearbyAttractions: [
      "William T. Davis Wildlife Refuge",
      "Staten Island Greenbelt",
      "Korean War Veterans Parkway",
    ],
  },
  {
    name: "High Rock Park",
    slug: "high-rock-park",
    borough: "Staten Island",
    boroughSlug: "staten-island",
    description:
      "A 90-acre nature preserve within the Staten Island Greenbelt, High Rock Park features five marked trails through swamp forests, kettle ponds, and rocky ridges. It is a favorite of hikers and naturalists.",
    bestSpot:
      "The clearing near the visitor center where the forest opens up and soft ground provides natural cushioning for stretching.",
    touristRating: 2,
    nearbyAttractions: [
      "Greenbelt Nature Center",
      "Todt Hill",
      "Richmond Creek",
    ],
  },
  {
    name: "Long Pond Park",
    slug: "long-pond-park",
    borough: "Staten Island",
    boroughSlug: "staten-island",
    description:
      "A serene wetland park in the southwestern corner of Staten Island, Long Pond Park features a freshwater pond, native wildflowers, and quiet trails through woods and meadows.",
    bestSpot:
      "The meadow along the pond shore where morning mist and stillness create a meditative stretching environment.",
    touristRating: 1,
    nearbyAttractions: [
      "Long Pond",
      "Clay Pit Ponds State Park Preserve",
      "Tottenville neighborhood",
    ],
  },
  {
    name: "Lemon Creek Park",
    slug: "lemon-creek-park",
    borough: "Staten Island",
    boroughSlug: "staten-island",
    description:
      "A waterfront park where Lemon Creek meets Raritan Bay, this park offers fishing, nature trails, a playground, and beach access. Its tidal creek and bay shoreline provide a coastal stretching environment.",
    bestSpot:
      "The shoreline area where the creek empties into Raritan Bay and the beach provides soft sand for stretching.",
    touristRating: 1,
    nearbyAttractions: [
      "Raritan Bay",
      "Prince's Bay",
      "Wolfe's Pond Park",
    ],
  },
  {
    name: "Von Briesen Park",
    slug: "von-briesen-park",
    borough: "Staten Island",
    boroughSlug: "staten-island",
    description:
      "A small clifftop park near Fort Wadsworth with dramatic views of the Verrazano Bridge and New York Harbor. Its elevated position and compact size make every stretch feel like a million-dollar view.",
    bestSpot:
      "The overlook lawn where the Verrazano Bridge, harbor, and Brooklyn shoreline spread out beneath you.",
    touristRating: 3,
    nearbyAttractions: [
      "Fort Wadsworth",
      "Verrazano-Narrows Bridge",
      "Bay Street corridor",
    ],
  },
  {
    name: "Bloomingdale Park",
    slug: "bloomingdale-park",
    borough: "Staten Island",
    boroughSlug: "staten-island",
    description:
      "A 106-acre park in the Woodrow-Pleasant Plains area with playing fields, tennis courts, nature trails, and a pond. It is one of the larger parks in southern Staten Island.",
    bestSpot:
      "The fields near the main entrance where flat grass and morning light provide a straightforward stretch space.",
    touristRating: 1,
    nearbyAttractions: [
      "Pleasant Plains neighborhood",
      "Woodrow United Methodist Church",
      "Rossville",
    ],
  },
];
