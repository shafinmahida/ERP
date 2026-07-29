import fs from 'fs';
import path from 'path';
import { generateBookingFormDocument } from '../src/services/print/printEngine';
import { getAllRegistrations } from '../src/services/registrationService';

const regs = getAllRegistrations();
// Find a registration with multiple PAX (e.g. 5 or 6 PAX family)
const multiPaxReg = regs.find((r) => r.paxCount >= 5) || regs[0];

if (!multiPaxReg) {
  throw new Error('No registrations found in database.');
}

console.log(`Generating A4 Booking Form Sample for Registration #${multiPaxReg.registration_number} (${multiPaxReg.paxCount} PAX)...`);

const htmlContent = generateBookingFormDocument(multiPaxReg.registration_id, 'combined');

const targetPath = 'C:\\Users\\Asus\\.gemini\\antigravity\\brain\\49ea212a-748c-4fee-9364-3ddd8111bb4e\\booking_form_sample.html';

fs.writeFileSync(targetPath, htmlContent, 'utf-8');

console.log(`✓ Sample Booking Form saved successfully to: ${targetPath}`);
