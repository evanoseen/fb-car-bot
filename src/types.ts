export interface Listing {
  id: string
  url: string
  title: string
  price: number | null
  year: number | null
  make: string | null
  model: string | null
  mileage: number | null
  location: string | null
  seenAt: string
}

export interface Config {
  makes: string[]
  models: string[]
  minYear: number | null
  maxYear: number | null
  minPrice: number | null
  maxPrice: number | null
  maxMileage: number | null
  cities: string[]
  intervalMinutes: number
  heartbeatHour: number
}

export interface EvalResult {
  matches: boolean
  reasons: string[]
}

export interface Env {
  telegramToken: string
  telegramChatId: string
  fbStoragePath: string
  dbPath: string
}
