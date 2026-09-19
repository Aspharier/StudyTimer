import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const screenshotsDir = path.join(rootDir, 'docs', 'screenshots');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function findActivePort() {
  for (const port of [4174, 4173, 5173]) {
    try {
      const res = await fetch(`http://localhost:${port}`);
      if (res.status < 500) return port;
    } catch {}
  }
  return null;
}

async function run() {
  let port = await findActivePort();
  let server = null;

  if (!port) {
    console.log('Starting preview server on port 4173...');
    server = spawn('npx.cmd', ['vite', 'preview', '--port', '4173'], {
      cwd: rootDir,
      stdio: 'pipe',
      shell: true
    });

    server.stdout.on('data', data => console.log(`[Vite]: ${data}`));
    server.stderr.on('data', data => console.error(`[Vite Err]: ${data}`));

    for (let i = 0; i < 15; i++) {
      await wait(1000);
      port = await findActivePort();
      if (port) break;
    }
  }

  if (!port) {
    throw new Error('Could not find active preview server.');
  }

  console.log(`Active server found on port ${port}!`);

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--window-size=1440,920'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  const appUrl = `http://localhost:${port}`;
  console.log(`Navigating to ${appUrl} ...`);
  await page.goto(appUrl, { waitUntil: 'networkidle0' });

  // Clear previous local storage cache
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(1200);

  // 1. Capture Sign-In / Gateway View
  console.log('Capturing signin.png...');
  await page.screenshot({ path: path.join(screenshotsDir, 'signin.png'), fullPage: false });

  // 2. Click [ Enter Offline Demo Session ]
  console.log('Clicking demo session button...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('Offline') || b.textContent.includes('Demo') || b.textContent.includes('DEMO'));
    if (btn) btn.click();
  });

  await wait(2000);

  // 3. Capture Aesthetic Planner Open Two-Page Spread
  console.log('Capturing dashboard-dark.png (open planner spread)...');
  await page.screenshot({ path: path.join(screenshotsDir, 'dashboard-dark.png'), fullPage: false });
  await page.screenshot({ path: path.join(screenshotsDir, 'dashboard-dark-full.png'), fullPage: true });

  // 4. Expand first syllabus module to showcase horizontal bar cards
  console.log('Expanding first syllabus module...');
  await page.evaluate(() => {
    const chips = Array.from(document.querySelectorAll('span.chip'));
    const expandChip = chips.find(c => c.textContent.includes('Expand'));
    if (expandChip) expandChip.click();
  });
  await wait(800);
  console.log('Capturing syllabus-dark.png (expanded horizontal bar cards)...');
  await page.screenshot({ path: path.join(screenshotsDir, 'syllabus-dark.png'), fullPage: false });

  // 5. Open Settings Modal Popup (press key 's')
  console.log('Opening settings modal popup (press key s)...');
  await page.keyboard.press('s');
  await wait(1200);
  console.log('Capturing settings-dark.png (settings modal)...');
  await page.screenshot({ path: path.join(screenshotsDir, 'settings-dark.png'), fullPage: false });

  // Close Settings Modal
  console.log('Closing settings modal (press Escape)...');
  await page.keyboard.press('Escape');
  await wait(800);

  console.log('All screenshots successfully refreshed in docs/screenshots/!');
  await browser.close();
  if (server) {
    try { server.kill(); } catch {}
  }
  process.exit(0);
}

run().catch(err => {
  console.error('Error taking screenshots:', err);
  process.exit(1);
});
