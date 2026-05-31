import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Config, Env } from './types.js'

interface RawConfig {
  makes?: string[]
  models?: string[]
  min_year?: number | null
  max_year?: number | null
  min_price?: number | null
  max_price?: number | null
  max_mileage?: number | null
  cities?: string[]
  interval_minutes?: number
  heartbeat_hour?: number
}

export function loadConfig(configPath = './config.json'): Config {
  const raw: RawConfig = JSON.parse(readFileSync(resolve(configPath), 'utf-8'))
  return {
    makes: raw.makes ?? [],
    models: raw.models ?? [],
    minYear: raw.min_year ?? null,
    maxYear: raw.max_year ?? null,
    minPrice: raw.min_price ?? null,
    maxPrice: raw.max_price ?? null,
    maxMileage: raw.max_mileage ?? null,
    cities: raw.cities ?? [],
    intervalMinutes: raw.interval_minutes ?? 30,
    heartbeatHour: raw.heartbeat_hour ?? 9,
  }
}

export function loadEnv(): Env {
  const token = process.env.TELEGRAM_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token) throw new Error('TELEGRAM_TOKEN env var is required — copy .env.example to .env and fill it in')
  if (!chatId) throw new Error('TELEGRAM_CHAT_ID env var is required — copy .env.example to .env and fill it in')
  return {
    telegramToken: token,
    telegramChatId: chatId,
    fbStoragePath: process.env.FB_STORAGE_STATE ?? './storageState.json',
    dbPath: process.env.DB_PATH ?? './data/listings.db',
  }
}
