/**
 * DAYAR-E-HABIB ERP — DATE UTILITIES
 * Takes a Passport Issue Date (YYYY-MM-DD, DD-MM-YYYY, or DD/MM/YYYY) and auto-suggests
 * Expiry Date as 10 Years minus 1 Day (e.g. 2024-05-15 -> 2034-05-14).
 * Returns string in YYYY-MM-DD format for standard HTML input elements.
 */
export function suggestPassportExpiryDate(issueDateStr: string): string {
  if (!issueDateStr || !issueDateStr.trim()) return '';

  const cleanStr = issueDateStr.trim();
  let year: number, month: number, day: number;

  if (cleanStr.includes('-')) {
    const parts = cleanStr.split('-');
    if (parts.length !== 3) return '';
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    } else {
      // DD-MM-YYYY
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
    }
  } else if (cleanStr.includes('/')) {
    const parts = cleanStr.split('/');
    if (parts.length !== 3) return '';
    if (parts[0].length === 4) {
      // YYYY/MM/DD
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    } else {
      // DD/MM/YYYY
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
    }
  } else {
    return '';
  }

  if (isNaN(year) || isNaN(month) || isNaN(day)) return '';

  // Add 10 years minus 1 day
  const expiryDate = new Date(year + 10, month, day - 1);

  const expY = expiryDate.getFullYear();
  const expM = String(expiryDate.getMonth() + 1).padStart(2, '0');
  const expD = String(expiryDate.getDate()).padStart(2, '0');

  return `${expY}-${expM}-${expD}`;
}

/**
 * Normalizes user input date to YYYY-MM-DD for standard input fields
 */
export function normalizeDateInput(val: string): string {
  if (!val) return '';
  const trimmed = val.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split('-');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return trimmed;
}

export function formatDateForDisplay(val: string): string {
  if (!val) return '-';
  const norm = normalizeDateInput(val);
  const parts = norm.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MM-YYYY
  }
  return val;
}
