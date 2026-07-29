import fs from 'fs';

// Simulating garbled MRZ line 2 with leading noise digit:
const line2Garbled = "1 W4860365<6IND0503316M32101013076941889422<10";

function sanitizeMrzLine2(rawLine2: string, docNumFromLine1OrText?: string): string {
  let cleaned = rawLine2.trim().replace(/\s+/g, '').replace(/[«\(\)\[\]\{\}|]/g, '<').toUpperCase();

  // Find start of MRZ Line 2:
  // Standard TD3 Line 2 structure: DocNo(9) + CheckDigit(1) + Nationality(3) + DOB(6) + CheckDigit(1) + Sex(1) + Expiry(6)
  // Example: W4860365<6IND0503316M3210101...
  // Search for pattern: 9 doc chars + 1 check digit + 3 letter country code (e.g. IND, USA, etc.)
  const match = cleaned.match(/([A-Z0-9<]{9}\d[A-Z]{3}\d{6}[0-9A-Z<]*)/);
  if (match) {
    return match[1];
  }

  // Fallback: search for 3-letter country code like IND
  const indMatch = cleaned.match(/([A-Z0-9<]{9}\d[A-Z]{3}.*)/);
  if (indMatch) {
    return indMatch[1];
  }

  return cleaned;
}

console.log('Original garbled line 2:', line2Garbled);
console.log('Sanitized line 2:       ', sanitizeMrzLine2(line2Garbled));
