import fs from 'fs';
import path from 'path';
import tesseract from 'tesseract.js';

async function scanAll() {
  const dir = `C:\\Users\\Asus\\.gemini\\antigravity\\brain\\7950b7cd-69c1-41a4-ac82-125a8fdecb9c\\.user_uploaded`;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    if (file.endsWith('.png') || file.endsWith('.jpg')) {
      const fullPath = path.join(dir, file);
      console.log(`=== TEXT FROM ${file} ===`);
      try {
        const res = await tesseract.recognize(fullPath, 'eng');
        console.log(res.data.text);
      } catch (e) {
        console.error(e);
      }
      console.log(`========================\n`);
    }
  }
}

scanAll().catch(console.error);
