import fs from 'fs';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import {
  parseTd3MrzLines,
  extractPassportMrzFromText,
  extractVisualPassportFields,
  mergeMrzWithVisual,
} from '../src/services/ocr/mrzParser';

const PASSPORT_PATH = 'C:\\Users\\Asus\\.gemini\\antigravity\\brain\\7950b7cd-69c1-41a4-ac82-125a8fdecb9c\\.user_uploaded\\media__1785166274714.jpg';

async function testDualStage() {
  console.log('=== DUAL-STAGE ORCHESTRATOR TEST ===');
  const worker = await createWorker('eng');
  const buf0 = fs.readFileSync(PASSPORT_PATH);

  // Stage 1: 0° OCR for MRZ
  await worker.setParameters({ tessedit_pageseg_mode: '3' });
  const ocr0 = await worker.recognize(buf0);
  const mrz0 = extractPassportMrzFromText(ocr0.data.text);

  console.log('Stage 1 (0°) MRZ Result:');
  console.log('MRZ Valid:', mrz0?.mrzValid);
  console.log('Passport No:', mrz0?.passport_number.value);
  console.log('DOB:', mrz0?.date_of_birth.value);
  console.log('Expiry:', mrz0?.expiry_date.value);
  console.log('Gender:', mrz0?.gender.value);

  // Stage 2: 270° OCR for Visual Fields
  const buf270 = await sharp(buf0).rotate(270).toBuffer();
  const ocr270 = await worker.recognize(buf270);

  const surname = mrz0?.full_name.value.split(' ').pop() || 'BUMEDIA';
  const given = mrz0?.full_name.value.split(' ').slice(0, -1).join(' ') || '';
  const dob = mrz0?.date_of_birth.value || '';
  const expiry = mrz0?.expiry_date.value || '';

  const visual = extractVisualPassportFields(ocr270.data.text, surname, given, dob, expiry);

  console.log('\nStage 2 (270°) Visual Fields Result:');
  console.log('Full Name:', visual.fullName);
  console.log('Father Name:', visual.fatherName);
  console.log('Issue Date:', visual.issueDate);
  console.log('Place of Issue:', visual.placeOfIssue);

  // Final Merged Output
  if (mrz0) {
    const finalResult = mergeMrzWithVisual(mrz0, visual, ocr270.data.text);
    console.log('\n=================================================================');
    console.log('  FINAL VERIFIED RESULTS');
    console.log('=================================================================');
    console.log('Full Name:      ', finalResult.full_name.value);
    console.log("Father's Name:  ", finalResult.father_name.value);
    console.log('Passport Number:', finalResult.passport_number.value);
    console.log('Nationality:    ', finalResult.nationality.value);
    console.log('Date of Birth:  ', finalResult.date_of_birth.value);
    console.log('Gender:         ', finalResult.gender.value);
    console.log('Date of Issue:  ', finalResult.issue_date.value);
    console.log('Expiry Date:    ', finalResult.expiry_date.value);
    console.log('Place of Issue: ', finalResult.place_of_issue.value);
    console.log('MRZ Valid:      ', finalResult.mrzValid);
    console.log('Overall Score:  ', finalResult.overallConfidenceScore + '% (' + finalResult.overallConfidenceTier + ')');
  }

  await worker.terminate();
}

testDualStage().catch(console.error);
