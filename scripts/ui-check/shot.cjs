// UI check: opens a page of the app in a real browser and saves one screenshot per CSS selector, so a new block can be looked at beside its
// neighbours. See "UI check" in CLAUDE.md. Nothing here is a dependency of the repo.
//
//   one-time:  npm i --no-save playwright-core        (the browsers are the ones Playwright already keeps in %LOCALAPPDATA%\ms-playwright)
//   throwaway Vite on its own port (never touch the developer's own `npm run dev`; the API on :3000 must be running):
//              npx vite --port 5199 --strictPort       (run inside apps/web)
//   then:      node scripts/ui-check/shot.cjs "<hash route>" <outPrefix> "<selector>" ["<selector>" ...]
//   example:   node scripts/ui-check/shot.cjs "/projects/SEED-SHOWCASE-X/phase/4?gate=SG10&market=Philippines" shots/q12 "#sec-market-assessment" "#sec-market-tracking"
//
// Signs in with the dev-login endpoint (app.admin@maxbiocare.com — the API refuses it in production). Env: UI_CHECK_URL (default
// http://localhost:5199), UI_CHECK_EMAIL, UI_CHECK_CHROME (a chrome executable, otherwise the newest Playwright chromium found).
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

function findChrome() {
  if (process.env.UI_CHECK_CHROME) return process.env.UI_CHECK_CHROME;
  const root = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  const dirs = fs.existsSync(root) ? fs.readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1])) : [];
  for (const d of dirs) {
    const exe = path.join(root, d, 'chrome-win64', 'chrome.exe');
    if (fs.existsSync(exe)) return exe;
  }
  throw new Error('No chromium found: run `npx playwright install chromium`, or set UI_CHECK_CHROME');
}

(async () => {
  const [route, prefix, ...selectors] = process.argv.slice(2);
  if (!route || !prefix || selectors.length === 0) throw new Error('usage: node shot.cjs "<hash route>" <outPrefix> "<selector>" ...');
  const base = process.env.UI_CHECK_URL || 'http://localhost:5199';
  const browser = await chromium.launch({ executablePath: findChrome(), headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const res = await context.request.post(`${base}/api/auth/dev-login`, { data: { email: process.env.UI_CHECK_EMAIL || 'app.admin@maxbiocare.com' } });
  if (!res.ok()) throw new Error('dev-login failed ' + res.status());
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message));
  await page.goto(`${base}/#${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  fs.mkdirSync(path.dirname(path.resolve(prefix)), { recursive: true });
  let i = 0;
  for (const sel of selectors) {
    const loc = page.locator(sel).first();
    if ((await page.locator(sel).count()) === 0) { console.log('no match:', sel); continue; }
    const box = await loc.boundingBox();
    if (!box || box.height < 1) { console.log('present but empty (nothing drawn):', sel); continue; }
    const file = `${prefix}-${i++}.png`;
    await loc.screenshot({ path: file });
    console.log('saved', file, sel, box ? `${Math.round(box.width)}x${Math.round(box.height)}` : '');
  }
  await browser.close();
})();
