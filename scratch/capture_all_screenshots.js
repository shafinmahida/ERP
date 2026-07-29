import puppeteer from 'puppeteer-core';
import path from 'path';

async function clickButtonWithText(page, text) {
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const btnText = await page.evaluate(el => el.textContent, b);
    if (btnText && btnText.includes(text)) {
      await b.click();
      return true;
    }
  }
  return false;
}

async function main() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const artifactDir = 'C:\\Users\\Asus\\.gemini\\antigravity\\brain\\49ea212a-748c-4fee-9364-3ddd8111bb4e';

  console.log('Launching Edge for full screenshot suite generation...');
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:5188', { waitUntil: 'networkidle0' });

  // 1. Executive Home Command Center (Minimalist Welcome Screen)
  console.log('Capturing Screenshot 1: Executive Home Command Center...');
  await page.screenshot({ path: path.join(artifactDir, '01_first_run_guide.png') });

  // 2. Pilgrim Directory
  console.log('Navigating to Pilgrim Directory tab...');
  await clickButtonWithText(page, 'Pilgrim Directory');
  await new Promise(r => setTimeout(r, 1000));

  console.log('Capturing Screenshot 2: Customer Directory...');
  await page.screenshot({ path: path.join(artifactDir, '02_customer_list.png') });

  // 3. Registration Workspace (with multi-pilgrim registration open)
  console.log('Navigating to Pilgrim Registrations tab...');
  await clickButtonWithText(page, 'Pilgrim Registrations');
  await new Promise(r => setTimeout(r, 1000));

  const clickedWorkspace = await clickButtonWithText(page, 'Workspace');
  if (!clickedWorkspace) {
    await clickButtonWithText(page, '+ Start New Registration');
  }
  await new Promise(r => setTimeout(r, 1200));

  console.log('Capturing Screenshot 3: Registration Workspace...');
  await page.screenshot({ path: path.join(artifactDir, '03_registration_workspace.png') });

  // Close workspace
  await clickButtonWithText(page, 'Back to Registrations');
  await new Promise(r => setTimeout(r, 800));

  // 4. Payments Dashboard
  console.log('Navigating to Payments & Ledger tab...');
  await clickButtonWithText(page, 'Payments & Ledger');
  await new Promise(r => setTimeout(r, 1000));

  console.log('Capturing Screenshot 4: Payments Dashboard...');
  await page.screenshot({ path: path.join(artifactDir, '04_payments_dashboard.png') });

  // 5. Settings Screen
  console.log('Navigating to Settings & Data Backup tab...');
  await clickButtonWithText(page, 'Settings & Data Backup');
  await new Promise(r => setTimeout(r, 1000));

  console.log('Capturing Screenshot 5: Settings Screen...');
  await page.screenshot({ path: path.join(artifactDir, '05_settings_screen.png') });

  console.log('✅ ALL 5 SCREENSHOTS CAPTURED SUCCESSFULLY!');
  await browser.close();
}

main().catch(err => {
  console.error('Error generating screenshots:', err);
  process.exit(1);
});
