import fs from 'fs';
import path from 'path';
import { getRawDb, getDatabasePath, setDataDirectory, DEFAULT_DATA_DIR } from '../src/db';
import { createCustomer, getCustomerById, getAllCustomers } from '../src/services/customerService';
import { createSeason, createPackage } from '../src/services/seasonPackageService';
import { createRegistration, getAllRegistrations, updateRegistrationStatus } from '../src/services/registrationService';
import { ensureDefaultDocumentTypesSeeded, getDocumentTypeByCode, getAllDocumentTypes } from '../src/services/documentTypeService';
import { uploadNewDocument, uploadReplacementVersion, restorePreviousVersion, searchAllDocuments, getDocumentById } from '../src/services/documentService';
import { createBackup } from '../src/services/backupService';
import { getAllAuditLogs } from '../src/services/auditService';
import { runFullStartupDiagnostic } from '../src/services/startupService';
import { runOfflineOcr } from '../src/services/ocr/ocrEngine';

async function runStabilizationTestSuite() {
  console.log('=== SPRINT 2: CRITICAL STABILIZATION & RECOVERY TEST SUITE ===\n');

  // Step 1: Startup Diagnostic Timeline Execution
  console.log('1. Testing System Startup Diagnostic Pipeline...');
  const startupResult = runFullStartupDiagnostic();
  if (!startupResult.success) {
    throw new Error('FAILED: Startup diagnostic pipeline failed!');
  }
  console.log(`   ✓ Startup pipeline executed successfully (${startupResult.logs.length} stages logged).`);

  // Step 2: Database Storage Path Verification
  console.log('\n2. Testing Single Active Database Storage Path...');
  const activePath = getDatabasePath();
  console.log(`   • Active Database: "${activePath}"`);
  if (!activePath.endsWith('database.db')) {
    throw new Error(`FAILED: Invalid active database path: ${activePath}`);
  }
  console.log('   ✓ Single active database path verified.');

  // Step 3: Sprint 1 Regression Verification (Customers, Registrations, Backup, Audit)
  console.log('\n3. Regression Verification — Sprint 1 Modules...');
  const uniqueMobile = `+92300${Math.floor(1000000 + Math.random() * 9000000)}`;
  const uniquePassport = `M${Math.floor(1000000 + Math.random() * 9000000)}`;

  const cust = createCustomer({
    full_name: 'Stabilization Pilgrim Tariq',
    father_name: 'Abdul Rehman',
    date_of_birth: '1990-05-15',
    gender: 'Male',
    nationality: 'Pakistani',
    mobile_number: uniqueMobile,
    passport_number: uniquePassport,
    issue_date: '2021-01-01',
    expiry_date: '2031-01-01',
    place_of_issue: 'Karachi',
  });

  const db = getRawDb();
  const defaultSeasonType = db.prepare(`SELECT * FROM season_type`).get() as any;
  const season = createSeason(defaultSeasonType ? defaultSeasonType.season_type_id : 1, 2026, 'Umrah 2026');
  const pkg = createPackage(season.season_id, 'Executive 5 Star', 'Umrah Package');

  const reg = createRegistration({
    customer_id: cust.customer_id,
    season_id: season.season_id,
    package_id: pkg.package_id,
    status: 'Draft',
  });

  const updatedReg = updateRegistrationStatus(reg.registration_id, 'Confirmed');
  if (updatedReg.status !== 'Confirmed') {
    throw new Error('FAILED: Sprint 1 Registration status update failed!');
  }

  const backup = await createBackup();
  const auditLogs = getAllAuditLogs(10);
  if (auditLogs.length === 0) {
    throw new Error('FAILED: Sprint 1 Audit logging failed!');
  }
  console.log(`   ✓ Sprint 1 verified: Customer #${cust.customer_id}, Reg #${reg.registration_id} (Confirmed), Backup: ${backup.filename}, Audits: ${auditLogs.length}`);

  // Step 4: Sprint 2 Regression Verification (Document Types, Versioning, OCR)
  console.log('\n4. Regression Verification — Sprint 2 Modules...');
  ensureDefaultDocumentTypesSeeded();
  const docTypes = getAllDocumentTypes();
  const visaType = getDocumentTypeByCode('VISA')!;
  const dummyPdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);

  const doc = await uploadNewDocument({
    registration_id: reg.registration_id,
    document_type_id: visaType.document_type_id,
    document_number: 'V99887766',
    issue_date: '2026-01-01',
    expiry_date: '2026-12-31',
    original_filename: 'Saudi_Visa_Scan.pdf',
    fileBuffer: dummyPdf,
    mime_type: 'application/pdf',
  });

  const v2Doc = await uploadReplacementVersion(
    doc.document_id,
    'Saudi_Visa_v2.pdf',
    new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35]),
    'application/pdf',
    'Updated visa stamp'
  );

  const restoredDoc = await restorePreviousVersion(doc.document_id, doc.versions[0].version_id);
  if (restoredDoc.versions.length !== 3) {
    throw new Error('FAILED: Sprint 2 Append-only restoration failed!');
  }

  const validPngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const ocrOutput = await runOfflineOcr(validPngDataUrl);
  if (!ocrOutput.engineName) {
    throw new Error('FAILED: Sprint 2 OCR engine execution failed!');
  }
  console.log(`   ✓ Sprint 2 verified: Document #${doc.document_id} (${docTypes.length} types), ${restoredDoc.versions.length} versions restored append-only, OCR via ${ocrOutput.engineName}`);


  // Step 5: Persistent Storage Survival Verification Across Restart
  console.log('\n5. Verifying Persistent Storage Survival Across Restart...');
  console.log(`   • Target Customer ID to retrieve: #${cust.customer_id}`);
  setDataDirectory(DEFAULT_DATA_DIR); // Close connection pointer
  const reopenedDb = getRawDb();

  const allCusts = getAllCustomers();
  console.log(`   • Total Customers in DB after restart: ${allCusts.length} -> IDs: [${allCusts.map((c) => c.customer_id).join(', ')}]`);

  const fetchedCust = getCustomerById(cust.customer_id);
  if (!fetchedCust) {
    throw new Error(`FAILED: Customer #${cust.customer_id} lost after database restart! Found IDs: ${allCusts.map((c) => c.customer_id).join(', ')}`);
  }


  const fetchedDoc = getDocumentById(doc.document_id);
  if (!fetchedDoc || fetchedDoc.document_number !== 'V99887766') {
    throw new Error('FAILED: Document metadata lost after database restart!');
  }
  console.log(`   ✓ SURVIVED RESTART: Customer #${fetchedCust.customer_id} & Document #${fetchedDoc.document_id} retrieved intact from disk.`);

  console.log('\n===============================================================');
  console.log('  ALL STABILIZATION & REGRESSION TESTS PASSED! (100%) ');
  console.log('===============================================================\n');
}

runStabilizationTestSuite().catch((e) => {
  console.error('\n❌ STABILIZATION TEST SUITE FAILED WITH ERROR:', e);
  process.exit(1);
});
