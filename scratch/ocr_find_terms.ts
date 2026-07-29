import fs from 'fs';
import path from 'path';
import tesseract from 'tesseract.js';

async function scanForTerms() {
  const dir = `C:\\Users\\Asus\\.gemini\\antigravity\\brain\\7950b7cd-69c1-41a4-ac82-125a8fdecb9c\\.user_uploaded`;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    console.log(`Scanning ${file}...`);
    try {
      const res = await tesseract.recognize(fullPath, 'eng');
      const text = res.data.text;
      if (text.toLowerCase().includes('condition') || text.toLowerCase().includes('subject') || text.toLowerCase().includes('receipt') || text.toLowerCase().includes('jurisdiction') || text.toLowerCase().includes('mumbai')) {
        console.log(`\n================ FOUND MATCH IN ${file} ================`);
        console.log(text);
        console.log(`=======================================================\n`);
      }
    } catch (e) {
      console.error(`Error scanning ${file}:`, e);
    }
  }
}

scanForTerms().catch(console.error);
