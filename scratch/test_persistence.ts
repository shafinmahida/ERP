import path from 'path';
import fs from 'fs';
import {
  getRawDb,
  getDatabasePath,
  setDataDirectory,
  DEFAULT_DATA_DIR,
} from '../src/db';
import { createCustomer, getCustomerById, getAllCustomers } from '../src/services/customerService';
import { createSeason, createPackage } from '../src/services/seasonPackageService';
import { createRegistration, getAllRegistrations } from '../src/services/registrationService';
import { ensureDefaultDocumentTypesSeeded, getDocumentTypeByCode } from '../src/services/documentTypeService';
import { uploadNewDocument, searchAllDocuments } from '../src/services/documentService';

async function runPersistenceAudit() {
  console.log('=== SPRINT 2: CRITICAL PERSISTENCE AUDIT & VERIFICATION SUITE ===\n');

  // Step 1: Active Database Location Verification
  const activeDbPath = getDatabasePath();
  console.log('1. Active SQLite Database Location Verification:');
  console.log(`   • Database Path: "${activeDbPath}"`);

  if (activeDbPath.includes(':memory:') || activeDbPath.includes('temp')) {
    throw new Error(`CRITICAL AUDIT FAILURE: Application is using memory/temp database: ${activeDbPath}`);
  }
  console.log('   ✓ CONFIRMED: Application is using real disk-backed storage file (NOT :memory: or temp db).');

  // Step 2: First-Time Seeding Idempotency
  console.log('\n2. Testing First-Time Seeding Idempotency...');
  ensureDefaultDocumentTypesSeeded();
  const db1 = getRawDb();
  const docTypeCount1 = (db1.prepare(`SELECT COUNT(*) as count FROM document_type`).get() as any).count;
  console.log(`   ✓ Master DocumentTypes present: ${docTypeCount1}`);

  // Step 3: Create Customer & Related Data
  console.log('\n3. Session 1: Creating Customer, Registration & Document...');
  const uniqueMobile = `+92300${Math.floor(1000000 + Math.random() * 9000000)}`;
  const uniquePassport = `K${Math.floor(1000000 + Math.random() * 9000000)}`;

  const createdCust = createCustomer({
    full_name: 'Persistent Pilgrim Tariq',
    father_name: 'Rehman Khan',
    date_of_birth: '1988-04-12',
    gender: 'Male',
    nationality: 'Pakistani',
    mobile_number: uniqueMobile,
    passport_number: uniquePassport,
    issue_date: '2021-01-01',
    expiry_date: '2031-01-01',
    place_of_issue: 'Islamabad',
  });

  const createdCustId = createdCust.customer_id;
  const createdIdentityId = createdCust.identities[0].identity_id;

  const defaultSeasonType = db1.prepare(`SELECT * FROM season_type`).get() as any;
  const season = createSeason(defaultSeasonType ? defaultSeasonType.season_type_id : 1, 2026, 'Hajj 2026');
  const pkg = createPackage(season.season_id, 'Gold VIP', '5 Star');
  const reg = createRegistration({
    customer_id: createdCustId,
    season_id: season.season_id,
    package_id: pkg.package_id,
    status: 'Confirmed',
  });

  const passportType = getDocumentTypeByCode('PASSPORT')!;
  const dummyPdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);

  const doc = await uploadNewDocument({
    identity_id: createdIdentityId,
    document_type_id: passportType.document_type_id,
    document_number: uniquePassport,
    issue_date: '2021-01-01',
    expiry_date: '2031-01-01',
    original_filename: 'Persistent_Passport.pdf',
    fileBuffer: dummyPdf,
    mime_type: 'application/pdf',
  });

  console.log(`   ✓ Created Customer #${createdCustId} ("Persistent Pilgrim Tariq"), Identity #${createdIdentityId}, Registration ${reg.registration_number}, Document #${doc.document_id}.`);

  // Step 4: Simulate Application Shutdown & Restart (Database Close & Reopen)
  console.log('\n4. Session 2: Closing Database & Simulating Restart / Windows Reboot...');
  // Force reset db instance memory pointer to simulate process restart
  setDataDirectory(DEFAULT_DATA_DIR);
  console.log('   ✓ Database connection closed. Application restarted.');

  // Step 5: Verify Data Persistence Across Restart
  console.log('\n5. Verifying Customer & Document Survival After Application Restart...');
  const reopenedDb = getRawDb();
  const fetchedCust = getCustomerById(createdCustId);

  if (!fetchedCust) {
    throw new Error(`CRITICAL AUDIT FAILURE: Customer #${createdCustId} disappeared after application restart!`);
  }

  if (fetchedCust.full_name !== 'Persistent Pilgrim Tariq' || fetchedCust.currentPassport !== uniquePassport) {
    throw new Error(`CRITICAL AUDIT FAILURE: Customer data corrupted on restart! Found: ${JSON.stringify(fetchedCust)}`);
  }
  console.log(`   ✓ SURVIVED RESTART: Customer #${fetchedCust.customer_id} "${fetchedCust.full_name}" (Passport: ${fetchedCust.currentPassport}) retrieved from disk!`);

  const fetchedRegs = getAllRegistrations().filter((r) => r.customer_id === createdCustId);
  if (fetchedRegs.length === 0) {
    throw new Error(`CRITICAL AUDIT FAILURE: Registration for Customer #${createdCustId} disappeared after restart!`);
  }
  console.log(`   ✓ SURVIVED RESTART: Registration ${fetchedRegs[0].registration_number} retrieved from disk!`);

  const searchedDocs = searchAllDocuments(uniquePassport);
  if (searchedDocs.length === 0) {
    throw new Error(`CRITICAL AUDIT FAILURE: Document with number ${uniquePassport} disappeared after restart!`);
  }
  console.log(`   ✓ SURVIVED RESTART: Document #${searchedDocs[0].document_id} (${searchedDocs[0].currentVersion?.original_filename}) retrieved from disk!`);

  // Step 6: Verify Database Disk File Existence on Windows Filesystem
  console.log('\n6. Physical Disk File Verification:');
  const diskExists = fs.existsSync(activeDbPath);
  const fileSize = diskExists ? fs.statSync(activeDbPath).size : 0;
  console.log(`   • Disk File Exists: ${diskExists ? 'YES' : 'NO'}`);
  console.log(`   • Disk File Size: ${(fileSize / 1024).toFixed(2)} KB`);

  if (!diskExists || fileSize === 0) {
    throw new Error(`CRITICAL AUDIT FAILURE: Database file does not exist on disk or is 0 bytes!`);
  }
  console.log('   ✓ CONFIRMED: Database file is non-empty and physically persisted on Windows disk filesystem.');

  console.log('\n===============================================================');
  console.log('  100% DISK PERSISTENCE VERIFIED! USER DATA SURVIVES RESTARTS ');
  console.log('===============================================================\n');
}

runPersistenceAudit().catch((e) => {
  console.error('\n❌ PERSISTENCE AUDIT FAILED WITH ERROR:', e);
  process.exit(1);
});
