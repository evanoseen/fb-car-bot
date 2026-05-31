# fb-car-bot

A self-hosted bot that watches Facebook Marketplace for used-car deals and pings you on Telegram the moment a match shows up. Built for the Greater Toronto Area but works anywhere — just edit the cities.

Tell it the makes, models, price range, and max mileage you care about. It polls Marketplace on an interval, filters out everything that does not fit, dedupes listings it has already seen, and sends you only the good ones.

## How it works

```
Facebook Marketplace  ──>  scraper  ──>  parser  ──>  evaluator  ──>  Telegram alert
   (patchright)            (raw GraphQL)   (clean)    (your config)     (only matches)
```

- **scraper** (`src/scraper.ts`) — drives a real Chromium browser via [patchright](https://github.com/Kaliiiiiiiiii-Vinyzu/patchright) (a stealth Playwright fork) to pull Marketplace listings
- **parser** (`src/parser.ts`) — extracts year / make / model / price / mileage from messy listing titles
- **evaluator** (`src/evaluator.ts`) — applies your `config.json` filters
- **db** (`src/db.ts`) — remembers what it has already sent so you never get duplicates
- **telegram** (`src/telegram.ts`) — sends the alerts
- **index** (`src/index.ts`) — the main poll loop

## Prerequisites

- Node.js 20+
- A Facebook account with Marketplace access
- A Telegram bot (instructions below)

## Installation

```bash
git clone https://github.com/evanoseen/fb-car-bot.git
cd fb-car-bot
npm install
npx patchright install chromium
```

## Create a Telegram bot

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` and follow the prompts — you'll get a **bot token**
3. Search for your new bot, open it, and press **Start**
4. Get your **chat ID**: send any message to the bot, then open
   `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` in a browser.
   Your chat ID is the value at `result[0].message.chat.id`

## Configure

```bash
cp .env.example .env
# Edit .env and fill in your Telegram token and chat ID
```

`.env`:

```
TELEGRAM_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_telegram_chat_id_here
FB_STORAGE_STATE=./storageState.json
DB_PATH=./data/listings.db
```

## First-time Facebook login

Run this once to save your Facebook session. A real browser window opens —
log in normally, then press Enter in the terminal:

```bash
npm run login
```

Your session is saved to `storageState.json` (gitignored, never committed).

## Set your search criteria

Edit `config.json`:

```json
{
  "makes": ["Toyota", "Honda"],
  "models": [],
  "min_year": 2005,
  "max_year": null,
  "min_price": 4000,
  "max_price": 11000,
  "max_mileage": 250000,
  "cities": ["toronto", "mississauga", "brampton", "markham", "vaughan"],
  "interval_minutes": 30,
  "heartbeat_hour": 9
}
```

- `models` — leave empty `[]` to match any model, or list specifics like `["Corolla", "Civic"]`
- `min_year` / `max_year` — set to `null` to disable that bound
- `max_mileage` — listings with no mileage shown are **not** rejected
- `cities` — Marketplace location slugs to search
- `interval_minutes` — how often to check
- `heartbeat_hour` — hour (0–23) to send a daily "still alive" message so you know it's running

## Run locally

```bash
npm start
```

## Run tests

```bash
npm test
```

## Deploy to a VPS (24/7 via systemd)

Runs as a `systemd` service so it survives reboots and restarts on failure. Replace `user@your-vps-ip` with your server.

```bash
# From your machine — copy the project up
scp -r ./fb-car-bot user@your-vps-ip:~/
# Copy your saved Facebook session separately (it's gitignored)
scp storageState.json user@your-vps-ip:~/fb-car-bot/

# SSH in
ssh user@your-vps-ip

# On the VPS
cd ~/fb-car-bot
npm install
npx patchright install chromium --with-deps

cp .env.example .env
nano .env   # fill in TELEGRAM_TOKEN and TELEGRAM_CHAT_ID

# Install as a service (edit fb-car-bot.service first if your path/user differs)
chmod +x install.sh
sudo bash install.sh
```

Monitor it:

```bash
journalctl -u fb-car-bot -f
```

Change criteria later — edit `config.json` on the VPS, then:

```bash
systemctl restart fb-car-bot
```

## Refreshing an expired Facebook session

Facebook sessions expire. If the bot stops finding listings, re-login. This
**must** happen on a machine with a visible browser (your laptop, not the VPS):

```bash
# On your laptop
npm run login

# Push the refreshed session up
scp storageState.json user@your-vps-ip:~/fb-car-bot/
ssh user@your-vps-ip "systemctl restart fb-car-bot"
```

## If Facebook blocks your VPS IP

Datacenter IPs (Hetzner, DigitalOcean, etc.) sometimes get blocked. Add a
residential proxy to the `chromium.launch` call in `src/scraper.ts`:

```typescript
const browser = await chromium.launch({
  headless: true,
  proxy: { server: 'http://proxy-host:port', username: 'user', password: 'pass' }
})
```

Providers like Webshare.io offer residential proxies for a few dollars a month
at this request volume.

## Notes & disclaimer

- This is a personal automation tool for your own Marketplace searches. Scraping
  Facebook is against their Terms of Service — use it on your own account, at a
  reasonable polling interval, at your own risk.
- Secrets (`.env`, `storageState.json`, the `data/` folder) are gitignored and
  never leave your machine.

## License

MIT — do whatever you want with it.
