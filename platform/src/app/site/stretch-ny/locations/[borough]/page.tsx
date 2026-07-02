// @ts-nocheck
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  boroughs,
  findBoroughBySlug,
  getNeighborhoodsByBorough,
  getParksByBorough,
  getNeighborhoodUrl,
  getParkUrl,
  getServiceUrl,
  getBoroughUrl,
  services,
  SITE_URL,
  SITE_SMS_LINK,
  SITE_PHONE,
  SITE_PHONE_LINK,
} from "@/app/site/stretch-ny/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/stretch-ny/_lib/schema";
import Logo from "@/app/site/stretch-ny/_components/Logo";

interface Props { params: Promise<{ borough: string }> }

export const dynamicParams = true;
export const revalidate = 2592000;

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { borough } = await params;
  const b = findBoroughBySlug(borough);
  if (!b) return {};
  const bNeighborhoods = getNeighborhoodsByBorough(borough);
  const bParks = getParksByBorough(borough);
  return {
    title: `${b.name} Assisted Stretch Service | $99/hr | ${bNeighborhoods.length} Areas`,
    description: `Assisted stretch service across ${bNeighborhoods.length} ${b.name} neighborhoods. $99/hr, 10% off weekly. Certified therapists come to you. Same-day available 7AM-10PM.`,
    alternates: { canonical: `${SITE_URL}/locations/${b.slug}` },
  };
}

/* ─── Borough-specific content maps ─── */

const boroughAbout: Record<string, { identity: string; physical: string; whyMobile: string; lifestyle: string; closing: string }> = {
  manhattan: {
    identity: "Manhattan is the beating heart of New York City, a dense vertical island where more than 1.6 million residents live and nearly 4 million workers commute every single weekday. From the towering glass offices of Midtown to the cobblestone streets of the West Village, from the dense residential blocks of the Upper West Side to the luxury high-rises of Tribeca, Manhattan concentrates ambition, stress, and physical strain into 22.8 square miles like nowhere else on Earth. The borough runs at a relentless pace that leaves bodies tight, sore, and in desperate need of professional stretch service.",
    physical: "The physical demands on Manhattan residents and workers are enormous. Office workers spend 8 to 12 hours hunched over screens in corporate towers along Park Avenue, in creative studios in SoHo, and in co-working spaces throughout Flatiron. Subway commuters endure cramped trains on the 1, 2, 3, A, C, E, and every other line, gripping overhead bars and contorting into packed cars during rush hour. Tourists walk upwards of 25,000 steps per day navigating Times Square, Central Park, the Brooklyn Bridge walkway, and miles of museum corridors. Restaurant and hospitality workers stand for 10-hour shifts in kitchens and dining rooms across every neighborhood from Harlem to the Financial District. Every one of these people benefits from professional stretch service, and Manhattan stretch service demand is the highest of any borough.",
    whyMobile: "Mobile stretch service is essential in Manhattan because time is the most precious commodity on the island. Manhattan residents do not have an extra hour to travel to a stretching studio, wait for an appointment, and travel back. With Manhattan stretch service from Stretch NYC, a certified stretch therapist arrives at your apartment, office, hotel room, or even a nearby park with all professional equipment. You get a full 60-minute stretch service session without leaving your building. For executives in Midtown, that means a stretch session during lunch. For residents on the Upper East Side, it means a morning stretch before the day starts. For tourists at a Times Square hotel, it means recovery stretching after a long day of sightseeing. Mobile stretch service eliminates every barrier between you and the flexibility, pain relief, and mobility improvement you need.",
    lifestyle: "Manhattan attracts some of the most health-conscious, performance-driven people in the world. Runners log miles around the Central Park loop and along the Hudson River Greenway. CrossFit athletes push their limits at gyms in Chelsea and the Lower East Side. Yoga practitioners flow through studios in Nolita and Greenwich Village. Pilates devotees sculpt in boutique studios across the Upper West Side. Yet even the most dedicated fitness enthusiasts neglect stretching, the single most important component of recovery and injury prevention. Professional stretch service fills that gap. Whether you are a Wall Street trader dealing with chronic neck tension, a Broadway performer maintaining peak flexibility, a medical professional at NYU Langone or Mount Sinai who stands all day, or a retiree on the Upper East Side looking to maintain independence, Manhattan stretch service from Stretch NYC is designed for your exact needs.",
    closing: "With service across every Manhattan neighborhood from Inwood to Battery Park, Stretch NYC is the premier mobile stretch service provider on the island. Our certified therapists know Manhattan inside and out. They navigate the grid, they arrive on time, and they deliver world-class stretch service sessions that leave you feeling like a completely different person. If you live, work, or visit Manhattan, professional stretch service is not a luxury. It is a necessity for surviving and thriving in the most demanding borough in the world.",
  },
  brooklyn: {
    identity: "Brooklyn is New York City's most populous borough, home to more than 2.7 million people spread across dozens of distinct neighborhoods that each carry their own character, culture, and energy. From the brownstone-lined streets of Park Slope and Fort Greene to the beachfront boardwalk of Coney Island, from the artistic warehouses of Bushwick to the family homes of Bay Ridge, Brooklyn is a borough of extraordinary diversity. It is also a borough where residents push their bodies hard, whether through long commutes into Manhattan, weekend runs across the Brooklyn Bridge, intense gym sessions in Williamsburg, or physically demanding work in Red Hook and Sunset Park. Brooklyn stretch service meets this borough exactly where it lives.",
    physical: "The physical toll of Brooklyn life is significant and varied. Young professionals in Williamsburg, Greenpoint, and DUMBO spend long hours at desks in creative agencies and tech startups, developing the same chronic neck, shoulder, and lower back pain that plagues office workers everywhere. Families in Park Slope, Carroll Gardens, and Cobble Hill carry children, push strollers up steep subway stairs, and run after kids in Prospect Park. Athletes train hard at gyms and CrossFit boxes across Bed-Stuy, Crown Heights, and Flatbush. Older residents in Bensonhurst, Gravesend, and Sheepshead Bay need gentle stretch service to maintain mobility and prevent falls. Construction workers, warehouse employees, and tradespeople across the borough put their bodies through punishing physical labor every single day. Brooklyn stretch service addresses every one of these needs with professional, mobile flexibility therapy.",
    whyMobile: "Brooklyn is a sprawling borough with limited direct transit connections between many neighborhoods. Getting from Bay Ridge to Bushwick by subway can take over an hour. Driving across Brooklyn during rush hour is an exercise in frustration. That is exactly why mobile stretch service matters so much here. Instead of traveling to a studio, your certified stretch therapist comes directly to your Brooklyn home, apartment, office, or local park. You text or call, we confirm, and your therapist arrives at your door with a professional massage table, yoga mat, straps, and all the equipment needed for a complete stretch service session. For busy Brooklyn parents, working professionals, and seniors who find travel difficult, mobile stretch service is the only practical way to get consistent, professional stretching therapy.",
    lifestyle: "Brooklyn has become one of the fitness capitals of the East Coast. Prospect Park is packed with runners, cyclists, and outdoor fitness groups every morning and evening. The Brooklyn waterfront attracts walkers, joggers, and yoga practitioners from Brooklyn Bridge Park to Red Hook. Boutique gyms and wellness studios have exploded across Williamsburg, Greenpoint, Park Slope, and DUMBO. Brooklyn Marathon runners train through every neighborhood in the borough. Yet despite all this fitness activity, most Brooklyn residents do not stretch properly or at all. They push through workouts, accumulate tightness and micro-injuries, and wonder why they feel worse instead of better. Professional stretch service is the missing piece. Our Brooklyn stretch service therapists work with runners, cyclists, lifters, yogis, dancers, and every other type of athlete to improve recovery, prevent injury, and unlock flexibility gains that self-stretching simply cannot achieve.",
    closing: "Whether you live in a Williamsburg loft, a Park Slope brownstone, a Flatbush apartment, or a Bay Ridge family home, Stretch NYC delivers the best stretch service in Brooklyn directly to your door. Our therapists serve every corner of this massive borough, from the waterfront to deep Brooklyn, seven days a week. Brooklyn stretch service at $99 per hour is the smartest investment you can make in your body, your recovery, and your quality of life.",
  },
  queens: {
    identity: "Queens is the most ethnically diverse urban area on the planet, a borough of 2.3 million people representing more than 130 nationalities and speaking over 200 languages. From the high-rise luxury of Long Island City overlooking the Manhattan skyline to the tree-lined residential streets of Bayside and Douglaston, from the bustling commercial corridors of Flushing and Jackson Heights to the beachfront communities of the Rockaways, Queens spans an enormous geographic and cultural landscape. This diversity extends to the physical needs of its residents, making Queens stretch service uniquely varied and essential.",
    physical: "Queens residents face physical demands as diverse as the borough itself. Office workers commute from Astoria, Sunnyside, and Woodside into Manhattan on packed 7 trains and N/W lines, arriving at their desks already stiff and sore. Construction workers, many based in neighborhoods like Maspeth, Ridgewood, and College Point, endure physically grueling days that leave muscles tight and joints aching. Restaurant workers along the food corridors of Flushing, Jackson Heights, and Astoria stand for marathon shifts. Families in Fresh Meadows, Bayside, and Forest Hills maintain active lifestyles that include sports leagues, park activities, and weekend adventures. Seniors in communities across Queens, from Kew Gardens to Howard Beach, need gentle stretching to maintain independence and mobility. Airport workers at JFK and LaGuardia push their bodies through demanding shifts. Queens stretch service from Stretch NYC addresses every one of these populations with targeted, professional flexibility therapy.",
    whyMobile: "Queens is the largest borough by area in New York City, spanning 109 square miles from the East River to the Nassau County border. Transit connections between Queens neighborhoods can be notoriously poor. Getting from the Rockaways to Astoria by public transit can take well over an hour. Driving across Queens during commute hours is a test of patience. This geographic spread makes mobile stretch service not just convenient but absolutely necessary. When your certified stretch therapist comes to your Queens home, office, or local park, you save the travel time and get a professional stretch service session in the comfort of your own space. For Queens residents, mobile stretch service is the practical, efficient, and effective way to get the flexibility therapy your body needs.",
    lifestyle: "Queens is home to some of the best parks and outdoor spaces in all of New York City. Flushing Meadows-Corona Park, site of two World's Fairs, offers enormous lawns perfect for outdoor stretch sessions. Forest Park in the heart of Queens provides miles of trails and quiet green space. Astoria Park along the East River is a fitness hub for runners and outdoor exercise enthusiasts. The Rockaways offer beach workouts and surfing culture. Alley Pond Park, Cunningham Park, and dozens of smaller neighborhood parks provide green space throughout the borough. Queens residents are active, outdoorsy, and health-conscious, but like residents everywhere, they tend to skip stretching. Professional stretch service in Queens helps runners recover faster, gym-goers prevent injury, desk workers eliminate chronic pain, and seniors maintain the mobility they need to stay independent.",
    closing: "From Long Island City to the Rockaways, from Astoria to Bayside, Stretch NYC provides the best mobile stretch service in Queens. Our certified therapists know the borough, travel to every neighborhood, and deliver professional stretch service sessions that make a real difference in how you feel and move. Queens stretch service at $99 per hour is available seven days a week, 7AM to 10PM. Your body will thank you.",
  },
  bronx: {
    identity: "The Bronx is New York City's northernmost borough, home to 1.4 million residents and a proud community with deep roots in culture, sports, and resilience. From the grand concourses and art deco buildings along the Grand Concourse to the waterfront beauty of City Island, from the cultural institutions of Belmont to the expansive green spaces of Pelham Bay Park and Van Cortlandt Park, the Bronx is a borough of tremendous character and physical energy. Bronx residents work hard, play hard, and put their bodies through significant daily demands. Bronx stretch service from Stretch NYC provides professional flexibility therapy to every neighborhood in the borough.",
    physical: "The physical demands on Bronx residents are substantial and varied. Many Bronx workers commute long distances by subway and bus into Manhattan and other boroughs, enduring standing-room-only rides on the 2, 5, 6, B, D, and other lines. Healthcare workers at Montefiore, Jacobi, and Lincoln hospitals work long shifts on their feet. Construction and trades workers across the borough perform physically demanding labor day after day. Student athletes at Fordham University, Lehman College, and dozens of high schools push their bodies in training and competition. Families across neighborhoods like Riverdale, Morris Park, Pelham Parkway, and Kingsbridge maintain active lifestyles that include sports leagues, park recreation, and daily physical activity. Seniors throughout the Bronx need gentle stretch service to maintain mobility, reduce fall risk, and support independent living. Bronx stretch service is designed for every one of these populations.",
    whyMobile: "The Bronx is a large, spread-out borough where transit options between neighborhoods can be limited. Getting from City Island to the South Bronx by transit takes significant time. Driving across the borough during peak hours is slow. Mobile stretch service eliminates the travel problem entirely. Your certified stretch therapist comes to your Bronx apartment, house, office, or local park with all professional equipment. You get a full 60-minute stretch service session without going anywhere. For busy Bronx families, working professionals, and seniors who find travel challenging, mobile stretch service is the only realistic way to get consistent professional stretching. Stretch NYC therapists serve every Bronx neighborhood, from Riverdale and Fieldston in the northwest to Throgs Neck and Country Club in the east, from Mott Haven in the south to Woodlawn in the north.",
    lifestyle: "The Bronx has some of the largest and most beautiful parks in New York City. Van Cortlandt Park spans over 1,000 acres and is home to the oldest public golf course in the country. Pelham Bay Park is the largest park in NYC at over 2,700 acres, with beaches, trails, and enormous open spaces. The New York Botanical Garden and Bronx Zoo draw millions of visitors who walk miles through their grounds. Wave Hill offers stunning gardens overlooking the Hudson. Crotona Park, St. Mary's Park, and dozens of neighborhood parks provide green space throughout the borough. Bronx residents are physically active, sports-loving people who benefit enormously from professional stretch service. Whether you are a runner training on the Van Cortlandt cross-country course, a basketball player competing at courts across the borough, a golfer dealing with back tightness, or simply someone who wants to feel better in their body, Bronx stretch service delivers results.",
    closing: "From the grand avenues of the South Bronx to the quiet streets of Riverdale, from the waterfront of City Island to the parks of Pelham Bay, Stretch NYC brings professional mobile stretch service to every corner of the Bronx. Our certified therapists understand the borough, respect its communities, and deliver stretch service sessions that make a real, measurable difference. Bronx stretch service at $99 per hour is available seven days a week. Text or call us today to book your first session.",
  },
  "staten-island": {
    identity: "Staten Island is New York City's most suburban borough, home to approximately 500,000 residents who enjoy a quieter, more spacious lifestyle while remaining connected to the energy and opportunity of the city. Known for its tree-lined streets, single-family homes, waterfront views, and strong community bonds, Staten Island offers a quality of life that is distinct from the other four boroughs. From the North Shore neighborhoods of St. George and Stapleton to the South Shore communities of Tottenville and Great Kills, Staten Island residents value health, family, and outdoor activity. Staten Island stretch service from Stretch NYC brings professional flexibility therapy to this unique borough.",
    physical: "Staten Island residents face a specific set of physical demands that make stretch service particularly valuable. Many residents commute to Manhattan via the Staten Island Ferry and then subway, a journey that can take 60 to 90 minutes each way. This long commute means hours of sitting, standing in crowded trains, and walking between connections, all of which contribute to chronic back pain, hip tightness, and neck tension. Drivers who commute over the Verrazzano-Narrows Bridge or through New Jersey deal with extended time behind the wheel, which is one of the worst positions for spinal health. Tradespeople, healthcare workers at Staten Island University Hospital, and retail employees throughout the borough endure physically demanding shifts. Active retirees and seniors make up a significant portion of the borough's population and need gentle stretch service to maintain mobility and prevent falls.",
    whyMobile: "Staten Island is the least transit-connected borough in New York City. There is one rail line, the Staten Island Railway, which runs along the East Shore. Bus service connects neighborhoods but can be slow. Many Staten Islanders drive, but travel between North Shore and South Shore neighborhoods can take 30 minutes or more depending on traffic. This makes mobile stretch service especially valuable on Staten Island. When your certified therapist comes to your Staten Island home, you eliminate all travel time and inconvenience. You get a full professional stretch service session in your living room, home gym, backyard, or even a nearby park without getting in the car. For busy families, working professionals with long commutes, and seniors who prefer to stay home, mobile stretch service on Staten Island is a genuine quality-of-life improvement.",
    lifestyle: "Staten Island has abundant green space and a culture of outdoor activity. The Staten Island Greenbelt spans 2,800 acres of parks, trails, and natural areas in the center of the borough. Clove Lakes Park, Wolfe's Pond Park, and Conference House Park offer beautiful settings for outdoor stretching. The boardwalk along South Beach and Midland Beach draws walkers, runners, and fitness enthusiasts. Youth sports leagues are deeply embedded in Staten Island culture, with thousands of kids playing soccer, baseball, basketball, and football across the borough. Adult recreational leagues keep older residents active. Golf courses, tennis courts, and cycling routes provide additional fitness outlets. All of these activities create demand for professional stretch service to improve recovery, prevent injury, and maintain the flexibility that active living requires. Staten Island stretch service from Stretch NYC supports every resident who wants to feel better and move better.",
    closing: "From St. George to Tottenville, from the North Shore waterfront to the South Shore beaches, Stretch NYC delivers the best mobile stretch service on Staten Island. Our certified therapists travel to every neighborhood in the borough, bringing professional equipment and expertise directly to your door. Staten Island stretch service at $99 per hour is available seven days a week, 7AM to 10PM. Book your session today and experience the difference professional stretching makes.",
  },
};

const boroughClients: Record<string, { types: { title: string; desc: string }[]; intro: string }> = {
  manhattan: {
    intro: "Manhattan attracts a unique cross-section of people who all share one thing in common: their bodies take a beating from the demands of life on this island. Manhattan stretch service clients come from every walk of life, every neighborhood, and every age group. Here are the most common client types our certified stretch therapists work with across Manhattan neighborhoods every single day.",
    types: [
      { title: "Corporate Executives and Office Workers", desc: "From Wall Street to Midtown to Hudson Yards, Manhattan's office workers spend 8 to 14 hours per day seated at desks, hunched over laptops, and tensing through high-pressure meetings. Chronic neck pain, rounded shoulders, lower back stiffness, and hip flexor tightness are nearly universal. Manhattan stretch service provides targeted relief that addresses these exact patterns, often during lunch breaks or immediately after work." },
      { title: "Broadway and Performing Arts Professionals", desc: "Dancers, actors, and musicians who perform in Broadway theaters, Off-Broadway venues, and concert halls across Manhattan depend on their bodies for their livelihood. Stretch service helps performers maintain the flexibility, range of motion, and injury prevention they need to perform at their best eight shows per week." },
      { title: "Tourists and Hotel Guests", desc: "Manhattan welcomes over 60 million visitors per year. Tourists walk 20,000 to 30,000 steps per day exploring the island, and they return to their hotels exhausted, sore, and barely able to move. Hotel room stretch service is one of our most popular offerings in Manhattan, with therapists visiting hotels in Midtown, Times Square, the Financial District, and throughout the borough." },
      { title: "Runners and Fitness Enthusiasts", desc: "Central Park runners, Hudson River Greenway cyclists, and gym-goers across Manhattan push their bodies hard but rarely stretch properly. Professional stretch service accelerates recovery, prevents overuse injuries, and unlocks flexibility gains that self-stretching cannot achieve." },
      { title: "Seniors and Retirees", desc: "The Upper East Side, Upper West Side, and other Manhattan neighborhoods have significant senior populations who benefit enormously from gentle stretch service. Regular professional stretching helps seniors maintain independence, reduce fall risk, manage arthritis pain, and improve quality of life." },
      { title: "Medical and Healthcare Professionals", desc: "Doctors, nurses, and healthcare workers at Manhattan hospitals including NYU Langone, Mount Sinai, NewYork-Presbyterian, and Memorial Sloan Kettering spend long shifts on their feet. Stretch service provides the recovery they need to keep caring for others." },
    ],
  },
  brooklyn: {
    intro: "Brooklyn is a borough of doers, makers, and movers. The people who live and work here push their bodies in ways both obvious and subtle, from intense gym sessions to marathon commutes to physically demanding creative work. Brooklyn stretch service clients represent the full spectrum of this dynamic borough. Here are the client types our therapists see most often across Brooklyn neighborhoods.",
    types: [
      { title: "Creative Professionals and Remote Workers", desc: "Brooklyn is home to thousands of designers, writers, developers, and freelancers who work from home offices, coffee shops, and co-working spaces in Williamsburg, DUMBO, Greenpoint, and Park Slope. These workers develop severe postural issues from improvised workstations. Brooklyn stretch service addresses chronic neck, shoulder, and back pain from hours of screen time in less-than-ideal ergonomic setups." },
      { title: "Young Athletes and Gym-Goers", desc: "CrossFit boxes, climbing gyms, boxing studios, and traditional gyms have exploded across Brooklyn. Young professionals in Bushwick, Bed-Stuy, Crown Heights, and Prospect Heights train intensely but rarely invest in proper recovery. Stretch service fills that gap, helping athletes recover faster, prevent injury, and break through flexibility plateaus." },
      { title: "Parents and Families", desc: "Park Slope, Carroll Gardens, Windsor Terrace, and Bay Ridge are family-heavy neighborhoods where parents spend their days lifting children, pushing strollers, and running after toddlers. The physical demands of parenting are real, and Brooklyn stretch service helps parents maintain their bodies through the most physically challenging years of their lives." },
      { title: "Runners and Cyclists", desc: "Prospect Park is one of the most popular running and cycling venues in New York City, and the Brooklyn waterfront attracts joggers and walkers from DUMBO to Red Hook and beyond. These athletes need professional stretch service for recovery, injury prevention, and performance improvement." },
      { title: "Restaurant and Hospitality Workers", desc: "Brooklyn's world-class restaurant scene employs thousands of cooks, servers, bartenders, and managers who spend long hours on their feet. Stretch service helps these essential workers manage the chronic pain that comes with standing and moving for 10 to 12 hours per shift." },
      { title: "Seniors in Established Communities", desc: "Neighborhoods like Bensonhurst, Bay Ridge, Gravesend, and Sheepshead Bay have large senior populations who benefit from gentle stretch service. Our therapists provide safe, careful stretching that helps seniors maintain mobility, reduce joint stiffness, and live independently." },
    ],
  },
  queens: {
    intro: "Queens is the most diverse borough on Earth, and its stretch service clients reflect that incredible diversity. From office workers in Long Island City to retirees in Bayside, from athletes in Astoria to families in Forest Hills, Queens stretch service serves every community in this vast borough. Here are the client types our therapists work with most often across Queens neighborhoods.",
    types: [
      { title: "Commuters with Long Transit Rides", desc: "Queens residents face some of the longest commutes in New York City. Workers traveling from Flushing, Jamaica, and the Rockaways into Manhattan spend hours on crowded trains and buses. This daily grind creates chronic tightness in the back, hips, shoulders, and neck. Queens stretch service provides the relief that commuters desperately need after long days of transit-related physical stress." },
      { title: "Airport and Aviation Workers", desc: "JFK International Airport and LaGuardia Airport are both in Queens, employing tens of thousands of workers in physically demanding roles including baggage handling, aircraft maintenance, security, and ground operations. These workers need stretch service to manage the physical toll of their demanding jobs." },
      { title: "Athletes and Sports League Participants", desc: "Queens has a thriving recreational sports culture with adult soccer leagues, basketball leagues, running clubs, and tennis communities across Astoria, Flushing, Forest Hills, and beyond. Professional stretch service helps these athletes perform better, recover faster, and avoid the injuries that sideline weekend warriors." },
      { title: "Families and Active Parents", desc: "Family-oriented neighborhoods like Forest Hills, Bayside, Fresh Meadows, and Rego Park are home to parents who stay physically active while managing the demands of raising children. Stretch service fits into busy family schedules because our therapists come directly to your home." },
      { title: "Seniors Across Queens Communities", desc: "Queens has one of the largest senior populations of any borough, with significant numbers of older adults in Flushing, Bayside, Jackson Heights, and Kew Gardens. Gentle stretch service helps Queens seniors maintain independence, prevent falls, manage chronic conditions, and improve their overall quality of life." },
      { title: "Restaurant and Food Industry Workers", desc: "The legendary food corridors of Flushing, Jackson Heights, Astoria, and Woodside employ thousands of cooks, chefs, and restaurant workers who stand for marathon shifts. Stretch service provides essential recovery for these hardworking individuals." },
    ],
  },
  bronx: {
    intro: "The Bronx is a borough built on strength, resilience, and community. Its residents work hard, stay active, and push their bodies through demanding daily routines. Bronx stretch service serves the full range of people who call this borough home, from young athletes to working professionals to beloved grandparents. Here are the most common client types our certified stretch therapists serve across Bronx neighborhoods.",
    types: [
      { title: "Healthcare Workers", desc: "The Bronx is home to major medical centers including Montefiore Medical Center, Jacobi Medical Center, and Lincoln Medical Center. Thousands of doctors, nurses, technicians, and support staff work long, physically demanding shifts. Bronx stretch service helps healthcare workers recover from the toll of standing, bending, and lifting throughout their workday." },
      { title: "Student Athletes", desc: "Fordham University, Lehman College, and dozens of Bronx high schools produce talented athletes who train intensely. Young athletes need professional stretch service to prevent injury, improve performance, and develop healthy flexibility habits that will serve them for life." },
      { title: "Commuters and Transit Workers", desc: "Bronx residents often face long commutes into Manhattan and other boroughs. MTA workers based in the Bronx perform physically demanding jobs maintaining trains and buses. Stretch service addresses the chronic pain and stiffness that come from hours of commuting and physical labor." },
      { title: "Active Seniors", desc: "The Bronx has vibrant senior communities in Riverdale, Pelham Parkway, Morris Park, and throughout the borough. Gentle stretch service helps seniors maintain the mobility, balance, and independence they need to enjoy their lives fully. Our therapists are trained in senior-specific stretching techniques that are safe, gentle, and effective." },
      { title: "Construction and Trade Workers", desc: "The Bronx has significant construction and trades employment. Electricians, plumbers, carpenters, and laborers put their bodies through punishing physical work every day. Stretch service provides the recovery and maintenance these workers need to stay healthy and keep working without chronic pain." },
      { title: "Park Users and Outdoor Fitness Enthusiasts", desc: "The Bronx has more parkland per capita than any other borough. Runners on the Van Cortlandt cross-country course, walkers in Pelham Bay Park, and fitness enthusiasts throughout the borough all benefit from professional stretch service to support their active lifestyles." },
    ],
  },
  "staten-island": {
    intro: "Staten Island is a borough of families, homeowners, and hardworking people who value health and community. The physical demands of Staten Island life, from long commutes to active outdoor lifestyles, create a real need for professional stretch service. Here are the client types our therapists serve most often across Staten Island neighborhoods.",
    types: [
      { title: "Long-Distance Commuters", desc: "Staten Island residents who commute to Manhattan endure the longest average commute of any borough. The combination of the Staten Island Ferry, subway transfers, and bus rides creates a physical toll that accumulates over weeks, months, and years. Stretch service addresses the chronic back pain, hip tightness, and shoulder tension that come from this demanding daily routine." },
      { title: "Active Families and Youth Athletes", desc: "Staten Island has a deeply rooted youth sports culture with thousands of kids in soccer, baseball, basketball, football, and other sports leagues. Parents who drive to practices, carry equipment, and stay active themselves also need stretch service. Our therapists serve entire families, with sessions tailored to each family member's age and needs." },
      { title: "Tradespeople and Physical Laborers", desc: "Staten Island has a large population of electricians, plumbers, construction workers, and other tradespeople. The physical demands of these professions create chronic pain patterns that respond excellently to professional stretch service. Regular sessions help tradespeople stay healthy and keep working." },
      { title: "Healthcare Workers", desc: "Staff at Staten Island University Hospital, Richmond University Medical Center, and other healthcare facilities work long, demanding shifts. Stretch service provides the recovery these essential workers need to continue caring for the Staten Island community." },
      { title: "Retirees and Active Seniors", desc: "Staten Island has a significant senior population, many of whom have lived in the borough for decades. Gentle stretch service helps these longtime residents maintain their independence, manage age-related stiffness, and enjoy the active outdoor lifestyle that Staten Island offers." },
      { title: "Outdoor Recreation Enthusiasts", desc: "Staten Island residents take advantage of the borough's extensive parks, beaches, and trails. The Greenbelt, South Beach boardwalk, and numerous parks attract runners, walkers, cyclists, and fitness enthusiasts who benefit from professional stretch service for recovery and injury prevention." },
    ],
  },
};

const boroughLogistics: Record<string, string> = {
  manhattan: "Booking a mobile stretch service session in Manhattan is simple and fast. Text or call 212-202-7080 with your preferred date, time, and Manhattan location. We confirm your appointment within minutes and assign a certified stretch therapist who works in your specific Manhattan neighborhood. On the day of your session, your therapist arrives at your door, whether that is a Midtown office, an Upper West Side apartment, a Financial District hotel, or any other Manhattan address, with a professional massage table, padded mat, straps, and all equipment needed for a complete stretch service session. Sessions run 60 minutes and cover a full-body stretch protocol customized to your needs. Your therapist begins with a mobility assessment to identify your tightest areas and pain points, then works through a systematic stretching sequence that addresses every major muscle group. Manhattan stretch service appointments are available seven days a week from 7AM to 10PM, with same-day availability for most time slots. We serve every Manhattan neighborhood, every zip code, and every type of location. Whether you need a one-time session or want to set up a weekly stretch service program at the discounted rate of $89 per hour, we make it happen on your schedule.",
  brooklyn: "Booking mobile stretch service in Brooklyn takes less than two minutes. Text or call 212-202-7080 with your preferred date, time, and Brooklyn address. We confirm quickly and dispatch a certified stretch therapist who knows your neighborhood. Your therapist arrives at your Brooklyn home, apartment, office, or park with a full professional setup including massage table, padded mat, straps, and all stretching tools. Every session begins with a brief mobility assessment where your therapist evaluates your range of motion, identifies problem areas, and builds a customized stretch protocol for your body. The session covers all major muscle groups with special attention to your specific pain points and tightness patterns. Brooklyn stretch service is available every day from 7AM to 10PM across all Brooklyn neighborhoods, from Williamsburg and DUMBO to Bay Ridge and Coney Island. Same-day appointments are available for most time slots. For the best results, we recommend weekly sessions at the discounted rate of $89 per hour, which ensures consistent progress on your flexibility, pain reduction, and mobility goals. Your therapist tracks your progress session to session and adjusts your protocol as your body improves.",
  queens: "Booking mobile stretch service in Queens is quick and easy. Text or call 212-202-7080 with your desired date, time, and Queens location. We confirm your appointment and match you with a certified stretch therapist who serves your area of Queens. Your therapist arrives at your home, office, or outdoor location with a complete professional setup. Given the size of Queens, we strategically position therapists across the borough to ensure timely arrival whether you are in Astoria, Flushing, Forest Hills, Jamaica, the Rockaways, or anywhere in between. Each session begins with a mobility assessment and continues with a full-body stretch service protocol customized to your individual needs. Queens stretch service is available seven days a week, 7AM to 10PM, with same-day availability for most appointments. Weekly clients in Queens receive a 10% discount at $89 per hour and enjoy priority scheduling, same therapist continuity, and progressive treatment plans that deliver measurable results over time.",
  bronx: "Booking mobile stretch service in the Bronx is straightforward. Text or call 212-202-7080 with your preferred date, time, and Bronx address. We confirm within minutes and assign a certified stretch therapist familiar with your neighborhood. Your therapist travels to your Bronx home, apartment, office, or park with all professional equipment including a massage table, padded mat, straps, and stretching aids. Sessions run 60 minutes and include a mobility assessment followed by a complete stretch service protocol tailored to your body's specific needs. Bronx stretch service is available every day from 7AM to 10PM across all Bronx neighborhoods, from Mott Haven to Riverdale, from Hunts Point to City Island. Same-day appointments are available most days. We recommend weekly sessions at $89 per hour for clients who want to see the best results in flexibility, pain reduction, and overall mobility. Your therapist maintains a treatment record and adjusts your protocol each session based on your progress.",
  "staten-island": "Booking mobile stretch service on Staten Island is simple. Text or call 212-202-7080 with your preferred date, time, and Staten Island address. We confirm your appointment and assign a certified stretch therapist who serves the Staten Island area. Your therapist comes to your home, whether that is in St. George, New Dorp, Tottenville, or anywhere else on the island, with a full professional setup. Every session starts with a mobility assessment to evaluate your current flexibility, identify pain points, and determine the best stretch protocol for your body. The 60-minute session covers all major muscle groups with focused attention on your specific problem areas. Staten Island stretch service is available seven days a week from 7AM to 10PM. Same-day appointments are available depending on therapist availability. Weekly sessions at $89 per hour provide the best value and the best results, with same therapist continuity and a progressive treatment plan that builds on each previous session.",
};

const boroughFaqs: Record<string, { question: string; answer: string }[]> = {
  manhattan: [
    { question: "How much does stretch service in Manhattan cost?", answer: "Manhattan stretch service from Stretch NYC costs $99 per hour for single sessions. Weekly clients receive a 10% discount at $89 per hour. There are no hidden fees, no membership required, and no contracts. You pay per session." },
    { question: "Do you serve all Manhattan neighborhoods?", answer: "Yes. Stretch NYC serves every Manhattan neighborhood from Inwood and Washington Heights in the north to Battery Park and the Financial District in the south, and every neighborhood in between including Harlem, the Upper East Side, Upper West Side, Midtown, Chelsea, Greenwich Village, SoHo, Tribeca, the Lower East Side, and more." },
    { question: "Can I book a stretch service session at my Manhattan office?", answer: "Absolutely. Office stretch sessions are one of our most popular services in Manhattan. Your therapist arrives at your workplace with a portable massage table and all equipment. Many Manhattan executives book lunchtime or end-of-day sessions right at their desks or in a conference room." },
    { question: "How quickly can I get a stretch service appointment in Manhattan?", answer: "Same-day stretch service appointments are available in Manhattan for most time slots. Text or call 212-202-7080 and we will find the earliest available appointment. Many clients book and receive a session within just a few hours." },
    { question: "Do you offer stretch service at Manhattan hotels?", answer: "Yes. Hotel room stretch service is extremely popular in Manhattan. We serve all major hotel areas including Times Square, Midtown, the Financial District, SoHo, and the Upper East Side. Tourists and business travelers book in-room stretch sessions to recover from long days of walking and meetings." },
    { question: "What should I wear for a stretch service session in Manhattan?", answer: "Wear comfortable, stretchy clothing such as athletic wear, yoga pants, or sweatpants and a T-shirt. No special clothing is required. Your therapist brings all equipment. Sessions can take place in your apartment, office, hotel room, or any space with enough room for a massage table or yoga mat." },
  ],
  brooklyn: [
    { question: "How much does stretch service in Brooklyn cost?", answer: "Brooklyn stretch service costs $99 per hour for individual sessions. Weekly clients save 10% at $89 per hour. No memberships, no contracts, no hidden fees. Simple per-session pricing." },
    { question: "Which Brooklyn neighborhoods do you serve?", answer: "Stretch NYC serves every Brooklyn neighborhood including Williamsburg, DUMBO, Park Slope, Brooklyn Heights, Cobble Hill, Carroll Gardens, Greenpoint, Bushwick, Bed-Stuy, Crown Heights, Prospect Heights, Fort Greene, Clinton Hill, Bay Ridge, Bensonhurst, Flatbush, Sunset Park, Red Hook, Coney Island, Sheepshead Bay, and many more." },
    { question: "Can I get a stretch service session in Prospect Park?", answer: "Yes. Outdoor stretch sessions in Prospect Park and other Brooklyn parks are available. Your therapist brings a padded mat and all necessary equipment. We recommend the Long Meadow, Nethermead, and the area near the Prospect Park Bandshell for the best outdoor stretching experience." },
    { question: "How fast can you send a stretch therapist to Brooklyn?", answer: "Same-day appointments are available across Brooklyn. Text or call 212-202-7080 and we will match you with the nearest available certified stretch therapist. Many Brooklyn clients receive same-day service within a few hours of booking." },
    { question: "Is stretch service good for runners who train in Brooklyn?", answer: "Professional stretch service is essential for Brooklyn runners. Whether you run in Prospect Park, along the Brooklyn waterfront, or through neighborhood streets, our therapists use PNF stretching, myofascial release, and targeted flexibility work to improve your recovery, reduce injury risk, and help you run faster and more efficiently." },
    { question: "Do you offer couples or group stretch sessions in Brooklyn?", answer: "Yes. We offer sessions for couples, families, and small groups in Brooklyn. Your therapist can work with two people back-to-back in a single visit, or we can send multiple therapists for simultaneous sessions. Contact us for group pricing and availability." },
  ],
  queens: [
    { question: "How much does stretch service in Queens cost?", answer: "Queens stretch service from Stretch NYC is $99 per hour for single sessions. Weekly clients get 10% off at $89 per hour. No membership fees, no contracts, no surprises. Straightforward per-session pricing." },
    { question: "Do you serve all of Queens or just certain areas?", answer: "We serve all of Queens. From Astoria and Long Island City near the river to Bayside and Little Neck near the Nassau border, from Flushing and College Point in the north to the Rockaways in the south, our therapists cover every Queens neighborhood." },
    { question: "Can I book a stretch session at a Queens park?", answer: "Absolutely. Outdoor stretch sessions are popular in Queens parks including Flushing Meadows-Corona Park, Astoria Park, Forest Park, Alley Pond Park, and Gantry Plaza State Park. Your therapist brings all equipment for a professional outdoor session." },
    { question: "I work near JFK or LaGuardia. Do you serve airport areas?", answer: "Yes. We serve neighborhoods near both JFK and LaGuardia airports. Airport workers, flight crew members, and travelers staying in airport-area hotels can all book stretch service sessions. Text or call to arrange a convenient time." },
    { question: "How soon can I get a stretch service appointment in Queens?", answer: "Same-day appointments are available throughout Queens. Our therapists are positioned across the borough to minimize travel time. Text or call 212-202-7080 to book the earliest available slot." },
    { question: "Is stretch service safe for seniors in Queens?", answer: "Absolutely. Our gentle stretch service is specifically designed for seniors. Our therapists are trained in age-appropriate techniques that are safe, comfortable, and effective. We work with seniors across Queens to maintain mobility, reduce fall risk, manage arthritis, and improve overall quality of life." },
  ],
  bronx: [
    { question: "How much does stretch service in the Bronx cost?", answer: "Bronx stretch service is $99 per hour for single sessions and $89 per hour for weekly clients, a 10% savings. No contracts, no memberships, and no hidden fees. You pay only when you book a session." },
    { question: "Which Bronx neighborhoods do you cover?", answer: "Stretch NYC serves every Bronx neighborhood including Riverdale, Kingsbridge, Fordham, Belmont, Morris Park, Pelham Parkway, Pelham Bay, Throgs Neck, City Island, Mott Haven, Hunts Point, Highbridge, the Grand Concourse, Tremont, and all surrounding areas." },
    { question: "Can I get a stretch session in Van Cortlandt Park or Pelham Bay Park?", answer: "Yes. Outdoor stretch service sessions in Bronx parks are available. Van Cortlandt Park and Pelham Bay Park are two of our most popular outdoor stretching locations in the Bronx. Your therapist arrives with a padded mat and all equipment for a complete outdoor session." },
    { question: "Do you work with student athletes at Bronx schools?", answer: "Yes. We work with student athletes at Fordham University, Lehman College, and Bronx high schools. Professional stretch service helps young athletes improve flexibility, prevent injury, and recover faster from training and competition." },
    { question: "How quickly can I get a Bronx stretch service appointment?", answer: "Same-day appointments are available in the Bronx. Text or call 212-202-7080 to book. We match you with the nearest available certified therapist and confirm your appointment quickly." },
    { question: "Is stretch service covered by insurance in the Bronx?", answer: "Stretch NYC does not bill insurance directly. However, if you have a flexible spending account (FSA) or health savings account (HSA), stretch service may be an eligible expense. We provide detailed receipts that you can submit to your plan administrator for potential reimbursement." },
  ],
  "staten-island": [
    { question: "How much does stretch service on Staten Island cost?", answer: "Staten Island stretch service is $99 per hour for single sessions. Weekly clients receive a 10% discount at $89 per hour. No memberships, no contracts, no hidden fees. Simple, transparent pricing." },
    { question: "Do you serve all of Staten Island?", answer: "Yes. Stretch NYC serves every Staten Island neighborhood including St. George, Stapleton, Tompkinsville, New Brighton, West Brighton, Port Richmond, Westerleigh, Willowbrook, New Dorp, Midland Beach, Great Kills, Eltingville, Annadale, Tottenville, Rossville, and all areas in between." },
    { question: "Can I book an outdoor stretch session on Staten Island?", answer: "Absolutely. The Staten Island Greenbelt, Clove Lakes Park, South Beach boardwalk, and other parks and outdoor spaces are excellent locations for stretch service sessions. Your therapist brings all equipment for a professional outdoor experience." },
    { question: "I have a long commute from Staten Island. Will stretching help?", answer: "Yes. Long commutes are one of the primary reasons Staten Island residents book stretch service. Sitting on the ferry, standing on the subway, and driving long distances all create chronic tightness and pain. Regular stretch service directly addresses these commute-related physical issues." },
    { question: "How quickly can I get a stretch appointment on Staten Island?", answer: "Same-day availability depends on therapist scheduling on Staten Island. Text or call 212-202-7080 to check current availability. We do our best to accommodate same-day requests and can usually book within 24 hours." },
    { question: "Do you offer stretch service for youth sports teams on Staten Island?", answer: "Yes. We work with youth sports teams across Staten Island. Team stretch sessions help young athletes improve flexibility, reduce injury risk, and develop healthy stretching habits. Contact us for team pricing and scheduling options." },
  ],
};

export default async function BoroughPage({ params }: Props) {
  const { borough } = await params;
  const b = findBoroughBySlug(borough);
  if (!b) notFound();

  const bNeighborhoods = getNeighborhoodsByBorough(borough);
  const bParks = getParksByBorough(borough);
  const otherBoroughs = boroughs.filter((ob) => ob.slug !== b.slug);
  const about = boroughAbout[b.slug];
  const clients = boroughClients[b.slug];
  const logistics = boroughLogistics[b.slug];
  const faqs = boroughFaqs[b.slug];

  return (
    <>
      <JsonLd data={webPageSchema(`${b.name} Stretch Service`, `Mobile stretch service across ${bNeighborhoods.length} ${b.name} neighborhoods.`, `${SITE_URL}/locations/${b.slug}`)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: "Locations", url: `${SITE_URL}/locations` },
        { name: b.name, url: `${SITE_URL}/locations/${b.slug}` },
      ])} />
      <JsonLd data={faqSchema(faqs)} />

      {/* ─── 1. HERO ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            {bNeighborhoods.length} Neighborhoods | $99/hr | Same-Day Available
          </p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            {b.name} <span className="text-teal-200">Stretch Service</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Professional mobile assisted stretch service across every {b.name} neighborhood. Our certified stretch therapists come to your home, office, or hotel with all equipment. $99/hr, 10% off weekly.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <span className="rounded-full bg-white/10 px-5 py-2 text-lg font-bold text-white font-cta">
              $99 Per Hour
            </span>
            <span className="rounded-full bg-teal-500/30 px-5 py-2 text-lg font-bold text-teal-100 font-cta">
              10% Off Weekly &mdash; $89/hr
            </span>
          </div>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a href={SITE_SMS_LINK} className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">
              Text {SITE_PHONE} to Book
            </a>
            <a href={SITE_PHONE_LINK} className="inline-block rounded-lg border-2 border-white/40 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/10 font-cta">
              Call {SITE_PHONE}
            </a>
          </div>
        </div>
      </section>

      {/* ─── 2. ABOUT STRETCH SERVICE IN [BOROUGH] ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            About Stretch Service in {b.name}
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-700">
            <p>{about.identity}</p>
            <p>{about.physical}</p>
            <p>{about.whyMobile}</p>
            <p>{about.lifestyle}</p>
            <p>{about.closing}</p>
          </div>
        </div>
      </section>

      {/* ─── 3. ALL NEIGHBORHOODS ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            All {bNeighborhoods.length} {b.name} Neighborhoods We Serve
          </h2>
          <p className="mt-3 text-base text-slate-600">
            Stretch NYC provides mobile stretch service to every neighborhood in {b.name}. Click any neighborhood below to learn about stretch service options, local parks, and booking information specific to your area. Our certified stretch therapists know {b.name} inside and out and travel to every one of these {bNeighborhoods.length} neighborhoods seven days a week.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bNeighborhoods.map((n) => (
              <Link key={n.slug} href={getNeighborhoodUrl(n)}>
                <div className="group rounded-xl border border-teal-200/60 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-600 font-heading">{n.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">{n.vibe}</p>
                  <p className="mt-2 text-sm text-slate-600 line-clamp-2">{n.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 4. TOP SERVICES IN [BOROUGH] ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            Top Stretch Services in {b.name}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-700">
            Stretch NYC offers {services.length} professional stretch service types across {b.name}. Every service is delivered mobile, meaning your certified stretch therapist comes to you with all professional equipment. The most popular stretch services in {b.name} include <Link href={getServiceUrl(services[0])} className="text-teal-600 underline hover:text-teal-800">{services[0].name}</Link>, which provides hands-on, one-on-one flexibility therapy; <Link href={getServiceUrl(services[1])} className="text-teal-600 underline hover:text-teal-800">{services[1].name}</Link>, the gold standard technique used by Olympic athletes; and <Link href={getServiceUrl(services[6])} className="text-teal-600 underline hover:text-teal-800">{services[6].name}</Link>, which targets the connective tissue responsible for chronic pain patterns. For {b.name} residents who work at desks, <Link href={getServiceUrl(services[4])} className="text-teal-600 underline hover:text-teal-800">{services[4].name}</Link> provides deep relaxation without any effort on your part. Athletes in {b.name} often combine <Link href={getServiceUrl(services[3])} className="text-teal-600 underline hover:text-teal-800">{services[3].name}</Link> for warm-ups with <Link href={getServiceUrl(services[8])} className="text-teal-600 underline hover:text-teal-800">{services[8].name}</Link> for post-workout recovery. Seniors across {b.name} neighborhoods benefit from our <Link href={getServiceUrl(services[9])} className="text-teal-600 underline hover:text-teal-800">{services[9].name}</Link> program, which focuses on safe, gentle movements that maintain independence and prevent falls.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {services.map((s) => (
              <Link key={s.slug} href={getServiceUrl(s)}>
                <div className="group rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-teal-400 hover:shadow-md">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{s.name}</h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-1">{s.tagline}</p>
                  <p className="mt-2 text-xs text-slate-600 line-clamp-2">{s.shortDesc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 5. PARKS & OUTDOOR STRETCHING ─── */}
      {bParks.length > 0 && (
        <section className="bg-section-teal py-16">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
              Parks &amp; Outdoor Stretching in {b.name}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-700">
              {b.name} is home to {bParks.length} parks and outdoor spaces where Stretch NYC provides professional mobile stretch service. Outdoor stretching combines the physical benefits of professional flexibility therapy with the mental health benefits of fresh air, natural surroundings, and sunlight. Our certified stretch therapists meet you at any {b.name} park with a padded mat, straps, and all necessary equipment for a complete outdoor stretch service session. Whether you prefer a quiet morning stretch in a neighborhood park or a weekend session in one of {b.name}&apos;s iconic green spaces, outdoor stretch service is a unique experience that many of our {b.name} clients love. Park sessions are available at the same $99 per hour rate, with the same 10% weekly discount. Click any park below to learn more about stretch service at that specific location.
            </p>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {bParks.map((p) => (
                <Link key={p.slug} href={getParkUrl(p)}>
                  <div className="group rounded-xl border border-teal-200/60 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{p.name}</h3>
                    <p className="mt-1 text-xs text-slate-500">Best spot: {p.bestSpot}</p>
                    <p className="mt-2 text-xs text-slate-600 line-clamp-2">{p.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── 6. WHO USES STRETCH SERVICE IN [BOROUGH] ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            Who Uses Stretch Service in {b.name}?
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-700">{clients.intro}</p>
          <div className="mt-8 space-y-6">
            {clients.types.map((ct) => (
              <div key={ct.title}>
                <h3 className="text-lg font-bold text-slate-900 font-heading">{ct.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-slate-700">{ct.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 7. HOW IT WORKS IN [BOROUGH] ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            How Mobile Stretch Service Works in {b.name}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-700">{logistics}</p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: "1", title: "Text or Call", desc: `Text or call ${SITE_PHONE} with your ${b.name} address, preferred date, and time.` },
              { step: "2", title: "We Confirm", desc: `We confirm your appointment and assign a certified stretch therapist in ${b.name}.` },
              { step: "3", title: "Therapist Arrives", desc: `Your therapist arrives at your ${b.name} location with all professional equipment.` },
              { step: "4", title: "Feel Amazing", desc: "Enjoy 60 minutes of professional stretch service. Feel immediate relief and improved mobility." },
            ].map((s) => (
              <div key={s.step} className="rounded-xl border border-teal-200/60 bg-white p-5 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-teal-600 text-lg font-bold text-white font-cta">{s.step}</div>
                <h3 className="mt-3 text-sm font-bold text-slate-900 font-heading">{s.title}</h3>
                <p className="mt-2 text-xs text-slate-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 8. PRICING ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            {b.name} Stretch Service Pricing
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-700">
            Stretch NYC keeps pricing simple and transparent for all {b.name} stretch service clients. There are no memberships, no contracts, and no hidden fees. You pay per session, and every session includes a full 60-minute stretch service with a certified therapist, all professional equipment, travel to your {b.name} location, and a customized stretch protocol designed for your body.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-xl border-2 border-slate-200 bg-white p-8 text-center">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Single Session</h3>
              <p className="mt-2 text-4xl font-bold text-teal-600 font-heading">$99<span className="text-base font-normal text-slate-500">/hour</span></p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600 text-left">
                <li>60-minute professional stretch service</li>
                <li>Certified stretch therapist</li>
                <li>All equipment included</li>
                <li>Mobile to any {b.name} location</li>
                <li>Mobility assessment included</li>
                <li>Same-day availability</li>
              </ul>
              <a href={SITE_SMS_LINK} className="mt-6 inline-block w-full rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700 font-cta">
                Book Single Session
              </a>
            </div>
            <div className="rounded-xl border-2 border-teal-400 bg-teal-50/50 p-8 text-center relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-teal-600 px-4 py-1 text-xs font-bold text-white font-cta">BEST VALUE</span>
              <h3 className="text-lg font-bold text-slate-900 font-heading">Weekly Program</h3>
              <p className="mt-2 text-4xl font-bold text-teal-600 font-heading">$89<span className="text-base font-normal text-slate-500">/hour</span></p>
              <p className="mt-1 text-sm font-semibold text-teal-700">10% Off &mdash; Save $10/week</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600 text-left">
                <li>Everything in single session</li>
                <li>Same therapist every week</li>
                <li>Priority scheduling</li>
                <li>Progressive treatment plan</li>
                <li>Session-to-session tracking</li>
                <li>Cancel anytime, no contract</li>
              </ul>
              <a href={SITE_SMS_LINK} className="mt-6 inline-block w-full rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700 font-cta">
                Start Weekly Program
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 9. FAQ ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            Frequently Asked Questions About {b.name} Stretch Service
          </h2>
          <div className="mt-8 space-y-6">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-xl border border-teal-200/60 bg-white p-6">
                <h3 className="text-base font-bold text-slate-900 font-heading">{faq.question}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 10. OTHER BOROUGHS ─── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            Stretch Service in Other NYC Boroughs
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-700">
            Stretch NYC serves all five boroughs of New York City. In addition to {b.name} stretch service, our certified therapists provide mobile stretch service across every neighborhood in the city. Click any borough below to learn about stretch service options, neighborhoods served, and local booking information.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {otherBoroughs.map((ob) => {
              const obNeighborhoods = getNeighborhoodsByBorough(ob.slug);
              return (
                <Link key={ob.slug} href={getBoroughUrl(ob)}>
                  <div className="group rounded-xl border border-slate-200 bg-white p-5 text-center transition-all hover:border-teal-400 hover:shadow-md">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-600 font-heading">{ob.name}</h3>
                    <p className="mt-1 text-xs text-slate-500">{obNeighborhoods.length} neighborhoods</p>
                    <p className="mt-2 text-sm text-teal-600 font-semibold">{ob.name} Stretch Service &rarr;</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 11. JOBS IN [BOROUGH] ─── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            Stretch Therapist Jobs in {b.name}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-700">
            Are you a certified stretch therapist, massage therapist, or personal trainer in {b.name}? Stretch NYC is hiring mobile stretch therapists to serve {b.name} neighborhoods. Earn $50 per hour, set your own schedule, and get paid within 30 minutes of every session. We provide the client base and booking system. You provide the expertise and professionalism. No marketing, no sales, no overhead.
          </p>
          <Link href={`/jobs/${b.slug}`} className="mt-6 inline-block rounded-lg bg-teal-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-colors hover:bg-teal-700 font-cta">
            View {b.name} Therapist Jobs
          </Link>
        </div>
      </section>

      {/* ─── 12. FINAL CTA ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl font-heading">
            Book the Best Stretch Service in {b.name} Today
          </h2>
          <p className="mt-4 text-lg text-white/80">
            Professional mobile stretch service across all {bNeighborhoods.length} {b.name} neighborhoods. $99 per hour. 10% off weekly. Certified therapists. Same-day appointments available 7AM to 10PM, seven days a week.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a href={SITE_SMS_LINK} className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">
              Text {SITE_PHONE}
            </a>
            <a href={SITE_PHONE_LINK} className="inline-block rounded-lg border-2 border-white/40 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/10 font-cta">
              Call {SITE_PHONE}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
