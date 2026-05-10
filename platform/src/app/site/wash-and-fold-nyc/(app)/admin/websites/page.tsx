// @ts-nocheck
'use client'
import { useEffect, useState } from 'react'
import WebsitesMap from '@/app/site/wash-and-fold-nyc/_components/WebsitesMap'

interface Website {
  domain: string
  location: string
  region: string
  url: string
  lat?: number
  lng?: number
}

const ITEMS_PER_PAGE = 24

export default function WebsitesPage() {
  useEffect(() => { document.title = 'Websites | Wash and Fold NYC' }, []);
  const [websites, setWebsites] = useState<Website[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    loadWebsites()
  }, [])

  const loadWebsites = () => {
    const sites: Website[] = [
      // ========== MANHATTAN ==========
      // Upper East Side
      { domain: 'uesmaid.com', location: 'Upper East Side', region: 'Manhattan', url: 'https://uesmaid.com', lat: 40.7736, lng: -73.9566 },
      { domain: 'uescleaningservice.com', location: 'Upper East Side', region: 'Manhattan', url: 'https://uescleaningservice.com', lat: 40.7736, lng: -73.9566 },
      { domain: 'uescarpetcleaner.com', location: 'Upper East Side', region: 'Manhattan', url: 'https://uescarpetcleaner.com', lat: 40.7736, lng: -73.9566 },

      // Upper West Side
      { domain: 'uwsmaid.com', location: 'Upper West Side', region: 'Manhattan', url: 'https://uwsmaid.com', lat: 40.7870, lng: -73.9754 },
      { domain: 'uwscleaningservice.com', location: 'Upper West Side', region: 'Manhattan', url: 'https://uwscleaningservice.com', lat: 40.7870, lng: -73.9754 },
      { domain: 'uwscarpetcleaner.com', location: 'Upper West Side', region: 'Manhattan', url: 'https://uwscarpetcleaner.com', lat: 40.7870, lng: -73.9754 },

      // Midtown
      { domain: 'midtownmaid.com', location: 'Midtown', region: 'Manhattan', url: 'https://midtownmaid.com', lat: 40.7549, lng: -73.9840 },
      { domain: 'cleaningserviceinmidtown.com', location: 'Midtown', region: 'Manhattan', url: 'https://cleaningserviceinmidtown.com', lat: 40.7549, lng: -73.9840 },

      // Central Park
      { domain: 'centralparkcleaningservice.com', location: 'Central Park', region: 'Manhattan', url: 'https://centralparkcleaningservice.com', lat: 40.7829, lng: -73.9654 },

      // Hell's Kitchen
      { domain: 'hellskitchenmaid.com', location: "Hell's Kitchen", region: 'Manhattan', url: 'https://hellskitchenmaid.com', lat: 40.7638, lng: -73.9918 },
      { domain: 'hellskitchencleaningservice.com', location: "Hell's Kitchen", region: 'Manhattan', url: 'https://hellskitchencleaningservice.com', lat: 40.7638, lng: -73.9918 },

      // Chelsea / Hudson Yards
      { domain: 'chelseacleaningservice.com', location: 'Chelsea', region: 'Manhattan', url: 'https://chelseacleaningservice.com', lat: 40.7465, lng: -74.0014 },
      { domain: 'hudsonyardsmaid.com', location: 'Hudson Yards', region: 'Manhattan', url: 'https://hudsonyardsmaid.com', lat: 40.7539, lng: -74.0020 },

      // Columbus Circle
      { domain: 'columbuscirclecleaningservice.com', location: 'Columbus Circle', region: 'Manhattan', url: 'https://columbuscirclecleaningservice.com', lat: 40.7681, lng: -73.9819 },

      // Tribeca
      { domain: 'tribecamaid.com', location: 'Tribeca', region: 'Manhattan', url: 'https://tribecamaid.com', lat: 40.7163, lng: -74.0086 },
      { domain: 'tribecacleaningservice.com', location: 'Tribeca', region: 'Manhattan', url: 'https://tribecacleaningservice.com', lat: 40.7163, lng: -74.0086 },

      // SoHo
      { domain: 'sohomaid.com', location: 'SoHo', region: 'Manhattan', url: 'https://sohomaid.com', lat: 40.7233, lng: -74.0030 },
      { domain: 'sohocleaningservice.com', location: 'SoHo', region: 'Manhattan', url: 'https://sohocleaningservice.com', lat: 40.7233, lng: -74.0030 },

      // West Village
      { domain: 'westvillagemaid.com', location: 'West Village', region: 'Manhattan', url: 'https://westvillagemaid.com', lat: 40.7358, lng: -74.0036 },
      { domain: 'westvillagecleaningservice.com', location: 'West Village', region: 'Manhattan', url: 'https://westvillagecleaningservice.com', lat: 40.7358, lng: -74.0036 },

      // Greenwich Village
      { domain: 'greenwichvillagemaid.com', location: 'Greenwich Village', region: 'Manhattan', url: 'https://greenwichvillagemaid.com', lat: 40.7336, lng: -73.9997 },
      { domain: 'greenwichvillagecleaningservice.com', location: 'Greenwich Village', region: 'Manhattan', url: 'https://greenwichvillagecleaningservice.com', lat: 40.7336, lng: -73.9997 },

      // East Village
      { domain: 'eastvillagemaid.com', location: 'East Village', region: 'Manhattan', url: 'https://eastvillagemaid.com', lat: 40.7264, lng: -73.9818 },

      // Lower East Side
      { domain: 'lesmaid.com', location: 'Lower East Side', region: 'Manhattan', url: 'https://lesmaid.com', lat: 40.7156, lng: -73.9874 },

      // Union Square
      { domain: 'unionsquarecleaningservice.com', location: 'Union Square', region: 'Manhattan', url: 'https://unionsquarecleaningservice.com', lat: 40.7359, lng: -73.9911 },

      // Gramercy
      { domain: 'grammercymaid.com', location: 'Gramercy', region: 'Manhattan', url: 'https://grammercymaid.com', lat: 40.7378, lng: -73.9847 },

      // Murray Hill / Kips Bay
      { domain: 'murrayhillmaid.com', location: 'Murray Hill', region: 'Manhattan', url: 'https://murrayhillmaid.com', lat: 40.7478, lng: -73.9755 },
      { domain: 'kipsbaymaid.com', location: 'Kips Bay', region: 'Manhattan', url: 'https://kipsbaymaid.com', lat: 40.7425, lng: -73.9785 },

      // Stuyvesant Town
      { domain: 'stuytownmaid.com', location: 'Stuyvesant Town', region: 'Manhattan', url: 'https://stuytownmaid.com', lat: 40.7310, lng: -73.9760 },
      { domain: 'stuytowncleaningservice.com', location: 'Stuyvesant Town', region: 'Manhattan', url: 'https://stuytowncleaningservice.com', lat: 40.7310, lng: -73.9760 },

      // NoMad / Flatiron
      { domain: 'nomadmaid.com', location: 'NoMad', region: 'Manhattan', url: 'https://nomadmaid.com', lat: 40.7450, lng: -73.9885 },
      { domain: 'flatironmaid.com', location: 'Flatiron', region: 'Manhattan', url: 'https://flatironmaid.com', lat: 40.7410, lng: -73.9897 },

      // Harlem
      { domain: 'harlemmaid.com', location: 'Harlem', region: 'Manhattan', url: 'https://harlemmaid.com', lat: 40.8116, lng: -73.9465 },

      // Battery Park / FiDi
      { domain: 'batteryparkmaid.com', location: 'Battery Park', region: 'Manhattan', url: 'https://batteryparkmaid.com', lat: 40.7033, lng: -74.0170 },
      { domain: 'fidimaid.com', location: 'Financial District', region: 'Manhattan', url: 'https://fidimaid.com', lat: 40.7074, lng: -74.0113 },

      // Roosevelt Island
      { domain: 'rooseveltislandcleaningservice.com', location: 'Roosevelt Island', region: 'Manhattan', url: 'https://rooseveltislandcleaningservice.com', lat: 40.7614, lng: -73.9511 },

      // General Manhattan
      { domain: 'manhtattanmaidservice.com', location: 'Manhattan', region: 'Manhattan', url: 'https://manhtattanmaidservice.com', lat: 40.7831, lng: -73.9712 },

      // ========== BROOKLYN ==========
      { domain: 'parkslopemaid.com', location: 'Park Slope', region: 'Brooklyn', url: 'https://parkslopemaid.com', lat: 40.6710, lng: -73.9778 },
      { domain: 'brooklynheightsmaid.com', location: 'Brooklyn Heights', region: 'Brooklyn', url: 'https://brooklynheightsmaid.com', lat: 40.6958, lng: -73.9936 },
      { domain: 'sunsetparkmaid.com', location: 'Sunset Park', region: 'Brooklyn', url: 'https://sunsetparkmaid.com', lat: 40.6453, lng: -74.0154 },
      { domain: 'cleaningservicebrooklynny.com', location: 'Brooklyn', region: 'Brooklyn', url: 'https://cleaningservicebrooklynny.com', lat: 40.6782, lng: -73.9442 },
      { domain: 'cleaningservicedumbony.com', location: 'DUMBO', region: 'Brooklyn', url: 'https://cleaningservicedumbony.com', lat: 40.7033, lng: -73.9888 },

      // ========== QUEENS ==========
      { domain: 'licmaid.com', location: 'Long Island City', region: 'Queens', url: 'https://licmaid.com', lat: 40.7447, lng: -73.9485 },
      { domain: 'cleaningservicelongislandcity.com', location: 'Long Island City', region: 'Queens', url: 'https://cleaningservicelongislandcity.com', lat: 40.7447, lng: -73.9485 },
      { domain: 'cleaningserviceastoriany.com', location: 'Astoria', region: 'Queens', url: 'https://cleaningserviceastoriany.com', lat: 40.7614, lng: -73.9246 },
      { domain: 'cleaningservicesunnysideny.com', location: 'Sunnyside', region: 'Queens', url: 'https://cleaningservicesunnysideny.com', lat: 40.7433, lng: -73.9196 },
      { domain: 'jacksonheightsmaid.com', location: 'Jackson Heights', region: 'Queens', url: 'https://jacksonheightsmaid.com', lat: 40.7557, lng: -73.8831 },
      { domain: 'regoparkmaid.com', location: 'Rego Park', region: 'Queens', url: 'https://regoparkmaid.com', lat: 40.7264, lng: -73.8616 },
      { domain: 'foresthillsmaid.com', location: 'Forest Hills', region: 'Queens', url: 'https://foresthillsmaid.com', lat: 40.7185, lng: -73.8448 },
      { domain: 'kewgardensmaid.com', location: 'Kew Gardens', region: 'Queens', url: 'https://kewgardensmaid.com', lat: 40.7070, lng: -73.8309 },
      { domain: 'flushingmaid.com', location: 'Flushing', region: 'Queens', url: 'https://flushingmaid.com', lat: 40.7674, lng: -73.8330 },
      { domain: 'baysidemaid.com', location: 'Bayside', region: 'Queens', url: 'https://baysidemaid.com', lat: 40.7682, lng: -73.7772 },
      { domain: 'cleaningservicequeensny.com', location: 'Queens', region: 'Queens', url: 'https://cleaningservicequeensny.com', lat: 40.7282, lng: -73.7949 },
      { domain: 'maidservicequeensny.com', location: 'Queens', region: 'Queens', url: 'https://maidservicequeensny.com', lat: 40.7282, lng: -73.7949 },

      // ========== LONG ISLAND ==========
      { domain: 'greatneckmaid.com', location: 'Great Neck', region: 'Long Island', url: 'https://greatneckmaid.com', lat: 40.8007, lng: -73.7285 },
      { domain: 'manhassetmaid.com', location: 'Manhasset', region: 'Long Island', url: 'https://manhassetmaid.com', lat: 40.7979, lng: -73.6993 },
      { domain: 'portwashingtonmaid.com', location: 'Port Washington', region: 'Long Island', url: 'https://portwashingtonmaid.com', lat: 40.8257, lng: -73.6982 },
      { domain: 'gardencitymaid.com', location: 'Garden City', region: 'Long Island', url: 'https://gardencitymaid.com', lat: 40.7268, lng: -73.6343 },

      // ========== NEW JERSEY ==========
      { domain: 'hobokenmaidservice.com', location: 'Hoboken', region: 'New Jersey', url: 'https://hobokenmaidservice.com', lat: 40.7439, lng: -74.0324 },
      { domain: 'jerseycitymaid.com', location: 'Jersey City', region: 'New Jersey', url: 'https://jerseycitymaid.com', lat: 40.7178, lng: -74.0431 },
      { domain: 'weehawkenmaid.com', location: 'Weehawken', region: 'New Jersey', url: 'https://weehawkenmaid.com', lat: 40.7697, lng: -74.0204 },
      { domain: 'edgewatermaid.com', location: 'Edgewater', region: 'New Jersey', url: 'https://edgewatermaid.com', lat: 40.8271, lng: -73.9754 },

      // ========== FLORIDA - TAMPA ==========
      { domain: 'thetampamaid.com', location: 'Tampa', region: 'Florida', url: 'https://thetampamaid.com', lat: 27.9506, lng: -82.4572 },
      { domain: 'southtampamaid.com', location: 'South Tampa', region: 'Florida', url: 'https://southtampamaid.com', lat: 27.9103, lng: -82.4754 },
      { domain: 'newtampamaid.com', location: 'New Tampa', region: 'Florida', url: 'https://newtampamaid.com', lat: 28.0748, lng: -82.3837 },
      { domain: 'channelsidemaid.com', location: 'Channelside', region: 'Florida', url: 'https://channelsidemaid.com', lat: 27.9392, lng: -82.4481 },
      { domain: 'hydeparkmaid.com', location: 'Hyde Park', region: 'Florida', url: 'https://hydeparkmaid.com', lat: 27.9306, lng: -82.4783 },
      { domain: 'westchasemaid.com', location: 'Westchase', region: 'Florida', url: 'https://westchasemaid.com', lat: 28.0542, lng: -82.5992 },
      { domain: 'carrollwoodmaid.com', location: 'Carrollwood', region: 'Florida', url: 'https://carrollwoodmaid.com', lat: 28.0522, lng: -82.5140 },
      { domain: 'seminoleheightsmaid.com', location: 'Seminole Heights', region: 'Florida', url: 'https://seminoleheightsmaid.com', lat: 27.9931, lng: -82.4593 },
      { domain: 'palmaceiamaid.com', location: 'Palma Ceia', region: 'Florida', url: 'https://palmaceiamaid.com', lat: 27.9219, lng: -82.4863 },
      { domain: 'beachparkmaid.com', location: 'Beach Park', region: 'Florida', url: 'https://beachparkmaid.com', lat: 27.9103, lng: -82.4960 },
      { domain: 'parklandestatesmaid.com', location: 'Parkland Estates', region: 'Florida', url: 'https://parklandestatesmaid.com', lat: 27.9447, lng: -82.4254 },
      { domain: 'davislandsmaid.com', location: 'Davis Islands', region: 'Florida', url: 'https://davislandsmaid.com', lat: 27.9182, lng: -82.4493 },

      // Florida - St Pete
      { domain: 'downtownstpetemaid.com', location: 'Downtown St. Pete', region: 'Florida', url: 'https://downtownstpetemaid.com', lat: 27.7709, lng: -82.6390 },
      { domain: 'oldnortheastmaid.com', location: 'Old Northeast', region: 'Florida', url: 'https://oldnortheastmaid.com', lat: 27.7821, lng: -82.6298 },
      { domain: 'snellislemaid.com', location: 'Snell Isle', region: 'Florida', url: 'https://snellislemaid.com', lat: 27.7868, lng: -82.6238 },

      // Florida - Clearwater
      { domain: 'clearwaterbeachmaid.com', location: 'Clearwater Beach', region: 'Florida', url: 'https://clearwaterbeachmaid.com', lat: 27.9785, lng: -82.8274 },
      { domain: 'sandkeymaid.com', location: 'Sand Key', region: 'Florida', url: 'https://sandkeymaid.com', lat: 27.9230, lng: -82.8521 },

      // ========== NYC METRO (General/Brand Sites) ==========
      { domain: 'washandfoldnyc.com', location: 'NYC', region: 'NYC Metro', url: 'https://www.washandfoldnyc.com', lat: 40.7589, lng: -73.9851 },
      { domain: 'washandfoldnyc.com', location: 'NYC', region: 'NYC Metro', url: 'https://washandfoldnyc.com', lat: 40.7589, lng: -73.9851 },
      { domain: 'maidny.com', location: 'NYC', region: 'NYC Metro', url: 'https://maidny.com', lat: 40.7589, lng: -73.9851 },
      { domain: 'thenyccleaningservice.com', location: 'NYC', region: 'NYC Metro', url: 'https://thenyccleaningservice.com', lat: 40.7589, lng: -73.9851 },
      { domain: 'thenyccleaningcrew.com', location: 'NYC', region: 'NYC Metro', url: 'https://thenyccleaningcrew.com', lat: 40.7589, lng: -73.9851 },
      { domain: 'thebestnychousecleaningservice.com', location: 'NYC', region: 'NYC Metro', url: 'https://thebestnychousecleaningservice.com', lat: 40.7589, lng: -73.9851 },
      { domain: 'nychousecleanernearme.com', location: 'NYC', region: 'NYC Metro', url: 'https://nychousecleanernearme.com', lat: 40.7589, lng: -73.9851 },
      { domain: 'cleanservicenyc.com', location: 'NYC', region: 'NYC Metro', url: 'https://cleanservicenyc.com', lat: 40.7589, lng: -73.9851 },
      { domain: 'citycleannyc.com', location: 'NYC', region: 'NYC Metro', url: 'https://citycleannyc.com', lat: 40.7589, lng: -73.9851 },
      { domain: 'samedaycleannyc.com', location: 'NYC', region: 'NYC Metro', url: 'https://samedaycleannyc.com', lat: 40.7589, lng: -73.9851 },
      { domain: 'nycemergencycleaning.com', location: 'NYC', region: 'NYC Metro', url: 'https://nycemergencycleaning.com', lat: 40.7589, lng: -73.9851 },
      { domain: 'nycspringcleaningmaid.com', location: 'NYC', region: 'NYC Metro', url: 'https://nycspringcleaningmaid.com', lat: 40.7589, lng: -73.9851 },
      { domain: 'nycholidaymaid.com', location: 'NYC', region: 'NYC Metro', url: 'https://nycholidaymaid.com', lat: 40.7589, lng: -73.9851 },
      { domain: 'imlookingforamaidinnyctoday.com', location: 'NYC', region: 'NYC Metro', url: 'https://imlookingforamaidinnyctoday.com', lat: 40.7589, lng: -73.9851 },

      // ========== NATIONAL ==========
      { domain: 'theusamaid.com', location: 'USA', region: 'National', url: 'https://theusamaid.com', lat: 39.8283, lng: -98.5795 },
      { domain: 'imlookingforamaidnearme.com', location: 'USA', region: 'National', url: 'https://imlookingforamaidnearme.com', lat: 39.8283, lng: -98.5795 },

      // ========== OTHER SERVICES ==========
      { domain: 'thenycdogwalker.com', location: 'NYC - Pet Services', region: 'Other', url: 'https://thenycdogwalker.com', lat: 40.7589, lng: -73.9851 },
      { domain: 'nycpetsittingservice.com', location: 'NYC - Pet Services', region: 'Other', url: 'https://nycpetsittingservice.com', lat: 40.7589, lng: -73.9851 },
      { domain: 'petcleaningnyc.com', location: 'NYC - Pet Services', region: 'Other', url: 'https://petcleaningnyc.com', lat: 40.7589, lng: -73.9851 },
    ]

    setWebsites(sites)
  }

  const filteredWebsites = websites.filter(site => {
    const matchesSearch = site.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         site.domain.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRegion = selectedRegion === 'all' || site.region === selectedRegion
    return matchesSearch && matchesRegion
  })

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedRegion])

  // Pagination
  const totalPages = Math.ceil(filteredWebsites.length / ITEMS_PER_PAGE)
  const paginatedWebsites = filteredWebsites.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const regions = ['all', ...Array.from(new Set(websites.map(s => s.region))).sort()]

  const getRegionColor = (region: string) => {
    const colors: Record<string, string> = {
      'Manhattan': '#3b82f6',
      'Brooklyn': '#10b981',
      'Queens': '#f59e0b',
      'Long Island': '#8b5cf6',
      'New Jersey': '#ec4899',
      'Florida': '#ef4444',
      'NYC Metro': '#6366f1',
      'National': '#64748b',
      'Other': '#14b8a6'
    }
    return colors[region] || '#000000'
  }

  // Count by region
  const regionCounts = websites.reduce((acc, site) => {
    acc[site.region] = (acc[site.region] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Unique locations count
  const uniqueLocations = new Set(websites.map(s => s.location)).size
  const activeRegions = Object.keys(regionCounts).length

  return (
    <>
      <main className="p-3 md:p-6">
        {/* Page Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#1E2A4A] mb-1">
            Website Network
          </h2>
          <p className="text-sm text-gray-500">Coverage across NYC, NJ, FL, and national reach</p>
        </div>

        {/* Stat Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          {/* Total Domains */}
          <div className="rounded-xl p-4 bg-[#1E2A4A] text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -translate-y-6 translate-x-6" />
            <p className="text-xs font-medium uppercase tracking-wider text-white/70 mb-1">Total Domains</p>
            <p className="text-3xl font-bold">{websites.length}</p>
            <p className="text-xs text-white/50 mt-1">All registered</p>
          </div>

          {/* Active Regions */}
          <div className="rounded-xl p-4 bg-[#A8F0DC]/20 border border-[#A8F0DC]/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-[#A8F0DC]/10 rounded-full -translate-y-6 translate-x-6" />
            <p className="text-xs font-medium uppercase tracking-wider text-[#1E2A4A]/60 mb-1">Active Regions</p>
            <p className="text-3xl font-bold text-[#1E2A4A]">{activeRegions}</p>
            <p className="text-xs text-[#1E2A4A]/40 mt-1">Markets covered</p>
          </div>

          {/* Neighborhoods */}
          <div className="rounded-xl p-4 bg-blue-50 border border-blue-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-100/50 rounded-full -translate-y-6 translate-x-6" />
            <p className="text-xs font-medium uppercase tracking-wider text-blue-500 mb-1">Neighborhoods</p>
            <p className="text-3xl font-bold text-blue-700">{uniqueLocations}</p>
            <p className="text-xs text-blue-400 mt-1">Unique locations</p>
          </div>

          {/* Filtered */}
          <div className="rounded-xl p-4 bg-green-50 border border-green-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-green-100/50 rounded-full -translate-y-6 translate-x-6" />
            <p className="text-xs font-medium uppercase tracking-wider text-green-600 mb-1">Showing</p>
            <p className="text-3xl font-bold text-green-700">{filteredWebsites.length}</p>
            <p className="text-xs text-green-400 mt-1">{selectedRegion === 'all' ? 'All domains' : selectedRegion}</p>
          </div>
        </div>

        {/* Region Filter Pills */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1E2A4A]/50 mb-3">Filter by Region</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedRegion('all')}
              className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-all ${
                selectedRegion === 'all'
                  ? 'bg-[#1E2A4A] text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All ({websites.length})
            </button>
            {Object.entries(regionCounts).sort((a, b) => b[1] - a[1]).map(([region, count]) => (
              <button
                key={region}
                onClick={() => setSelectedRegion(selectedRegion === region ? 'all' : region)}
                className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
                  selectedRegion === region
                    ? 'shadow-md ring-1 ring-offset-1'
                    : 'hover:shadow-sm'
                }`}
                style={{
                  backgroundColor: selectedRegion === region ? getRegionColor(region) : getRegionColor(region) + '18',
                  color: selectedRegion === region ? '#ffffff' : getRegionColor(region),
                  '--tw-ring-color': getRegionColor(region),
                } as React.CSSProperties}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: selectedRegion === region ? '#ffffff' : getRegionColor(region),
                  }}
                />
                {region} ({count})
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6 flex gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search locations or domains..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-[#1E2A4A] bg-white focus:outline-none focus:ring-2 focus:ring-[#1E2A4A]/20 focus:border-[#1E2A4A]/30 transition"
            />
          </div>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-[#1E2A4A] bg-white focus:outline-none focus:ring-2 focus:ring-[#1E2A4A]/20 focus:border-[#1E2A4A]/30 transition"
          >
            {regions.map(region => (
              <option key={region} value={region}>
                {region === 'all' ? 'All Regions' : region}
              </option>
            ))}
          </select>
        </div>

        {/* Map Section */}
        <div className="mb-8">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1E2A4A]/50 mb-3 flex items-center gap-2">
            <span>MAP VIEW</span>
            <span className="text-xs font-normal text-gray-400">({filteredWebsites.length} pins)</span>
          </h3>
          <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
            <WebsitesMap websites={filteredWebsites} />
          </div>
        </div>

        {/* Domain Portfolio Section Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1E2A4A]/50 flex items-center gap-2">
            <span>DOMAIN PORTFOLIO</span>
            <span className="text-xs font-normal bg-[#1E2A4A]/8 text-[#1E2A4A]/60 px-2 py-0.5 rounded-full">
              {filteredWebsites.length} domains
            </span>
          </h3>
          {totalPages > 1 && (
            <p className="text-xs text-gray-400">
              Page {currentPage} of {totalPages}
            </p>
          )}
        </div>

        {/* Website Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {paginatedWebsites.map((site) => (
            <a
              key={site.domain}
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-white border border-gray-100 rounded-xl p-4 hover:border-[#1E2A4A]/20 hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Region badge + location */}
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-white shadow-sm"
                      style={{ backgroundColor: getRegionColor(site.region) }}
                    />
                    <h3 className="font-semibold text-[#1E2A4A] text-sm truncate">{site.location}</h3>
                  </div>
                  {/* Region tag */}
                  <span
                    className="inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide mb-2"
                    style={{
                      backgroundColor: getRegionColor(site.region) + '15',
                      color: getRegionColor(site.region),
                    }}
                  >
                    {site.region}
                  </span>
                  {/* Domain name in monospace */}
                  <p className="text-xs text-gray-400 font-mono truncate">{site.domain}</p>
                </div>
                <svg className="w-4 h-4 text-gray-300 group-hover:text-[#1E2A4A] flex-shrink-0 ml-2 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            </a>
          ))}
        </div>

        {/* Empty State */}
        {filteredWebsites.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">
              <span role="img" aria-label="globe">&#127760;</span>
            </div>
            <h3 className="text-lg font-semibold text-[#1E2A4A] mb-1">No websites found</h3>
            <p className="text-sm text-gray-500">Try adjusting your search or region filter</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between border-t border-gray-100 pt-6 gap-3">
            <p className="text-xs text-gray-400">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}
              {' '}-{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredWebsites.length)}
              {' '}of {filteredWebsites.length} domains
            </p>
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-[#1E2A4A] hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-[#1E2A4A] hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Prev
              </button>
              {/* Page numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  if (totalPages <= 7) return true
                  if (page === 1 || page === totalPages) return true
                  if (Math.abs(page - currentPage) <= 1) return true
                  return false
                })
                .reduce<(number | string)[]>((acc, page, idx, arr) => {
                  if (idx > 0 && typeof arr[idx - 1] === 'number' && (page as number) - (arr[idx - 1] as number) > 1) {
                    acc.push('...')
                  }
                  acc.push(page)
                  return acc
                }, [])
                .map((item, idx) =>
                  typeof item === 'string' ? (
                    <span key={`ellipsis-${idx}`} className="px-1.5 text-xs text-gray-300">...</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setCurrentPage(item)}
                      className={`w-8 h-8 text-xs font-medium rounded-lg transition ${
                        currentPage === item
                          ? 'bg-[#1E2A4A] text-white shadow-sm'
                          : 'border border-gray-200 text-[#1E2A4A] hover:bg-gray-50'
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-[#1E2A4A] hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-[#1E2A4A] hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
