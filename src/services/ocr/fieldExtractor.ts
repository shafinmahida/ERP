/**
 * DAYAR-E-HABIB ERP — PRODUCTION DOCUMENT INTELLIGENCE PIPELINE
 * 
 * CRITICAL QUALITY & COMPLIANCE REQUIREMENTS:
 * 1. ZERO mock, dummy, sample, or hardcoded identity data.
 * 2. Extracted fields MUST originate from the uploaded image document.
 * 3. MRZ is the primary source of truth for passports; VIZ text is compared for discrepancies.
 * 4. Overall document confidence is capped at the weakest critical field score.
 */

import { preprocessImageForOcr, PreprocessedImageResult } from './imagePreprocessor';
import { runOfflineOcr, OcrEngineOutput } from './ocrEngine';
import {
  parseTd3MrzLines,
  extractPassportMrzFromText,
  extractVisualPassportFields,
  ParsedPassportMrz,
  getConfidenceTier,
} from './mrzParser';

export interface OcrDiagnosticMetadata {
  ocrEngine: string;
  ocrEngineVersion: string;
  ocrProcessedAt: string;
  mrzValidationResult: boolean;
  averageConfidenceScore: number;
  documentClassification: 'Passport' | 'Visa' | 'ID Card' | 'Other';
  discrepancyCount: number;
}

export interface OcrExtractionResult {
  parsedPassport: ParsedPassportMrz | null;
  rawText: string;
  diagnosticMetadata: OcrDiagnosticMetadata;
  preprocessedImage: PreprocessedImageResult;
}

export async function processPassportScan(
  imageSource: HTMLImageElement | HTMLCanvasElement,
  rotateAngle: number = 0
): Promise<OcrExtractionResult> {
  // Step 1: Preprocess Image on Memory Canvas (Original Image Byte-for-Byte Untouched)
  const preprocessed = preprocessImageForOcr(imageSource, { enhanceContrast: true, rotateAngle });

  // Step 2: Run Real OCR Engine (Tesseract.js or Rust Backend IPC)
  // Use MRZ cropped region first for highest character recognition accuracy
  const ocrOutput: OcrEngineOutput = await runOfflineOcr(preprocessed.dataUrl);
  let mrzOcrOutput: OcrEngineOutput = { rawText: '', lines: [], engineName: '', engineVersion: '', processedAt: '', averageConfidence: 0 };

  if (preprocessed.mrzDataUrl) {
    mrzOcrOutput = await runOfflineOcr(preprocessed.mrzDataUrl);
  }

  // Step 3: Combine raw text lines from MRZ crop and full image
  const combinedRawText = `${mrzOcrOutput.rawText}\n${ocrOutput.rawText}`.trim();
  const combinedLines = [...mrzOcrOutput.lines, ...ocrOutput.lines];

  // Step 4: MRZ Line Pair Parser (Primary Source of Truth)
  let parsedMrz: ParsedPassportMrz | null = null;

  for (let i = 0; i < combinedLines.length - 1; i++) {
    const l1 = combinedLines[i];
    const l2 = combinedLines[i + 1];

    if (l1.includes('P<') || l1.startsWith('P')) {
      const res = parseTd3MrzLines(l1, l2);
      if (res) {
        parsedMrz = res;
        break;
      }
    }
  }

  if (!parsedMrz) {
    const mrzPair = extractPassportMrzFromText(combinedRawText);
    if (mrzPair) {
      parsedMrz = parseTd3MrzLines(mrzPair.line1, mrzPair.line2);
    }
  }

  // Step 5: Visual Inspection Zone (VIZ) Regex Extraction & Discrepancy Verification
  const visualFields = extractVisualPassportFields(combinedRawText);
  let discrepancyCount = 0;

  if (parsedMrz) {
    // Check for Passport Number discrepancy between MRZ and Visual text
    if (visualFields.passportNumber && visualFields.passportNumber !== parsedMrz.passport_number.value) {
      parsedMrz.passport_number.hasDiscrepancy = true;
      parsedMrz.passport_number.reason += ` (Discrepancy: Visual text shows '${visualFields.passportNumber}')`;
      discrepancyCount++;
    }

    // Check for DOB discrepancy
    if (visualFields.dateOfBirth && visualFields.dateOfBirth !== parsedMrz.date_of_birth.value) {
      parsedMrz.date_of_birth.hasDiscrepancy = true;
      parsedMrz.date_of_birth.reason += ` (Discrepancy: Visual text shows '${visualFields.dateOfBirth}')`;
      discrepancyCount++;
    }
  } else if (visualFields.passportNumber || visualFields.fullName || visualFields.dateOfBirth) {
    // VIZ-only Extraction (No valid MRZ detected)
    const passScore = visualFields.passportNumber ? 45 : 0;
    const dobScore = visualFields.dateOfBirth ? 45 : 0;
    const expScore = visualFields.expiryDate ? 45 : 0;
    const nameScore = visualFields.fullName ? 45 : 0;

    parsedMrz = {
      full_name: {
        value: visualFields.fullName,
        score: nameScore,
        tier: getConfidenceTier(nameScore),
        checksumPassed: false,
        formatValid: Boolean(visualFields.fullName),
        reason: visualFields.fullName ? 'Extracted from visual text (MRZ missing)' : 'Unreadable',
        boundingBox: { x: 5, y: 15, width: 50, height: 15 },
      },
      passport_number: {
        value: visualFields.passportNumber,
        score: passScore,
        tier: getConfidenceTier(passScore),
        checksumPassed: false,
        formatValid: Boolean(visualFields.passportNumber),
        reason: visualFields.passportNumber ? 'Extracted from visual text (MRZ missing)' : 'Unreadable',
        boundingBox: { x: 5, y: 70, width: 25, height: 10 },
      },
      nationality: {
        value: '',
        score: 0,
        tier: 'Low',
        checksumPassed: false,
        formatValid: false,
        reason: 'MRZ missing',
        boundingBox: { x: 30, y: 35, width: 20, height: 10 },
      },
      date_of_birth: {
        value: visualFields.dateOfBirth,
        score: dobScore,
        tier: getConfidenceTier(dobScore),
        checksumPassed: false,
        formatValid: Boolean(visualFields.dateOfBirth),
        reason: visualFields.dateOfBirth ? 'Extracted from visual text (MRZ missing)' : 'Unreadable',
        boundingBox: { x: 30, y: 70, width: 20, height: 10 },
      },
      gender: {
        value: visualFields.gender,
        score: 40,
        tier: 'Low',
        checksumPassed: false,
        formatValid: true,
        reason: 'Extracted from visual text',
        boundingBox: { x: 50, y: 35, width: 10, height: 10 },
      },
      expiry_date: {
        value: visualFields.expiryDate,
        score: expScore,
        tier: getConfidenceTier(expScore),
        checksumPassed: false,
        formatValid: Boolean(visualFields.expiryDate),
        reason: visualFields.expiryDate ? 'Extracted from visual text (MRZ missing)' : 'Unreadable',
        boundingBox: { x: 55, y: 70, width: 20, height: 10 },
      },
      mrzValid: false,
      mrzRawLine1: '',
      mrzRawLine2: '',
      documentType: 'Passport',
      overallConfidenceScore: Math.min(passScore, dobScore, expScore, nameScore),
      overallConfidenceTier: 'Low',
      mrzBoundingBox: { x: 5, y: 65, width: 90, height: 30 },
    };
  }

  // Step 6: Production Diagnostic Metadata
  const mrzValid = parsedMrz?.mrzValid || false;
  const overallConfidenceScore = parsedMrz?.overallConfidenceScore || 0;

  const diagnosticMetadata: OcrDiagnosticMetadata = {
    ocrEngine: ocrOutput.engineName,
    ocrEngineVersion: ocrOutput.engineVersion,
    ocrProcessedAt: ocrOutput.processedAt,
    mrzValidationResult: mrzValid,
    averageConfidenceScore: overallConfidenceScore,
    documentClassification: 'Passport',
    discrepancyCount,
  };

  return {
    parsedPassport: parsedMrz,
    rawText: combinedRawText,
    diagnosticMetadata,
    preprocessedImage: preprocessed,
  };
}

export async function processVisaScan(
  imageSource: HTMLImageElement | HTMLCanvasElement
): Promise<{ rawText: string; diagnosticMetadata: OcrDiagnosticMetadata }> {
  const preprocessed = preprocessImageForOcr(imageSource, { enhanceContrast: true });
  const ocrOutput = await runOfflineOcr(preprocessed.dataUrl);

  return {
    rawText: ocrOutput.rawText,
    diagnosticMetadata: {
      ocrEngine: ocrOutput.engineName,
      ocrEngineVersion: ocrOutput.engineVersion,
      ocrProcessedAt: ocrOutput.processedAt,
      mrzValidationResult: false,
      averageConfidenceScore: ocrOutput.averageConfidence,
      documentClassification: 'Visa',
      discrepancyCount: 0,
    },
  };
}
