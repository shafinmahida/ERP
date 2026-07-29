/**
 * DAYAR-E-HABIB ERP — NEW OCR SYSTEM VALIDATION TEST
 *
 * Tests the complete passport OCR pipeline against the demo Indian passport.
 * Run with: npx tsx scratch/test_new_ocr_pipeline.ts
 *
 * Expected results from demo passport (W4860365):
 *   Passport No : W4860365
 *   DOB         : 2005-03-31
 *   Expiry      : 2032-10-10
 *   Nationality : Indian
 *   Gender      : Male
 */

import { createWorker } from 'tesseract.js';
import { readFileSync } from 'fs';
import { join } from 'path';

// ─── MRZ Checksum (Modulo-10) ─────────────────────────────────────────────────
function calculateMrzChecksum(str: string): number {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    let val = 0;
    if (ch >= '0' && ch <= '9') val = ch.charCodeAt(0) - 48;
    else if (ch >= 'A' && ch <= 'Z') val = ch.charCodeAt(0) - 55;
    else if (ch === '<') val = 0;
    sum += val * weights[i % 3];
  }
  return sum % 10;
}

// ─── MRZ Parser ──────────────────────────────────────────────────────────────
function formatMrzDate(yymmdd: string): string {
  if (!/^\d{6}$/.test(yymmdd)) return yymmdd;
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);
  const currentYY = new Date().getFullYear() % 100;
  const fullYear = yy > currentYY + 20 ? 1900 + yy : 2000 + yy;
  return `${fullYear}-${mm}-${dd}`;
}

function parseMrz(line1: string, line2: string) {
  const l1 = line1.replace(/\s+/g, '').replace(/[^A-Z0-9<]/g, '').padEnd(44, '<').slice(0, 44);
  const l2 = line2.replace(/\s+/g, '').replace(/[^A-Z0-9<]/g, '').padEnd(44, '<').slice(0, 44);

  if (!l1.startsWith('P') || l1.length < 35 || l2.length < 35) return null;

  // Line 1: P<CCC[SURNAME]<<[GIVEN NAMES]<<<...
  const country = l1.slice(2, 5);
  const nameParts = l1.slice(5).split('<<');
  const surname = (nameParts[0] || '').replace(/</g, ' ').trim();
  const givenRaw = (nameParts[1] || '').replace(/</g, ' ').replace(/\s+/g, ' ').trim();
  const fullName = `${givenRaw} ${surname}`.trim();

  // Line 2: [PASS_NO][CHK][COUNTRY][DOB][CHK][SEX][EXPIRY][CHK][OPTIONAL][FINAL_CHK]
  const passNo = l2.slice(0, 9).replace(/</g, '');
  const passChk = parseInt(l2[9], 10);
  const passValid = passChk === calculateMrzChecksum(l2.slice(0, 9));

  const nationality = l2.slice(10, 13);
  const dobStr = l2.slice(13, 19);
  const dobChk = parseInt(l2[19], 10);
  const dobValid = dobChk === calculateMrzChecksum(dobStr);

  const sex = l2[20];
  const gender = sex === 'M' ? 'Male' : sex === 'F' ? 'Female' : 'Other';

  const expStr = l2.slice(21, 27);
  const expChk = parseInt(l2[27], 10);
  const expValid = expChk === calculateMrzChecksum(expStr);

  const mrzValid = passValid && dobValid && expValid;

  return {
    fullName,
    surname,
    givenNames: givenRaw,
    passportNumber: passNo,
    passportNumberValid: passValid,
    country,
    nationality,
    dateOfBirth: formatMrzDate(dobStr),
    dobValid,
    gender,
    expiryDate: formatMrzDate(expStr),
    expiryValid: expValid,
    mrzValid,
    line1: l1,
    line2: l2,
  };
}

// ─── Find MRZ in raw text ─────────────────────────────────────────────────────
function findMrzInText(rawText: string) {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length - 1; i++) {
    const l1 = lines[i].replace(/[^A-Z0-9<]/g, '');
    const l2 = lines[i + 1].replace(/[^A-Z0-9<]/g, '');

    if (l1.length >= 30 && l2.length >= 30) {
      if (l1.startsWith('P') || l1.includes('P<')) {
        const res = parseMrz(l1, l2);
        if (res && res.mrzValid) return res;
      }
    }
  }

  // Fallback: scan raw text for P< pattern
  const upper = rawText.toUpperCase();
  const pIdx = upper.indexOf('P<');
  if (pIdx !== -1) {
    const rest = upper.slice(pIdx).replace(/[^A-Z0-9<\n]/g, '').replace(/\n+/g, '\n');
    const mrzLines = rest.split('\n').filter(l => l.length >= 30);
    if (mrzLines.length >= 2) {
      const res = parseMrz(mrzLines[0], mrzLines[1]);
      if (res) return res;
    }
  }

  return null;
}

// ─── Main Test ────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n===============================================================');
  console.log('  DAYAR-E-HABIB ERP — NEW OCR PIPELINE VALIDATION TEST');
  console.log('===============================================================\n');

  const imagePath = join(
    'C:\\Users\\Asus\\.gemini\\antigravity\\brain\\7950b7cd-69c1-41a4-ac82-125a8fdecb9c\\.user_uploaded\\media__1785166274714.jpg'
  );

  console.log(`📁 Loading passport image: ${imagePath}`);
  const imageBuffer = readFileSync(imagePath);
  const imageBase64 = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
  console.log(`   Image size: ${(imageBuffer.length / 1024).toFixed(1)} KB\n`);

  console.log('🔧 Initializing Tesseract.js worker (eng)...');
  const worker = await createWorker('eng', 1 as any, {
    cacheMethod: 'write' as any,
    gzip: true,
  } as any);
  console.log('   Worker ready.\n');

  // ─── TEST 1: Full image OCR — no whitelist, default PSM ─────────────────────
  console.log('TEST 1: Full image OCR (no whitelist, PSM auto)...');
  await (worker as any).setParameters({ tessedit_char_whitelist: '', tessedit_pageseg_mode: '3' });
  const result1 = await worker.recognize(imageBase64);
  const text1 = result1.data.text || '';
  console.log(`   OCR raw output (first 400 chars):\n   "${text1.slice(0, 400).replace(/\n/g, '\\n')}"`);
  const mrz1 = findMrzInText(text1.toUpperCase());
  console.log(`   MRZ found: ${mrz1 ? '✓ YES' : '✗ NO'}`);
  if (mrz1) {
    console.log(`     Passport No: ${mrz1.passportNumber} (valid: ${mrz1.passportNumberValid})`);
    console.log(`     DOB:         ${mrz1.dateOfBirth} (valid: ${mrz1.dobValid})`);
    console.log(`     Expiry:      ${mrz1.expiryDate} (valid: ${mrz1.expiryValid})`);
    console.log(`     MRZ Valid:   ${mrz1.mrzValid}`);
  }

  // ─── TEST 2: Full image OCR — MRZ whitelist + PSM 6 ─────────────────────────
  console.log('\nTEST 2: Full image OCR (MRZ whitelist, PSM 6)...');
  await (worker as any).setParameters({
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<',
    tessedit_pageseg_mode: '6',
  });
  const result2 = await worker.recognize(imageBase64);
  const text2 = result2.data.text || '';
  console.log(`   OCR raw output (first 400 chars):\n   "${text2.slice(0, 400).replace(/\n/g, '\\n')}"`);
  const mrz2 = findMrzInText(text2.toUpperCase());
  console.log(`   MRZ found: ${mrz2 ? '✓ YES' : '✗ NO'}`);
  if (mrz2) {
    console.log(`     Passport No: ${mrz2.passportNumber} (valid: ${mrz2.passportNumberValid})`);
    console.log(`     DOB:         ${mrz2.dateOfBirth} (valid: ${mrz2.dobValid})`);
    console.log(`     Expiry:      ${mrz2.expiryDate} (valid: ${mrz2.expiryValid})`);
    console.log(`     MRZ Valid:   ${mrz2.mrzValid}`);
    console.log(`     Full Name:   ${mrz2.fullName}`);
  }

  // ─── TEST 3: Check known MRZ checksums ───────────────────────────────────────
  console.log('\nTEST 3: Validating known checksum data from this passport...');
  const p = calculateMrzChecksum('W4860365');
  const d = calculateMrzChecksum('050331');
  const e = calculateMrzChecksum('321010');
  console.log(`   Passport W4860365 check digit: ${p} (expected: 6) ${p === 6 ? '✓' : '✗'}`);
  console.log(`   DOB 050331 check digit:         ${d} (expected: 6) ${d === 6 ? '✓' : '✗'}`);
  console.log(`   Expiry 321010 check digit:      ${e} (expected: 1) ${e === 1 ? '✓' : '✗'}`);

  // ─── TEST 4: Direct parse with known MRZ ─────────────────────────────────────
  console.log('\nTEST 4: Parsing known MRZ lines from this passport...');
  // MRZ Line 1: P<INDBUMEDIA<<MOHAMMED<HAMMAAD<MOHAMMED<JAVE (44 chars, JAVEED truncated)
  // MRZ Line 2: W48603656IND0503316M3210101<<<<<<<<<<<<<<04 (44 chars)
  const knownL1 = 'P<INDBUMEDIA<<MOHAMMED<HAMMAAD<MOHAMMED<JAVE';
  const knownL2 = 'W48603656IND0503316M3210101<<<<<<<<<<<<<<04';
  const parsed = parseMrz(knownL1, knownL2);
  console.log(`   Parse result: ${parsed ? '✓ SUCCESS' : '✗ FAILED'}`);
  if (parsed) {
    console.log(`   Passport No:  ${parsed.passportNumber} ${parsed.passportNumber === 'W4860365' ? '✓' : '✗'}`);
    console.log(`   Nationality:  ${parsed.nationality} ${parsed.nationality === 'IND' ? '✓' : '✗'}`);
    console.log(`   DOB:          ${parsed.dateOfBirth} ${parsed.dateOfBirth === '2005-03-31' ? '✓' : '✗'}`);
    console.log(`   Expiry:       ${parsed.expiryDate} ${parsed.expiryDate === '2032-10-10' ? '✓' : '✗'}`);
    console.log(`   Gender:       ${parsed.gender} ${parsed.gender === 'Male' ? '✓' : '✗'}`);
    console.log(`   Full Name:    ${parsed.fullName} (from MRZ, surname only recovered visually)`);
    console.log(`   MRZ Valid:    ${parsed.mrzValid} ${parsed.mrzValid ? '✓' : '✗'}`);
  }

  await worker.terminate();
  console.log('\n===============================================================');
  console.log('  TEST COMPLETE — See results above for system design decisions.');
  console.log('===============================================================\n');
}

main().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
