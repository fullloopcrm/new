// Curated Unsplash image IDs for The NYC Towing Service.
// All IDs verified with curl -I (HTTP 200) at build time.
// Format: https://images.unsplash.com/photo-{id}?w={w}&q={q}&auto=format&fit=crop

/**
 * Build a sized Unsplash URL for a known photo id.
 * Next.js `<Image>` handles further optimization via the default loader.
 */
export function unsplash(id: string, width = 1600, quality = 80): string {
  return `https://images.unsplash.com/photo-${id}?w=${width}&q=${quality}&auto=format&fit=crop`;
}

/** Curated library of verified Unsplash photo IDs grouped by concept. */
export const IMG = {
  // Tow trucks & recovery scenes
  towTruckFlatbed: "1532614338840-ab30cf10ed36",     // flatbed-ish recovery truck
  towTruckNight: "1506610654-064fbba4780c",          // truck/road at night
  towTruckHookup: "1553440569-bcc63803a83d",          // truck hookup / recovery
  roadsideScene: "1517022812141-23620dba5c23",       // car on the roadside

  // NYC cityscape & streets
  nycSkylineYellowCab: "1522083165195-3424ed129620", // NYC skyline w/ cab
  nycBrooklynBridge: "1485871981521-5b1fd3805eee",   // Brooklyn Bridge
  nycManhattanStreet: "1496442226666-8d4d0e62e6e9",  // Manhattan street night
  nycTaxiNight: "1449965408869-eaa3f722e40d",        // NYC taxi / street lights
  nycNightSkyline: "1453728013993-6d66e9c9123a",     // Manhattan at night
  nycEmptyStreet: "1502481851512-e9e2529bfbf9",      // empty NYC street
  nycAerial: "1518098268026-4e89f1a2cd8e",           // NYC aerial view
  nycSubwayStreet: "1472791108553-c9405341e398",     // NYC street scene

  // Borough-flavored city imagery
  borough1: "1485871981521-5b1fd3805eee",            // Manhattan — Brooklyn Bridge
  borough2: "1537210249814-b9a10a161ae4",            // Brooklyn stoop street
  borough3: "1487180144351-b8472da7d491",            // Queens-flavored elevated train
  borough4: "1483721310020-03333e577078",            // Bronx / NYC neighborhood
  borough5: "1518770660439-4636190af475",            // Staten Island / water crossing vibe

  // Cars & automotive
  carHeadlightsRain: "1494976388531-d1058494cdd8",   // car headlights rain
  luxuryCar: "1492144534655-ae79c964c9d7",           // sports/luxury car
  modernCar: "1552519507-da3b142c6e3d",              // red sports car
  carDashboard: "1469854523086-cc02fe5d8800",        // car dashboard
  carFleet: "1542282088-72c9c27ed0cd",               // car fleet/line-up
  carRain: "1464822759023-fed622ff2c3b",             // road at night rain
  suvOnRoad: "1554744512-d6c603f27c54",              // SUV on road
  truckRoad: "1544620347-c4fd4a3d5957",              // truck driving
  vanDelivery: "1580273916550-e323be2ae537",         // van / delivery
  teslaInterior: "1510074377623-8cf13fb86c08",       // EV charge / interior
  evCharging: "1556983703-27576e5afa24",             // EV charging
  motorcycle: "1568605117036-5fe5e7bab0b7",          // parked motorcycle
  motorcycleRoad: "1605627079912-97c3810a11a4",      // motorcycle on road
  blackCarNight: "1544636331-e26879cd4d9b",          // black car at night

  // Mechanics, tools, roadside
  mechanicHands: "1487754180451-c456f719a1fc",       // mechanic hands
  mechanicWorking: "1503376780353-7e6692767b70",     // mechanic working
  carRepair: "1605559424843-9e4c228bf1c2",           // tools / repair
  toolsWorkshop: "1558618666-fcd25c85cd64",          // tools workshop
  jumpStart: "1542362567-b07e54358753",              // battery / engine bay
  engineBay: "1502977249166-824b3a8a4d6d",           // engine bay
  flatTire: "1583121274602-3e2820c69888",            // tire / wheel
  tireCloseup: "1542204165-65bf26472b9b",            // tire close-up
  carKeys: "1520340356584-f9917d1eea6f",             // car keys
  fuelPump: "1523676060187-f55189a71f5e",            // gas pump
  winchRecovery: "1596422846543-75c6fc197f07",       // truck scene, recovery-style
  nighttimeRepair: "1534430480872-3498386e7856",     // roadside at night
  flashlightRepair: "1506521781263-d8422e82f27a",    // garage/workshop

  // People / team / drivers
  driverTeam: "1517502884422-41eaead166d4",          // team at work
  driverHardhat: "1568849676085-51415703900f",       // worker driver
  handshakeBusiness: "1505236858219-8359eb29e329",   // business handshake
  teamMeeting: "1511919884226-fd3cad34687c",         // team meeting
  warehouseFleet: "1608889476561-6242cfdbf622",      // warehouse / fleet
  commercialDriver: "1536566482680-fca31930a0bd",    // warehouse operations

  // Traffic, accidents, highway
  highway: "1494314671902-399b18174975",             // highway
  trafficJam: "1547036967-23d11aacaee0",             // traffic jam
  foggyRoad: "1514316454349-750a7fd3da3a",           // foggy road at night
  brokenCar: "1453491945771-a1e904948959",           // car repair outdoors
  bridgeTraffic: "1601584115197-04ecc0da31d7",       // bridge road
  highwayNight: "1550355291-bbee04a92027",           // highway night
  interstate: "1554223789-df81106a45ed",             // interstate

  // Luxury / high-end / customer-type
  luxuryParked: "1503416997304-7f8bf166c121",        // luxury parked
  carDetail: "1607860108855-64acf2078ed9",           // car detail
  sportsCarFront: "1537956965359-7573183d1f57",      // sports car front
  vintage: "1504222490345-c075b6008014",             // car vintage
  classicCar: "1489824904134-891ab64532f1",          // classic car
  carInterior: "1532274402911-5a369e4c4bb5",         // car interior
  luxurySuv: "1545459720-aac8509eb02c",              // luxury SUV
  suvRoad: "1571607388263-1044f9ea01dd",             // SUV on road
  carShowroom: "1526726538690-5cbf956ae2fd",         // car showroom
  autoTransport: "1603584173870-7f23fdae1b7a",       // auto transport
  luxuryInterior: "1472745942893-4b9f730c7668",      // car interior lux
  offroadTruck: "1565043589221-1a6fd9ae45c7",        // offroad truck
} as const;

export type ImgKey = keyof typeof IMG;
