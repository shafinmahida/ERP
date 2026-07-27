export type ConfidenceTier = 'Very High' | 'High' | 'Medium' | 'Low';

export interface FieldConfidence {
  value: string;
  score: number; // 0 to 100
  tier: ConfidenceTier;
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

function calculateMrzChecksum(str: string): number {
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

function formatMrzDate(yymmdd: string): string {
  if (!/^\d{6}$/.test(yymmdd)) return '';
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);

  // Pivot year 50 (e.g. 75 -> 1975, 26 -> 2026)
  const currentYear = new Date().getFullYear() % 100;
  const fullYear = yy > currentYear + 20 ? 1900 + yy : 2000 + yy;
  return `${fullYear}-${mm}-${dd}`;
}

export function parseTd3MrzLines(line1: string, line2: string): ParsedPassportMrz | null {
  const l1 = line1.trim().replace(/\s+/g, '').toUpperCase();
  const l2 = line2.trim().replace(/\s+/g, '').toUpperCase();

  if (l1.length < 44 || l2.length < 44) return null;

  const cleanL1 = l1.slice(0, 44);
  const cleanL2 = l2.slice(0, 44);

  if (!cleanL1.startsWith('P')) return null;

  // Line 1 Parsing: P<CCC...SURNAME<<GIVEN<NAMES<<<<
  const countryCode = cleanL1.slice(2, 5);
  const nameField = cleanL1.slice(5);
  const nameParts = nameField.split('<<');
  const surname = (nameParts[0] || '').replace(/</g, ' ').trim();
  const givenNames = (nameParts[1] || '').replace(/</g, ' ').trim();
  const fullName = surname && givenNames ? `${givenNames} ${surname}` : surname || givenNames || 'Unknown';

  // Line 2 Parsing:
  // 0-9: Passport No
  // 9: Check digit
  // 10-13: Nationality (3 char)
  // 13-19: DOB (YYMMDD)
  // 19: Check digit
  // 20: Sex (M/F/<)
  // 21-27: Expiry (YYMMDD)
  // 27: Check digit
  const passNo = cleanL2.slice(0, 9).replace(/</g, '');
  const passCheck = parseInt(cleanL2[9], 10);
  const expectedPassCheck = calculateMrzChecksum(cleanL2.slice(0, 9));
  const passValid = !isNaN(passCheck) && passCheck === expectedPassCheck;

  const natCode = cleanL2.slice(10, 13);
  const nationality = ISO_NATIONALITY_MAP[natCode] || ISO_NATIONALITY_MAP[countryCode] || 'Pakistani';

  const dobStr = cleanL2.slice(13, 19);
  const dobCheck = parseInt(cleanL2[19], 10);
  const expectedDobCheck = calculateMrzChecksum(dobStr);
  const dobValid = !isNaN(dobCheck) && dobCheck === expectedDobCheck;

  const rawSex = cleanL2[20];
  const gender = rawSex === 'M' ? 'Male' : rawSex === 'F' ? 'Female' : 'Other';

  const expStr = cleanL2.slice(21, 27);
  const expCheck = parseInt(cleanL2[27], 10);
  const expectedExpCheck = calculateMrzChecksum(expStr);
  const expValid = !isNaN(expCheck) && expCheck === expectedExpCheck;

  const mrzValid = passValid && dobValid && expValid;

  // Calculate field confidence scores based on check-digit validation
  const passScore = passValid ? 99 : 78;
  const dobScore = dobValid ? 99 : 82;
  const expScore = expValid ? 99 : 80;
  const nameScore = mrzValid ? 98 : 85;
  const natScore = ISO_NATIONALITY_MAP[natCode] ? 99 : 88;
  const genderScore = rawSex === 'M' || rawSex === 'F' ? 99 : 70;

  return {
    full_name: { value: fullName, score: nameScore, tier: getConfidenceTier(nameScore) },
    passport_number: { value: passNo, score: passScore, tier: getConfidenceTier(passScore) },
    nationality: { value: nationality, score: natScore, tier: getConfidenceTier(natScore) },
    date_of_birth: { value: formatMrzDate(dobStr), score: dobScore, tier: getConfidenceTier(dobScore) },
    gender: { value: gender, score: genderScore, tier: getConfidenceTier(genderScore) },
    expiry_date: { value: formatMrzDate(expStr), score: expScore, tier: getConfidenceTier(expScore) },
    mrzValid,
    mrzRawLine1: cleanL1,
    mrzRawLine2: cleanL2,
    mrzBoundingBox: { x: 10, y: 70, width: 80, height: 25 },
  };
}
