import puppeteer from 'puppeteer-core';
import fs from 'fs';

async function main() {
  const edgePaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  let executablePath = edgePaths.find((p) => fs.existsSync(p));

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
  });

  const page = await browser.newPage();
  const htmlPath = 'C:\\Users\\Asus\\.gemini\\antigravity\\brain\\49ea212a-748c-4fee-9364-3ddd8111bb4e\\booking_form_sample.html';
  const pngPath = 'C:\\Users\\Asus\\.gemini\\antigravity\\brain\\49ea212a-748c-4fee-9364-3ddd8111bb4e\\06_booking_form_sample.png';

  await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: pngPath, fullPage: true });

  await browser.close();
  console.log(`✓ Rendered PNG screenshot: ${pngPath}`);
}

main().catch(console.error);
