import {
  createRegistrationWithPax,
  updateRegistrationWithPax,
  getRegistrationWithDetails,
  generateRegistrationNumber,
} from '../src/services/registrationService';
import { createCustomer, getAllCustomers } from '../src/services/customerService';
import { createPayment } from '../src/services/financialService';
import { generateBookingFormDocument, generateInvoiceDocument } from '../src/services/print/printEngine';
import { getActiveSeasons, getPackagesBySeason } from '../src/services/seasonPackageService';

console.log('================================================================');
console.log('=== 5 END-TO-END REAL-WORLD REGISTRATION SCENARIOS VALIDATION ===');
console.log('================================================================\n');

const seasons = getActiveSeasons();
if (seasons.length === 0) {
  throw new Error('No active seasons found in DB.');
}
const testSeason = seasons[0];
const packages = getPackagesBySeason(testSeason.season_id);
if (packages.length === 0) {
  throw new Error(`No packages found for season #${testSeason.season_id}`);
}
const testPackage = packages[0];

console.log(`Using Season: ${testSeason.label} (ID: ${testSeason.season_id})`);
console.log(`Using Package: ${testPackage.name} (ID: ${testPackage.package_id})\n`);

// ------------------------------------------------------------------
// SCENARIO 1: Single Solo Pilgrim
// ------------------------------------------------------------------
console.log('--- SCENARIO 1: Solo Individual Pilgrim ---');
// Step 1: Create Customer in Master Directory
const cust1 = createCustomer({
  full_name: 'Dr. Tariq Al-Mansoor',
  father_name: 'Al-Mansoor Senior',
  date_of_birth: '1985-04-12',
  gender: 'Male',
  nationality: 'Indian',
  mobile_number: '+919876543210',
  state: 'Maharashtra',
  city: 'Mumbai',
  address_line1: 'Flat 402, Green Towers',
  passport_number: 'P1000001',
  issue_date: '2020-01-01',
  expiry_date: '2030-01-01',
  place_of_issue: 'Mumbai',
});
console.log(`✓ Step 1.1: Customer Created (ID: ${cust1.customer_id})`);

// Step 2: Create Initial Draft Registration
let reg1 = createRegistrationWithPax({
  season_id: testSeason.season_id,
  package_id: testPackage.package_id,
  status: 'Draft',
  paxList: [
    {
      customer_id: cust1.customer_id,
      fullName: cust1.full_name,
      fatherName: cust1.father_name,
      dob: cust1.date_of_birth,
      gender: cust1.gender,
      mobile: cust1.mobile_number,
      passportNumber: cust1.currentPassport,
      issueDate: '2020-01-01',
      expiryDate: '2030-01-01',
      relationship: 'Primary',
      is_primary: true,
    },
  ],
});
console.log(`✓ Step 1.2: Initial Registration Draft Created (#${reg1.registration_number})`);

// Step 3: Update Flight PNR & Travel Info (Save Step)
reg1 = updateRegistrationWithPax(reg1.registration_id, {
  airline: 'Saudi Arabian Airlines (SV789)',
  sector: 'BOM-JED-BOM',
  flight_number: 'SV789',
  pnr: 'PNR10001',
  status: 'Confirmed',
});
console.log(`✓ Step 1.3: Flight PNR Updated & Saved (PNR: ${reg1.pnr})`);

// Step 4: Record Payment (Save Step)
createPayment({
  registration_id: reg1.registration_id,
  amount: 50000,
  payment_mode: 'Bank Transfer (NEFT)',
  reference_number: 'TXN10001',
});
reg1 = getRegistrationWithDetails(reg1.registration_id)!;
console.log(`✓ Step 1.4: Payment Recorded (Paid: ₹${reg1.totalPaid.toLocaleString('en-IN')}, Balance: ₹${reg1.balanceAmount.toLocaleString('en-IN')})`);

// Step 5: Verify Document Generation
const docHtml1 = generateBookingFormDocument(reg1.registration_id, 'combined');
if (!docHtml1.includes(reg1.registration_number) || !docHtml1.includes('Dr. Tariq Al-Mansoor')) {
  throw new Error('Scenario 1 Document Generation Failed!');
}
console.log(`✅ SCENARIO 1 PASSED: 1 PAX Solo Pilgrim processed 100% cleanly!\n`);

// ------------------------------------------------------------------
// SCENARIO 2: Family of 5 (Husband, Wife, 3 Children) in 2 Rooms
// ------------------------------------------------------------------
console.log('--- SCENARIO 2: Family of 5 (Parents + 3 Children) in 2 Rooms ---');

// Step 1: Create Registration with 5 PAX
let reg2 = createRegistrationWithPax({
  season_id: testSeason.season_id,
  package_id: testPackage.package_id,
  status: 'Confirmed',
  room_preference: 'Room 1: Husband + Wife (Double) | Room 2: 3 Children (Triple)',
  paxList: [
    {
      fullName: 'Farhan Mahmood Syed',
      fatherName: 'Mahmood Syed',
      dob: '1980-06-15',
      gender: 'Male',
      mobile: '+919988776655',
      passportNumber: 'P2000001',
      issueDate: '2021-02-10',
      expiryDate: '2031-02-10',
      placeOfIssue: 'Mumbai',
      relationship: 'Primary',
      is_primary: true,
    },
    {
      fullName: 'Ayesha Farhan Syed',
      fatherName: 'Rashid Ahmed',
      dob: '1984-09-20',
      gender: 'Female',
      mobile: '+919988776655',
      passportNumber: 'P2000002',
      issueDate: '2021-03-12',
      expiryDate: '2031-03-12',
      placeOfIssue: 'Mumbai',
      relationship: 'Spouse (Wife)',
      is_primary: false,
    },
    {
      fullName: 'Hamza Farhan Syed',
      fatherName: 'Farhan Mahmood Syed',
      dob: '2010-01-05',
      gender: 'Male',
      mobile: '+919988776655',
      passportNumber: 'P2000003',
      issueDate: '2022-05-01',
      expiryDate: '2032-05-01',
      placeOfIssue: 'Mumbai',
      relationship: 'Child (Son - 1st Born)',
      is_primary: false,
    },
    {
      fullName: 'Bilal Farhan Syed',
      fatherName: 'Farhan Mahmood Syed',
      dob: '2014-08-18',
      gender: 'Male',
      mobile: '+919988776655',
      passportNumber: 'P2000004',
      issueDate: '2022-05-01',
      expiryDate: '2032-05-01',
      placeOfIssue: 'Mumbai',
      relationship: 'Child (Son - 2nd Born)',
      is_primary: false,
    },
    {
      fullName: 'Zainab Farhan Syed',
      fatherName: 'Farhan Mahmood Syed',
      dob: '2018-11-30',
      gender: 'Female',
      mobile: '+919988776655',
      passportNumber: 'P2000005',
      issueDate: '2022-05-01',
      expiryDate: '2032-05-01',
      placeOfIssue: 'Mumbai',
      relationship: 'Child (Daughter - 3rd Born)',
      is_primary: false,
    },
  ],
});

console.log(`✓ Step 2.1: Family Registration Created (#${reg2.registration_number}) with ${reg2.paxCount} PAX.`);

// Step 2: Verify all 5 PAX are distinct profiles in DB
if (reg2.paxCount !== 5) {
  throw new Error(`Scenario 2 Failed: Expected 5 PAX, got ${reg2.paxCount}`);
}

const names2 = reg2.paxList.map((p) => p.fullName);
const uniqueNames2 = new Set(names2);
if (uniqueNames2.size !== 5) {
  throw new Error(`Scenario 2 Failed: Duplicate PAX detected! (${names2.join(', ')})`);
}
console.log(`✓ Step 2.2: All 5 PAX verified distinct: ${Array.from(uniqueNames2).join(' | ')}`);

// Step 3: Re-Save / Update Registration (verifying no PAX drop or duplication)
reg2 = updateRegistrationWithPax(reg2.registration_id, {
  makkah_hotel: 'Swissotel Al Maqam Makkah',
  madinah_hotel: 'Dar Al Taqwa Madinah',
  status: 'Visa Processing',
  paxList: reg2.paxList.map((p) => ({
    customer_id: p.customer_id,
    fullName: p.fullName,
    fatherName: p.fatherName,
    dob: p.dob,
    gender: p.gender,
    mobile: p.mobile,
    passportNumber: p.passportNumber,
    issueDate: p.issueDate,
    expiryDate: p.expiryDate,
    placeOfIssue: p.placeOfIssue,
    relationship: p.relationship,
    is_primary: p.is_primary === 1,
  })),
});

console.log(`✓ Step 2.3: Re-Saved Family Registration. Final PAX Count=${reg2.paxCount}`);
if (reg2.paxCount !== 5) {
  throw new Error(`Scenario 2 Re-save Failed: Expected 5 PAX, got ${reg2.paxCount}`);
}
console.log(`✅ SCENARIO 2 PASSED: 5 PAX Family processed without data loss or duplication!\n`);

// ------------------------------------------------------------------
// SCENARIO 3: Elderly Couple
// ------------------------------------------------------------------
console.log('--- SCENARIO 3: Elderly Couple (Double Room) ---');
let reg3 = createRegistrationWithPax({
  season_id: testSeason.season_id,
  package_id: testPackage.package_id,
  status: 'Confirmed',
  room_preference: 'Double Room (Ground Floor / Elevator Accessible)',
  paxList: [
    {
      fullName: 'Haji Ghulam Rasool Sheikh',
      fatherName: 'Abdul Rasool Sheikh',
      dob: '1955-03-10',
      gender: 'Male',
      mobile: '+919820011223',
      passportNumber: 'P3000001',
      issueDate: '2019-06-15',
      expiryDate: '2029-06-15',
      placeOfIssue: 'Srinagar',
      relationship: 'Primary',
      is_primary: true,
    },
    {
      fullName: 'Hajjan Begum Safia Sheikh',
      fatherName: 'Mohammad Yusuf',
      dob: '1960-08-25',
      gender: 'Female',
      mobile: '+919820011223',
      passportNumber: 'P3000002',
      issueDate: '2019-06-15',
      expiryDate: '2029-06-15',
      placeOfIssue: 'Srinagar',
      relationship: 'Spouse (Wife)',
      is_primary: false,
    },
  ],
});

console.log(`✓ Step 3.1: Couple Registration Created (#${reg3.registration_number}) with ${reg3.paxCount} PAX.`);
if (reg3.paxCount !== 2) throw new Error('Scenario 3 Failed!');
console.log(`✅ SCENARIO 3 PASSED: Elderly Couple registered cleanly!\n`);

// ------------------------------------------------------------------
// SCENARIO 4: Group of 4 Relatives/Friends
// ------------------------------------------------------------------
console.log('--- SCENARIO 4: Group of 4 Relatives (Quad Room) ---');
let reg4 = createRegistrationWithPax({
  season_id: testSeason.season_id,
  package_id: testPackage.package_id,
  status: 'Confirmed',
  room_preference: 'Quad Sharing Room',
  paxList: [
    {
      fullName: 'Imran Hashim Merchant',
      fatherName: 'Hashim Merchant',
      dob: '1988-12-01',
      gender: 'Male',
      mobile: '+919700112233',
      passportNumber: 'P4000001',
      issueDate: '2021-09-01',
      expiryDate: '2031-09-01',
      placeOfIssue: 'Mumbai',
      relationship: 'Primary',
      is_primary: true,
    },
    {
      fullName: 'Faisal Hashim Merchant',
      fatherName: 'Hashim Merchant',
      dob: '1990-04-14',
      gender: 'Male',
      mobile: '+919700112233',
      passportNumber: 'P4000002',
      issueDate: '2021-09-01',
      expiryDate: '2031-09-01',
      placeOfIssue: 'Mumbai',
      relationship: 'Brother',
      is_primary: false,
    },
    {
      fullName: 'Zubair Hashim Merchant',
      fatherName: 'Hashim Merchant',
      dob: '1993-07-22',
      gender: 'Male',
      mobile: '+919700112233',
      passportNumber: 'P4000003',
      issueDate: '2021-09-01',
      expiryDate: '2031-09-01',
      placeOfIssue: 'Mumbai',
      relationship: 'Brother',
      is_primary: false,
    },
    {
      fullName: 'Asif Yakub Memon',
      fatherName: 'Yakub Memon',
      dob: '1989-10-10',
      gender: 'Male',
      mobile: '+919811223344',
      passportNumber: 'P4000004',
      issueDate: '2021-11-15',
      expiryDate: '2031-11-15',
      placeOfIssue: 'Mumbai',
      relationship: 'Cousin',
      is_primary: false,
    },
  ],
});

console.log(`✓ Step 4.1: Group of 4 Relatives Created (#${reg4.registration_number}) with ${reg4.paxCount} PAX.`);
if (reg4.paxCount !== 4) throw new Error('Scenario 4 Failed!');
console.log(`✅ SCENARIO 4 PASSED: 4 Relatives Group processed cleanly!\n`);

// ------------------------------------------------------------------
// SCENARIO 5: Extended Family of 6 Across 2 Rooms with Flight & Hotel Dates
// ------------------------------------------------------------------
console.log('--- SCENARIO 5: Extended Family of 6 (3 Generations) in 2 Rooms ---');
let reg5 = createRegistrationWithPax({
  season_id: testSeason.season_id,
  package_id: testPackage.package_id,
  status: 'Travel Ready',
  airline: 'Flynas (XY512)',
  sector: 'BOM-MED-JED-BOM',
  flight_number: 'XY512',
  pnr: 'PNR55555',
  makkah_hotel: 'Clock Tower Makkah',
  madinah_hotel: 'Oberoi Madinah',
  makkah_checkin: '2026-05-10',
  makkah_checkout: '2026-05-20',
  madinah_checkin: '2026-05-20',
  madinah_checkout: '2026-05-28',
  paxList: [
    {
      fullName: 'Usman Ali Chotani',
      fatherName: 'Ali Chotani',
      dob: '1976-02-14',
      gender: 'Male',
      mobile: '+919892012345',
      passportNumber: 'P5000001',
      issueDate: '2022-01-01',
      expiryDate: '2032-01-01',
      placeOfIssue: 'Mumbai',
      relationship: 'Primary',
      is_primary: true,
    },
    {
      fullName: 'Sana Usman Chotani',
      fatherName: 'Rizwan Parekh',
      dob: '1982-05-20',
      gender: 'Female',
      mobile: '+919892012345',
      passportNumber: 'P5000002',
      issueDate: '2022-01-01',
      expiryDate: '2032-01-01',
      placeOfIssue: 'Mumbai',
      relationship: 'Spouse (Wife)',
      is_primary: false,
    },
    {
      fullName: 'Yusuf Usman Chotani',
      fatherName: 'Usman Ali Chotani',
      dob: '2008-09-09',
      gender: 'Male',
      mobile: '+919892012345',
      passportNumber: 'P5000003',
      issueDate: '2022-01-01',
      expiryDate: '2032-01-01',
      placeOfIssue: 'Mumbai',
      relationship: 'Child (Son)',
      is_primary: false,
    },
    {
      fullName: 'Maryam Usman Chotani',
      fatherName: 'Usman Ali Chotani',
      dob: '2012-03-15',
      gender: 'Female',
      mobile: '+919892012345',
      passportNumber: 'P5000004',
      issueDate: '2022-01-01',
      expiryDate: '2032-01-01',
      placeOfIssue: 'Mumbai',
      relationship: 'Child (Daughter)',
      is_primary: false,
    },
    {
      fullName: 'Ali Mohammed Chotani',
      fatherName: 'Mohammed Chotani',
      dob: '1950-11-11',
      gender: 'Male',
      mobile: '+919892012345',
      passportNumber: 'P5000005',
      issueDate: '2018-04-04',
      expiryDate: '2028-04-04',
      placeOfIssue: 'Mumbai',
      relationship: 'Father (Grandfather)',
      is_primary: false,
    },
    {
      fullName: 'Khadija Ali Chotani',
      fatherName: 'Ibrahim Siddiqui',
      dob: '1954-07-07',
      gender: 'Female',
      mobile: '+919892012345',
      passportNumber: 'P5000006',
      issueDate: '2018-04-04',
      expiryDate: '2028-04-04',
      placeOfIssue: 'Mumbai',
      relationship: 'Mother (Grandmother)',
      is_primary: false,
    },
  ],
});

console.log(`✓ Step 5.1: 6-PAX Extended Family Created (#${reg5.registration_number}) with ${reg5.paxCount} PAX.`);
if (reg5.paxCount !== 6) throw new Error('Scenario 5 Failed!');

const docHtml5 = generateBookingFormDocument(reg5.registration_id, 'combined');
if (!docHtml5.includes(reg5.registration_number) || !docHtml5.includes('Usman Ali Chotani')) {
  throw new Error('Scenario 5 Document Generation Failed!');
}
console.log(`✓ Step 5.2: Booking Form PDF HTML Generated (${docHtml5.length} bytes).`);
console.log(`✅ SCENARIO 5 PASSED: 6-PAX 3-Generations Family processed 100% successfully!\n`);

console.log('================================================================');
console.log('🎉 ALL 5 COMPLEX SCENARIOS EXECUTED & PASSED WITH 100% INTEGRITY!');
console.log('================================================================');
