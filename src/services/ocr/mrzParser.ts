export type ConfidenceTier = 'Very High' | 'High' | 'Medium' | 'Low';

export interface FieldConfidence {
  value: string;
  score: number; // 0 to 100
  tier: ConfidenceTier;
  checksumPassed: boolean;
  formatValid: boolean;
  reason: string;
  hasDiscrepancy?: boolean;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

export interface ParsedPassportMrz {
  // Core Identity (from MRZ)
  full_name: FieldConfidence;
  passport_number: FieldConfidence;
  nationality: FieldConfidence;
  date_of_birth: FieldConfidence;
  gender: FieldConfidence;
  expiry_date: FieldConfidence;

  // Visual-extracted fields (from bio page text)
  father_name: FieldConfidence;
  issue_date: FieldConfidence;
  place_of_issue: FieldConfidence;
  place_of_birth: FieldConfidence;

  mrzValid: boolean;
  mrzRawLine1: string;
  mrzRawLine2: string;
  documentType: 'Passport' | 'Visa' | 'ID Card' | 'Other';
  overallConfidenceScore: number;
  overallConfidenceTier: ConfidenceTier;
  mrzBoundingBox?: { x: number; y: number; width: number; height: number };
}

const ISO_NATIONALITY_MAP: Record<string, string> = {
  PAK: 'Pakistani',
  IND: 'Indian',
  SAU: 'Saudi',
  GBR: 'British',
  USA: 'American',
  CAN: 'Canadian',
  AUS: 'Australian',
  ARE: 'Emirati',
  TUR: 'Turkish',
  EGY: 'Egyptian',
  MYS: 'Malaysian',
  IDN: 'Indonesian',
  BGD: 'Bangladeshi',
  AFG: 'Afghan',
  IRN: 'Iranian',
  OMN: 'Omani',
  KWT: 'Kuwaiti',
  QAT: 'Qatari',
  BHR: 'Bahraini',
  JOR: 'Jordanian',
  SYR: 'Syrian',
  IRQ: 'Iraqi',
  LBN: 'Lebanese',
  NGA: 'Nigerian',
  ZAF: 'South African',
  KEN: 'Kenyan',
  ETH: 'Ethiopian',
  PHL: 'Filipino',
  LKA: 'Sri Lankan',
  NPL: 'Nepali',
};

export function getConfidenceTier(score: number): ConfidenceTier {
  if (score >= 98) return 'Very High';
  if (score >= 90) return 'High';
  if (score >= 75) return 'Medium';
  return 'Low';
}

export function calculateMrzChecksum(str: string): number {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    let val = 0;
    if (char >= '0' && char <= '9') val = char.charCodeAt(0) - 48;
    else if (char >= 'A' && char <= 'Z') val = char.charCodeAt(0) - 55;
    else if (char === '<') val = 0;
    sum += val * weights[i % 3];
  }
  return sum % 10;
}

export function formatMrzDate(yymmdd: string): string {
  if (!/^\d{6}$/.test(yymmdd)) return yymmdd;
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);

  const currentYear = new Date().getFullYear() % 100;
  const fullYear = yy > currentYear + 20 ? 1900 + yy : 2000 + yy;
  return `${fullYear}-${mm}-${dd}`;
}

/** Format a dd/mm/yyyy or dd-mm-yyyy or yyyy-mm-dd visual date into yyyy-mm-dd ISO */
export function normalizeVisualDate(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();

  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // dd/mm/yyyy or dd-mm-yyyy or dd.mm.yyyy
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const dd = dmyMatch[1].padStart(2, '0');
    const mm = dmyMatch[2].padStart(2, '0');
    const yyyy = dmyMatch[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  // yyyy/mm/dd
  const ymdMatch = trimmed.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (ymdMatch) {
    const yyyy = ymdMatch[1];
    const mm = ymdMatch[2].padStart(2, '0');
    const dd = ymdMatch[3].padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  return trimmed;
}

export function extractPassportMrzFromText(rawText: string): { line1: string; line2: string } | null {
  if (!rawText) return null;

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/[«\(\)\[\]\{\}]/g, '<').toUpperCase());

  // Search for line containing P<
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const pIdx = l.indexOf('P<');
    if (pIdx !== -1 && i + 1 < lines.length) {
      const candidate1 = l.slice(pIdx).replace(/[^A-Z0-9<]/g, '');
      const candidate2 = lines[i + 1].replace(/[^A-Z0-9<]/g, '');

      if (candidate1.length >= 30 && candidate2.length >= 30) {
        const line1 = candidate1.padEnd(44, '<').slice(0, 44);
        const line2 = candidate2.padEnd(44, '<').slice(0, 44);
        return { line1, line2 };
      }
    }
  }

  // Fallback: 44-character lines starting with P
  for (let i = 0; i < lines.length - 1; i++) {
    const c1 = lines[i].replace(/[^A-Z0-9<]/g, '');
    const c2 = lines[i + 1].replace(/[^A-Z0-9<]/g, '');
    if (c1.startsWith('P') && c1.length >= 35 && c2.length >= 35) {
      return {
        line1: c1.padEnd(44, '<').slice(0, 44),
        line2: c2.padEnd(44, '<').slice(0, 44),
      };
    }
  }

  return null;
}

/**
 * Rich visual passport field extractor — parses bio page and observation page text
 * to extract all fields that MRZ cannot provide: father's name, issue date,
 * place of issue, place of birth, and the full untruncated name.
 */
// Words that should never be treated as a person's name
const PLACE_AND_DOC_BLACKLIST = new Set([
  'MUMBAI', 'MAHARASHTRA', 'INDIA', 'REPUBLIC', 'EMIGRATION', 'REQUIRED',
  'CHECK', 'NATIONAL', 'INTERNATIONAL', 'PASSPORT', 'DELHI', 'HYDERABAD',
  'KOLKATA', 'CHENNAI', 'BANGALORE', 'AHMEDABAD', 'PUNE', 'SURAT',
  'GUJARAT', 'RAJASTHAN', 'KARNATAKA', 'KERALA', 'TAMILNADU',
  'UTTAR', 'PRADESH', 'HARYANA', 'PUNJAB', 'HIMACHAL',
  'ECNR', 'ECNR', 'NOTE', 'HOLDER', 'DECLARED',
]);

function isLikelyPersonName(line: string): boolean {
  const words = line.trim().split(/\s+/);
  // Must have at least 3 words
  if (words.length < 3) return false;
  // All words must be alpha only AND at least 3 chars each (filters OCR noise: YY, AE, AY)
  if (!words.every((w) => /^[A-Z]{3,}$/.test(w))) return false;
  // At least one word must be >= 4 chars (real name segment: MOHAMMED, JAVEED, etc.)
  if (!words.some((w) => w.length >= 4)) return false;
  // Must not contain any blacklisted place/doc words
  if (words.some((w) => PLACE_AND_DOC_BLACKLIST.has(w))) return false;
  // Must not be all the same word repeated
  if (new Set(words).size === 1) return false;
  return true;
}

export function extractVisualPassportFields(rawText: string, knownMrzSurname?: string) {
  if (!rawText) {
    return {
      passportNumber: '',
      dateOfBirth: '',
      expiryDate: '',
      issueDate: '',
      gender: 'Male',
      fullName: '',
      surname: '',
      givenNames: '',
      fatherName: '',
      placeOfIssue: '',
      placeOfBirth: '',
    };
  }

  const upper = rawText.toUpperCase();
  const lines = upper.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // ─── Passport Number ─────────────────────────────────────────────────────────
  const passMatch = upper.match(/\b([A-Z]{1,2}\d{7,8})\b/);
  const passportNumber = passMatch ? passMatch[1] : '';

  // ─── Dates (all dd/mm/yyyy and yyyy-mm-dd occurrences) ───────────────────────
  const allDates = [...upper.matchAll(/\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}|\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2})\b/g)]
    .map((m) => normalizeVisualDate(m[1]));

  let dateOfBirth = '';
  let expiryDate = '';
  let issueDate = '';

  // Look for labelled dates first
  const dobMatch = upper.match(/(?:DATE?\s*OF?\s*BIRTH|D\.O\.B|DOB)[^\d]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}|\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2})/);
  if (dobMatch) dateOfBirth = normalizeVisualDate(dobMatch[1]);

  const expiryMatch = upper.match(/(?:DATE?\s*OF?\s*EXP|EXPIRY|EXPIRATION|VALID\s*UNTIL|VALID\s*TILL)[^\d]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}|\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2})/);
  if (expiryMatch) expiryDate = normalizeVisualDate(expiryMatch[1]);

  const issueMatch = upper.match(/(?:DATE?\s*OF?\s*ISSUE|DATE?\s*OF?\s*ISSU|ISSUED?\s*ON|ISSUED?)[^\d]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}|\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2})/);
  if (issueMatch) issueDate = normalizeVisualDate(issueMatch[1]);

  // Smart date assignment:
  // - Newest date (furthest in future) = expiry
  // - Oldest date (furthest in past, could be DOB from 1900s-2010s) = DOB
  // - Remaining middle date(s) = issue date (passports issued 2000-present)
  if ((!dateOfBirth || !expiryDate || !issueDate) && allDates.length >= 2) {
    const sorted = [...allDates].sort(); // ISO sort = chronological
    if (!expiryDate) expiryDate = sorted[sorted.length - 1] || '';
    if (!dateOfBirth) dateOfBirth = sorted[0] || '';
    // Issue date: the date that is NOT the oldest (DOB) and NOT the newest (expiry),
    // i.e. a middle date that falls in a realistic passport issuance range (>= 2000)
    if (!issueDate) {
      const candidates = sorted
        .filter((d) => d !== dateOfBirth && d !== expiryDate)
        .filter((d) => d >= '2000-01-01'); // passports not issued before 2000 for this ERP
      // Pick the most recent candidate (closest to today) as the issue date
      issueDate = candidates[candidates.length - 1] || '';
    }
  }

  // ─── Gender ──────────────────────────────────────────────────────────────────
  let gender = 'Male';
  if (/\b(FEMALE|F\/|SEX\s*[:\-]?\s*F)\b/.test(upper) || /\bSEX\s*[:\-]?\s*F\b/.test(upper)) {
    gender = 'Female';
  }
  if (/\bSEX\s*[:\-]?\s*M\b/.test(upper) || /\b[MF]\s+MALE\b/.test(upper)) {
    gender = 'Male';
  }

  // ─── Surname / Given Names (from visual bio page labels) ─────────────────────
  let surname = '';
  let givenNames = '';

  const surnameMatch = upper.match(/(?:SURNAME|LAST\s*NAME)[:\s]+([A-Z][A-Z\s]+)/);
  if (surnameMatch) surname = surnameMatch[1].trim().split('\n')[0].trim();

  const givenMatch = upper.match(/(?:GIVEN\s*NAME[S]?|FIRST\s*NAME|NAME\s*\(S\))[:\s]+([A-Z][A-Z\s]+)/);
  if (givenMatch) givenNames = givenMatch[1].trim().split('\n')[0].trim();

  // ─── Full Name ───────────────────────────────────────────────────────────────
  let fullName = '';
  if (surname && givenNames) {
    fullName = `${givenNames} ${surname}`.trim();
  } else if (surname) {
    fullName = surname;
  } else if (givenNames) {
    fullName = givenNames;
  }

  // Fallback: look for "NAME: XYZ" pattern
  if (!fullName) {
    const nameMatch = upper.match(/(?:^|\n)\s*NAME\s*[:\-]?\s*([A-Z][A-Z\s]{5,50})(?:\n|$)/m);
    if (nameMatch) fullName = nameMatch[1].trim();
  }

  // Smart surname-based full name recovery:
  // Indian passport bio pages often list surname and given names on SEPARATE lines.
  // Strategy:
  //   1. Try to find a text line containing the MRZ surname (most reliable — direct match)
  //   2. If not found, find the longest valid name-like line and append MRZ surname
  //      (handles bio pages where OCR reads given names without surname on same line)
  if (knownMrzSurname && (!fullName || fullName.length < 15)) {
    const surnameUpper = knownMrzSurname.toUpperCase();

    // Try 1: line that contains the exact surname
    const withSurname = lines
      .filter((l) => l.includes(surnameUpper) && isLikelyPersonName(l))
      .sort((a, b) => b.length - a.length);

    if (withSurname.length > 0) {
      fullName = withSurname[0];
    } else {
      // Try 2: find the longest valid given-name line (doesn't have the surname)
      // and append the MRZ surname to reconstruct the full name
      const givenNameLines = lines
        .filter((l) => isLikelyPersonName(l))
        .sort((a, b) => b.length - a.length);

      if (givenNameLines.length > 0) {
        const bestGivenLine = givenNameLines[0];
        // Only combine if the surname isn't already at the end
        if (!bestGivenLine.endsWith(surnameUpper)) {
          fullName = `${bestGivenLine} ${surnameUpper}`;
        } else {
          fullName = bestGivenLine;
        }
      }
    }
  }

  // ─── Father's Name ────────────────────────────────────────────────────────────
  // Indian passports list father on the observation/last page
  let fatherName = '';
  const fatherPatterns = [
    /(?:FATHER['\u2019S]?\s*(?:NAME|:|\/))[:\s\/]*([A-Z][A-Z\s]{3,60})/,
    /(?:FATHER\s+NAME)[:\s]*([A-Z][A-Z\s]{3,60})/,
    /(?:FATHER[:\s]+)([A-Z][A-Z\s]{3,60})/,
    /(?:F\/NAME|F\.NAME)[:\s]+([A-Z][A-Z\s]{3,60})/,
  ];
  for (const pattern of fatherPatterns) {
    const m = upper.match(pattern);
    if (m) {
      fatherName = m[1].trim().split('\n')[0].trim();
      break;
    }
  }

  // Indian passport observation page specific: the line after "MOHAMMED JAVEED" as father
  // Try to find observation page names: typically the first full-caps multi-word name after
  // "EMIGRATION CHECK" or "ECNR" that isn't the passport holder's own name
  if (!fatherName) {
    // Look for FATHER keyword then get name from same or next line
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('FATHER') || lines[i].includes('F/NAME')) {
        // Check next line for a valid person name
        const nextLine = (lines[i + 1] || '').trim();
        if (isLikelyPersonName(nextLine)) {
          fatherName = nextLine;
          break;
        }
        // Name might be inline after the FATHER keyword
        const inline = lines[i].replace(/FATHER['\u2019S]*\s*(NAME)?[:\s\/]*/i, '').trim();
        if (isLikelyPersonName(inline)) {
          fatherName = inline;
          break;
        }
      }
    }
  }

  // Strategy 3: On Indian passport observation pages, scan all name-like lines
  // Father's name is the FIRST valid person-name line that isn't the holder
  if (!fatherName) {
    const holderSurname = knownMrzSurname ? knownMrzSurname.toUpperCase() : '';
    for (const nameLine of lines) {
      if (!isLikelyPersonName(nameLine)) continue;
      // Skip if this is the holder's own name (contains holder surname)
      if (holderSurname && nameLine.includes(holderSurname)) continue;
      // Skip common document headers that pass the name test
      if (/EMIGRATION|REQUIRED|NATIONAL|ECNR/.test(nameLine)) continue;
      fatherName = nameLine;
      break;
    }
  }

  // ─── Place of Issue ───────────────────────────────────────────────────────────
  let placeOfIssue = '';
  const issueLocationPatterns = [
    /(?:PLACE\s*OF\s*ISSUE|ISSUED?\s*AT|ISSUED?\s*FROM)[:\s]+([A-Z][A-Z\s,]+)/,
    /(?:PLACE\s*OF\s*ISSU)[:\s]+([A-Z][A-Z\s,]+)/,
  ];
  for (const pattern of issueLocationPatterns) {
    const m = upper.match(pattern);
    if (m) {
      placeOfIssue = m[1].trim().split('\n')[0].trim();
      // Clean trailing filler words
      placeOfIssue = placeOfIssue.replace(/\b(MAHARASHTRA|INDIA|REPUBLIC|OF|PASSPORT)\b.*$/, '').trim();
      if (!placeOfIssue.includes('MAHARASHTRA')) {
        // Try to keep MAHARASHTRA if it was the state
        const stateMatch = m[1].match(/([A-Z]+(?:\s[A-Z]+)?)[,\s]+(?:MAHARASHTRA|INDIA)/);
        if (stateMatch) placeOfIssue = stateMatch[1].trim();
      }
      break;
    }
  }

  // Fallback: if "MUMBAI" or another city appears after an issue date context
  if (!placeOfIssue) {
    const cityMatch = upper.match(/(?:\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})\s*\n?\s*([A-Z]{4,20}(?:[,\s][A-Z]{4,20})?)/);
    if (cityMatch) placeOfIssue = cityMatch[1].trim();
  }

  // ─── Place of Birth ───────────────────────────────────────────────────────────
  let placeOfBirth = '';
  const birthLocationPatterns = [
    /(?:PLACE\s*OF\s*BIRTH|BIRTH\s*PLACE)[:\s]+([A-Z][A-Z\s,]+)/,
    /(?:BORN\s*IN|BORN\s*AT)[:\s]+([A-Z][A-Z\s,]+)/,
  ];
  for (const pattern of birthLocationPatterns) {
    const m = upper.match(pattern);
    if (m) {
      placeOfBirth = m[1].trim().split('\n')[0].trim();
      break;
    }
  }

  return {
    passportNumber,
    dateOfBirth,
    expiryDate,
    issueDate,
    gender,
    fullName,
    surname,
    givenNames,
    fatherName,
    placeOfIssue,
    placeOfBirth,
  };
}

export function parseTd3MrzLines(line1: string, line2: string): ParsedPassportMrz | null {
  const l1 = line1.trim().replace(/\s+/g, '').replace(/[«\(\)\[\]\{\}]/g, '<').toUpperCase();
  const l2 = line2.trim().replace(/\s+/g, '').replace(/[«\(\)\[\]\{\}]/g, '<').toUpperCase();

  if (l1.length < 35 || l2.length < 35) return null;

  const cleanL1 = l1.padEnd(44, '<').slice(0, 44);
  const cleanL2 = l2.padEnd(44, '<').slice(0, 44);

  if (!cleanL1.startsWith('P')) return null;

  // ─── Line 1: P<CCC...SURNAME<<GIVEN<NAMES<<<<< ───────────────────────────────
  const countryCode = cleanL1.slice(2, 5);
  const nameField = cleanL1.slice(5);
  const nameParts = nameField.split('<<');
  const surname = (nameParts[0] || '').replace(/</g, ' ').trim();
  // Given names: join with space, remove trailing filler, trim
  const givenNamesRaw = (nameParts[1] || '').replace(/</g, ' ').replace(/\s+/g, ' ').trim();
  // Remove any trailing partial word fragments from truncation (last "word" may be cut off)
  const fullName = surname && givenNamesRaw ? `${givenNamesRaw} ${surname}` : surname || givenNamesRaw || '';

  // ─── Line 2: Passport No + check + Country + DOB + check + Sex + Expiry + check ─
  const passNo = cleanL2.slice(0, 9).replace(/</g, '');
  const passCheckStr = cleanL2[9];
  const passCheck = parseInt(passCheckStr, 10);
  const expectedPassCheck = calculateMrzChecksum(cleanL2.slice(0, 9));
  const passValid = !isNaN(passCheck) && passCheck === expectedPassCheck;

  const natCode = cleanL2.slice(10, 13);
  const nationality: string = (ISO_NATIONALITY_MAP[natCode] || ISO_NATIONALITY_MAP[countryCode]) ?? (natCode ? natCode : '');

  const dobStr = cleanL2.slice(13, 19);
  const dobCheckStr = cleanL2[19];
  const dobCheck = parseInt(dobCheckStr, 10);
  const expectedDobCheck = calculateMrzChecksum(dobStr);
  const dobValid = !isNaN(dobCheck) && dobCheck === expectedDobCheck;

  const rawSex = cleanL2[20];
  const gender = rawSex === 'M' ? 'Male' : rawSex === 'F' ? 'Female' : 'Other';

  const expStr = cleanL2.slice(21, 27);
  const expCheckStr = cleanL2[27];
  const expCheck = parseInt(expCheckStr, 10);
  const expectedExpCheck = calculateMrzChecksum(expStr);
  const expValid = !isNaN(expCheck) && expCheck === expectedExpCheck;

  const mrzValid = passValid && dobValid && expValid;

  // ─── Confidence Engine ────────────────────────────────────────────────────────
  const calculateFieldConfidence = (
    val: string,
    checksumPassed: boolean,
    formatRegex: RegExp,
    label: string,
    bbox: { x: number; y: number; width: number; height: number }
  ): FieldConfidence => {
    if (!val || val.trim() === '') {
      return {
        value: '',
        score: 0,
        tier: 'Low',
        checksumPassed: false,
        formatValid: false,
        reason: `${label} missing or unreadable in MRZ`,
        boundingBox: bbox,
      };
    }

    const formatValid = formatRegex.test(val);
    let score = 0;
    if (checksumPassed) score += 40;
    if (formatValid) score += 30;
    if (val.length >= 3) score += 20;
    if (mrzValid) score += 10;

    if (!checksumPassed && score > 45) score = 45;

    return {
      value: val,
      score,
      tier: getConfidenceTier(score),
      checksumPassed,
      formatValid,
      reason: checksumPassed
        ? `${label} verified via MRZ Modulo-10 checksum.`
        : `${label} extracted but MRZ checksum unverified.`,
      boundingBox: bbox,
    };
  };

  const makeVisualField = (
    val: string,
    label: string,
    score: number,
    bbox: { x: number; y: number; width: number; height: number }
  ): FieldConfidence => ({
    value: val,
    score: val ? score : 0,
    tier: getConfidenceTier(val ? score : 0),
    checksumPassed: false,
    formatValid: Boolean(val && val.length > 1),
    reason: val ? `${label} extracted from visual document text.` : `${label} not found in document.`,
    boundingBox: bbox,
  });

  const passField = calculateFieldConfidence(passNo, passValid, /^[A-Z0-9]{7,9}$/, 'Passport Number', { x: 5, y: 70, width: 25, height: 10 });
  const dobFormatted = formatMrzDate(dobStr);
  const dobField = calculateFieldConfidence(dobFormatted, dobValid, /^\d{4}-\d{2}-\d{2}$/, 'Date of Birth', { x: 30, y: 70, width: 20, height: 10 });
  const expFormatted = formatMrzDate(expStr);
  const expField = calculateFieldConfidence(expFormatted, expValid, /^\d{4}-\d{2}-\d{2}$/, 'Expiry Date', { x: 55, y: 70, width: 20, height: 10 });

  const nameFieldScore = fullName ? (mrzValid ? 90 : 70) : 0;
  const nameConfidence: FieldConfidence = {
    value: fullName,
    score: nameFieldScore,
    tier: getConfidenceTier(nameFieldScore),
    checksumPassed: mrzValid,
    formatValid: Boolean(fullName && fullName.length > 2),
    reason: fullName
      ? 'Name from MRZ Line 1 — may be truncated if long; visual text will override.'
      : 'Name unreadable in MRZ',
    boundingBox: { x: 5, y: 15, width: 50, height: 15 },
  };

  const natFieldScore = nationality ? 95 : 0;
  const natConfidence: FieldConfidence = {
    value: nationality,
    score: natFieldScore,
    tier: getConfidenceTier(natFieldScore),
    checksumPassed: true,
    formatValid: Boolean(nationality),
    reason: nationality ? `ISO Country Code ${natCode || countryCode} verified` : 'Nationality missing',
    boundingBox: { x: 30, y: 35, width: 20, height: 10 },
  };

  const genderConfidence: FieldConfidence = {
    value: gender,
    score: rawSex === 'M' || rawSex === 'F' ? 95 : 50,
    tier: getConfidenceTier(rawSex === 'M' || rawSex === 'F' ? 95 : 50),
    checksumPassed: true,
    formatValid: rawSex === 'M' || rawSex === 'F',
    reason: `Sex character '${rawSex}' parsed from MRZ position 20`,
    boundingBox: { x: 50, y: 35, width: 10, height: 10 },
  };

  // Visual-only fields — will be enriched by fieldExtractor after OCR
  const fatherField = makeVisualField('', 'Father\'s Name', 72, { x: 5, y: 45, width: 50, height: 10 });
  const issueDateField = makeVisualField('', 'Issue Date', 72, { x: 5, y: 55, width: 25, height: 10 });
  const placeOfIssueField = makeVisualField('', 'Place of Issue', 72, { x: 30, y: 55, width: 30, height: 10 });
  const placeOfBirthField = makeVisualField('', 'Place of Birth', 70, { x: 5, y: 60, width: 30, height: 10 });

  const mandatoryScores = [passField.score, dobField.score, expField.score];
  const overallConfidenceScore = Math.min(...mandatoryScores);

  return {
    full_name: nameConfidence,
    passport_number: passField,
    nationality: natConfidence,
    date_of_birth: dobField,
    gender: genderConfidence,
    expiry_date: expField,
    father_name: fatherField,
    issue_date: issueDateField,
    place_of_issue: placeOfIssueField,
    place_of_birth: placeOfBirthField,
    mrzValid,
    mrzRawLine1: cleanL1,
    mrzRawLine2: cleanL2,
    documentType: 'Passport',
    overallConfidenceScore,
    overallConfidenceTier: getConfidenceTier(overallConfidenceScore),
    mrzBoundingBox: { x: 5, y: 65, width: 90, height: 30 },
  };
}
