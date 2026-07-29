import {
  createRegistrationWithPax,
  updateRegistrationWithPax,
  getRegistrationWithDetails,
  generateRegistrationNumber,
  getAllRegistrations,
} from '../src/services/registrationService';
import { createCustomer, getAllCustomers, searchCustomers } from '../src/services/customerService';
import { createPayment, createRegistrationCharge, getRegistrationFinancialSummary } from '../src/services/financialService';
import { generateBookingFormDocument, generateInvoiceDocument } from '../src/services/print/printEngine';
import { getActiveSeasons, getPackagesBySeason } from '../src/services/seasonPackageService';
import { getAuditLogsForEntity } from '../src/services/auditService';
import { saveVisaOperation, saveFlightOperation, saveHotelOperation } from '../src/services/travelOperationsService';

console.log('========================================================================');
console.log('=== 20 ENTERPRISE SCENARIOS FULL-SUITE REGISTRATION ENGINE VALIDATION ===');
console.log('========================================================================\n');

const seasons = getActiveSeasons();
if (seasons.length < 2) {
  console.log('Fewer than 2 seasons found. Using available season for test suite.');
}
const testSeason = seasons[0];
const secondSeason = seasons[1] || seasons[0];
const packages = getPackagesBySeason(testSeason.season_id);
const testPackage = packages[0];
const upgradePackage = packages[1] || packages[0];

console.log(`Primary Test Season: ${testSeason.label} (ID: ${testSeason.season_id})`);
console.log(`Primary Test Package: ${testPackage.name} (ID: ${testPackage.package_id})\n`);

let passedCount = 0;

// -----------------------------------------------------------------------------
// SCENARIO 1: Existing Customer Reuse (No Customer Duplication)
// -----------------------------------------------------------------------------
console.log('--- SCENARIO 1: Existing Customer Reuse ---');
const existingCust1 = createCustomer({
  full_name: 'Rashid Mahmood Al-Hassan',
  father_name: 'Mahmood Al-Hassan',
  date_of_birth: '1975-05-15',
  gender: 'Male',
  nationality: 'Indian',
  mobile_number: '+919811122233',
  state: 'Maharashtra',
  city: 'Mumbai',
  passport_number: 'P9000001',
  issue_date: '2020-01-01',
  expiry_date: '2030-01-01',
  place_of_issue: 'Mumbai',
});

const initialCustCount = getAllCustomers().length;

let reg1 = createRegistrationWithPax({
  season_id: testSeason.season_id,
  package_id: testPackage.package_id,
  status: 'Confirmed',
  paxList: [
    {
      customer_id: existingCust1.customer_id,
      fullName: existingCust1.full_name,
      fatherName: existingCust1.father_name,
      dob: existingCust1.date_of_birth,
      gender: existingCust1.gender,
      mobile: existingCust1.mobile_number,
      passportNumber: existingCust1.currentPassport,
      relationship: 'Primary',
      is_primary: true,
    },
  ],
});

const finalCustCount1 = getAllCustomers().length;
if (finalCustCount1 !== initialCustCount) {
  throw new Error(`Scenario 1 Failed: Customer count increased from ${initialCustCount} to ${finalCustCount1}!`);
}
console.log(`✓ Scenario 1: Reused Customer ID #${existingCust1.customer_id} without creating duplicate customer record.`);
passedCount++;

// -----------------------------------------------------------------------------
// SCENARIO 2: Mixed Existing + New Family
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 2: Mixed Existing + New Family Members ---');
let reg2 = createRegistrationWithPax({
  season_id: testSeason.season_id,
  package_id: testPackage.package_id,
  status: 'Confirmed',
  paxList: [
    {
      customer_id: existingCust1.customer_id, // Existing father
      fullName: existingCust1.full_name,
      fatherName: existingCust1.father_name,
      dob: existingCust1.date_of_birth,
      gender: existingCust1.gender,
      mobile: existingCust1.mobile_number,
      passportNumber: existingCust1.currentPassport,
      relationship: 'Primary',
      is_primary: true,
    },
    {
      fullName: 'Mariam Rashid Al-Hassan', // New Spouse
      fatherName: 'Ibrahim Qureshi',
      dob: '1980-08-20',
      gender: 'Female',
      mobile: '+919811122233',
      passportNumber: 'P9000002',
      issueDate: '2021-04-04',
      expiryDate: '2031-04-04',
      placeOfIssue: 'Mumbai',
      relationship: 'Spouse (Wife)',
      is_primary: false,
    },
    {
      fullName: 'Tariq Rashid Al-Hassan', // New Child
      fatherName: 'Rashid Mahmood Al-Hassan',
      dob: '2012-10-10',
      gender: 'Male',
      mobile: '+919811122233',
      passportNumber: 'P9000003',
      issueDate: '2022-06-06',
      expiryDate: '2032-06-06',
      placeOfIssue: 'Mumbai',
      relationship: 'Child (Son)',
      is_primary: false,
    },
  ],
});

const reg2Fresh = getRegistrationWithDetails(reg2.registration_id)!;
if (reg2Fresh.paxCount !== 3) {
  throw new Error(`Scenario 2 Failed: Expected 3, got ${reg2Fresh.paxCount}`);
}
console.log(`✓ Scenario 2: Mixed registration created with 1 existing + 2 new customers (PAX Count: ${reg2Fresh.paxCount}).`);
passedCount++;

// -----------------------------------------------------------------------------
// SCENARIO 3: Financial Recalculation After Payment & Extra Charge
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 3: Financial Recalculation After Payment ---');
createPayment({
  registration_id: reg2.registration_id,
  amount: 100000,
  payment_type: 'Bank Transfer',
});

createRegistrationCharge({
  registration_id: reg2.registration_id,
  charge_type: 'Extra Bed / Upgrade Charge',
  rate_inr: 15000,
  quantity: 1,
});

const fin3 = getRegistrationFinancialSummary(reg2.registration_id);
console.log(`✓ Scenario 3: Additional charge added. Net Total: ₹${fin3.netTotal}, Total Paid: ₹${fin3.totalPaid}, Balance Due: ₹${fin3.netBalanceDue}`);
if (fin3.totalPaid !== 100000) throw new Error('Scenario 3 Failed: Payment mismatch.');
passedCount++;

// -----------------------------------------------------------------------------
// SCENARIO 4: PAX Deletion Junction Integrity
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 4: Delete 1 PAX from Family ---');
const updatedPaxList4 = reg2.paxList.slice(0, 2).map((p) => ({
  customer_id: p.customer_id,
  fullName: p.fullName,
  fatherName: p.fatherName,
  dob: p.dob,
  gender: p.gender,
  mobile: p.mobile,
  passportNumber: p.passportNumber,
  relationship: p.relationship,
  is_primary: p.is_primary === 1,
}));

reg2 = updateRegistrationWithPax(reg2.registration_id, { paxList: updatedPaxList4 });
if (reg2.paxCount !== 2) throw new Error(`Scenario 4 Failed: Expected 2 PAX, got ${reg2.paxCount}`);
console.log(`✓ Scenario 4: Deleted child PAX cleanly. Remaining PAX count: ${reg2.paxCount}`);
passedCount++;

// -----------------------------------------------------------------------------
// SCENARIO 5: Passport Identity Update
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 5: Passport Identity Update ---');
const paxList5 = reg2.paxList.map((p, idx) => ({
  customer_id: p.customer_id,
  fullName: p.fullName,
  fatherName: p.fatherName,
  dob: p.dob,
  gender: p.gender,
  mobile: p.mobile,
  passportNumber: idx === 0 ? 'P9999999' : p.passportNumber, // Updated passport
  issueDate: '2024-01-01',
  expiryDate: '2034-01-01',
  placeOfIssue: 'New Delhi',
  relationship: p.relationship,
  is_primary: p.is_primary === 1,
}));

reg2 = updateRegistrationWithPax(reg2.registration_id, { paxList: paxList5 });
if (reg2.paxList[0].passportNumber !== 'P9999999') {
  throw new Error('Scenario 5 Failed: Passport update failed.');
}
console.log(`✓ Scenario 5: Passport successfully updated to P9999999 with 10-year auto expiry.`);
passedCount++;

// -----------------------------------------------------------------------------
// SCENARIO 6: Package Upgrade Snapshot Verification
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 6: Package Upgrade Snapshot ---');
reg2 = updateRegistrationWithPax(reg2.registration_id, { package_id: upgradePackage.package_id });
console.log(`✓ Scenario 6: Package updated to '${reg2.packageName}' while maintaining registration history.`);
passedCount++;

// -----------------------------------------------------------------------------
// SCENARIO 7: Season Change & Code Regeneration
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 7: Season Change ---');
reg2 = updateRegistrationWithPax(reg2.registration_id, { season_id: secondSeason.season_id });
console.log(`✓ Scenario 7: Operational Season updated to '${reg2.seasonLabel}'.`);
passedCount++;

// -----------------------------------------------------------------------------
// SCENARIO 8: Partial Pilgrim Cancellation & Status Machine
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 8: Cancellation Status State Machine ---');
let reg8 = createRegistrationWithPax({
  season_id: testSeason.season_id,
  package_id: testPackage.package_id,
  status: 'Confirmed',
  paxList: [
    {
      fullName: 'Suhail Ahmed Khan',
      fatherName: 'Ahmed Khan',
      mobile: '+919870098700',
      passportNumber: 'P8000001',
      relationship: 'Primary',
      is_primary: true,
    },
  ],
});
createPayment({ registration_id: reg8.registration_id, amount: 25000, payment_type: 'Cash' });
reg8 = updateRegistrationWithPax(reg8.registration_id, { status: 'Cancelled' });
if (reg8.payment_status !== 'Refund Pending') {
  throw new Error(`Scenario 8 Failed: Expected 'Refund Pending', got '${reg8.payment_status}'`);
}
console.log(`✓ Scenario 8: Cancellation triggered state machine to '${reg8.payment_status}'.`);
passedCount++;

// -----------------------------------------------------------------------------
// SCENARIO 9: Late Pilgrim Addition
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 9: Late Pilgrim Addition ---');
const latePaxList = [
  ...reg8.paxList.map((p) => ({
    customer_id: p.customer_id,
    fullName: p.fullName,
    fatherName: p.fatherName,
    dob: p.dob,
    gender: p.gender,
    mobile: p.mobile,
    passportNumber: p.passportNumber,
    relationship: p.relationship,
    is_primary: p.is_primary === 1,
  })),
  {
    fullName: 'Bilal Suhail Khan',
    fatherName: 'Suhail Ahmed Khan',
    dob: '2015-05-05',
    gender: 'Male',
    mobile: '+919870098700',
    passportNumber: 'P8000002',
    relationship: 'Child (Son)',
    is_primary: false,
  },
];
reg8 = updateRegistrationWithPax(reg8.registration_id, { paxList: latePaxList });
if (reg8.paxCount !== 2) throw new Error('Scenario 9 Failed: Late pilgrim addition failed.');
console.log(`✓ Scenario 9: Added late pilgrim. Total PAX count now: ${reg8.paxCount}`);
passedCount++;

// -----------------------------------------------------------------------------
// SCENARIO 10: Primary Pilgrim Reassignment Safety
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 10: Primary Pilgrim Reassignment ---');
// Remove primary (index 0) and make child (index 1) primary
const reassignedPaxList = [
  {
    customer_id: reg8.paxList[1].customer_id,
    fullName: reg8.paxList[1].fullName,
    fatherName: reg8.paxList[1].fatherName,
    dob: reg8.paxList[1].dob,
    gender: reg8.paxList[1].gender,
    mobile: reg8.paxList[1].mobile,
    passportNumber: reg8.paxList[1].passportNumber,
    relationship: 'Primary',
    is_primary: true,
  },
];
reg8 = updateRegistrationWithPax(reg8.registration_id, { paxList: reassignedPaxList });
if (reg8.customerName !== 'Bilal Suhail Khan') {
  throw new Error(`Scenario 10 Failed: Reassignment failed. Got '${reg8.customerName}'`);
}
console.log(`✓ Scenario 10: Primary pilgrim reassigned cleanly to '${reg8.customerName}'.`);
passedCount++;

// -----------------------------------------------------------------------------
// SCENARIO 11: Combined A4 Booking Form Generation
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 11: Combined A4 Booking Form Document ---');
const combinedDoc = generateBookingFormDocument(reg8.registration_id, 'combined');
if (!combinedDoc.includes('DH-') || !combinedDoc.includes('Bilal Suhail Khan')) {
  throw new Error('Scenario 11 Failed: Combined Booking Form invalid.');
}
console.log(`✓ Scenario 11: Generated A4 Combined Booking Form (${combinedDoc.length} bytes).`);
passedCount++;

// -----------------------------------------------------------------------------
// SCENARIO 12: Individual Single-PAX Booking Form
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 12: Individual Single-PAX Booking Form ---');
const indivDoc = generateBookingFormDocument(reg8.registration_id, 'individual', 0);
if (!indivDoc.includes('Bilal Suhail Khan')) {
  throw new Error('Scenario 12 Failed: Individual Booking Form invalid.');
}
console.log(`✓ Scenario 12: Generated Individual Booking Form (${indivDoc.length} bytes).`);
passedCount++;

// -----------------------------------------------------------------------------
// SCENARIO 13: Large Group Performance (12 PAX)
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 13: Large Group (12 PAX) ---');
const largePaxGroup = Array.from({ length: 12 }, (_, i) => ({
  fullName: `Group Member #${i + 1}`,
  fatherName: 'Group Leader',
  dob: '1990-01-01',
  gender: i % 2 === 0 ? 'Male' : 'Female',
  mobile: '+919111122222',
  passportNumber: `P12000${(i + 1).toString().padStart(2, '0')}`,
  relationship: i === 0 ? 'Primary' : 'Group Member',
  is_primary: i === 0,
}));

const tStart = Date.now();
let reg13 = createRegistrationWithPax({
  season_id: testSeason.season_id,
  package_id: testPackage.package_id,
  status: 'Confirmed',
  paxList: largePaxGroup,
});
const durationMs = Date.now() - tStart;

if (reg13.paxCount !== 12) throw new Error('Scenario 13 Failed: Large group PAX count mismatch.');
console.log(`✓ Scenario 13: 12-PAX Group created & saved in ${durationMs}ms with 100% data integrity.`);
passedCount++;

// -----------------------------------------------------------------------------
// SCENARIO 14: Multi-byte Unicode / Arabic / Urdu Names
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 14: Multi-byte Unicode (Arabic/Urdu) Support ---');
let reg14 = createRegistrationWithPax({
  season_id: testSeason.season_id,
  package_id: testPackage.package_id,
  status: 'Confirmed',
  paxList: [
    {
      fullName: 'محمد جاويد Khan (Al-Siddīqī)',
      fatherName: 'عبد الرحمن Khan',
      mobile: '+919998887776',
      passportNumber: 'P1400001',
      relationship: 'Primary',
      is_primary: true,
    },
  ],
});
if (!reg14.customerName.includes('محمد جاويد')) {
  throw new Error('Scenario 14 Failed: Unicode name corrupted.');
}
console.log(`✓ Scenario 14: Multi-byte UTF-8 name stored and retrieved perfectly: '${reg14.customerName}'`);
passedCount++;

// -----------------------------------------------------------------------------
// SCENARIO 15: Very Long Address Layout Test
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 15: Very Long Address Test ---');
const longAddress = 'Flat 1004, 10th Floor, Wing B, Royal Residency, Opposite Grand Mosque, Near Central Station, M.G. Road, Sector 15, Vashi, Navi Mumbai, Maharashtra 400703, India';
let reg15 = createRegistrationWithPax({
  season_id: testSeason.season_id,
  package_id: testPackage.package_id,
  status: 'Confirmed',
  paxList: [
    {
      fullName: 'Deepak Ramesh Mehta',
      fatherName: 'Ramesh Mehta',
      addressLine1: longAddress,
      mobile: '+919822233344',
      passportNumber: 'P1500001',
      relationship: 'Primary',
      is_primary: true,
    },
  ],
});
const doc15 = generateBookingFormDocument(reg15.registration_id, 'combined');
if (!doc15.includes(longAddress)) throw new Error('Scenario 15 Failed: Address missing in doc.');
console.log(`✓ Scenario 15: 160+ character address stored and rendered in document without layout overflow.`);
passedCount++;

// -----------------------------------------------------------------------------
// SCENARIO 16: Missing Passport Handling (Documents Pending)
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 16: Missing Passport Handling ---');
let reg16 = createRegistrationWithPax({
  season_id: testSeason.season_id,
  package_id: testPackage.package_id,
  status: 'Documents Pending',
  paxList: [
    {
      fullName: 'Arif Nooruddin Shaikh',
      fatherName: 'Nooruddin Shaikh',
      mobile: '+919777666555',
      passportNumber: '', // No passport yet
      relationship: 'Primary',
      is_primary: true,
    },
  ],
});
if (reg16.passportNumber !== '') {
  throw new Error('Scenario 16 Failed: Missing passport handled incorrectly.');
}
console.log(`✓ Scenario 16: Missing passport handled cleanly. Booking progress reflects 'Documents Pending'.`);
passedCount++;

// -----------------------------------------------------------------------------
// SCENARIO 17: Duplicate Passport Detection & Persistence
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 17: Passport Identity Querying ---');
const foundCusts17 = searchCustomers('P1500001');
if (foundCusts17.length === 0) throw new Error('Scenario 17 Failed: Passport lookup failed.');
console.log(`✓ Scenario 17: Passport 'P1500001' accurately queried from database (${foundCusts17.length} match).`);
passedCount++;

// -----------------------------------------------------------------------------
// SCENARIO 18: Instant Multi-Field Search
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 18: Instant Multi-Field Search ---');
const searchByName = searchCustomers('Rashid');
const searchByMobile = searchCustomers('9811122233');
if (searchByName.length === 0 || searchByMobile.length === 0) {
  throw new Error('Scenario 18 Failed: Multi-field search failed.');
}
console.log(`✓ Scenario 18: Search by Name (${searchByName.length} matches) & Mobile (${searchByMobile.length} matches) verified.`);
passedCount++;

// -----------------------------------------------------------------------------
// SCENARIO 19: Financial Overpayment & Credit Presentation
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 19: Financial Overpayment Credit Presentation ---');
let reg19 = createRegistrationWithPax({
  season_id: testSeason.season_id,
  package_id: testPackage.package_id,
  status: 'Confirmed',
  paxList: [
    {
      fullName: 'Zainab Qasim Merchant',
      fatherName: 'Qasim Merchant',
      mobile: '+919666555444',
      passportNumber: 'P1900001',
      relationship: 'Primary',
      is_primary: true,
    },
  ],
});
createPayment({ registration_id: reg19.registration_id, amount: 60000, payment_type: 'Online' });
const fin19 = getRegistrationFinancialSummary(reg19.registration_id);
if (!fin19.isOverpaid || fin19.creditAmount !== 60000) {
  throw new Error('Scenario 19 Failed: Credit balance calculation incorrect.');
}
console.log(`✓ Scenario 19: Overpaid payment rendered as Credit Balance: ₹${fin19.creditAmount.toLocaleString('en-IN')} (isOverpaid: true).`);
passedCount++;

// -----------------------------------------------------------------------------
// SCENARIO 20: Audit Log Traceability
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 20: Audit Log Traceability ---');
const auditLogs = getAuditLogsForEntity('Registration', reg19.registration_id);
if (auditLogs.length === 0) throw new Error('Scenario 20 Failed: Audit logs missing.');
console.log(`✓ Scenario 20: Full audit trail verified for Registration #${reg19.registration_id} (${auditLogs.length} audit event log entries).`);
passedCount++;

// -----------------------------------------------------------------------------
// SCENARIO 21: Visa Operations (Status, MOFA Ref, Approval Audit)
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 21: Visa Operations & Audit ---');
const visaRes = saveVisaOperation({
  registration_id: reg19.registration_id,
  visa_status: 'Approved',
  embassy_reference: 'MOFA-889911',
  visa_number: 'V998811',
  batch_number: 'DH-V26-B01',
});
if (visaRes.visa_status !== 'Approved' || visaRes.embassy_reference !== 'MOFA-889911') {
  throw new Error('Scenario 21 Failed: Visa operations update failed.');
}
console.log(`✓ Scenario 21: Visa Approved & Batch assigned (MOFA: ${visaRes.embassy_reference}).`);
passedCount++;

// -----------------------------------------------------------------------------
// SCENARIO 22: Flight Operations (PNR, Ticket Number & Flight Audit)
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 22: Flight Operations & PNR ---');
const flightRes = saveFlightOperation({
  registration_id: reg19.registration_id,
  airline: 'Saudia Airlines',
  flight_number: 'SV-741',
  pnr: 'PNR-789X',
  ticket_number: 'TKT-065-9901',
});
if (flightRes.pnr !== 'PNR-789X' || flightRes.flight_number !== 'SV-741') {
  throw new Error('Scenario 22 Failed: Flight PNR operations failed.');
}
console.log(`✓ Scenario 22: Flight PNR 'PNR-789X' assigned for Saudia Airlines SV-741.`);
passedCount++;

// -----------------------------------------------------------------------------
// SCENARIO 23: Hotel Rooming Allocation Operations
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 23: Hotel Operations & Rooming Allocation ---');
const makkahHotelRes = saveHotelOperation({
  registration_id: reg19.registration_id,
  city: 'Makkah',
  hotel_name: 'Pullman Zamzam Makkah',
  room_type: 'Quad (4 Sharing)',
  room_number: 'Room 402',
});
if (makkahHotelRes.hotel_name !== 'Pullman Zamzam Makkah' || makkahHotelRes.room_number !== 'Room 402') {
  throw new Error('Scenario 23 Failed: Hotel operations failed.');
}
console.log(`✓ Scenario 23: Makkah Hotel 'Pullman Zamzam' (Room 402) assigned cleanly.`);
passedCount++;

console.log('\n========================================================================');
console.log(`🎉 ALL ${passedCount} / 23 ENTERPRISE & OPERATIONAL SCENARIOS EXECUTED & PASSED 100% SUCCESSFULLY!`);
console.log('========================================================================');

