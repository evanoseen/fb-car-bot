import type { Listing } from './types.js'

const API_BASE = 'https://api.telegram.org/bot'

function ts(): string {
  return new Date().toLocaleTimeString('en-US', { hour12: false })
}

function fmt(n: number | null | undefined): string {
  if (n == null) return 'not listed'
  return n.toLocaleString()
}

async function sendMessage(token: string, chatId: string, text: string): Promise<void> {
  let lastErr: Error | null = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${API_BASE}${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
      return
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err))
      if (attempt < 3) await new Promise(r => setTimeout(r, 5000))
    }
  }
  console.error(`[${ts()}] [ERROR] Telegram failed after 3 attempts: ${lastErr?.message}`)
}

export async function sendAlert(
  token: string,
  chatId: string,
  listing: Listing,
  isPriceDrop: boolean,
  oldPrice?: number | null,
): Promise<void> {
  const priceStr = listing.price !== null ? `$${listing.price.toLocaleString()}` : 'price unknown'
  const mileageStr = listing.mileage !== null ? `${listing.mileage.toLocaleString()} km` : 'mileage not listed'
  const makeModel = [listing.year, listing.make, listing.model].filter(Boolean).join(' ')

  let text = ''
  if (isPriceDrop && oldPrice != null) {
    text += `💸 <b>Price Drop!</b>\nWas: $${fmt(oldPrice)} → Now: ${priceStr}\n\n`
  }
  text += `🚗 <b>${isPriceDrop ? '' : 'New Deal Found!\n'}${makeModel} — ${priceStr}</b>\n`
  text += `📅 Year: ${listing.year ?? 'unknown'}  |  🔧 ${listing.make ?? 'unknown'} ${listing.model ?? ''}\n`
  text += `📏 ${mileageStr}  |  📍 ${listing.location ?? 'unknown'}\n`
  text += `🔗 ${listing.url}`

  await sendMessage(token, chatId, text.trim())
}

export async function sendHeartbeat(
  token: string,
  chatId: string,
  stats: { checked: number; alerted: number; nextCheckMin: number },
): Promise<void> {
  const date = new Date().toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
  const text =
    `✅ <b>FB Car Bot alive</b> — ${date}\n` +
    `Checked: ${stats.checked} listings today  |  Alerted: ${stats.alerted} deals\n` +
    `Next check in ${stats.nextCheckMin} min`
  await sendMessage(token, chatId, text)
}

export async function sendDegradedWarning(token: string, chatId: string): Promise<void> {
  const text =
    `⚠️ <b>FB Car Bot Warning</b>\n` +
    `0 listings returned for 3+ consecutive checks.\n` +
    `Possible causes: session expired, bot detection, or geofencing.\n` +
    `Run <code>npx tsx login.ts</code> on the VPS to refresh the session.`
  await sendMessage(token, chatId, text)
}
