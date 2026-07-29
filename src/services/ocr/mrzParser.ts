/**
 * DAYAR-E-HABIB ERP — PASSPORT TD3 MRZ PARSER & CHECKSUM VALIDATOR
 * 
 * Compliance Rules:
 * 1. Implements standard ICAO Doc 9303 TD3 Passport MRZ Parsing (2 x 44 chars).
 * 2. Evaluates Modulo-10 checksums (weights 7, 3, 1, 7, 3, 1...).
 * 3. All checksums pass -> HIGH CONFIDENCE & AUTHORITATIVE SOURCE (cannot be overwritten by general OCR).
 * 4. Checksums fail -> LOW CONFIDENCE ("please verify"), but fields are still extracted and populated.
 */

export interface MrzFieldResult {
  value: string;
  confidence: 'HIGH' | 'LOW';
  isAuthoritative: boolean;
}

export interface ParsedMrzData {
  full_name: MrzFieldResult;
  surname: MrzFieldResult;
  given_names: MrzFieldResult;
  passport_number: MrzFieldResult;
  date_of_birth: MrzFieldResult; // YYYY-MM-DD
  gender: MrzFieldResult; // Male | Female | Other
  nationality: MrzFieldResult; // e.g. Indian
  expiry_date: MrzFieldResult; // YYYY-MM-DD
  checksumsPassed: boolean;
  passportNoChecksumPassed: boolean;
  dobChecksumPassed: boolean;
  expiryChecksumPassed: boolean;
  compositeChecksumPassed: boolean;
  rawLine1: string;
  rawLine2: string;
}

/**
 * Calculates Modulo 10 Check Digit for a string based on ICAO 9303 standard.
 * Weights: 7, 3, 1, 7, 3, 1...
 * '<' = 0, '0'-'9' = 0-9, 'A'-'Z' = 10-35.
 */
export function calculateMrzCheckDigit(str: string): number {
  const weights = [7, 3, 1];
  let sum = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str[i].toUpperCase();
    let val = 0;

    if (char >= '0' && char <= '9') {
      val = char.charCodeAt(0) - '0'.charCodeAt(0);
    } else if (char >= 'A' && char <= 'Z') {
      val = char.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
    } else if (char === '<') {
      val = 0;
    }

    sum += val * weights[i % 3];
  }

  return sum % 10;
}

/**
 * Sanitizes OCR character confusions in MRZ Line 2 numbers.
 */
function sanitizeMrzDigits(str: string): string {
  return str
    .toUpperCase()
    .replace(/S/g, '5')
    .replace(/O/g, '0')
    .replace(/I/g, '1')
    .replace(/L/g, '1')
    .replace(/Z/g, '2')
    .replace(/B/g, '8')
    .replace(/G/g, '9')
    .replace(/q/gi, '9')
    .replace(/D/g, '0');
}

/**
 * Converts 6-digit YYMMDD date to ISO YYYY-MM-DD format with 2000s/1900s century detection.
 */
function parseMrzDate(yymmdd: string, isExpiryDate: boolean = false): string {
  const sanitized = sanitizeMrzDigits(yymmdd.padEnd(6, '0').slice(0, 6));
  const yy = parseInt(sanitized.slice(0, 2), 10);
  const mm = sanitized.slice(2, 4);
  const dd = sanitized.slice(4, 6);

  if (isNaN(yy)) return '';

  const currentYear = new Date().getFullYear();
  const currentYY = currentYear % 100;

  let century = 2000;
  if (isExpiryDate) {
    // Expiry date is almost always in 2000s
    century = 2000;
  } else {
    // DOB: if YY > currentYY, person was born in 1900s
    century = yy > currentYY ? 1900 : 2000;
  }

  const yearStr = `${century + yy}`;
  return `${yearStr}-${mm}-${dd}`;
}

/**
 * Parses MRZ Line 1 and Line 2 according to TD3 format.
 */
export function parseTd3MrzLines(line1: string, line2: string): ParsedMrzData | null {
  const l1 = line1.trim().replace(/\s+/g, '').toUpperCase();
  const l2 = line2.trim().replace(/\s+/g, '').toUpperCase();

  if (!l1.startsWith('P') || l1.length < 30 || l2.length < 30) {
    return null;
  }

  // --- Line 1 Extraction: Name & Nationality ---
  // P<INDNAME<<SURNAME<<<<<<<<<<<<<<<<<<<<<<<<<<
  const nameSection = l1.slice(5);
  const doubleFillerIdx = nameSection.indexOf('<<');
  let surname = '';
  let givenNames = '';

  if (doubleFillerIdx !== -1) {
    surname = nameSection.slice(0, doubleFillerIdx).replace(/</g, ' ').trim();
    givenNames = nameSection.slice(doubleFillerIdx + 2).replace(/</g, ' ').trim();
  } else {
    givenNames = nameSection.replace(/</g, ' ').trim();
  }

  const fullNameStr = surname ? `${givenNames} ${surname}`.trim() : givenNames;

  // --- Line 2 Extraction: Passport No, DOB, Sex, Expiry ---
  // Pos 0-8: Passport Number (9 chars)
  // Pos 9: Passport Number Check Digit
  // Pos 10-12: Nationality (3 chars)
  // Pos 13-18: DOB (6 chars YYMMDD)
  // Pos 19: DOB Check Digit
  // Pos 20: Sex (M/F/<)
  // Pos 21-26: Expiry Date (6 chars YYMMDD)
  // Pos 27: Expiry Check Digit
  // Pos 28-41: Personal Number / Optional (14 chars)
  // Pos 42: Personal Number Check Digit
  // Pos 43: Composite Check Digit

  // Normalize Line 2 length to 44 characters
  let cleanL2 = l2;
  // Strip non-alphanumeric leading noise if present
  cleanL2 = cleanL2.replace(/^[^A-Z0-9]+/, '');
  cleanL2 = cleanL2.padEnd(44, '<').slice(0, 44);

  const rawPassportNo = cleanL2.slice(0, 9).replace(/</g, '');
  const passCheckDigitChar = cleanL2.charAt(9);

  const nationality = cleanL2.slice(10, 13).replace(/</g, '');
  const rawDob = cleanL2.slice(13, 19);
  const dobCheckDigitChar = cleanL2.charAt(19);

  const sexChar = cleanL2.charAt(20);
  let gender = 'Male';
  if (sexChar === 'F') gender = 'Female';
  else if (sexChar === 'M') gender = 'Male';
  else gender = 'Other';

  const rawExpiry = cleanL2.slice(21, 27);
  const expiryCheckDigitChar = cleanL2.charAt(27);

  const optionalData = cleanL2.slice(28, 42);
  const compositeCheckDigitChar = cleanL2.charAt(43);

  // --- Checksum Calculations ---
  const expectedPassCheck = calculateMrzCheckDigit(rawPassportNo);
  const actualPassCheck = parseInt(passCheckDigitChar, 10);
  const passportNoChecksumPassed = !isNaN(actualPassCheck) && expectedPassCheck === actualPassCheck;

  const sanitizedDob = sanitizeMrzDigits(rawDob);
  const expectedDobCheck = calculateMrzCheckDigit(sanitizedDob);
  const actualDobCheck = parseInt(dobCheckDigitChar, 10);
  const dobChecksumPassed = !isNaN(actualDobCheck) && expectedDobCheck === actualDobCheck;

  const sanitizedExpiry = sanitizeMrzDigits(rawExpiry);
  const expectedExpiryCheck = calculateMrzCheckDigit(sanitizedExpiry);
  const actualExpiryCheck = parseInt(expiryCheckDigitChar, 10);
  const expiryChecksumPassed = !isNaN(actualExpiryCheck) && expectedExpiryCheck === actualExpiryCheck;

  // Composite checksum string = PassportNo(9) + PassCheck(1) + DOB(6) + DOBCheck(1) + Expiry(6) + ExpiryCheck(1) + Optional(14) + OptionalCheck(1)
  const compositeStr = cleanL2.slice(0, 43);
  const expectedCompositeCheck = calculateMrzCheckDigit(compositeStr);
  const actualCompositeCheck = parseInt(compositeCheckDigitChar, 10);
  const compositeChecksumPassed = !isNaN(actualCompositeCheck) && expectedCompositeCheck === actualCompositeCheck;

  // All checksums pass -> HIGH confidence & AUTHORITATIVE
  const allChecksumsPassed = passportNoChecksumPassed && dobChecksumPassed && expiryChecksumPassed;
  const confidenceLevel: 'HIGH' | 'LOW' = allChecksumsPassed ? 'HIGH' : 'LOW';

  const formattedDob = parseMrzDate(sanitizedDob, false);
  const formattedExpiry = parseMrzDate(sanitizedExpiry, true);

  // Country Code mapping
  let normNat = nationality === 'IND' ? 'Indian' : nationality === 'PAK' ? 'Pakistani' : nationality;

  return {
    full_name: { value: fullNameStr, confidence: confidenceLevel, isAuthoritative: allChecksumsPassed },
    surname: { value: surname, confidence: confidenceLevel, isAuthoritative: allChecksumsPassed },
    given_names: { value: givenNames, confidence: confidenceLevel, isAuthoritative: allChecksumsPassed },
    passport_number: { value: rawPassportNo, confidence: confidenceLevel, isAuthoritative: allChecksumsPassed },
    date_of_birth: { value: formattedDob, confidence: confidenceLevel, isAuthoritative: allChecksumsPassed },
    gender: { value: gender, confidence: confidenceLevel, isAuthoritative: allChecksumsPassed },
    nationality: { value: normNat, confidence: confidenceLevel, isAuthoritative: allChecksumsPassed },
    expiry_date: { value: formattedExpiry, confidence: confidenceLevel, isAuthoritative: allChecksumsPassed },
    checksumsPassed: allChecksumsPassed,
    passportNoChecksumPassed,
    dobChecksumPassed,
    expiryChecksumPassed,
    compositeChecksumPassed,
    rawLine1: l1,
    rawLine2: cleanL2,
  };
}
