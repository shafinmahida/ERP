import { createWorker } from 'tesseract.js';

const PASSPORT_PATH = 'C:\\Users\\Asus\\.gemini\\antigravity\\brain\\7950b7cd-69c1-41a4-ac82-125a8fdecb9c\\.user_uploaded\\media__1785166274714.jpg';

async function testAll() {
  console.log('Testing raw passport image OCR...');
  const worker = await createWorker('eng');
  
  await worker.setParameters({ tessedit_pageseg_mode: '3' });
  const ret3 = await worker.recognize(PASSPORT_PATH);
  console.log(`--- PSM 3 Output (${ret3.data.text.length} chars) ---`);
  console.log(ret3.data.text);
  
  await worker.terminate();
}

testAll().catch(console.error);
