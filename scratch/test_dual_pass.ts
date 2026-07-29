import fs from 'fs';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';

const PASSPORT_PATH = 'C:\\Users\\Asus\\.gemini\\antigravity\\brain\\7950b7cd-69c1-41a4-ac82-125a8fdecb9c\\.user_uploaded\\media__1785166274714.jpg';

async function testDualPass() {
  console.log('Testing Dual-Pass (0° for MRZ + 270° for Visual)...');
  const worker = await createWorker('eng');
  const buf = fs.readFileSync(PASSPORT_PATH);

  // Pass 1: 0° (Original) for pristine MRZ
  await worker.setParameters({ tessedit_pageseg_mode: '3' });
  const res0 = await worker.recognize(buf);
  console.log('=== PASS 1: 0° OCR TEXT ===');
  console.log(res0.data.text);

  // Pass 2: 270° for upright visual fields (Father name, observation page, etc.)
  const buf270 = await sharp(buf).rotate(270).toBuffer();
  const res270 = await worker.recognize(buf270);
  console.log('\n=== PASS 2: 270° OCR TEXT ===');
  console.log(res270.data.text);

  await worker.terminate();
}

testDualPass().catch(console.error);
