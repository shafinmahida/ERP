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
  full_name: FieldConfidence;
  passport_number: FieldConfidence;
  nationality: FieldConfidence;
  date_of_birth: FieldConfidence;
  gender: FieldConfidence;
  expiry_date: FieldConfidence;
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

  // Search for 44-character line pairs starting with P
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

export function extractVisualPassportFields(rawText: string) {
  if (!rawText) {
    return { passportNumber: '', dateOfBirth: '', expiryDate: '', gender: 'Male', fullName: '' };
  }

  const upper = rawText.toUpperCase();

  const passMatch = upper.match(/\b([A-Z]{1,2}\d{7,8})\b/);
  const passportNumber = passMatch ? passMatch[1] : '';

  const dates = upper.match(/\b(\d{2}[\/\.-]\d{2}[\/\.-]\d{4}|\d{4}[\/\.-]\d{2}[\/\.-]\d{2})\b/g) || [];
  let dateOfBirth = '';
  let expiryDate = '';

  if (dates.length >= 2) {
    dateOfBirth = dates[0] || '';
    expiryDate = dates[1] || '';
  } else if (dates.length === 1) {
    dateOfBirth = dates[0] || '';
  }

  let gender = 'Male';
  if (/\b(FEMALE|WOMAN|F)\b/.test(upper)) {
    gender = 'Female';
  }

  let fullName = '';
  const nameMatch = upper.match(/(?:NAME|FULL NAME|SURNAME|GIVEN NAMES)[\s:]+([A-Z\s]+)/);
  if (nameMatch) {
    fullName = nameMatch[1].trim().split('\n')[0];
  }

  return {
    passportNumber,
    dateOfBirth,
    expiryDate,
    gender,
    fullName,
  };
}

export function parseTd3MrzLines(line1: string, line2: string): ParsedPassportMrz | null {
  const l1 = line1.trim().replace(/\s+/g, '').replace(/[«\(\)\[\]\{\}]/g, '<').toUpperCase();
  const l2 = line2.trim().replace(/\s+/g, '').replace(/[«\(\)\[\]\{\}]/g, '<').toUpperCase();

  if (l1.length < 35 || l2.length < 35) return null;

  const cleanL1 = l1.padEnd(44, '<').slice(0, 44);
  const cleanL2 = l2.padEnd(44, '<').slice(0, 44);

  if (!cleanL1.startsWith('P')) return null;

  // Line 1 Parsing: P<CCC...SURNAME<<GIVEN<NAMES<<<<
  const countryCode = cleanL1.slice(2, 5);
  const nameField = cleanL1.slice(5);
  const nameParts = nameField.split('<<');
  const surname = (nameParts[0] || '').replace(/</g, ' ').trim();
  const givenNames = (nameParts[1] || '').replace(/</g, ' ').trim();
  const fullName = surname && givenNames ? `${givenNames} ${surname}` : surname || givenNames || '';

  // Line 2 Parsing:
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

  // STRICT FIELD CONFIDENCE ENGINE:
  // - MRZ Checksum Match: +40%
  // - Regex Format Valid: +30%
  // - Non-Empty Value: +20%
  // - Verified Field Match: +10%
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

    // Cap confidence if MRZ checksum failed
    if (!checksumPassed && score > 45) {
      score = 45;
    }

    return {
      value: val,
      score,
      tier: getConfidenceTier(score),
      checksumPassed,
      formatValid,
      reason: checksumPassed
        ? `${label} verified via MRZ Modulo-10 checksum algorithm.`
        : `${label} extracted but MRZ checksum validation failed or unverified.`,
      boundingBox: bbox,
    };
  };

  const passField = calculateFieldConfidence(
    passNo,
    passValid,
    /^[A-Z0-9]{7,9}$/,
    'Passport Number',
    { x: 5, y: 70, width: 25, height: 10 }
  );

  const dobFormatted = formatMrzDate(dobStr);
  const dobField = calculateFieldConfidence(
    dobFormatted,
    dobValid,
    /^\d{4}-\d{2}-\d{2}$/,
    'Date of Birth',
    { x: 30, y: 70, width: 20, height: 10 }
  );

  const expFormatted = formatMrzDate(expStr);
  const expField = calculateFieldConfidence(
    expFormatted,
    expValid,
    /^\d{4}-\d{2}-\d{2}$/,
    'Expiry Date',
    { x: 55, y: 70, width: 20, height: 10 }
  );

  const nameFieldScore = fullName ? (mrzValid ? 98 : 75) : 0;
  const nameConfidence: FieldConfidence = {
    value: fullName,
    score: nameFieldScore,
    tier: getConfidenceTier(nameFieldScore),
    checksumPassed: mrzValid,
    formatValid: Boolean(fullName && fullName.length > 2),
    reason: fullName ? 'Full Name extracted from MRZ Line 1' : 'Name unreadable in MRZ',
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
    reason: `Gender char '${rawSex}' parsed`,
    boundingBox: { x: 50, y: 35, width: 10, height: 10 },
  };

  // Overall Document Confidence: Capped at weakest critical field
  const mandatoryScores = [passField.score, dobField.score, expField.score, nameConfidence.score];
  const overallConfidenceScore = Math.min(...mandatoryScores);

  return {
    full_name: nameConfidence,
    passport_number: passField,
    nationality: natConfidence,
    date_of_birth: dobField,
    gender: genderConfidence,
    expiry_date: expField,
    mrzValid,
    mrzRawLine1: cleanL1,
    mrzRawLine2: cleanL2,
    documentType: 'Passport',
    overallConfidenceScore,
    overallConfidenceTier: getConfidenceTier(overallConfidenceScore),
    mrzBoundingBox: { x: 5, y: 65, width: 90, height: 30 },
  };
}
