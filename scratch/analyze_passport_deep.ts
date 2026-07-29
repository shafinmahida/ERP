import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';

const PASSPORT_PATH = 'C:\\Users\\Asus\\.gemini\\antigravity\\brain\\7950b7cd-69c1-41a4-ac82-125a8fdecb9c\\.user_uploaded\\media__1785166274714.jpg';

async function testPassportEnhancements() {
  const worker = await createWorker('eng');

  // Load image dimensions
  const metadata = await sharp(PASSPORT_PATH).metadata();
  console.log(`Original image: width=${metadata.width}, height=${metadata.height}, format=${metadata.format}`);

  // Test cases:
  // 1. Full image at 0 deg, 90 deg, 180 deg, 270 deg
  // 2. Left half (Bio page) vs Right half (Address page)
  // 3. Upscaled 2x
  // 4. Contrast / sharpening

  for (const angle of [0, 90, 180, 270]) {
    console.log(`\n=================== ANGLE ${angle}° ===================`);
    const rotated = sharp(PASSPORT_PATH).rotate(angle);
    const buf = await rotated.toBuffer();
    
    await worker.setParameters({ tessedit_pageseg_mode: '3' });
    const res = await worker.recognize(buf);
    console.log(`=== FULL IMAGE (${angle}°) ===`);
    console.log(res.data.text);
    
    // Also crop left half (bio page) and right half (address page)
    const rotMeta = await sharp(buf).metadata();
    const w = rotMeta.width || 1000;
    const h = rotMeta.height || 1000;
    
    // Left half crop (0..0.5 w)
    const leftBuf = await sharp(buf).extract({ left: 0, top: 0, width: Math.floor(w * 0.52), height: h }).toBuffer();
    const leftRes = await worker.recognize(leftBuf);
    console.log(`--- LEFT HALF (${angle}°) ---`);
    console.log(leftRes.data.text);

    // Right half crop (0.48..1.0 w)
    const rightBuf = await sharp(buf).extract({ left: Math.floor(w * 0.48), top: 0, width: Math.floor(w * 0.52), height: h }).toBuffer();
    const rightRes = await worker.recognize(rightBuf);
    console.log(`--- RIGHT HALF (${angle}°) ---`);
    console.log(rightRes.data.text);

    // MRZ Zone crop (bottom 35% of left page or full image)
    const mrzBuf = await sharp(buf).extract({ left: 0, top: Math.floor(h * 0.6), width: w, height: Math.floor(h * 0.4) }).toBuffer();
    await worker.setParameters({ tessedit_pageseg_mode: '6' }); // Single block
    const mrzRes = await worker.recognize(mrzBuf);
    console.log(`--- MRZ CROP (${angle}°, PSM 6) ---`);
    console.log(mrzRes.data.text);
  }

  await worker.terminate();
}

testPassportEnhancements().catch(console.error);
