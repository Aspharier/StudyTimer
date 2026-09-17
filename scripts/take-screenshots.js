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

async function run() {
  console.log('Starting preview server...');
  const server = spawn('npx.cmd', ['vite', 'preview', '--port', '4173', '--strictPort'], {
    cwd: rootDir,
    stdio: 'pipe',
    shell: true
  });

  server.stdout.on('data', data => console.log(`[Vite]: ${data}`));
  server.stderr.on('data', data => console.error(`[Vite Err]: ${data}`));

  await wait(3500);

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

  console.log('Navigating to http://localhost:4173 ...');
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });

  // Clear previous local storage cache
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });

  // 1. Capture Sign-In / Gateway View
  console.log('Capturing signin.png...');
  await page.screenshot({ path: path.join(screenshotsDir, 'signin.png'), fullPage: false });

  // 2. Click [ ENTER OFFLINE / DEMO SESSION ]
  console.log('Clicking demo session button...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('OFFLINE') || b.textContent.includes('DEMO'));
    if (btn) btn.click();
  });

  await wait(2000);

  // 3. Capture Dashboard Viewport & Full Page (Dark Mode)
  console.log('Capturing dashboard-dark.png...');
  await page.screenshot({ path: path.join(screenshotsDir, 'dashboard-dark.png'), fullPage: false });
  await page.screenshot({ path: path.join(screenshotsDir, 'dashboard-dark-full.png'), fullPage: true });

  // 4. Navigate to Daily Plan
  console.log('Navigating to Plan (press key 2)...');
  await page.keyboard.press('2');
  await wait(1500);
  console.log('Capturing plan-dark.png...');
  await page.screenshot({ path: path.join(screenshotsDir, 'plan-dark.png'), fullPage: false });

  // 5. Navigate to Syllabus Tree
  console.log('Navigating to Syllabus (press key 3)...');
  await page.keyboard.press('3');
  await wait(1500);
  console.log('Capturing syllabus-dark.png...');
  await page.screenshot({ path: path.join(screenshotsDir, 'syllabus-dark.png'), fullPage: false });

  // 6. Navigate to Telemetry / Settings
  console.log('Navigating to Settings (press key 4)...');
  await page.keyboard.press('4');
  await wait(1500);
  console.log('Capturing settings-dark.png...');
  await page.screenshot({ path: path.join(screenshotsDir, 'settings-dark.png'), fullPage: false });

  // 7. Toggle Light Theme & Return to Dashboard
  console.log('Switching to light theme...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const themeBtn = btns.find(b => b.textContent.includes('LIGHT') || b.textContent.includes('THEME'));
    if (themeBtn) themeBtn.click();
  });
  await wait(500);
  console.log('Returning to dashboard in light theme (press key 1)...');
  await page.keyboard.press('1');
  await wait(1500);
  console.log('Capturing dashboard-light.png...');
  await page.screenshot({ path: path.join(screenshotsDir, 'dashboard-light.png'), fullPage: false });

  console.log('All screenshots successfully refreshed!');
  await browser.close();
  try {
    server.kill();
  } catch {}
  process.exit(0);
}

run().catch(err => {
  console.error('Error taking screenshots:', err);
  process.exit(1);
});
