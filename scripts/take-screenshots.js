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

  // 4. Switch to Rows view or All Modules to showcase compact syllabus layout
  console.log('Switching to Rows view...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const rowsBtn = btns.find(b => b.textContent.includes('Rows'));
    if (rowsBtn) rowsBtn.click();
  });
  await wait(800);
  console.log('Capturing syllabus-dark.png (compact rows view)...');
  await page.screenshot({ path: path.join(screenshotsDir, 'syllabus-dark.png'), fullPage: false });

  // Switch to All Modules in Shelf view
  console.log('Switching to All Modules in Shelf view...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const shelfBtn = btns.find(b => b.textContent.includes('Shelf'));
    if (shelfBtn) shelfBtn.click();
    const allBtn = btns.find(b => b.textContent.includes('All Modules'));
    if (allBtn) allBtn.click();
  });
  await wait(800);
  await page.screenshot({ path: path.join(screenshotsDir, 'dashboard-light.png'), fullPage: false });

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
