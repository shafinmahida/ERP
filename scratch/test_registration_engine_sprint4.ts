import { getRawDb } from '../src/db/index';
import {
  createRegistrationWithPax,
  updateRegistrationWithPax,
  getRegistrationPaxList,
  getRegistrationWithDetails,
} from '../src/services/registrationService';
import { createSeason, getActiveSeasons, createPackage, getPackagesBySeason } from '../src/services/seasonPackageService';
import { createSeasonType, getAllSeasonTypes } from '../src/services/seasonTypeService';
import { createCustomer } from '../src/services/customerService';

console.log('=== SPRINT 4 REGISTRATION ENGINE & PASSPORT VERIFICATION ===');

const db = getRawDb();

// 1. Ensure Season Type and Season exist
let seasonTypes = getAllSeasonTypes();
if (seasonTypes.length === 0) {
  const st = createSeasonType('HAJJ', 'Hajj Pilgrimage', 'Operator Managed');
  seasonTypes = [st];
}

let seasons = getActiveSeasons();
let seasonId = seasons[0]?.season_id;
if (!seasonId) {
  const s = createSeason(seasonTypes[0].season_type_id, 2026, 'Hajj 2026');
  seasonId = s.season_id;
}

let packages = getPackagesBySeason(seasonId);
let packageId = packages[0]?.package_id;
if (!packageId) {
  const pkg = createPackage(seasonId, 'Executive Deluxe Family Package', '5 Star Hotel + Transport');
  packageId = pkg.package_id;
}

// 2. Create 5 test customers with passport details
console.log('\nStep 1: Creating 5 family customers with passport details...');
const paxInputDataList = [
  {
    is_primary: 1,
    relationship: 'Primary Pilgrim',
    fullName: 'Mohammed Javeed Ahmed Khan',
    fatherName: 'Mohammed Rashid Khan',
    dob: '1982-05-15',
    gender: 'Male',
    nationality: 'Indian',
    mobile: '+919820011111',
    passportNumber: 'Z1234567',
    issueDate: '2020-01-10',
    expiryDate: '2030-01-09',
    placeOfIssue: 'Mumbai',
    addressLine1: 'Flat 101, Crescent Towers',
    addressLine2: 'Bandra West',
    city: 'Mumbai',
    state: 'Maharashtra',
    pinCode: '400050',
  },
  {
    is_primary: 0,
    relationship: 'Spouse (Wife)',
    fullName: 'Fatima Mohammed Javeed Khan',
    fatherName: 'Abdul Rehman Shaikh',
    dob: '1985-08-20',
    gender: 'Female',
    nationality: 'Indian',
    mobile: '+919820011111',
    passportNumber: 'Z2345678',
    issueDate: '2021-03-12',
    expiryDate: '2031-03-11',
    placeOfIssue: 'Mumbai',
    addressLine1: 'Flat 101, Crescent Towers',
    city: 'Mumbai',
    state: 'Maharashtra',
  },
  {
    is_primary: 0,
    relationship: 'Child (Son - 1st Born)',
    fullName: 'Zayd Mohammed Javeed Khan',
    fatherName: 'Mohammed Javeed Ahmed Khan',
    dob: '2010-11-05',
    gender: 'Male',
    nationality: 'Indian',
    mobile: '+919820011111',
    passportNumber: 'Z3456789',
    issueDate: '2022-06-18',
    expiryDate: '2032-06-17',
    placeOfIssue: 'Mumbai',
  },
  {
    is_primary: 0,
    relationship: 'Child (Son - 2nd Born)',
    fullName: 'Tariq Mohammed Javeed Khan',
    fatherName: 'Mohammed Javeed Ahmed Khan',
    dob: '2013-04-12',
    gender: 'Male',
    nationality: 'Indian',
    mobile: '+919820011111',
    passportNumber: 'Z4567890',
    issueDate: '2023-01-05',
    expiryDate: '2033-01-04',
    placeOfIssue: 'Mumbai',
  },
  {
    is_primary: 0,
    relationship: 'Child (Daughter - 3rd Born)',
    fullName: 'Mariam Mohammed Javeed Khan',
    fatherName: 'Mohammed Javeed Ahmed Khan',
    dob: '2017-09-28',
    gender: 'Female',
    nationality: 'Indian',
    mobile: '+919820011111',
    passportNumber: 'Z5678901',
    issueDate: '2024-02-14',
    expiryDate: '2034-02-13',
    placeOfIssue: 'Mumbai',
  },
];

// Link or Create customers
for (const p of paxInputDataList) {
  const cust = createCustomer({
    full_name: p.fullName,
    father_name: p.fatherName,
    date_of_birth: p.dob,
    gender: p.gender,
    nationality: p.nationality,
    mobile_number: p.mobile,
    state: p.state || 'Maharashtra',
    passport_number: p.passportNumber,
    issue_date: p.issueDate,
    expiry_date: p.expiryDate,
    place_of_issue: p.placeOfIssue,
  });
  (p as any).customer_id = cust.customer_id;
}

// 3. Create Registration with 5 PAX
console.log('\nStep 2: Creating Registration with 5 PAX...');
const reg = createRegistrationWithPax({
  season_id: seasonId,
  package_id: packageId,
  status: 'In Progress',
  bookingDate: '2026-07-28',
  representative: 'Farhan Agent',
  paxList: paxInputDataList,
});

console.log(`✓ Registration Created: ID=${reg.registration_id}, Number=${reg.registration_number}`);

// 4. Fetch PAX List and verify passport data persistence
console.log('\nStep 3: Fetching saved PAX list and verifying passport persistence...');
const savedPaxList = getRegistrationPaxList(reg.registration_id);
console.log(`✓ Retrived ${savedPaxList.length} PAX records from DB.`);

let allPassportsValid = true;
savedPaxList.forEach((pax, index) => {
  console.log(
    `  PAX #${index + 1}: ${pax.fullName} | Rel: ${pax.relationship} | Passport: ${pax.passportNumber} | Exp: ${pax.expiryDate}`
  );
  if (!pax.passportNumber || pax.passportNumber === 'N/A') {
    allPassportsValid = false;
  }
});

if (savedPaxList.length === 5 && allPassportsValid) {
  console.log('\n✅ PASS: All 5 PAX and Passport details saved & retrieved perfectly!');
} else {
  console.error('\n❌ FAIL: Pax count or passport details mismatch!');
  process.exit(1);
}

// 5. Test Re-Saving (Update) without losing passport data
console.log('\nStep 4: Testing Re-Saving (Update) to verify no data loss or N/A wipe...');
updateRegistrationWithPax(reg.registration_id, {
  season_id: seasonId,
  package_id: packageId,
  status: 'Confirmed',
  bookingDate: '2026-07-28',
  representative: 'Farhan Agent (Senior)',
  paxList: savedPaxList,
});

const updatedReg = getRegistrationWithDetails(reg.registration_id);
console.log(`✓ Registration Updated. Pax Count=${updatedReg?.paxCount}`);

let updatePassportsValid = true;
updatedReg?.paxList.forEach((pax, index) => {
  console.log(
    `  Updated PAX #${index + 1}: ${pax.fullName} | Passport: ${pax.passportNumber} | Exp: ${pax.expiryDate}`
  );
  if (!pax.passportNumber || pax.passportNumber === 'N/A') {
    updatePassportsValid = false;
  }
});

if (updatedReg?.paxList.length === 5 && updatePassportsValid) {
  console.log('\n✅ SPRINT 4 ALL TESTS PASSED SUCCESSFULLY 🚀');
} else {
  console.error('\n❌ FAIL: Re-save wiped or damaged PAX/Passport data!');
  process.exit(1);
}
