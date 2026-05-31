import { chromium } from 'patchright'
import * as readline from 'node:readline'

async function main(): Promise<void> {
  console.log('Launching browser for Facebook login...')
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto('https://www.facebook.com')

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  await new Promise<void>(resolve => {
    rl.question('\nLog into Facebook in the browser window, then press Enter here to save the session...\n', () => {
      rl.close()
      resolve()
    })
  })

  await context.storageState({ path: './storageState.json' })
  await browser.close()
  console.log('\nSession saved to storageState.json')
  console.log('Run "npm start" to start the bot.')
}

main().catch(err => { console.error(err); process.exit(1) })
