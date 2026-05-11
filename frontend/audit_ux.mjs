import { chromium } from './node_modules/playwright/index.mjs';

const BASE = 'http://localhost:5173';
const REPORT = [];

function log(msg, type = 'INFO') {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] [${type}] ${msg}`);
  REPORT.push(`[${type}] ${msg}`);
}

async function audit() {
  log('Starting UX audit');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const errors = [];
  const networkErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('response', response => {
    if (response.status() >= 400) {
      networkErrors.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on('pageerror', err => errors.push(err.message));

  // --- Login ---
  log('Navigating to login');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.screenshot({ path: '/tmp/audit_01_login.png' });
  log('Login page loaded');

  const emailInput = await page.$('input[type="email"]');
  const passInput = await page.$('input[type="password"]');
  const submitBtn = await page.$('button[type="submit"]');
  log(`Login form: email=${!!emailInput} pass=${!!passInput} btn=${!!submitBtn}`, 'CHECK');

  await page.fill('input[type="email"]', 'admin@kambelleh.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await page.waitForTimeout(3000); // wait for data to load
  await page.screenshot({ path: '/tmp/audit_02_dashboard.png' });
  log('Dashboard loaded after login');

  // --- Check dashboard data ---
  const dashText = await page.textContent('body');
  const hasStats = dashText.includes('Ocupación') || dashText.includes('0%') || dashText.includes('Habitaciones');
  log(`Dashboard has stats: ${hasStats}`, 'CHECK');

  // --- Network errors detail ---
  if (networkErrors.length > 0) {
    log('--- Network errors (4xx/5xx) ---');
    [...new Set(networkErrors)].forEach(e => log('NETWORK ERROR: ' + e, 'FAIL'));
  }

  // --- Sidebar ---
  const sidebarItems = await page.$$('aside nav a');
  log(`Sidebar items: ${sidebarItems.length}`, 'CHECK');

  // --- Dark mode toggle ---
  const toggleBtn = await page.$('button[aria-label*="modo"]');
  log(`Dark mode toggle found: ${!!toggleBtn}`, 'CHECK');

  // --- Mobile menu button ---
  const mobileMenuBtn = await page.$('button[aria-label*="Abrir"]');
  log(`Mobile menu button found: ${!!mobileMenuBtn}`, 'CHECK');

  // --- Analytics (Spanish label) ---
  try {
    await page.click('text=Analíticas');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/audit_03_analytics.png' });
    log('Analytics page loaded');
  } catch(e) { log('Analytics nav failed: ' + e.message, 'FAIL'); }

  // --- Rooms ---
  try {
    await page.click('text=Habitaciones');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: '/tmp/audit_04_rooms.png' });
    log('Rooms page screenshot taken');
  } catch(e) { log('Rooms nav failed: ' + e.message); }

  // --- Reservations ---
  try {
    await page.click('text=Reservas');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: '/tmp/audit_05_reservations.png' });
    log('Reservations page screenshot taken');
  } catch(e) { log('Reservations nav failed: ' + e.message); }

  // --- Guests ---
  try {
    await page.click('text=Huéspedes');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: '/tmp/audit_06_guests.png' });
    log('Guests page screenshot taken');
  } catch(e) { log('Guests nav failed: ' + e.message); }

  // --- Housekeeping ---
  try {
    await page.click('text=Limpieza');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: '/tmp/audit_07_housekeeping.png' });
    log('Housekeeping page screenshot taken');
  } catch(e) { log('Housekeeping nav failed: ' + e.message); }

  // --- Staff ---
  try {
    await page.click('text=Personal');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: '/tmp/audit_08_staff.png' });
    log('Staff page screenshot taken');
  } catch(e) { log('Staff nav failed: ' + e.message); }

  // --- Mobile viewport ---
  log('Testing mobile viewport');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/audit_09_mobile_dash.png' });

  // --- Console errors summary ---
  log('--- Console errors ---');
  if (errors.length === 0) {
    log('No console errors detected', 'PASS');
  } else {
    [...new Set(errors)].forEach(e => {
      if (e.includes('401')) log('Console 401: ' + e, 'FAIL');
      else if (e.includes('prefetch')) log('Console prefetch: ' + e, 'FAIL');
      else log('Console error: ' + e, 'FAIL');
    });
  }

  await browser.close();
  log('Audit complete');

  console.log('\n===== AUDIT REPORT =====');
  REPORT.forEach(line => console.log(line));
  console.log('\nScreenshots: /tmp/audit_*.png');
}

audit().catch(err => {
  console.error('Audit failed:', err.message);
  process.exit(1);
});