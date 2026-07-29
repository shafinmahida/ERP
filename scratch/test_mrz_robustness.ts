import { extractPassportMrzFromText } from '../src/services/ocr/mrzParser';

const testRawOcrGarbled = `
P<INDBUMEDIA<<MOHAMMED<HAMMAAD<MOHAMMED<JAVE
1 W4860365<6IND0S03316M32101013076941889422<10
`;

const res = extractPassportMrzFromText(testRawOcrGarbled);

console.log('=== TEST MRZ ROBUSTNESS WITH NOISE DIGIT & LETTER S ===');
console.log('Parsed non-null:', res !== null);
if (res) {
  console.log('Passport Number:', res.passport_number.value);
  console.log('Nationality:    ', res.nationality.value);
  console.log('Date of Birth:  ', res.date_of_birth.value);
  console.log('Gender:         ', res.gender.value);
  console.log('Expiry Date:    ', res.expiry_date.value);
  console.log('MRZ Valid:      ', res.mrzValid);
}
