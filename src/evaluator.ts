import type { Listing, Config, EvalResult } from './types.js'

const NON_CAR_KEYWORDS = [
  // parts & accessories
  'rim', 'rims', 'wheel', 'wheels', 'tire', 'tires', 'tyre', 'tyres',
  'bumper', 'hood', 'door', 'fender', 'headlight', 'taillight', 'mirror',
  'seat', 'seats', 'engine', 'transmission', 'gearbox', 'exhaust', 'muffler',
  'alternator', 'radiator', 'strut', 'struts', 'caliper', 'rotor', 'rotors',
  'axle', 'control arm', 'catalytic', 'turbo', 'supercharger',
  'part', 'parts', 'parting out', 'for parts', 'spares', 'salvage',
  'body kit', 'spoiler', 'air filter', 'oil filter', 'wiper', 'wipers',
  'stereo', 'subwoofer', 'speaker', 'dash cam', 'floor mat', 'floor mats',
  'car cover', 'car wrap', 'vinyl wrap',
  // motorcycles & powersports
  'motorcycle', 'motorbike', 'dirt bike', 'dirtbike', 'trail bike', 'trailbike',
  'sport bike', 'sportbike', 'scooter', 'moped', 'atv', 'quad bike', 'snowmobile', 'sled',
  // Honda motorcycle model codes
  'cbr', 'cb300', 'cb400', 'cb500', 'cb650', 'cb750', 'cb1000',
  'cmx', 'crf', 'ctx', 'nc750', 'pcx',
  // other brands
  'gsxr', 'r1 ', 'r6 ', 'ninja ', 'kawasaki', 'ducati', 'harley', 'yamaha r',
  // other vehicles
  'rv ', 'camper', 'trailer', 'motorhome',
]

export function evaluate(listing: Listing, config: Config): EvalResult {
  const reasons: string[] = []

  const titleLower = listing.title.toLowerCase()
  const nonCarMatch = NON_CAR_KEYWORDS.find(kw => titleLower.includes(kw))
  if (nonCarMatch) {
    reasons.push(`non-car keyword "${nonCarMatch}" in title`)
  }

  // motorcycles list displacement in cc (e.g. "249cc") — cars use litres
  if (/\d+\s*cc\b/i.test(listing.title)) {
    reasons.push('motorcycle displacement (cc) in title')
  }

  if (config.makes.length > 0) {
    const titleLowerForMake = listing.title.toLowerCase()
    const makeToCheck = listing.make ?? ''
    const ok = config.makes.some(
      m => makeToCheck.toLowerCase().includes(m.toLowerCase()) || titleLowerForMake.includes(m.toLowerCase())
    )
    if (!ok) reasons.push(`make not in [${config.makes.join(', ')}] (title: "${listing.title}")`)
  }

  if (config.models.length > 0 && listing.model !== null) {
    const ok = config.models.some(m => listing.model!.toLowerCase().includes(m.toLowerCase()))
    if (!ok) reasons.push(`model "${listing.model}" not in [${config.models.join(', ')}]`)
  }

  if (config.minYear !== null && listing.year !== null && listing.year < config.minYear) {
    reasons.push(`year ${listing.year} < min ${config.minYear}`)
  }

  if (config.maxYear !== null && listing.year !== null && listing.year > config.maxYear) {
    reasons.push(`year ${listing.year} > max ${config.maxYear}`)
  }

  if (config.minPrice !== null && listing.price !== null && listing.price < config.minPrice) {
    reasons.push(`price $${listing.price.toLocaleString()} < min $${config.minPrice.toLocaleString()}`)
  }

  if (config.maxPrice !== null && listing.price !== null && listing.price > config.maxPrice) {
    reasons.push(`price $${listing.price.toLocaleString()} > max $${config.maxPrice.toLocaleString()}`)
  }

  if (config.maxMileage !== null) {
    if (listing.mileage === null) {
      reasons.push('mileage not listed')
    } else if (listing.mileage > config.maxMileage) {
      reasons.push(`mileage ${listing.mileage.toLocaleString()} km > max ${config.maxMileage.toLocaleString()} km`)
    }
  }

  if (config.cities.length > 0 && listing.location !== null) {
    const ok = config.cities.some(c => listing.location!.toLowerCase().includes(c.toLowerCase()))
    if (!ok) reasons.push(`location "${listing.location}" not in GTA city list`)
  }

  return { matches: reasons.length === 0, reasons }
}
