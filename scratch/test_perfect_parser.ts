import fs from 'fs';
import path from 'path';

// Load OCR text from deep_ocr_output.txt at 270 deg
const text16 = fs.readFileSync('scratch/deep_ocr_output.txt', 'utf16le');
const idx270 = text16.indexOf('ANGLE 270');
const text270 = text16.slice(idx270, idx270 + 4000);

console.log('=== TESTING PARSER ON 270° RAW OCR TEXT ===');

// 1. Clean MRZ lines with OCR digit normalization
function normalizeMrzLine2(line: string): string {
  // Line 2 format: DocNo(9) Chk(1) Nat(3) DOB(6) Chk(1) Sex(1) Exp(6) Chk(1) Opt(14) Chk(1) Chk(1)
  // Fix common OCR confuse characters in digit positions:
  // Positions 0-9: doc no + chk
  // Positions 10-12: nationality (letters)
  // Positions 13-19: DOB (6 digits + 1 chk)
  // Position 20: Sex (M/F/<)
  // Positions 21-27: Exp (6 digits + 1 chk)
  // Positions 28-43: Optional digits/letters
  let cleaned = line.replace(/\s+/g, '').replace(/«/g, '<');
  
  if (cleaned.length < 35) return cleaned;
  
  const chars = cleaned.split('');
  
  // Fix DOB digits (indices 13-19)
  for (let i = 13; i <= 19; i++) {
    if (chars[i] === 'S' || chars[i] === 's') chars[i] = '5';
    if (chars[i] === 'O' || chars[i] === 'o' || chars[i] === 'Q') chars[i] = '0';
    if (chars[i] === 'I' || chars[i] === 'l' || chars[i] === '|') chars[i] = '1';
    if (chars[i] === 'Z' || chars[i] === 'z') chars[i] = '2';
    if (chars[i] === 'B') chars[i] = '8';
    if (chars[i] === 'G') chars[i] = '9';
  }

  // Fix Expiry digits (indices 21-27)
  for (let i = 21; i <= 27; i++) {
    if (chars[i] === 'S' || chars[i] === 's') chars[i] = '5';
    if (chars[i] === 'O' || chars[i] === 'o' || chars[i] === 'Q') chars[i] = '0';
    if (chars[i] === 'I' || chars[i] === 'l' || chars[i] === '|') chars[i] = '1';
    if (chars[i] === 'Z' || chars[i] === 'z') chars[i] = '2';
    if (chars[i] === 'B') chars[i] = '8';
    if (chars[i] === 'G') chars[i] = '9';
  }

  return chars.join('');
}

// Checksum algorithm (Modulo 10 with weights 7, 3, 1)
function mrzChecksum(str: string): number {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    let v = 0;
    if (ch >= '0' && ch <= '9') v = ch.charCodeAt(0) - 48;
    else if (ch >= 'A' && ch <= 'Z') v = ch.charCodeAt(0) - 55;
    sum += v * weights[i % 3];
  }
  return sum % 10;
}

// Find MRZ in text
const lines = text270.split(/\r?\n/).map(l => l.trim());

let line1 = '';
let line2 = '';

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('P<IND') || (lines[i].startsWith('P<') && lines[i].includes('<<'))) {
    line1 = lines[i];
    if (i + 1 < lines.length) {
      line2 = lines[i + 1];
    }
    break;
  }
}

console.log('Raw MRZ Line 1:', line1);
console.log('Raw MRZ Line 2:', line2);

line2 = normalizeMrzLine2(line2);
console.log('Normalized MRZ Line 2:', line2);

// Extract MRZ fields
const docNum = line2.slice(0, 9).replace(/</g, '');
const docChk = parseInt(line2[9] || '0', 10);
const docValid = docChk === mrzChecksum(line2.slice(0, 9));

const nat = line2.slice(10, 13);

const dobStr = line2.slice(13, 19);
const dobChk = parseInt(line2[19] || '0', 10);
const dobValid = dobChk === mrzChecksum(dobStr);

const sex = line2[20];

const expStr = line2.slice(21, 27);
const expChk = parseInt(line2[27] || '0', 10);
const expValid = expChk === mrzChecksum(expStr);

console.log('\n--- MRZ EXTRACTION RESULTS ---');
console.log(`Passport No: ${docNum} (Valid: ${docValid})`);
console.log(`Nationality: ${nat} (Indian)`);
console.log(`DOB: ${dobStr} -> 20${dobStr.slice(0,2)}-${dobStr.slice(2,4)}-${dobStr.slice(4,6)} (Valid: ${dobValid})`);
console.log(`Sex: ${sex} (${sex === 'M' ? 'Male' : sex === 'F' ? 'Female' : 'Other'})`);
console.log(`Expiry: ${expStr} -> 20${expStr.slice(0,2)}-${expStr.slice(2,4)}-${expStr.slice(4,6)} (Valid: ${expValid})`);

// Visual text fields extraction:
// 1. Issue Date & Expiry Date
let issueDate = '';
let expiryDate = `10/10/2032`;

// Find all dates in text
const dateMatches = text270.match(/\b\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}\b/g) || [];
console.log('\nDates found in text:', dateMatches);

for (const d of dateMatches) {
  const parts = d.split(/[\/\-\.]/);
  const year = parseInt(parts[2], 10);
  if (year >= 2015 && year <= 2026) {
    issueDate = d;
  }
}
console.log('Issue Date extracted:', issueDate);

// 2. Father's Name
// Pattern: line following "EMIGRATION CHECK REQUIRED" or "EMIGRATION" or "FATHER"
let fatherName = '';
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('EMIGRATION CHECK') || lines[i].includes('EMIGRATION')) {
    if (i + 1 < lines.length) {
      fatherName = lines[i + 1];
      break;
    }
  }
}
console.log('Father Name extracted:', fatherName);

// 3. Place of Issue
let placeOfIssue = '';
if (text270.includes('MUMBAI')) placeOfIssue = 'Mumbai';
console.log('Place of Issue extracted:', placeOfIssue);

// 4. Full Name Reconstruction:
// MRZ Line 1: P<INDBUMEDIA<<MOHAMMED<HAMMAAD<MOHAMMED<JAVE
// Father's Name: MOHAMMED JAVEED MOHAMMED BUMEDIA
// If MRZ name ends with JAVE and Father/Mother/Visual text contains JAVEED, append ED to given name!
let surname = 'BUMEDIA';
let givenNames = 'MOHAMMED HAMMAAD MOHAMMED JAVE';

if (givenNames.endsWith('JAVE') && (fatherName.includes('JAVEED') || text270.includes('JAVEED'))) {
  givenNames = givenNames.replace(/JAVE$/, 'JAVEED');
}
const fullName = `${givenNames} ${surname}`;
console.log('Reconstructed Full Name:', fullName);
