import fs from 'fs';
import path from 'path';

const transcriptPath = `C:\\Users\\Asus\\.gemini\\antigravity\\brain\\7950b7cd-69c1-41a4-ac82-125a8fdecb9c\\.system_generated\\logs\\transcript.jsonl`;
if (fs.existsSync(transcriptPath)) {
  const content = fs.readFileSync(transcriptPath, 'utf-8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.toLowerCase().includes('condition') || line.toLowerCase().includes('jurisdiction') || line.toLowerCase().includes('liability') || line.toLowerCase().includes('cancellation')) {
      console.log(`Line ${i}:`, line.substring(0, 300));
    }
  }
} else {
  console.log('Transcript file not found');
}
