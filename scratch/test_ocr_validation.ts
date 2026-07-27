import {
  parseTd3MrzLines,
  calculateMrzChecksum,
  extractPassportMrzFromText,
  extractVisualPassportFields,
  getConfidenceTier,
} from '../src/services/ocr/mrzParser';
import { runOfflineOcr } from '../src/services/ocr/ocrEngine';
import { processPassportScan } from '../src/services/ocr/fieldExtractor';

async function runOcrValidationTestSuite() {
  console.log('==================================================================');
  console.log('  DAYAR-E-HABIB ERP — OCR & MRZ ENGINE VALIDATION SPRINT (TEST) ');
  console.log('==================================================================\n');

  // Test 1: Verify Zero Mock Data Production Safety
  console.log('1. Verifying Zero Mock Data Rule (Empty / Unreadable input)...');
  const emptyOcr = await runOfflineOcr('');
  if (emptyOcr.rawText !== '' || emptyOcr.lines.length !== 0 || emptyOcr.averageConfidence !== 0) {
    throw new Error('FAILED: Engine returned non-empty text or non-zero confidence for empty image!');
  }
  console.log('   ✓ PASSED: Empty/unreadable image returned 0% confidence and 0 mock fields.');

  // Test 2: Modulo-10 Checksum Algorithm Verification
  console.log('\n2. Verifying TD3 MRZ Modulo-10 Checksum Algorithm...');
  // Test case: Passport Number "W4860365"
  // Weights [7, 3, 1]: W(32)*7 + 4*3 + 8*1 + 6*7 + 0*3 + 3*1 + 6*7 + 5*3 = 224 + 12 + 8 + 42 + 0 + 3 + 42 + 15 = 346. 346 % 10 = 6.
  const passNum = 'W4860365';
  const passCheck = calculateMrzChecksum(passNum);
  console.log(`   • Checksum for Passport Number "${passNum}" -> Output Check Digit: ${passCheck}`);
  if (passCheck !== 6) {
    throw new Error(`FAILED: Incorrect checksum output for ${passNum}: Expected 6, got ${passCheck}`);
  }

  // DOB "050331" (31/03/2005)
  // 0*7 + 5*3 + 0*1 + 3*7 + 3*3 + 1*1 = 0 + 15 + 0 + 21 + 9 + 1 = 46. 46 % 10 = 6.
  const dobStr = '050331';
  const dobCheck = calculateMrzChecksum(dobStr);
  console.log(`   • Checksum for DOB "${dobStr}" (31/03/2005) -> Output Check Digit: ${dobCheck}`);
  if (dobCheck !== 6) {
    throw new Error(`FAILED: Incorrect checksum output for DOB ${dobStr}: Expected 6, got ${dobCheck}`);
  }

  // Expiry "321010" (10/10/2032)
  // 3*7 + 2*3 + 1*1 + 0*7 + 1*3 + 0*1 = 21 + 6 + 1 + 0 + 3 + 0 = 31. 31 % 10 = 1.
  const expStr = '321010';
  const expCheck = calculateMrzChecksum(expStr);
  console.log(`   • Checksum for Expiry "${expStr}" (10/10/2032) -> Output Check Digit: ${expCheck}`);
  if (expCheck !== 1) {
    throw new Error(`FAILED: Incorrect checksum output for Expiry ${expStr}: Expected 1, got ${expCheck}`);
  }
  console.log('   ✓ PASSED: Modulo-10 Checksum Algorithm verified 100%.');

  // Test 3: Real Indian Passport MRZ Extraction Test
  // Supplied Passport: W4860365, Indian (IND), DOB: 31/03/2005 (050331), Expiry: 10/10/2032 (321010), Name: SHARMA<<PRIYA
  console.log('\n3. Verifying Real Indian Passport Sample Scan Parsing...');
  const mrzLine1 = 'P<INDSHARMA<<PRIYA<<<<<<<<<<<<<<<<<<<<<<<<<<';
  const mrzLine2 = 'W4860365<6IND0503316F3210101<<<<<<<<<<<<<<<0';

  const parsedIndian = parseTd3MrzLines(mrzLine1, mrzLine2);

  if (!parsedIndian) {
    throw new Error('FAILED: Unable to parse Indian Passport MRZ lines!');
  }

  console.log(`   • Passport Number : "${parsedIndian.passport_number.value}" (Score: ${parsedIndian.passport_number.score}%)`);
  console.log(`   • Nationality     : "${parsedIndian.nationality.value}" (Score: ${parsedIndian.nationality.score}%)`);
  console.log(`   • Date of Birth   : "${parsedIndian.date_of_birth.value}" (Score: ${parsedIndian.date_of_birth.score}%)`);
  console.log(`   • Gender          : "${parsedIndian.gender.value}" (Score: ${parsedIndian.gender.score}%)`);
  console.log(`   • Expiry Date     : "${parsedIndian.expiry_date.value}" (Score: ${parsedIndian.expiry_date.score}%)`);
  console.log(`   • Full Name       : "${parsedIndian.full_name.value}" (Score: ${parsedIndian.full_name.score}%)`);

  if (parsedIndian.passport_number.value !== 'W4860365') {
    throw new Error(`FAILED: Passport Number mismatch! Expected W4860365, got ${parsedIndian.passport_number.value}`);
  }
  if (parsedIndian.nationality.value !== 'Indian') {
    throw new Error(`FAILED: Nationality mismatch! Expected Indian, got ${parsedIndian.nationality.value}`);
  }
  if (parsedIndian.date_of_birth.value !== '2005-03-31') {
    throw new Error(`FAILED: DOB mismatch! Expected 2005-03-31, got ${parsedIndian.date_of_birth.value}`);
  }
  if (parsedIndian.expiry_date.value !== '2032-10-10') {
    throw new Error(`FAILED: Expiry mismatch! Expected 2032-10-10, got ${parsedIndian.expiry_date.value}`);
  }
  if (parsedIndian.full_name.value !== 'PRIYA SHARMA') {
    throw new Error(`FAILED: Name mismatch! Expected PRIYA SHARMA, got ${parsedIndian.full_name.value}`);
  }
  if (!parsedIndian.mrzValid) {
    throw new Error('FAILED: MRZ validation returned false when all checksums passed!');
  }
  console.log('   ✓ PASSED: Real Indian Passport extracted with 100% field precision.');

  // Test 4: Verification of Confidence Capping Rules
  console.log('\n4. Verifying Confidence Capping Rules (Corrupted Checksum)...');
  const corruptMrzLine2 = 'W4860365<9IND0503316F3210101<<<<<<<<<<<<<<<0'; // Check digit changed from 6 to 9
  const parsedCorrupt = parseTd3MrzLines(mrzLine1, corruptMrzLine2);

  if (!parsedCorrupt) {
    throw new Error('FAILED: Unable to parse corrupt MRZ lines!');
  }

  console.log(`   • Corrupt Passport Number Score: ${parsedCorrupt.passport_number.score}% (${parsedCorrupt.passport_number.tier})`);
  console.log(`   • Overall Document Confidence Score: ${parsedCorrupt.overallConfidenceScore}% (${parsedCorrupt.overallConfidenceTier})`);

  if (parsedCorrupt.passport_number.score > 45) {
    throw new Error(`FAILED: Corrupt check digit was assigned high score (${parsedCorrupt.passport_number.score}%)! Must be capped at 45%!`);
  }
  if (parsedCorrupt.overallConfidenceScore > 45) {
    throw new Error(`FAILED: Document with corrupt check digit received overall confidence > 45%!`);
  }
  console.log('   ✓ PASSED: Corrupted checksum correctly capped confidence at 45% (Low).');

  console.log('\n==================================================================');
  console.log('  ALL OCR & MRZ ENGINE VALIDATION TESTS PASSED CLEANLY! (100%) ');
  console.log('==================================================================\n');
}

runOcrValidationTestSuite().catch((e) => {
  console.error('\n❌ OCR VALIDATION TEST FAILED:', e);
  process.exit(1);
});
