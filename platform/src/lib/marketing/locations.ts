export interface CityData {
  name: string
  slug: string
  state: string
  stateAbbr: string
  population: string
  description: string
}

export const cities: CityData[] = [
  // Northeast
  { name: 'New York', slug: 'new-york', state: 'New York', stateAbbr: 'NY', population: '8.3M', description: 'The largest US metro with massive demand across all home service trades.' },
  { name: 'Boston', slug: 'boston', state: 'Massachusetts', stateAbbr: 'MA', population: '4.9M', description: 'Dense metro with high-income homeowners and strong demand for premium services.' },
  { name: 'Philadelphia', slug: 'philadelphia', state: 'Pennsylvania', stateAbbr: 'PA', population: '6.2M', description: 'Large metro area spanning PA, NJ, and DE with diverse service needs.' },
  { name: 'Pittsburgh', slug: 'pittsburgh', state: 'Pennsylvania', stateAbbr: 'PA', population: '2.4M', description: 'Growing metro with older housing stock driving renovation and maintenance demand.' },
  { name: 'Hartford', slug: 'hartford', state: 'Connecticut', stateAbbr: 'CT', population: '1.2M', description: 'Affluent suburbs with strong demand for landscaping and home maintenance.' },
  { name: 'Providence', slug: 'providence', state: 'Rhode Island', stateAbbr: 'RI', population: '1.6M', description: 'Compact metro spanning RI and MA with growing home service demand.' },
  { name: 'Newark', slug: 'newark', state: 'New Jersey', stateAbbr: 'NJ', population: '2.3M', description: 'Dense suburban metro adjacent to NYC with strong residential demand.' },
  { name: 'Buffalo', slug: 'buffalo', state: 'New York', stateAbbr: 'NY', population: '1.2M', description: 'Western NY metro with seasonal service demand and growing renovation market.' },
  { name: 'Albany', slug: 'albany', state: 'New York', stateAbbr: 'NY', population: '900K', description: 'Capital district metro with steady demand for residential and commercial services.' },

  // Southeast
  { name: 'Miami', slug: 'miami', state: 'Florida', stateAbbr: 'FL', population: '6.1M', description: 'Year-round demand for cleaning, pest control, pool service, and landscaping.' },
  { name: 'Tampa', slug: 'tampa', state: 'Florida', stateAbbr: 'FL', population: '3.2M', description: 'Fast-growing Gulf Coast metro with strong demand for outdoor and cleaning services.' },
  { name: 'Orlando', slug: 'orlando', state: 'Florida', stateAbbr: 'FL', population: '2.7M', description: 'Rapidly expanding metro with booming residential construction and maintenance needs.' },
  { name: 'Jacksonville', slug: 'jacksonville', state: 'Florida', stateAbbr: 'FL', population: '1.6M', description: 'Sprawling metro with growing suburbs creating new demand for home services.' },
  { name: 'Atlanta', slug: 'atlanta', state: 'Georgia', stateAbbr: 'GA', population: '6.1M', description: 'One of the fastest-growing metros with exploding demand for all trades.' },
  { name: 'Charlotte', slug: 'charlotte', state: 'North Carolina', stateAbbr: 'NC', population: '2.7M', description: 'Booming metro with new construction and high demand for cleaning and landscaping.' },
  { name: 'Raleigh', slug: 'raleigh', state: 'North Carolina', stateAbbr: 'NC', population: '1.5M', description: 'Research Triangle area with tech-savvy homeowners and growing populations.' },
  { name: 'Nashville', slug: 'nashville', state: 'Tennessee', stateAbbr: 'TN', population: '2M', description: 'Explosive growth creating demand for every category of home service.' },
  { name: 'Memphis', slug: 'memphis', state: 'Tennessee', stateAbbr: 'TN', population: '1.3M', description: 'Established metro with steady demand for residential and commercial services.' },
  { name: 'Richmond', slug: 'richmond', state: 'Virginia', stateAbbr: 'VA', population: '1.3M', description: 'Historic metro with older homes driving strong renovation and maintenance demand.' },
  { name: 'Washington DC', slug: 'washington-dc', state: 'District of Columbia', stateAbbr: 'DC', population: '6.3M', description: 'High-income metro spanning DC, MD, and VA with premium service demand.' },
  { name: 'New Orleans', slug: 'new-orleans', state: 'Louisiana', stateAbbr: 'LA', population: '1.3M', description: 'Unique market with year-round pest control, humidity-related cleaning, and restoration demand.' },
  { name: 'Charleston', slug: 'charleston', state: 'South Carolina', stateAbbr: 'SC', population: '800K', description: 'Growing coastal metro with strong demand for cleaning and outdoor services.' },
  { name: 'Savannah', slug: 'savannah', state: 'Georgia', stateAbbr: 'GA', population: '400K', description: 'Historic coastal city with unique maintenance needs and growing population.' },

  // Midwest
  { name: 'Chicago', slug: 'chicago', state: 'Illinois', stateAbbr: 'IL', population: '9.5M', description: 'Third-largest metro with massive demand across all home service categories.' },
  { name: 'Detroit', slug: 'detroit', state: 'Michigan', stateAbbr: 'MI', population: '4.3M', description: 'Large metro with strong seasonal demand and growing renovation market.' },
  { name: 'Minneapolis', slug: 'minneapolis', state: 'Minnesota', stateAbbr: 'MN', population: '3.7M', description: 'Twin Cities metro with strong demand for seasonal services and home maintenance.' },
  { name: 'St. Louis', slug: 'st-louis', state: 'Missouri', stateAbbr: 'MO', population: '2.8M', description: 'Bi-state metro with diverse housing stock and steady service demand.' },
  { name: 'Kansas City', slug: 'kansas-city', state: 'Missouri', stateAbbr: 'MO', population: '2.2M', description: 'Growing metro spanning MO and KS with expanding suburbs and service demand.' },
  { name: 'Columbus', slug: 'columbus', state: 'Ohio', stateAbbr: 'OH', population: '2.1M', description: 'Fast-growing Ohio metro with strong residential cleaning and landscaping demand.' },
  { name: 'Cleveland', slug: 'cleveland', state: 'Ohio', stateAbbr: 'OH', population: '2M', description: 'Established metro with older housing stock driving maintenance and repair demand.' },
  { name: 'Cincinnati', slug: 'cincinnati', state: 'Ohio', stateAbbr: 'OH', population: '2.3M', description: 'Tri-state metro spanning OH, KY, and IN with diverse service needs.' },
  { name: 'Indianapolis', slug: 'indianapolis', state: 'Indiana', stateAbbr: 'IN', population: '2.1M', description: 'Central Indiana metro with growing suburbs and steady home service demand.' },
  { name: 'Milwaukee', slug: 'milwaukee', state: 'Wisconsin', stateAbbr: 'WI', population: '1.6M', description: 'Lake Michigan metro with strong seasonal demand and older housing stock.' },
  { name: 'Omaha', slug: 'omaha', state: 'Nebraska', stateAbbr: 'NE', population: '970K', description: 'Growing Midwest metro with expanding residential areas and service demand.' },
  { name: 'Des Moines', slug: 'des-moines', state: 'Iowa', stateAbbr: 'IA', population: '700K', description: 'Central Iowa metro with steady growth and strong home maintenance demand.' },

  // Southwest
  { name: 'Dallas', slug: 'dallas', state: 'Texas', stateAbbr: 'TX', population: '7.6M', description: 'Massive metro with year-round demand and explosive population growth.' },
  { name: 'Houston', slug: 'houston', state: 'Texas', stateAbbr: 'TX', population: '7.1M', description: 'Fourth-largest US metro with year-round demand for every home service trade.' },
  { name: 'San Antonio', slug: 'san-antonio', state: 'Texas', stateAbbr: 'TX', population: '2.6M', description: 'Fast-growing South Texas metro with strong demand for cleaning and outdoor services.' },
  { name: 'Austin', slug: 'austin', state: 'Texas', stateAbbr: 'TX', population: '2.3M', description: 'One of America\'s fastest-growing metros with booming new construction and service needs.' },
  { name: 'Phoenix', slug: 'phoenix', state: 'Arizona', stateAbbr: 'AZ', population: '4.9M', description: 'Year-round warm weather drives constant demand for pool, pest, and outdoor services.' },
  { name: 'Scottsdale', slug: 'scottsdale', state: 'Arizona', stateAbbr: 'AZ', population: '260K', description: 'Luxury market with premium service demand for cleaning, landscaping, and pool care.' },
  { name: 'Tucson', slug: 'tucson', state: 'Arizona', stateAbbr: 'AZ', population: '1M', description: 'Southern Arizona metro with strong demand for HVAC, pest control, and landscaping.' },
  { name: 'Las Vegas', slug: 'las-vegas', state: 'Nevada', stateAbbr: 'NV', population: '2.3M', description: 'Fast-growing desert metro with strong demand for cleaning, pool, and HVAC services.' },
  { name: 'Albuquerque', slug: 'albuquerque', state: 'New Mexico', stateAbbr: 'NM', population: '900K', description: 'New Mexico\'s largest metro with growing residential service demand.' },
  { name: 'Oklahoma City', slug: 'oklahoma-city', state: 'Oklahoma', stateAbbr: 'OK', population: '1.4M', description: 'Central Oklahoma metro with expanding suburbs and growing home service market.' },
  { name: 'El Paso', slug: 'el-paso', state: 'Texas', stateAbbr: 'TX', population: '870K', description: 'Border metro with bilingual demand for home services.' },

  // West Coast
  { name: 'Los Angeles', slug: 'los-angeles', state: 'California', stateAbbr: 'CA', population: '13.2M', description: 'Largest West Coast metro with massive demand across all home service trades.' },
  { name: 'San Francisco', slug: 'san-francisco', state: 'California', stateAbbr: 'CA', population: '4.7M', description: 'High-income Bay Area metro with premium demand for cleaning and home services.' },
  { name: 'San Diego', slug: 'san-diego', state: 'California', stateAbbr: 'CA', population: '3.3M', description: 'Year-round temperate climate drives consistent demand for outdoor and cleaning services.' },
  { name: 'San Jose', slug: 'san-jose', state: 'California', stateAbbr: 'CA', population: '2M', description: 'Silicon Valley metro with tech-savvy homeowners and premium service expectations.' },
  { name: 'Sacramento', slug: 'sacramento', state: 'California', stateAbbr: 'CA', population: '2.4M', description: 'California\'s capital with growing suburbs and strong residential service demand.' },
  { name: 'Seattle', slug: 'seattle', state: 'Washington', stateAbbr: 'WA', population: '4M', description: 'Tech hub with high-income residents and strong demand for cleaning and home services.' },
  { name: 'Portland', slug: 'portland', state: 'Oregon', stateAbbr: 'OR', population: '2.5M', description: 'Eco-conscious metro with demand for green cleaning and sustainable home services.' },
  { name: 'Denver', slug: 'denver', state: 'Colorado', stateAbbr: 'CO', population: '2.9M', description: 'Fast-growing Front Range metro with strong demand across all service categories.' },
  { name: 'Salt Lake City', slug: 'salt-lake-city', state: 'Utah', stateAbbr: 'UT', population: '1.3M', description: 'Growing Wasatch Front metro with expanding suburbs and strong family-oriented demand.' },
  { name: 'Boise', slug: 'boise', state: 'Idaho', stateAbbr: 'ID', population: '770K', description: 'One of America\'s fastest-growing metros with exploding residential service needs.' },
  { name: 'Honolulu', slug: 'honolulu', state: 'Hawaii', stateAbbr: 'HI', population: '1M', description: 'Island metro with year-round demand for cleaning, pest control, and maintenance.' },
  { name: 'Anchorage', slug: 'anchorage', state: 'Alaska', stateAbbr: 'AK', population: '400K', description: 'Alaska\'s largest metro with unique seasonal service demand.' },

  // Additional major metros
  { name: 'Baltimore', slug: 'baltimore', state: 'Maryland', stateAbbr: 'MD', population: '2.8M', description: 'Major Mid-Atlantic metro with diverse housing stock and strong service demand.' },
  { name: 'Louisville', slug: 'louisville', state: 'Kentucky', stateAbbr: 'KY', population: '1.3M', description: 'Kentucky\'s largest metro with steady residential and commercial demand.' },
  { name: 'Birmingham', slug: 'birmingham', state: 'Alabama', stateAbbr: 'AL', population: '1.1M', description: 'Alabama\'s largest metro with year-round demand for cleaning and outdoor services.' },
  { name: 'Virginia Beach', slug: 'virginia-beach', state: 'Virginia', stateAbbr: 'VA', population: '1.8M', description: 'Hampton Roads metro with military bases and growing residential demand.' },
  { name: 'Greenville', slug: 'greenville', state: 'South Carolina', stateAbbr: 'SC', population: '950K', description: 'Fast-growing Upstate SC metro with expanding residential areas.' },
  { name: 'Knoxville', slug: 'knoxville', state: 'Tennessee', stateAbbr: 'TN', population: '900K', description: 'East Tennessee metro with growing population and strong service demand.' },
  { name: 'Tulsa', slug: 'tulsa', state: 'Oklahoma', stateAbbr: 'OK', population: '1M', description: 'Eastern Oklahoma metro with steady residential service demand.' },
  { name: 'Fresno', slug: 'fresno', state: 'California', stateAbbr: 'CA', population: '1.1M', description: 'Central Valley metro with growing residential areas and strong service needs.' },
  { name: 'Bakersfield', slug: 'bakersfield', state: 'California', stateAbbr: 'CA', population: '910K', description: 'Southern Central Valley metro with hot climate driving HVAC and pool demand.' },
  { name: 'Riverside', slug: 'riverside', state: 'California', stateAbbr: 'CA', population: '4.6M', description: 'Inland Empire metro with massive suburban sprawl and growing service demand.' },
]

export function getCityBySlug(slug: string): CityData | undefined {
  return cities.find((c) => c.slug === slug)
}

export function getAllCitySlugs(): string[] {
  return cities.map((c) => c.slug)
}

export function getCitiesByState(): Record<string, CityData[]> {
  const grouped: Record<string, CityData[]> = {}
  for (const city of cities) {
    if (!grouped[city.state]) grouped[city.state] = []
    grouped[city.state].push(city)
  }
  return grouped
}
