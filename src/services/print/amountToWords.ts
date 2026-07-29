/**
 * DAYAR-E-HABIB ERP — INDIAN CURRENCY AMOUNT IN WORDS CONVERTER
 * 
 * Complies with standard Indian financial numbering system:
 * - Uses "Lacs" / "Lakhs", "Crores", "Thousands", "Hundreds".
 * - Converts Rupees and optional Paise into clear capitalized text format.
 * - Example: ₹6,60,000 -> "Rupees Six Lacs Sixty Thousand Only"
 * - Example: ₹1,23,456.50 -> "Rupees One Lac Twenty Three Thousand Four Hundred Fifty Six and Paise Fifty Only"
 */

const units = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const tens = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function convertIntegerToWords(num: number): string {
  if (num === 0) return 'Zero';

  let words = '';

  // Crores (1,00,00,000)
  if (Math.floor(num / 10000000) > 0) {
    words += convertIntegerToWords(Math.floor(num / 10000000)) + ' Crore ';
    num %= 10000000;
  }

  // Lacs (1,00,000)
  const lacsVal = Math.floor(num / 100000);
  if (lacsVal > 0) {
    const lacLabel = lacsVal === 1 ? 'Lac' : 'Lacs';
    words += convertIntegerToWords(lacsVal) + ` ${lacLabel} `;
    num %= 100000;
  }

  // Thousands (1,000)
  if (Math.floor(num / 1000) > 0) {
    words += convertIntegerToWords(Math.floor(num / 1000)) + ' Thousand ';
    num %= 1000;
  }

  // Hundreds (100)
  if (Math.floor(num / 100) > 0) {
    words += convertIntegerToWords(Math.floor(num / 100)) + ' Hundred ';
    num %= 100;
  }

  if (num > 0) {
    if (num < 20) {
      words += units[num];
    } else {
      words += tens[Math.floor(num / 10)];
      if (num % 10 > 0) {
        words += ' ' + units[num % 10];
      }
    }
  }

  return words.trim();
}

/**
 * Converts a numeric amount in Rupees (e.g. 660000 or 1234.56) into Indian Currency Words.
 */
export function convertRupeesToWords(amountInRupees: number): string {
  if (isNaN(amountInRupees) || amountInRupees < 0) return 'Rupees Zero Only';

  const integerPart = Math.floor(amountInRupees);
  const paisePart = Math.round((amountInRupees - integerPart) * 100);

  const integerWords = convertIntegerToWords(integerPart);
  const rupeeStr = `Rupees ${integerWords}`;

  if (paisePart > 0) {
    const paiseWords = convertIntegerToWords(paisePart);
    return `${rupeeStr} and Paise ${paiseWords} Only`;
  }

  return `${rupeeStr} Only`;
}
