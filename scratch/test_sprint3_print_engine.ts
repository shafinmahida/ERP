import fs from 'fs';
import path from 'path';
import { initializeFoundationDatabase, resetDatabaseToEmpty, getRawDb, getDataDirectory } from '../src/db';
import { createCustomer, createCustomerIdentity } from '../src/services/customerService';
import { createRegistration, generateRegistrationNumber } from '../src/services/registrationService';
import { createSeason } from '../src/services/seasonPackageService';
import { getAllSeasonTypes } from '../src/services/seasonTypeService';
import { createRegistrationCharge, createPayment } from '../src/services/financialService';
import { convertRupeesToWords } from '../src/services/print/amountToWords';
import { getNextDocumentNumber } from '../src/services/documentSequenceService';
import { generateReceiptForPayment, saveReceiptToDisk } from '../src/services/print/printEngine';
import { getAllAuditLogs } from '../src/services/auditService';

async function runSprint3QualityGateTests() {
  console.log('=================================================================');
  console.log('   DAYAR-E-HABIB ERP — SPRINT 3 QUALITY GATE VERIFICATION (v2)');
  console.log('=================================================================\n');

  initializeFoundationDatabase();

  // ── 1. TEST PART A1: DATABASE RESET ENGINE ────────────────────────────────
  console.log('--- TEST 1 [Part A1]: Database Reset & Audit Log Entry ---');
  resetDatabaseToEmpty();

  const db = getRawDb();
  const custCount = (db.prepare(`SELECT COUNT(*) as cnt FROM customer`).get() as any).cnt;
  const regCount = (db.prepare(`SELECT COUNT(*) as cnt FROM registration`).get() as any).cnt;
  const payCount = (db.prepare(`SELECT COUNT(*) as cnt FROM payment`).get() as any).cnt;

  console.log(`After Reset -> Customers: ${custCount}, Registrations: ${regCount}, Payments: ${payCount}`);
  if (custCount !== 0 || regCount !== 0 || payCount !== 0) {
    throw new Error('Database reset failed to clear all rows!');
  }

  const logs = getAllAuditLogs(5);
  const resetLog = logs.find((l) => l.action === 'DATABASE_RESET');
  console.log('Audit Log Entry Recorded for Database Reset:');
  console.log('  Action:   ', resetLog?.action);
  console.log('  Notes:    ', resetLog?.notes);
  if (!resetLog) throw new Error('Database reset failed to record an AuditLog entry!');
  console.log('✅ Part A1: Database Reset & Audit Logging Verified.\n');


  // ── 2. TEST PART A2: REGISTRATION NUMBER BUG FIX ─────────────────────────
  console.log('--- TEST 2 [Part A2]: Registration Number Fix (Real SeasonType) ---');
  const seasonTypes = getAllSeasonTypes();
  const hajjType = seasonTypes.find((st) => st.code === 'HAJJ') || seasonTypes[0];
  const newSeason = createSeason(hajjType.season_type_id, 2026, 'Hajj 2026 Deluxe');
  console.log(`Created Season #${newSeason.season_id}: "${newSeason.label}" with SeasonType code "${newSeason.seasonTypeCode}"`);

  const regNum = generateRegistrationNumber(newSeason.season_id);
  console.log(`Generated Registration Number: "${regNum}"`);

  if (!regNum.includes('-HAJJ-') && !regNum.includes(`-${newSeason.seasonTypeCode}-`)) {
    throw new Error('Registration number still contains REG fallback instead of SeasonType code!');
  }
  console.log('✅ Part A2: Registration Number Enforces SeasonType Code PASSED.\n');


  // ── 3. TEST PASSPORT NUMBER & 7 CONDITIONS OF TRAVEL ──────────────────────
  console.log('--- TEST 3: Passport Number Resolution & 7 Conditions Footer ---');

  // Create customer with Passport W4860365
  const customer = createCustomer({
    full_name: 'Mohammed Javeed Bumedia',
    father_name: 'Mohammed Hammaad',
    date_of_birth: '2005-03-31',
    gender: 'Male',
    nationality: 'Indian',
    mobile_number: '+919820012345',
    state: 'Maharashtra',
    passport_number: 'W4860365',
    expiry_date: '2032-10-10',
    place_of_issue: 'Mumbai',
  });

  const registration = createRegistration({
    customer_id: customer.customer_id,
    season_id: newSeason.season_id,
    package_id: 1,
    status: 'Confirmed',
  });

  createRegistrationCharge({
    registration_id: registration.registration_id,
    charge_type: 'Adult',
    rate_inr: 660000,
    quantity: 1,
  });

  const payment = createPayment({
    registration_id: registration.registration_id,
    amount: 660000,
    payment_type: 'Cheque',
    cheque_number: '998120',
    bank_name: 'HDFC Bank, Fort Branch',
    payment_date: '2026-07-28',
  });

  // Generate Receipt
  const { html, receiptData, pdfDoc } = generateReceiptForPayment(payment.payment_id);

  console.log('Receipt Passport Number Field:', receiptData.passportNumber);
  if (receiptData.passportNumber !== 'W4860365') {
    throw new Error(`Passport number failed to extract! Expected "W4860365", got "${receiptData.passportNumber}"`);
  }

  console.log('Conditions of Travel Count:', receiptData.termsAndConditions.length);
  if (receiptData.termsAndConditions.length !== 7) {
    throw new Error(`Conditions of Travel count mismatch! Expected 7, got ${receiptData.termsAndConditions.length}`);
  }
  console.log('  Term 1:', receiptData.termsAndConditions[0]);
  console.log('  Term 7:', receiptData.termsAndConditions[6]);
  console.log('✅ Passport Number & 7 Conditions of Travel Footer Verified 100% Accurate.\n');


  // ── 4. TEST GENUINE PDF SAVE & MAGIC HEADER CHECK ─────────────────────────
  console.log('--- TEST 4: Genuine PDF File Generation & Disk Save ---');
  const saved = await saveReceiptToDisk(registration.registration_number, receiptData.receiptNumber, html, pdfDoc);
  console.log(`Saved Genuine PDF File Path: ${saved.filePath}`);

  if (!fs.existsSync(saved.filePath)) throw new Error(`PDF file not found on disk at ${saved.filePath}`);
  if (!saved.filename.endsWith('.pdf')) throw new Error(`Saved file ${saved.filename} does not end with .pdf!`);

  const fileBytes = fs.readFileSync(saved.filePath);
  const pdfHeaderStr = fileBytes.subarray(0, 8).toString('utf-8');
  console.log(`File Size: ${(fileBytes.length / 1024).toFixed(2)} KB  |  Magic Header: "${pdfHeaderStr}"`);

  if (!pdfHeaderStr.startsWith('%PDF-')) {
    throw new Error(`Saved file is NOT a valid PDF document! Magic header: "${pdfHeaderStr}"`);
  }

  console.log('\n=================================================================');
  console.log('  ✅ SPRINT 3 QUALITY GATE VERIFICATION PASSED WITH ZERO ISSUES!');
  console.log(`  Artifact Ready for Personal Inspection: ${saved.filePath}`);
  console.log('=================================================================');
}

runSprint3QualityGateTests().catch(console.error);
