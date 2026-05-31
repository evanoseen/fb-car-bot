import 'dotenv/config'
import { loadConfig, loadEnv } from './config.js'
import { scrapeListings } from './scraper.js'
import { initDb, isNew, insertListing, markAlerted, checkPriceDrop, updatePrice, type DB } from './db.js'
import { evaluate } from './evaluator.js'
import { sendAlert, sendHeartbeat, sendDegradedWarning } from './telegram.js'
import type { Config, Env } from './types.js'

function ts(): string {
  return new Date().toLocaleTimeString('en-US', { hour12: false })
}

function log(level: 'INFO' | 'WARN' | 'ERROR', msg: string): void {
  console.log(`[${ts()}] [${level}] ${msg}`)
}

interface BotState {
  consecutiveZero: number
  todayChecked: number
  todayAlerted: number
  lastHeartbeatDate: string
}

async function pollOnce(
  state: BotState,
  config: Config,
  db: DB,
  env: Env,
): Promise<void> {
  log('INFO', 'Polling Facebook Marketplace...')

  let listings
  try {
    listings = await scrapeListings(env.fbStoragePath, config)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg === 'FB_SESSION_EXPIRED') {
      log('ERROR', 'Facebook session expired — re-run: npx tsx login.ts, then copy storageState.json to the VPS')
    } else {
      log('ERROR', `Scrape error: ${msg}`)
    }
    state.consecutiveZero++
    if (state.consecutiveZero >= 3) {
      await sendDegradedWarning(env.telegramToken, env.telegramChatId)
    }
    return
  }

  if (listings.length === 0) {
    state.consecutiveZero++
    log('WARN', `0 listings returned (consecutive zero count: ${state.consecutiveZero})`)
    if (state.consecutiveZero >= 3) {
      await sendDegradedWarning(env.telegramToken, env.telegramChatId)
    }
    return
  }

  state.consecutiveZero = 0
  state.todayChecked += listings.length
  log('INFO', `Got ${listings.length} listings`)

  for (const listing of listings) {
    try {
      if (isNew(db, listing.id)) {
        insertListing(db, listing)
        const result = evaluate(listing, config)
        if (result.matches) {
          log('INFO', `Match: ${listing.title} — $${listing.price?.toLocaleString() ?? 'unknown'}`)
          markAlerted(db, listing.id)
          await sendAlert(env.telegramToken, env.telegramChatId, listing, false)
          state.todayAlerted++
        }
      } else {
        const oldPrice = checkPriceDrop(db, listing)
        if (oldPrice !== null && listing.price !== null) {
          updatePrice(db, listing.id, listing.price)
          const result = evaluate(listing, config)
          if (result.matches) {
            log('INFO', `Price drop: ${listing.title} — was $${oldPrice.toLocaleString()}, now $${listing.price.toLocaleString()}`)
            markAlerted(db, listing.id)
            await sendAlert(env.telegramToken, env.telegramChatId, listing, true, oldPrice)
            state.todayAlerted++
          }
        }
      }
    } catch (err) {
      log('ERROR', `Error processing ${listing.id}: ${err instanceof Error ? err.message : err}`)
    }
  }

  // Daily heartbeat
  const today = new Date().toLocaleDateString('en-CA')
  const hour = new Date().getHours()
  if (hour === config.heartbeatHour && state.lastHeartbeatDate !== today) {
    state.lastHeartbeatDate = today
    await sendHeartbeat(env.telegramToken, env.telegramChatId, {
      checked: state.todayChecked,
      alerted: state.todayAlerted,
      nextCheckMin: config.intervalMinutes,
    })
  }
}

async function run(): Promise<void> {
  const config = loadConfig()
  const env = loadEnv()
  const db = initDb(env.dbPath)

  const state: BotState = {
    consecutiveZero: 0,
    todayChecked: 0,
    todayAlerted: 0,
    lastHeartbeatDate: '',
  }

  const makes = config.makes.length > 0 ? config.makes.join('/') : 'any make'
  log('INFO', `FB Car Bot started. Polling every ${config.intervalMinutes} min.`)
  log('INFO', `Criteria: ${makes} | ${config.minYear ?? 'any'}+ | ≤${config.maxMileage?.toLocaleString() ?? 'any'} km | $${config.minPrice?.toLocaleString() ?? '0'}–$${config.maxPrice?.toLocaleString() ?? 'any'}`)

  process.on('SIGINT', () => {
    log('INFO', 'Shutting down...')
    db.close()
    process.exit(0)
  })
  process.on('SIGTERM', () => {
    log('INFO', 'Shutting down...')
    db.close()
    process.exit(0)
  })

  await pollOnce(state, config, db, env)
  setInterval(
    () => { pollOnce(state, config, db, env).catch(err => log('ERROR', String(err))) },
    config.intervalMinutes * 60 * 1000,
  )
}

run().catch(err => {
  console.error(`[FATAL] ${err instanceof Error ? err.message : err}`)
  process.exit(1)
})
