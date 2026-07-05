import { IMG, unsplash } from "./images";

/** Slugs match entries in src/data/customer-types.ts CUSTOMER_TYPES. */
const CUSTOMER_IMAGE_IDS: Record<string, string> = {
  "stranded-motorists": IMG.roadsideScene,
  "fleet-managers": IMG.warehouseFleet,
  "insurance-adjusters": IMG.handshakeBusiness,
  "body-shops": IMG.mechanicWorking,
  "property-managers": IMG.nycEmptyStreet,
  "rideshare-drivers": IMG.nycTaxiNight,
  "commercial-trucking": IMG.truckRoad,
  "ev-drivers": IMG.evCharging,
  "luxury-owners": IMG.luxuryCar,
  "accident-victims": IMG.winchRecovery,
  "homeowners-landlords": IMG.nycSubwayStreet,
  "motorcycle-riders": IMG.motorcycleRoad,
  "long-distance-transports": IMG.autoTransport,
};

const DEFAULT_CUSTOMER_IMAGE = IMG.nycManhattanStreet;

export function getCustomerImage(slug: string, width = 1600): string {
  const id = CUSTOMER_IMAGE_IDS[slug] ?? DEFAULT_CUSTOMER_IMAGE;
  return unsplash(id, width);
}
