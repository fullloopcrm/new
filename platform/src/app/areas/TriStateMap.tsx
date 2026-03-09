"use client";

import { useEffect, useRef, useCallback } from "react";
// @ts-ignore — maplibre-gl not installed, component disabled
import maplibregl from "maplibre-gl";
// @ts-ignore
import "maplibre-gl/dist/maplibre-gl.css";

/* ── Region colors ───────────────────────────────────────────── */
const regionColors: Record<string, string> = {
  Manhattan: "#14b8a6",
  Brooklyn: "#f97316",
  Queens: "#a78bfa",
  Bronx: "#f472b6",
  "Staten Island": "#fbbf24",
  "Long Island": "#38bdf8",
  Westchester: "#4ade80",
  "New Jersey": "#fb923c",
};

/* ── All area pins with coordinates ──────────────────────────── */
const pins: { name: string; region: string; lat: number; lng: number; type: string; slug: string }[] = [
  // Manhattan
  { name: "Manhattan", region: "Manhattan", lat: 40.7831, lng: -73.9712, type: "Borough", slug: "manhattan-marketing-company" },
  { name: "Midtown", region: "Manhattan", lat: 40.7549, lng: -73.9840, type: "Neighborhood", slug: "midtown-manhattan-marketing-company" },
  { name: "Lower Manhattan", region: "Manhattan", lat: 40.7075, lng: -74.0113, type: "Neighborhood", slug: "lower-manhattan-marketing-company" },
  { name: "Upper East Side", region: "Manhattan", lat: 40.7736, lng: -73.9566, type: "Neighborhood", slug: "upper-east-side-marketing-company" },
  { name: "Upper West Side", region: "Manhattan", lat: 40.7870, lng: -73.9754, type: "Neighborhood", slug: "upper-west-side-marketing-company" },
  { name: "Harlem", region: "Manhattan", lat: 40.8116, lng: -73.9465, type: "Neighborhood", slug: "harlem-marketing-company" },
  { name: "SoHo", region: "Manhattan", lat: 40.7233, lng: -74.0030, type: "Neighborhood", slug: "soho-marketing-company" },
  { name: "Chelsea", region: "Manhattan", lat: 40.7465, lng: -74.0014, type: "Neighborhood", slug: "chelsea-marketing-company" },
  { name: "East Village", region: "Manhattan", lat: 40.7265, lng: -73.9815, type: "Neighborhood", slug: "east-village-marketing-company" },
  { name: "West Village", region: "Manhattan", lat: 40.7336, lng: -74.0027, type: "Neighborhood", slug: "west-village-marketing-company" },
  { name: "Tribeca", region: "Manhattan", lat: 40.7163, lng: -74.0086, type: "Neighborhood", slug: "tribeca-marketing-company" },
  { name: "Chinatown", region: "Manhattan", lat: 40.7158, lng: -73.9970, type: "Neighborhood", slug: "chinatown-marketing-company" },
  { name: "Financial District", region: "Manhattan", lat: 40.7074, lng: -74.0113, type: "Neighborhood", slug: "financial-district-marketing-company" },
  // Brooklyn
  { name: "Brooklyn", region: "Brooklyn", lat: 40.6782, lng: -73.9442, type: "Borough", slug: "brooklyn-marketing-company" },
  { name: "Williamsburg", region: "Brooklyn", lat: 40.7081, lng: -73.9571, type: "Neighborhood", slug: "williamsburg-marketing-company" },
  { name: "Bushwick", region: "Brooklyn", lat: 40.6944, lng: -73.9213, type: "Neighborhood", slug: "bushwick-marketing-company" },
  { name: "Park Slope", region: "Brooklyn", lat: 40.6710, lng: -73.9814, type: "Neighborhood", slug: "park-slope-marketing-company" },
  { name: "DUMBO", region: "Brooklyn", lat: 40.7033, lng: -73.9890, type: "Neighborhood", slug: "dumbo-marketing-company" },
  { name: "Downtown Brooklyn", region: "Brooklyn", lat: 40.6930, lng: -73.9866, type: "Neighborhood", slug: "downtown-brooklyn-marketing-company" },
  { name: "Bay Ridge", region: "Brooklyn", lat: 40.6346, lng: -74.0187, type: "Neighborhood", slug: "bay-ridge-marketing-company" },
  { name: "Flatbush", region: "Brooklyn", lat: 40.6523, lng: -73.9597, type: "Neighborhood", slug: "flatbush-marketing-company" },
  { name: "Bensonhurst", region: "Brooklyn", lat: 40.6023, lng: -73.9932, type: "Neighborhood", slug: "bensonhurst-marketing-company" },
  { name: "Sunset Park", region: "Brooklyn", lat: 40.6454, lng: -74.0092, type: "Neighborhood", slug: "sunset-park-marketing-company" },
  { name: "Crown Heights", region: "Brooklyn", lat: 40.6694, lng: -73.9422, type: "Neighborhood", slug: "crown-heights-marketing-company" },
  { name: "Bed-Stuy", region: "Brooklyn", lat: 40.6872, lng: -73.9418, type: "Neighborhood", slug: "bed-stuy-marketing-company" },
  { name: "Greenpoint", region: "Brooklyn", lat: 40.7274, lng: -73.9514, type: "Neighborhood", slug: "greenpoint-marketing-company" },
  // Queens
  { name: "Queens", region: "Queens", lat: 40.7282, lng: -73.7949, type: "Borough", slug: "queens-marketing-company" },
  { name: "Astoria", region: "Queens", lat: 40.7723, lng: -73.9301, type: "Neighborhood", slug: "astoria-marketing-company" },
  { name: "Flushing", region: "Queens", lat: 40.7675, lng: -73.8330, type: "Neighborhood", slug: "flushing-marketing-company" },
  { name: "Long Island City", region: "Queens", lat: 40.7447, lng: -73.9485, type: "Neighborhood", slug: "long-island-city-marketing-company" },
  { name: "Forest Hills", region: "Queens", lat: 40.7182, lng: -73.8448, type: "Neighborhood", slug: "forest-hills-marketing-company" },
  { name: "Jamaica", region: "Queens", lat: 40.7029, lng: -73.7897, type: "Neighborhood", slug: "jamaica-queens-marketing-company" },
  { name: "Bayside", region: "Queens", lat: 40.7686, lng: -73.7714, type: "Neighborhood", slug: "bayside-marketing-company" },
  { name: "Jackson Heights", region: "Queens", lat: 40.7557, lng: -73.8831, type: "Neighborhood", slug: "jackson-heights-marketing-company" },
  { name: "Ridgewood", region: "Queens", lat: 40.7043, lng: -73.9018, type: "Neighborhood", slug: "ridgewood-marketing-company" },
  { name: "Woodside", region: "Queens", lat: 40.7454, lng: -73.9026, type: "Neighborhood", slug: "woodside-marketing-company" },
  { name: "Rego Park", region: "Queens", lat: 40.7261, lng: -73.8625, type: "Neighborhood", slug: "rego-park-marketing-company" },
  { name: "Elmhurst", region: "Queens", lat: 40.7394, lng: -73.8802, type: "Neighborhood", slug: "elmhurst-marketing-company" },
  // Bronx
  { name: "The Bronx", region: "Bronx", lat: 40.8448, lng: -73.8648, type: "Borough", slug: "bronx-marketing-company" },
  { name: "Riverdale", region: "Bronx", lat: 40.8990, lng: -73.9120, type: "Neighborhood", slug: "riverdale-marketing-company" },
  { name: "Fordham", region: "Bronx", lat: 40.8615, lng: -73.8903, type: "Neighborhood", slug: "fordham-marketing-company" },
  { name: "Pelham Bay", region: "Bronx", lat: 40.8505, lng: -73.8365, type: "Neighborhood", slug: "pelham-bay-marketing-company" },
  { name: "Mott Haven", region: "Bronx", lat: 40.8089, lng: -73.9230, type: "Neighborhood", slug: "mott-haven-marketing-company" },
  { name: "Kingsbridge", region: "Bronx", lat: 40.8841, lng: -73.9016, type: "Neighborhood", slug: "kingsbridge-marketing-company" },
  { name: "Throgs Neck", region: "Bronx", lat: 40.8196, lng: -73.8196, type: "Neighborhood", slug: "throgs-neck-marketing-company" },
  // Staten Island
  { name: "Staten Island", region: "Staten Island", lat: 40.5795, lng: -74.1502, type: "Borough", slug: "staten-island-marketing-company" },
  { name: "St. George", region: "Staten Island", lat: 40.6435, lng: -74.0764, type: "Neighborhood", slug: "st-george-marketing-company" },
  { name: "Tottenville", region: "Staten Island", lat: 40.5066, lng: -74.2549, type: "Neighborhood", slug: "tottenville-marketing-company" },
  { name: "New Dorp", region: "Staten Island", lat: 40.5732, lng: -74.1172, type: "Neighborhood", slug: "new-dorp-marketing-company" },
  { name: "Great Kills", region: "Staten Island", lat: 40.5544, lng: -74.1517, type: "Neighborhood", slug: "great-kills-marketing-company" },
  // Long Island
  { name: "Long Island", region: "Long Island", lat: 40.7891, lng: -73.1350, type: "Region", slug: "long-island-marketing-company" },
  { name: "Nassau County", region: "Long Island", lat: 40.7400, lng: -73.5594, type: "County", slug: "nassau-county-marketing-company" },
  { name: "Suffolk County", region: "Long Island", lat: 40.9423, lng: -72.6824, type: "County", slug: "suffolk-county-marketing-company" },
  { name: "Garden City", region: "Long Island", lat: 40.7268, lng: -73.6343, type: "Neighborhood", slug: "garden-city-marketing-company" },
  { name: "Great Neck", region: "Long Island", lat: 40.8007, lng: -73.7284, type: "Neighborhood", slug: "great-neck-marketing-company" },
  { name: "Huntington", region: "Long Island", lat: 40.8682, lng: -73.4257, type: "Neighborhood", slug: "huntington-marketing-company" },
  { name: "Babylon", region: "Long Island", lat: 40.6956, lng: -73.3257, type: "Neighborhood", slug: "babylon-marketing-company" },
  { name: "Hempstead", region: "Long Island", lat: 40.7062, lng: -73.6187, type: "Neighborhood", slug: "hempstead-marketing-company" },
  { name: "Oyster Bay", region: "Long Island", lat: 40.8654, lng: -73.5318, type: "Neighborhood", slug: "oyster-bay-marketing-company" },
  { name: "Islip", region: "Long Island", lat: 40.7298, lng: -73.2104, type: "Neighborhood", slug: "islip-marketing-company" },
  { name: "Smithtown", region: "Long Island", lat: 40.8559, lng: -73.2007, type: "Neighborhood", slug: "smithtown-marketing-company" },
  { name: "Brookhaven", region: "Long Island", lat: 40.7793, lng: -72.9157, type: "Neighborhood", slug: "brookhaven-marketing-company" },
  { name: "Massapequa", region: "Long Island", lat: 40.6812, lng: -73.4732, type: "Neighborhood", slug: "massapequa-marketing-company" },
  { name: "Levittown", region: "Long Island", lat: 40.7259, lng: -73.5143, type: "Neighborhood", slug: "levittown-marketing-company" },
  { name: "Hicksville", region: "Long Island", lat: 40.7682, lng: -73.5251, type: "Neighborhood", slug: "hicksville-marketing-company" },
  // Westchester
  { name: "Westchester County", region: "Westchester", lat: 41.1220, lng: -73.7949, type: "County", slug: "westchester-marketing-company" },
  { name: "White Plains", region: "Westchester", lat: 41.0340, lng: -73.7629, type: "Neighborhood", slug: "white-plains-marketing-company" },
  { name: "Yonkers", region: "Westchester", lat: 40.9312, lng: -73.8987, type: "Neighborhood", slug: "yonkers-marketing-company" },
  { name: "New Rochelle", region: "Westchester", lat: 40.9115, lng: -73.7824, type: "Neighborhood", slug: "new-rochelle-marketing-company" },
  { name: "Scarsdale", region: "Westchester", lat: 41.0051, lng: -73.7846, type: "Neighborhood", slug: "scarsdale-marketing-company" },
  { name: "Mount Vernon", region: "Westchester", lat: 40.9126, lng: -73.8371, type: "Neighborhood", slug: "mount-vernon-marketing-company" },
  { name: "Rye", region: "Westchester", lat: 40.9807, lng: -73.6835, type: "Neighborhood", slug: "rye-marketing-company" },
  { name: "Mamaroneck", region: "Westchester", lat: 40.9487, lng: -73.7335, type: "Neighborhood", slug: "mamaroneck-marketing-company" },
  { name: "Tarrytown", region: "Westchester", lat: 41.0762, lng: -73.8587, type: "Neighborhood", slug: "tarrytown-marketing-company" },
  { name: "Dobbs Ferry", region: "Westchester", lat: 41.0145, lng: -73.8796, type: "Neighborhood", slug: "dobbs-ferry-marketing-company" },
  { name: "Larchmont", region: "Westchester", lat: 40.9276, lng: -73.7518, type: "Neighborhood", slug: "larchmont-marketing-company" },
  // New Jersey
  { name: "Jersey City", region: "New Jersey", lat: 40.7178, lng: -74.0431, type: "City", slug: "jersey-city-marketing-company" },
  { name: "Hoboken", region: "New Jersey", lat: 40.7440, lng: -74.0324, type: "City", slug: "hoboken-marketing-company" },
  { name: "Newark", region: "New Jersey", lat: 40.7357, lng: -74.1724, type: "City", slug: "newark-marketing-company" },
  { name: "Fort Lee", region: "New Jersey", lat: 40.8509, lng: -73.9712, type: "City", slug: "fort-lee-marketing-company" },
  { name: "Edgewater", region: "New Jersey", lat: 40.8271, lng: -73.9754, type: "City", slug: "edgewater-marketing-company" },
];

export { pins, regionColors };

export default function TriStateMap({
  activeRegion,
  onRegionHover,
  onRegionClick,
  height = "h-[600px] sm:h-[750px]",
}: {
  activeRegion: string | null;
  onRegionHover: (region: string | null) => void;
  onRegionClick: (region: string) => void;
  height?: string;
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const cancelledRef = useRef(false);

  const hoverRef = useRef(onRegionHover);
  const clickRef = useRef(onRegionClick);
  hoverRef.current = onRegionHover;
  clickRef.current = onRegionClick;

  const createMarkers = useCallback((m: maplibregl.Map) => {
    // Bail if effect was cleaned up before load fired
    if (cancelledRef.current) return;

    markersRef.current.forEach((mk) => mk.remove());
    markersRef.current = [];

    pins.forEach((pin) => {
      const color = regionColors[pin.region] || "#14b8a6";
      const size = pin.type === "Borough" || pin.type === "Region" || pin.type === "County" ? 14 : 10;

      const el = document.createElement("div");
      el.style.cssText = `
        width:${size}px;height:${size}px;border-radius:50%;
        background:${color};border:2px solid rgba(255,255,255,0.3);
        cursor:pointer;transition:transform .2s,box-shadow .2s,opacity .2s;
      `;
      el.dataset.region = pin.region;

      el.addEventListener("mouseenter", () => {
        el.style.transform = "scale(1.6)";
        el.style.boxShadow = `0 0 12px ${color}`;
        el.style.zIndex = "10";
        hoverRef.current(pin.region);
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "scale(1)";
        el.style.boxShadow = "none";
        el.style.zIndex = "1";
        hoverRef.current(null);
      });
      el.addEventListener("click", () => {
        clickRef.current(pin.region);
      });

      const popup = new maplibregl.Popup({
        offset: 12,
        closeButton: false,
        className: "map-popup",
      }).setHTML(
        `<div style="font-family:var(--font-heading,sans-serif);padding:4px 0;">
          <div style="font-size:13px;font-weight:700;color:#0f172a;">${pin.name}</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px;">${pin.region} &middot; ${pin.type}</div>
          <a href="/areas/${pin.slug}" style="font-size:11px;color:#0d9488;font-weight:600;text-decoration:underline;margin-top:4px;display:block;">View Area &rarr;</a>
        </div>`
      );

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([pin.lng, pin.lat])
        .setPopup(popup)
        .addTo(m);

      markersRef.current.push(marker);
    });
  }, []);

  useEffect(() => {
    if (!mapContainer.current) return;

    cancelledRef.current = false;

    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: [-73.85, 40.75],
      zoom: 9.3,
      minZoom: 7,
      maxZoom: 15,
      attributionControl: false,
      scrollZoom: false,
    });

    mapRef.current = m;

    m.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-left"
    );

    // Markers don't need style to be loaded — add them immediately
    m.on("load", () => createMarkers(m));

    return () => {
      cancelledRef.current = true;
      markersRef.current.forEach((mk) => mk.remove());
      markersRef.current = [];
      m.remove();
      mapRef.current = null;
    };
  }, [createMarkers]);

  // Highlight active region's pins
  useEffect(() => {
    if (markersRef.current.length === 0) return;
    markersRef.current.forEach((marker) => {
      const el = marker.getElement();
      const region = el.dataset.region;
      if (activeRegion) {
        if (region === activeRegion) {
          el.style.opacity = "1";
          el.style.transform = "scale(1.3)";
          el.style.boxShadow = `0 0 8px ${regionColors[region!] || "#14b8a6"}`;
        } else {
          el.style.opacity = "0.25";
          el.style.transform = "scale(0.8)";
          el.style.boxShadow = "none";
        }
      } else {
        el.style.opacity = "1";
        el.style.transform = "scale(1)";
        el.style.boxShadow = "none";
      }
    });
  }, [activeRegion]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-700">
      <div ref={mapContainer} className={`w-full ${height}`} />
      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-slate-900/90 backdrop-blur-sm rounded-lg p-3 border border-slate-700">
        <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider mb-2 font-cta">Regions</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {Object.entries(regionColors).map(([region, color]) => (
            <button
              key={region}
              onMouseEnter={() => onRegionHover(region)}
              onMouseLeave={() => onRegionHover(null)}
              onClick={() => onRegionClick(region)}
              className="flex items-center gap-1.5 text-left hover:opacity-80 transition-opacity"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-[10px] text-white/70 font-medium">{region}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
