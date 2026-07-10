import { IMG, unsplash } from "./images";

/**
 * Map each service slug to a contextually appropriate Unsplash photo id.
 * Slugs match the catalog in src/data/services.ts.
 */
const SERVICE_IMAGE_IDS: Record<string, string> = {
  // Light-duty
  "light-duty-towing": IMG.towTruckHookup,
  "motorcycle-towing": IMG.motorcycle,

  // Heavy-duty
  "heavy-duty-towing": IMG.truckRoad,
  "flatbed-towing": IMG.towTruckFlatbed,
  "accident-recovery": IMG.winchRecovery,
  "long-distance-towing": IMG.autoTransport,

  // Roadside
  "roadside-assistance": IMG.roadsideScene,
  "jump-start": IMG.jumpStart,
  "battery-replacement": IMG.engineBay,
  "gas-delivery": IMG.fuelPump,
  "flat-tire-change": IMG.flatTire,
  "lockout-service": IMG.carKeys,
  "winch-out-recovery": IMG.offroadTruck,

  // Specialty
  "junk-car-removal": IMG.brokenCar,
  "illegally-parked-towing": IMG.nycEmptyStreet,
  "impound-recovery": IMG.nycManhattanStreet,
  "abandoned-vehicle-removal": IMG.roadsideScene,

  // Commercial
  "fleet-towing": IMG.warehouseFleet,
  "commercial-towing": IMG.vanDelivery,
  "emergency-247-towing": IMG.towTruckNight,

  // New additions (fall through to DEFAULT_SERVICE_IMAGE at render time)
  "ev-tesla-towing": IMG.towTruckFlatbed,
  "luxury-exotic-towing": IMG.towTruckFlatbed,
  "dealer-auto-transport": IMG.autoTransport,
  "insurance-claim-towing": IMG.winchRecovery,
  "auto-body-collision-delivery": IMG.winchRecovery,
  "boat-trailer-towing": IMG.towTruckFlatbed,
  "rv-motorhome-towing": IMG.truckRoad,
  "classic-antique-car-transport": IMG.towTruckFlatbed,
  "mobile-mechanic-on-site-repairs": IMG.engineBay,
  "winter-snow-extraction": IMG.offroadTruck,
};

const DEFAULT_SERVICE_IMAGE = IMG.towTruckFlatbed;

/** Resolve the hero image for a service slug, with a sensible fallback. */
export function getServiceImage(slug: string, width = 1600): string {
  const id = SERVICE_IMAGE_IDS[slug] ?? DEFAULT_SERVICE_IMAGE;
  return unsplash(id, width);
}
