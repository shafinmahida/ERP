import fs from 'fs';
import path from 'path';
import { initializeFoundationDatabase, resetDatabaseToEmpty, getRawDb } from '../src/db';
import { createCustomer } from '../src/services/customerService';
import { createRegistration, generateRegistrationNumber } from '../src/services/registrationService';
import { createSeason } from '../src/services/seasonPackageService';
import { getAllSeasonTypes } from '../src/services/seasonTypeService';
import { createRegistrationCharge, createPayment } from '../src/services/financialService';
import { generateReceiptForPayment, saveReceiptToDisk } from '../src/services/print/printEngine';

async function runMultiAmountPdfTests() {
  console.log('=================================================================');
  console.log(' DAYAR-E-HABIB ERP — MULTI-AMOUNT REAL PDF GENERATION VERIFICATION');
  console.log('=================================================================\n');

  initializeFoundationDatabase();
  resetDatabaseToEmpty();

  const seasonTypes = getAllSeasonTypes();
  const hajjType = seasonTypes.find((st) => st.code === 'HAJJ') || seasonTypes[0];
  const season = createSeason(hajjType.season_type_id, 2026, 'Hajj 2026 Deluxe');

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
    season_id: season.season_id,
    package_id: 1,
    status: 'Confirmed',
  });

  const testAmounts = [
    { label: 'Amount 1 (Standard ₹6,60,000)', rupees: 660000, date: '2026-07-28', mode: 'Cheque', chq: '998120' },
    { label: 'Amount 2 (Large Amount ₹15,50,000)', rupees: 1550000, date: '2026-07-28', mode: 'Bank Transfer', ref: 'UPI-9988112233' },
    { label: 'Amount 3 (Decimal Amount ₹1,23,456.50)', rupees: 123456.50, date: '2026-07-28', mode: 'Cash', chq: undefined },
  ];

  const generatedPdfPaths: string[] = [];

  for (let i = 0; i < testAmounts.length; i++) {
    const item = testAmounts[i];
    console.log(`--- Testing ${item.label} ---`);

    createRegistrationCharge({
      registration_id: registration.registration_id,
      charge_type: 'Adult',
      rate_inr: item.rupees,
      quantity: 1,
    });

    const payment = createPayment({
      registration_id: registration.registration_id,
      amount: item.rupees,
      payment_type: item.mode,
      cheque_number: item.chq,
      reference_number: item.ref,
      payment_date: item.date,
    });

    const { html, receiptData, pdfDoc } = generateReceiptForPayment(payment.payment_id);

    console.log('  Receipt Number:  ', receiptData.receiptNumber);
    console.log('  Amount Rupees:   ', `₹${receiptData.amountRupees.toLocaleString('en-IN')}`);
    console.log('  Amount Words:    ', receiptData.amountInWords);
    console.log('  Passport Number: ', receiptData.passportNumber);

    const saved = await saveReceiptToDisk(registration.registration_number, receiptData.receiptNumber, html, pdfDoc);
    console.log('  Saved File Path: ', saved.filePath);

    if (!fs.existsSync(saved.filePath)) throw new Error(`PDF file missing at ${saved.filePath}`);
    if (!saved.filename.endsWith('.pdf')) throw new Error(`Filename ${saved.filename} does not end with .pdf!`);

    const fileBytes = fs.readFileSync(saved.filePath);
    const pdfHeader = fileBytes.subarray(0, 8).toString('utf-8');
    console.log(`  File Size:       ${(fileBytes.length / 1024).toFixed(2)} KB | Magic Header: "${pdfHeader}"`);

    if (!pdfHeader.startsWith('%PDF-')) {
      throw new Error(`File at ${saved.filePath} is not a valid PDF! Header: ${pdfHeader}`);
    }

    generatedPdfPaths.push(saved.filePath);
    console.log('  ✅ Test Passed.\n');
  }

  console.log('=================================================================');
  console.log('  ALL 3 REAL PDF FILES GENERATED & VERIFIED SUCCESFULLY!');
  console.log('=================================================================');
  console.log('Exact File Paths for Personal User Inspection:');
  generatedPdfPaths.forEach((p, idx) => console.log(`  ${idx + 1}. file:///${p.replace(/\\/g, '/')}`));
  console.log('=================================================================');
}

runMultiAmountPdfTests().catch(console.error);
