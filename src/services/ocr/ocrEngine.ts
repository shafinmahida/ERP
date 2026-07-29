import { createWorker } from 'tesseract.js';
import { rotateCanvas, enhanceCanvasForOcr } from './imagePreprocessor';
import { parseTd3MrzLines, ParsedMrzData } from './mrzParser';

export type ExtractionMode =
  | 'MRZ_VERIFIED' // Green Badge: Checksums passed 100%, MRZ authoritative
  | 'MRZ_UNVERIFIED' // Amber Badge: Checksum mismatch, needs operator review
  | 'GENERAL_OCR_FALLBACK' // Slate Badge: No MRZ found, raw text extracted
  | 'MANUAL_ENTRY'; // Slate Badge: No text extracted or non-passport doc

export interface ExtractedField {
  value: string;
  confidence: 'HIGH' | 'LOW';
  isAuthoritative: boolean;
}

export interface DocumentOcrResult {
  extractionMode: ExtractionMode;
  confidenceBadge: {
    label: string;
    variant: 'success' | 'warning' | 'info' | 'secondary';
    description: string;
  };
  fields: {
    full_name: ExtractedField;
    father_name: ExtractedField;
    passport_number: ExtractedField;
    date_of_birth: ExtractedField;
    gender: ExtractedField;
    nationality: ExtractedField;
    issue_date: ExtractedField;
    expiry_date: ExtractedField;
    place_of_issue: ExtractedField;
  };
  mrzData: ParsedMrzData | null;
  rawText: string;
  orientationUsed: number;
}

/**
 * Creates an offline Tesseract Worker configured for clean alphanumeric OCR.
 */
let tesseractWorkerPromise: Promise<any> | null = null;

async function getTesseractWorker() {
  if (!tesseractWorkerPromise) {
    tesseractWorkerPromise = (async () => {
      const worker = await createWorker('eng');
      return worker;
    })();
  }
  return await tesseractWorkerPromise;
}

/**
 * Runs Tesseract OCR on a canvas and extracts text.
 */
export async function recognizeCanvasText(canvas: HTMLCanvasElement): Promise<string> {
  try {
    const worker = await getTesseractWorker();
    const ret = await worker.recognize(canvas);
    return ret.data.text || '';
  } catch (err) {
    console.warn('Tesseract OCR error:', err);
    return '';
  }
}

/**
 * Finds MRZ 2 lines (44 characters each starting with P< or P) in text snippet.
 */
export function findMrzLinesInText(text: string): { line1: string; line2: string } | null {
  const lines = text
    .split('\n')
    .map((l) => l.trim().replace(/\s+/g, ''))
    .filter((l) => l.length >= 28);

  for (let i = 0; i < lines.length; i++) {
    const l1 = lines[i];
    if (l1.startsWith('P<') || l1.startsWith('P') || l1.includes('<<')) {
      // Look for line 2 immediately following or 1-2 lines after
      for (let j = i + 1; j <= Math.min(i + 3, lines.length - 1); j++) {
        const l2 = lines[j];
        if (l2.length >= 28 && /[0-9A-Z<]{28,}/.test(l2)) {
          return { line1: l1, line2: l2 };
        }
      }
    }
  }

  return null;
}

/**
 * Extracts visual zone non-MRZ fields (Father's Name, Issue Date, Place of Issue) from general text.
 */
export function extractVisualZoneFields(text: string) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  let fatherName = '';
  let placeOfIssue = '';
  let issueDate = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Father's Name anchor
    if (/father|husband|mother|guardian/i.test(line)) {
      if (line.includes(':') || line.includes('-')) {
        const parts = line.split(/[:\-]+/);
        if (parts.length >= 2) fatherName = parts[1].trim();
      } else if (i + 1 < lines.length) {
        fatherName = lines[i + 1].trim();
      }
    }

    // Place of issue anchor
    if (/place of issue|issuing authority|issue place/i.test(line)) {
      if (line.includes(':') || line.includes('-')) {
        const parts = line.split(/[:\-]+/);
        if (parts.length >= 2) placeOfIssue = parts[1].trim();
      } else if (i + 1 < lines.length) {
        placeOfIssue = lines[i + 1].trim();
      }
    } else if (/\b(MUMBAI|DELHI|ISLAMABAD|LAHORE|KARACHI|PESHAWAR|QUETTA|HYDERABAD|BANGALORE|CHENNAI|KOLKATA|LUCKNOW|AHMEDABAD)\b/i.test(line)) {
      if (!placeOfIssue) {
        const match = line.match(/\b(MUMBAI|DELHI|ISLAMABAD|LAHORE|KARACHI|PESHAWAR|QUETTA|HYDERABAD|BANGALORE|CHENNAI|KOLKATA|LUCKNOW|AHMEDABAD)\b/i);
        if (match) placeOfIssue = match[0].toUpperCase();
      }
    }

    // Issue Date regex (DD/MM/YYYY)
    if (/issue|date of issue|issued/i.test(line) || (!issueDate && /\b\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}\b/.test(line))) {
      const dateMatch = line.match(/\b(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})\b/);
      if (dateMatch) {
        issueDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
      }
    }
  }

  return { fatherName, placeOfIssue, issueDate };
}
