import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { createWorker } from 'tesseract.js';
import { parseTd3MrzLines } from '../src/services/ocr/mrzParser';
import { findMrzLinesInText, extractVisualZoneFields } from '../src/services/ocr/ocrEngine';
import { precheckImageQuality } from '../src/services/ocr/imagePreprocessor';

const REAL_PASSPORT_IMAGE_PATH = 'C:/Users/Asus/.gemini/antigravity/brain/7950b7cd-69c1-41a4-ac82-125a8fdecb9c/.user_uploaded/media__1785166274714.jpg';
const OUTPUT_DIR = 'C:/DayarEHabibERP/scratch/ocr_test_images';

async function runRealImageOcrPipelineTest() {
  console.log('=================================================================');
  console.log('  DAYAR-E-HABIB ERP — REAL IMAGE END-TO-END OCR PIPELINE TEST');
  console.log('=================================================================\n');

  if (!fs.existsSync(REAL_PASSPORT_IMAGE_PATH)) {
    throw new Error(`Real passport image file not found at ${REAL_PASSPORT_IMAGE_PATH}`);
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const worker = await createWorker('eng');

  // --- PASS 1: Real Original Straight Image Pass ---
  console.log('--- PASS 1: Real Original Image file -> Tesseract OCR ---');
  const metadata = await sharp(REAL_PASSPORT_IMAGE_PATH).metadata();
  console.log(`Original Image File Dimensions: ${metadata.width} x ${metadata.height} px`);

  const pass1Res = await worker.recognize(REAL_PASSPORT_IMAGE_PATH);
  const rawText1 = pass1Res.data.text || '';
  console.log('\n[Pass 1 Raw OCR Text Output]:\n', rawText1);

  const mrzLines1 = findMrzLinesInText(rawText1);
  console.log('MRZ Lines Located:', mrzLines1);

  let parsed1 = null;
  if (mrzLines1) {
    parsed1 = parseTd3MrzLines(mrzLines1.line1, mrzLines1.line2);
    console.log('Parsed MRZ Output:', parsed1);
  }


  // --- PASS 2: Real 270° Rotated Image Pass ---
  console.log('\n--- PASS 2: Real 270° Rotated Image file -> Tesseract OCR ---');
  const rotatedImagePath = path.join(OUTPUT_DIR, 'passport_rotated_270.jpg');
  await sharp(REAL_PASSPORT_IMAGE_PATH)
    .rotate(270)
    .toFile(rotatedImagePath);

  const rotMeta = await sharp(rotatedImagePath).metadata();
  console.log(`Saved Rotated Image: ${rotatedImagePath} (${rotMeta.width} x ${rotMeta.height} px)`);

  // Run Tesseract directly on rotated image file
  const pass2Res = await worker.recognize(rotatedImagePath);
  const rawText2 = pass2Res.data.text || '';
  console.log('\n[Pass 2 Raw OCR Text Output (Rotated Image)]:\n', rawText2);

  const mrzLines2 = findMrzLinesInText(rawText2);
  console.log('MRZ Lines Located on Rotated Image File:', mrzLines2);


  // --- PASS 3: Real Blurry / Resized Image Pass ---
  console.log('\n--- PASS 3: Real Blurry & Low-Res Image file -> Tesseract OCR ---');
  const blurryImagePath = path.join(OUTPUT_DIR, 'passport_blurry_lowres.jpg');
  await sharp(REAL_PASSPORT_IMAGE_PATH)
    .resize(320, 240, { fit: 'fill' }) // Downscale to 320x240
    .blur(4.0) // Apply real gaussian blur
    .toFile(blurryImagePath);

  const blurMeta = await sharp(blurryImagePath).metadata();
  console.log(`Saved Blurry Image: ${blurryImagePath} (${blurMeta.width} x ${blurMeta.height} px)`);

  const qualityCheckBlur = precheckImageQuality(blurMeta.width || 320, blurMeta.height || 240, null);
  console.log('Pre-check Quality Result on Blurry Image File:');
  console.log('  isLowQuality:   ', qualityCheckBlur.isLowQuality);
  console.log('  warningMessage: ', qualityCheckBlur.warningMessage);

  const pass3Res = await worker.recognize(blurryImagePath);
  const rawText3 = pass3Res.data.text || '';
  console.log('\n[Pass 3 Raw OCR Text Output (Blurry Image File)]:\n', rawText3);

  const mrzLines3 = findMrzLinesInText(rawText3);
  console.log('MRZ Lines Located on Blurry Image File:', mrzLines3);

  let parsed3 = null;
  if (mrzLines3) {
    parsed3 = parseTd3MrzLines(mrzLines3.line1, mrzLines3.line2);
    console.log('Parsed MRZ from Blurry Image:', parsed3);
  } else {
    console.log('No valid MRZ detected on blurred image file (as expected for severe blur).');
  }

  await worker.terminate();

  console.log('\n=================================================================');
  console.log('  REAL IMAGE END-TO-END OCR PIPELINE TEST COMPLETED');
  console.log('=================================================================');
}

runRealImageOcrPipelineTest().catch(console.error);
