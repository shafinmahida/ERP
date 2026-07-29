import sharp from 'sharp';
import tesseract from 'tesseract.js';

async function ocrRotatedReceipt() {
  const src = `C:\\Users\\Asus\\.gemini\\antigravity\\brain\\7950b7cd-69c1-41a4-ac82-125a8fdecb9c\\.user_uploaded\\media__1785165103591.jpg`;

  for (const rot of [90, 180, 270]) {
    const rotBuf = await sharp(src).rotate(rot).toBuffer();
    const res = await tesseract.recognize(rotBuf, 'eng');
    console.log(`=== ROTATION ${rot}° ===`);
    console.log(res.data.text);
    console.log(`=======================\n`);
  }
}

ocrRotatedReceipt().catch(console.error);
