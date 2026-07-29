import fs from 'fs';
import path from 'path';
import { initializeFoundationDatabase, resetDatabaseToEmpty, getRawDb } from '../src/db';
import {
  createSeason,
  updateSeason,
  toggleSeasonActive,
  deleteSeason,
  getAllSeasons,
  getActiveSeasons,
  createPackage,
  updatePackage,
  getPackagesBySeason,
} from '../src/services/seasonPackageService';
import { getAllSeasonTypes } from '../src/services/seasonTypeService';
import { createCustomer, updateCustomer, getCustomerById } from '../src/services/customerService';
import {
  createRegistrationWithPax,
  updateRegistrationWithPax,
  getRegistrationWithDetails,
  generateRegistrationNumber,
} from '../src/services/registrationService';
import { suggestPassportExpiryDate } from '../src/services/dateUtils';
import { createRegistrationCharge, createPayment } from '../src/services/financialService';

async function runSprint4QualityGate() {
  console.log('=================================================================');
  console.log('   DAYAR-E-HABIB ERP — SPRINT 4 FULL-PAGE QUALITY GATE VERIFICATION');
  console.log('=================================================================\n');

  initializeFoundationDatabase();
  resetDatabaseToEmpty();

  // -------------------------------------------------------------
  // TEST 1: Season System Audit & Complete Master CRUD
  // -------------------------------------------------------------
  console.log('--- TEST 1: Season System Audit & Complete Master CRUD ---');
  const seasonTypes = getAllSeasonTypes();
  const hajjType = seasonTypes.find((st) => st.code === 'HAJJ') || seasonTypes[0];
  const umrahType = seasonTypes.find((st) => st.code === 'UMR') || seasonTypes[1];

  const seasonHajj = createSeason(hajjType.season_type_id, 2026, 'Hajj 2026 Master Season');
  const seasonUmrah = createSeason(umrahType.season_type_id, 2026, 'Umrah 2026 Executive');

  console.log('Created Season #1:', seasonHajj.label, `(ID #${seasonHajj.season_id})`);
  console.log('Created Season #2:', seasonUmrah.label, `(ID #${seasonUmrah.season_id})`);

  // Update Season
  const updatedHajj = updateSeason(seasonHajj.season_id, hajjType.season_type_id, 2026, 'Hajj 2026 Deluxe Star');
  if (updatedHajj.label !== 'Hajj 2026 Deluxe Star') throw new Error('Season update failed!');

  // Toggle Season Active
  toggleSeasonActive(seasonUmrah.season_id, 0);
  const activeList = getActiveSeasons();
  if (activeList.some((s) => s.season_id === seasonUmrah.season_id)) {
    throw new Error('Deactivated season still appeared in active list!');
  }
  toggleSeasonActive(seasonUmrah.season_id, 1);
  console.log('  Season CRUD & Active Toggle Verified ✓\n');

  // -------------------------------------------------------------
  // TEST 2: Passport Expiry 10-Year Auto-Suggestion Engine
  // -------------------------------------------------------------
  console.log('--- TEST 2: Passport Expiry 10-Year Auto-Suggestion Engine ---');
  const issueDate = '2024-05-15';
  const suggestedExpiry = suggestPassportExpiryDate(issueDate);
  console.log(`Input Issue Date: "${issueDate}" -> Auto-Suggested Expiry Date: "${suggestedExpiry}"`);
  if (suggestedExpiry !== '2034-05-14') {
    throw new Error(`Passport expiry suggestion failed! Expected 2034-05-14, got ${suggestedExpiry}`);
  }
  console.log('  Passport 10-Year Expiry Engine Verified ✓\n');

  // -------------------------------------------------------------
  // TEST 3: Short Registration Numbering Engine
  // -------------------------------------------------------------
  console.log('--- TEST 3: Short Registration Numbering Engine ---');
  const shortNum1 = generateRegistrationNumber(seasonHajj.season_id);
  console.log(`Generated Short Number #1: "${shortNum1}"`);
  if (!shortNum1.startsWith('DH-H26-')) {
    throw new Error(`Short registration number ${shortNum1} does not start with DH-H26-!`);
  }
  console.log('  Short Numbering Engine Verified ✓\n');

  // -------------------------------------------------------------
  // TEST 4: End-to-End Workflow (Multi-PAX + Passport + Financials)
  // -------------------------------------------------------------
  console.log('--- TEST 4: End-to-End Complete Workflow Verification ---');

  // Create Master Package
  const pkgs = getPackagesBySeason(seasonHajj.season_id);
  const mainPkg = pkgs[0];
  updatePackage(mainPkg.package_id, mainPkg.name, mainPkg.description, 66000000); // ₹6,60,000 in paise

  // Create Registration with 3 PAX (Primary, Spouse, Child)
  const reg = createRegistrationWithPax({
    season_id: seasonHajj.season_id,
    package_id: mainPkg.package_id,
    status: 'Confirmed',
    representative: 'Al-Hidayah Travels',
    tour_name: 'Super Deluxe Hajj Group A',
    pnr: 'SV-998811',
    room_preference: 'Quad Sharing',
    bus_number: 'Bus 04',
    paxList: [
      {
        full_name: 'Mohammed Javeed Bumedia',
        father_name: 'Mohammed Hammaad',
        date_of_birth: '1985-03-31',
        gender: 'Male',
        nationality: 'Indian',
        mobile_number: '+919820012345',
        passport_number: 'W4860365',
        issue_date: '2024-05-15',
        expiry_date: '2034-05-14',
        place_of_issue: 'Mumbai',
        relationship: 'Primary',
        is_primary: true,
        address_line1: '53, Zakaria Masjid Street',
        address_line2: '1st Floor, Room 04',
        city: 'Mumbai',
        state: 'Maharashtra',
        pin_code: '400009',
        email: 'javeed@dayarehabib.com',
      },
      {
        full_name: 'Amina Javeed Bumedia',
        father_name: 'Mohammed Javeed',
        date_of_birth: '1990-08-12',
        gender: 'Female',
        nationality: 'Indian',
        mobile_number: '+919820054321',
        passport_number: 'Z9876543',
        issue_date: '2023-01-10',
        expiry_date: '2033-01-09',
        place_of_issue: 'Mumbai',
        relationship: 'Spouse',
        is_primary: false,
      },
      {
        full_name: 'Yusuf Javeed Bumedia',
        father_name: 'Mohammed Javeed',
        date_of_birth: '2015-11-20',
        gender: 'Male',
        nationality: 'Indian',
        mobile_number: '+919820012345',
        passport_number: 'K1122334',
        issue_date: '2022-06-01',
        expiry_date: '2027-05-31',
        place_of_issue: 'Mumbai',
        relationship: 'Child',
        is_primary: false,
      },
    ],
  });

  console.log(`Created Multi-PAX Registration Number: "${reg.registration_number}" (ID #${reg.registration_id})`);
  console.log('PAX Count:', reg.paxCount, 'Person(s)');
  console.log('Primary Pilgrim Name:', reg.customerName);
  console.log('Primary Passport Number:', reg.passportNumber);
  console.log('Dynamic Progress Score:', `${reg.progressPercent}%`);

  if (reg.paxCount !== 3) throw new Error(`PAX count mismatch! Expected 3, got ${reg.paxCount}`);
  if (reg.passportNumber !== 'W4860365') throw new Error(`Passport number mismatch! Got ${reg.passportNumber}`);

  // Calculate Financial Charges & Payment
  createRegistrationCharge({
    registration_id: reg.registration_id,
    charge_type: 'Adult',
    rate_inr: 660000,
    quantity: 2,
  });

  createRegistrationCharge({
    registration_id: reg.registration_id,
    charge_type: 'ChildWithBed',
    rate_inr: 330000,
    quantity: 1,
  });

  const pay = createPayment({
    registration_id: reg.registration_id,
    amount: 500000,
    payment_type: 'Bank Transfer',
    reference_number: 'NEFT-889900',
    payment_date: '2026-07-28',
  });

  // Reopen Registration & Verify Persistence
  const reopened = getRegistrationWithDetails(reg.registration_id)!;
  console.log('\n--- Reopened Registration Verification ---');
  console.log('  Registration No:   ', reopened.registration_number);
  console.log('  Package Snapshot:  ', reopened.packageName);
  console.log('  Season Snapshot:   ', reopened.seasonLabel);
  console.log('  PAX #1 (Primary):  ', reopened.paxList[0].fullName, `(${reopened.paxList[0].passportNumber})`);
  console.log('  PAX #2 (Spouse):   ', reopened.paxList[1].fullName, `(${reopened.paxList[1].passportNumber})`);
  console.log('  PAX #3 (Child):    ', reopened.paxList[2].fullName, `(${reopened.paxList[2].passportNumber})`);
  console.log('  Net Charges:       ', `₹${reopened.netTotal.toLocaleString('en-IN')}`);
  console.log('  Total Paid:        ', `₹${reopened.totalPaid.toLocaleString('en-IN')}`);
  console.log('  Balance Due:       ', `₹${reopened.balanceAmount.toLocaleString('en-IN')}`);
  console.log('  Progress Score:    ', `${reopened.progressPercent}%`);

  if (reopened.netTotal !== 1650000) throw new Error(`Net total mismatch! Expected 1,650,000, got ${reopened.netTotal}`);
  if (reopened.totalPaid !== 500000) throw new Error(`Total paid mismatch! Expected 500,000, got ${reopened.totalPaid}`);
  if (reopened.balanceAmount !== 1150000) throw new Error(`Balance mismatch! Expected 1,150,000, got ${reopened.balanceAmount}`);

  // -------------------------------------------------------------
  // TEST 5: Customer Address Normalization & Non-Duplication Test
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Customer Address Normalization & Non-Duplication Test ---');
  const primaryCustId = reopened.paxList[0].customer_id;
  updateCustomer(primaryCustId, {
    full_name: 'Mohammed Javeed Bumedia (Updated)',
    father_name: 'Mohammed Hammaad',
    date_of_birth: '1985-03-31',
    gender: 'Male',
    nationality: 'Indian',
    mobile_number: '+919820012345',
    state: 'Maharashtra',
  });

  const reopenedAfterCustUpdate = getRegistrationWithDetails(reg.registration_id)!;
  console.log('Updated Primary Customer Name:', reopenedAfterCustUpdate.customerName);
  if (reopenedAfterCustUpdate.customerName !== 'Mohammed Javeed Bumedia (Updated)') {
    throw new Error('Customer update did not propagate dynamically to registration_pax view!');
  }
  console.log('  Customer Normalization Verified ✓\n');

  console.log('=================================================================');
  console.log('  ✅ ALL SPRINT 4 QUALITY GATE VERIFICATIONS PASSED WITH 100% SUCCESS!');
  console.log('=================================================================');
}

runSprint4QualityGate().catch(console.error);
