import { chromium } from 'patchright'
import { parseTitle, parseMileage, parsePrice } from './parser.js'
import type { Listing, Config } from './types.js'

interface RawListingNode {
  id: string
  marketplace_listing_title?: string
  listing_price?: { amount?: string; currency?: string }
  location?: { reverse_geocode?: { city?: string } }
  custom_sub_titles_with_rendering_flags?: Array<{ subtitle?: string }>
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function extractListings(data: unknown, results: RawListingNode[]): void {
  if (data === null || typeof data !== 'object') return
  if (Array.isArray(data)) {
    for (const item of data) extractListings(item, results)
    return
  }
  const obj = data as Record<string, unknown>
  if (typeof obj['id'] === 'string' && typeof obj['marketplace_listing_title'] === 'string') {
    results.push(obj as unknown as RawListingNode)
    return
  }
  for (const val of Object.values(obj)) {
    extractListings(val, results)
  }
}

function mapToListing(node: RawListingNode, debug = false): Listing {
  const subtitles = (node.custom_sub_titles_with_rendering_flags ?? [])
    .map(s => s.subtitle ?? '')
    .filter(Boolean)
  const mileage = parseMileage(subtitles)
  if (debug) {
    console.log(`[scraper:debug] "${node.marketplace_listing_title}" | subtitles: ${JSON.stringify(subtitles)} | mileage: ${mileage}`)
  }
  const { year, make, model } = parseTitle(node.marketplace_listing_title ?? '')
  return {
    id: node.id,
    url: `https://www.facebook.com/marketplace/item/${node.id}`,
    title: node.marketplace_listing_title ?? '',
    price: parsePrice(node.listing_price?.amount),
    year,
    make,
    model,
    mileage,
    location: node.location?.reverse_geocode?.city ?? null,
    seenAt: new Date().toISOString(),
  }
}

function buildSearchUrls(config: Config): string[] {
  const params = new URLSearchParams({ sortBy: 'creation_time_descend', exact: 'false' })
  if (config.maxPrice !== null) params.set('maxPrice', String(config.maxPrice))
  if (config.minPrice !== null) params.set('minPrice', String(config.minPrice))

  // One search URL per make so we actually find them
  if (config.makes.length > 0) {
    return config.makes.map(make => {
      const p = new URLSearchParams(params)
      p.set('query', make)
      return `https://www.facebook.com/marketplace/toronto/search?${p}`
    })
  }

  return [`https://www.facebook.com/marketplace/toronto/vehicles?${params}`]
}

async function scrapeUrl(
  page: import('patchright').Page,
  url: string,
  collected: RawListingNode[],
): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })

  if (page.url().includes('facebook.com/login')) {
    throw new Error('FB_SESSION_EXPIRED')
  }

  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => window.scrollBy(0, 900))
    await page.waitForTimeout(randomBetween(1200, 2800))
  }
  await page.waitForTimeout(1500)
}

export async function scrapeListings(storagePath: string, config: Config): Promise<Listing[]> {
  const browser = await chromium.launch({ headless: true })
  const collected: RawListingNode[] = []
  let graphqlResponseCount = 0

  try {
    const context = await browser.newContext({ storageState: storagePath })
    const page = await context.newPage()
    page.on('response', async (res) => {
      if (!res.url().includes('/api/graphql/') || res.status() !== 200) return
      graphqlResponseCount++
      try {
        const text = await res.text()
        for (const line of text.split('\n')) {
          const trimmed = line.trim()
          if (!trimmed) continue
          try {
            const data: unknown = JSON.parse(trimmed)
            extractListings(data, collected)
          } catch {
            // not valid JSON on this line
          }
        }
      } catch {
        // ignore unreadable responses
      }
    })

    const urls = buildSearchUrls(config)
    for (const url of urls) {
      console.log(`[scraper] searching: ${url}`)
      await scrapeUrl(page, url, collected)
    }

  } finally {
    console.log(`[scraper] graphql responses intercepted: ${graphqlResponseCount}, raw nodes: ${collected.length}`)
    await browser.close()
  }

  const seen = new Set<string>()
  const unique: RawListingNode[] = []
  for (const node of collected) {
    if (!seen.has(node.id)) {
      seen.add(node.id)
      unique.push(node)
    }
  }

  // log first 5 listings in debug so we can see the subtitle format
  return unique.map((node, i) => mapToListing(node, i < 5))
}
