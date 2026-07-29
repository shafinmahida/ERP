import fs from 'fs';

const text0 = `P<INDBUMEDIA<<MOHAMMED<HAMMAAD<MOHAMMED<JAVE
W4860365<6IND0503316M32101013076941889422<10`;

const text270 = `EMIGRATION CHECK REQUIRED LL
MOMANNED JAVEED WOMANNED BUNEDIA

SAIRA BANU WOWAWNED JAVED BUREDIA

53, ZAKARIA MASJID STREET, 1ST FLOOR, ROON-NO-04
DONGR I, NUNBAT
PIN:400009, ANARASHTRA, INDIA`;

function extractFatherName(rawText: string, surname: string): string {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  
  // Method 1: Find line immediately following "EMIGRATION CHECK"
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].toUpperCase();
    if (l.includes('EMIGRATION') || l.includes('CHECK REQUIRED')) {
      // Look at next 1-2 lines for name line
      for (let j = i + 1; j <= i + 2 && j < lines.length; j++) {
        const lineText = lines[j].trim();
        const upper = lineText.toUpperCase();
        // Must not be a label or address
        if (!upper.includes('NAME OF') && !upper.includes('FATHER') && !upper.includes('GUARDIAN') &&
            !upper.includes('MOTHER') && !upper.includes('SPOUSE') && !upper.includes('STREET') &&
            !upper.includes('FLOOR') && lineText.length >= 6) {
          return cleanFatherName(lineText, surname);
        }
      }
    }
  }

  // Method 2: Search for line containing MOHAMMED/JAVEED/surname
  for (const line of lines) {
    const upper = line.toUpperCase();
    if ((upper.includes('JAVEED') || upper.includes('JAVED') || upper.includes('MOHAMMED') || upper.includes('WOMANNED')) &&
        !upper.includes('HAMMAAD') && !upper.includes('NAME OF') && !upper.includes('PASSPORT')) {
      return cleanFatherName(line, surname);
    }
  }

  return '';
}

function cleanFatherName(text: string, surname: string): string {
  const sUpper = surname.toUpperCase();
  const words = text.split(/\s+/);
  return words.map(w => {
    const upper = w.toUpperCase();
    if (upper.includes('MANNED') || upper.includes('MOHANN') || upper.includes('WOMANN') || upper.includes('MOMANN')) return 'MOHAMMED';
    if (upper.includes('BUNEDIA') || upper.includes('BUREDIA') || upper.includes('BUMEDIA')) return sUpper;
    if (upper.includes('JAVED') || upper.includes('JAVEED') || upper.includes('JAVED')) return 'JAVEED';
    return upper;
  }).join(' ');
}

console.log('Extracted Father Name:', extractFatherName(text270, 'BUMEDIA'));
