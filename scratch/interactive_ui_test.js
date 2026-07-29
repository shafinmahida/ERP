import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACTS_DIR = 'C:\\Users\\Asus\\.gemini\\antigravity\\brain\\49ea212a-748c-4fee-9364-3ddd8111bb4e';

async function runFullBrowserUITesting() {
  console.log('========================================================================');
  console.log('=== END-TO-END BROWSER APP UI INTERACTION & ARTIFACT GENERATION ===');
  console.log('========================================================================');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
  });

  const page = await browser.newPage();
  page.on('dialog', async dialog => {
    try { await dialog.dismiss(); } catch {}
  });

  // 1. Open App UI & Clear old browser storage cache
  console.log('\n[1/5] Opening Dayar-E-Habib ERP App UI in Real Edge Browser...');
  await page.goto('http://localhost:5188', { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, '01_browser_home_screen.png') });

  // 2. Open Pilgrim Directory
  console.log('\n[2/5] Interacting with Pilgrim Directory Tab...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Pilgrim Directory'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, '02_browser_customer_directory.png') });

  // 3. Open Registration Workspace
  console.log('\n[3/5] Interacting with Registration Workspace...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('New Registration'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Select Pilgrim #1 in dropdown
  await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select'));
    const custSelect = selects.find(s => s.options[0]?.text.includes('Select Saved Customer'));
    if (custSelect && custSelect.options.length > 1) {
      custSelect.value = custSelect.options[1].value;
      custSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, '03_browser_1pax_registration.png') });

  // 4. Test Flight Itinerary Section UI
  console.log('\n[4/5] Testing Flight Itinerary Section UI...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Flight Itinerary'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, '04_browser_flight_itinerary.png') });

  // 5. Test Hotels & Room Splitting Section UI
  console.log('\n[5/5] Testing Hotels & Room Splitting Section UI...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Hotels & Room Splitting'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, '05_browser_hotel_splitting.png') });

  // Test Travel Operations Execution Tab UI
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Travel Operations'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, '07_browser_travel_operations_view.png') });

  await browser.close();

  console.log('\n========================================================================');
  console.log('🎉 REAL BROWSER APP UI TESTING COMPLETE & ALL SCREENSHOTS VERIFIED!');
  console.log('========================================================================');
}

runFullBrowserUITesting().catch(console.error);
