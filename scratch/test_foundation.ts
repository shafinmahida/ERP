import { getRawDb, getDataDirectory } from '../src/db';
import { createSeasonType, getAllSeasonTypes } from '../src/services/seasonTypeService';
import { createCustomer, getAllCustomers, checkForDuplicates } from '../src/services/customerService';
import { getAllSeasons, createSeason, createPackage } from '../src/services/seasonPackageService';
import { createRegistration, getAllRegistrations, updateRegistrationStatus } from '../src/services/registrationService';
import { getAllAuditLogs } from '../src/services/auditService';
import { createBackup, listBackups } from '../src/services/backupService';
import { getDirectoryStats } from '../src/services/settingsService';

async function runTests() {
  console.log('=== STARTING DAYAR-E-HABIB ERP FOUNDATION VERIFICATION (REFINED) ===\n');

  // 1. Data Directory & DB Initialization
  console.log('[1] Checking Data Directory & Database Initialization...');
  const stats = getDirectoryStats();
  console.log(`- Data Directory Path: ${stats.path}`);
  console.log(`- Database Size: ${stats.databaseSize} bytes`);

  // 2. SeasonType Master Table
  console.log('\n[2] Testing SeasonType Master Table Creation...');
  const stHajj = createSeasonType({
    name: 'Hajj',
    code: 'HAJJ',
    description: 'Annual Hajj Season',
    is_active: 1,
  });
  console.log(`- Created SeasonType #${stHajj.season_type_id}: ${stHajj.name} (${stHajj.code})`);

  const stUmrah = createSeasonType({
    name: 'Umrah',
    code: 'UMR',
    description: 'Umrah Pilgrimage Season',
    is_active: 1,
  });
  console.log(`- Created SeasonType #${stUmrah.season_type_id}: ${stUmrah.name} (${stUmrah.code})`);

  // 3. Season & Package Creation (Zero default seeds)
  console.log('\n[3] Testing Season & Package Creation...');
  const season1 = createSeason(stHajj.season_type_id, 2026, 'Hajj 2026');
  console.log(`- Created Season #${season1.season_id}: ${season1.label} (${season1.year}) [Code: ${season1.seasonTypeCode}]`);

  const pkg1 = createPackage(season1.season_id, 'Executive Shifting Hajj Package', '5-Star stay with Azizia shifting.');
  console.log(`- Created Package #${pkg1.package_id}: ${pkg1.name}`);

  // 4. Customer Creation & Identity Status
  console.log('\n[4] Testing Customer Creation & Identity Status...');
  const cust1 = createCustomer({
    full_name: 'Tariq Mehmood Khan',
    father_name: 'Abdul Rehman Khan',
    date_of_birth: '1975-06-15',
    gender: 'Male',
    nationality: 'Pakistani',
    mobile_number: '+923001234567',
    passport_number: 'AB1234567',
    issue_date: '2022-01-10',
    expiry_date: '2032-01-09',
    place_of_issue: 'Islamabad',
  });
  console.log(`- Created Customer #${cust1.customer_id}: ${cust1.full_name} | Active Passport: ${cust1.currentPassport}`);

  const activeId = cust1.identities.find((i) => i.identity_status === 'ACTIVE');
  if (!activeId) {
    throw new Error('FAILED: Customer identity status was not set to ACTIVE!');
  }
  console.log(`- Passport Identity Status: ${activeId.identity_status}`);

  // 5. Duplicate Detection & DATA CONFLICT Verification
  console.log('\n[5] Testing Duplicate Detection & DATA CONFLICT Flagging...');
  // 5a. Exact match
  const exactMatches = checkForDuplicates({
    full_name: 'Tariq Mehmood Khan',
    father_name: 'Abdul Rehman Khan',
    date_of_birth: '1975-06-15',
  });
  console.log(`- Exact Duplicate matches found: ${exactMatches.length} | Score: ${exactMatches[0]?.confidenceScore}% (${exactMatches[0]?.confidenceLevel})`);

  // 5b. Passport match with differing name -> DATA CONFLICT
  console.log('- Running duplicate check for Passport match with differing Name...');
  const conflictMatches = checkForDuplicates({
    full_name: 'Muhammad Imran Khan', // Differing name!
    father_name: 'Abdul Rehman Khan',
    date_of_birth: '1980-01-01',
    passport_number: 'AB1234567', // Same passport as Tariq!
  });

  console.log(`- Mismatched Passport check found ${conflictMatches.length} candidate(s)`);
  if (conflictMatches.length > 0 && conflictMatches[0].isDataConflict) {
    console.log(`  SUCCESSFULLY FLAGGED DATA CONFLICT: ${conflictMatches[0].matchedFields.join(', ')} | Level: ${conflictMatches[0].confidenceLevel}`);
  } else {
    throw new Error('FAILED: Passport match with differing full name was NOT flagged as a DATA CONFLICT!');
  }

  // 6. Registration Creation & 6-Digit Sequence Padding Verification
  console.log('\n[6] Testing Registration Creation & 6-Digit Registration Number...');
  const reg1 = createRegistration({
    customer_id: cust1.customer_id,
    season_id: season1.season_id,
    package_id: pkg1.package_id,
    status: 'Draft',
  });
  console.log(`- Created Registration #${reg1.registration_id} | Reg Number: ${reg1.registration_number}`);

  if (reg1.registration_number !== 'DH-2026-HAJJ-000001') {
    throw new Error(`FAILED: Registration number sequence padding expected DH-2026-HAJJ-000001 but got ${reg1.registration_number}`);
  }
  console.log(`  SUCCESS: Registration number correctly formatted with 6-digit sequence padding!`);

  // 7. Audit Logging Verification
  console.log('\n[7] Verifying Automatic AuditLog Entries...');
  const logs = getAllAuditLogs(20);
  console.log(`- Total AuditLog entries recorded: ${logs.length}`);
  logs.slice(0, 5).forEach((l) => {
    console.log(`  Action: [${l.action}] Entity: ${l.entity_type} (#${l.entity_id}) | Notes: ${l.notes}`);
  });

  if (logs.length === 0) {
    throw new Error('FAILED: No AuditLog entries were automatically created!');
  }

  // 8. Backup Verification (.dhtt archive generation)
  console.log('\n[8] Testing "Backup Now" (.dhtt archive generation)...');
  const backup = await createBackup();
  console.log(`- Backup created: ${backup.filename} (${backup.sizeBytes} bytes)`);

  if (backup.sizeBytes <= 0) {
    throw new Error('FAILED: Backup generated an empty archive!');
  }

  console.log('\n=== ALL REFINED FOUNDATION DIRECTIVE TESTS PASSED CLEANLY! ===');
}

runTests().catch((err) => {
  console.error('\nTEST FAILED WITH ERROR:', err);
  process.exit(1);
});
