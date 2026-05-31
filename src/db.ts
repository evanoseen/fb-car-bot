import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { Listing } from './types.js'

export type DB = InstanceType<typeof DatabaseSync>

const SCHEMA = `
CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT,
  price INTEGER,
  year INTEGER,
  make TEXT,
  model TEXT,
  mileage INTEGER,
  location TEXT,
  seen_at TEXT NOT NULL,
  alerted INTEGER NOT NULL DEFAULT 0,
  last_price INTEGER
);
`

export function initDb(dbPath: string): DB {
  mkdirSync(dirname(dbPath), { recursive: true })
  const db = new DatabaseSync(dbPath)
  db.exec(SCHEMA)
  return db
}

export function isNew(db: DB, id: string): boolean {
  const row = db.prepare('SELECT id FROM listings WHERE id = ?').get(id)
  return row === undefined
}

export function insertListing(db: DB, listing: Listing): void {
  db.prepare(`
    INSERT INTO listings (id, url, title, price, year, make, model, mileage, location, seen_at, alerted, last_price)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).run(
    listing.id, listing.url, listing.title, listing.price, listing.year,
    listing.make, listing.model, listing.mileage, listing.location, listing.seenAt,
    listing.price,
  )
}

export function markAlerted(db: DB, id: string): void {
  db.prepare('UPDATE listings SET alerted = 1 WHERE id = ?').run(id)
}

// Returns the previous price if a drop is detected and listing not yet alerted, null otherwise
export function checkPriceDrop(db: DB, listing: Listing): number | null {
  if (listing.price === null) return null
  const row = db.prepare('SELECT last_price, alerted FROM listings WHERE id = ?').get(listing.id) as
    | { last_price: number | null; alerted: number }
    | undefined
  if (!row || row.alerted === 1 || row.last_price === null) return null
  return listing.price < row.last_price ? row.last_price : null
}

export function updatePrice(db: DB, id: string, newPrice: number): void {
  db.prepare('UPDATE listings SET last_price = ? WHERE id = ?').run(newPrice, id)
}
