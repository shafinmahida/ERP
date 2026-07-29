import puppeteer from 'puppeteer-core';
import path from 'path';

async function main() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  console.log('Launching Edge via Puppeteer-Core...');

  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();
  console.log('Navigating to http://localhost:5188 ...');
  await page.goto('http://localhost:5188', { waitUntil: 'networkidle0' });

  const screenshotPath = 'C:\\Users\\Asus\\.gemini\\antigravity\\brain\\49ea212a-748c-4fee-9364-3ddd8111bb4e\\test_render.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });

  console.log('✅ Screenshot captured successfully at:', screenshotPath);
  await browser.close();
}

main().catch(err => {
  console.error('Error taking test screenshot:', err);
  process.exit(1);
});
