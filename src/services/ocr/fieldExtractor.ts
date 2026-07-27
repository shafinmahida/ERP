/**
 * DAYAR-E-HABIB ERP — MULTI-ANGLE AUTO-ROTATION DOCUMENT INTELLIGENCE PIPELINE
 *
 * FIELD EXTRACTION PRIORITY:
 * 1. MRZ checksummed fields: passport_number, dob, expiry, gender, nationality — HIGHEST priority
 * 2. Visual bio page text: full_name (preferred over MRZ which truncates), issue_date, place_of_issue
 * 3. Visual observation page: father_name (Indian passports), place_of_birth
 *
 * ZERO MOCK DATA POLICY — every extracted value must originate directly from the image.
 */

import { preprocessImageForOcr, PreprocessedImageResult } from './imagePreprocessor';
import { runOfflineOcr, OcrEngineOutput } from './ocrEngine';
import {
  parseTd3MrzLines,
  extractPassportMrzFromText,
  extractVisualPassportFields,
  ParsedPassportMrz,
  getConfidenceTier,
  normalizeVisualDate,
  FieldConfidence,
} from './mrzParser';

export interface OcrDiagnosticMetadata {
  ocrEngine: string;
  ocrEngineVersion: string;
  ocrProcessedAt: string;
  mrzValidationResult: boolean;
  averageConfidenceScore: number;
  documentClassification: 'Passport' | 'Visa' | 'ID Card' | 'Other';
  discrepancyCount: number;
  detectedRotationAngle: number;
}

export interface OcrExtractionResult {
  parsedPassport: ParsedPassportMrz | null;
  rawText: string;
  diagnosticMetadata: OcrDiagnosticMetadata;
  preprocessedImage: PreprocessedImageResult;
}

/** Create a visual-sourced FieldConfidence entry */
function makeVisualField(
  value: string,
  label: string,
  score: number,
  bbox: { x: number; y: number; width: number; height: number }
): FieldConfidence {
  return {
    value,
    score: value ? score : 0,
    tier: getConfidenceTier(value ? score : 0),
    checksumPassed: false,
    formatValid: Boolean(value && value.length > 1),
    reason: value
      ? `${label} extracted from visual document text.`
      : `${label} not found in document text.`,
    boundingBox: bbox,
  };
}

/**
 * Merges MRZ-parsed fields with visual text extraction results.
 * Visual text is preferred for name (MRZ truncates) and for fields
 * not present in MRZ (father name, issue date, place of issue).
 */
function mergeMrzWithVisual(
  mrzResult: ParsedPassportMrz,
  visual: ReturnType<typeof extractVisualPassportFields>,
  combinedText: string
): ParsedPassportMrz {
  const merged = { ...mrzResult };

  // Full name: prefer visual bio page text over MRZ (MRZ line 1 is 44 chars so names are truncated)
  if (visual.fullName && visual.fullName.length > mrzResult.full_name.value.length) {
    merged.full_name = {
      ...mrzResult.full_name,
      value: visual.fullName,
      score: Math.min(95, mrzResult.full_name.score + 5),
      reason: 'Full name from visual bio page text (preferred over truncated MRZ name).',
    };
  }

  // Father's name — not in MRZ, only from visual observation page
  if (visual.fatherName) {
    merged.father_name = makeVisualField(visual.fatherName, "Father's Name", 78, { x: 5, y: 45, width: 50, height: 10 });
  } else {
    // Secondary attempt: look for patterns common in Indian passport last-page layout
    // The holder's father name often appears as a full-caps line near "FATHER" keyword
    const fatherAttempt = extractFatherNameFromText(combinedText, mrzResult.full_name.value);
    if (fatherAttempt) {
      merged.father_name = makeVisualField(fatherAttempt, "Father's Name (inferred)", 60, { x: 5, y: 45, width: 50, height: 10 });
    }
  }

  // Issue date — not in MRZ, from bio page visual text
  if (visual.issueDate) {
    const iso = normalizeVisualDate(visual.issueDate);
    merged.issue_date = makeVisualField(iso, 'Issue Date', 80, { x: 5, y: 55, width: 25, height: 10 });
  }

  // Place of issue
  if (visual.placeOfIssue) {
    merged.place_of_issue = makeVisualField(visual.placeOfIssue, 'Place of Issue', 75, { x: 30, y: 55, width: 30, height: 10 });
  }

  // Place of birth
  if (visual.placeOfBirth) {
    merged.place_of_birth = makeVisualField(visual.placeOfBirth, 'Place of Birth', 75, { x: 5, y: 60, width: 30, height: 10 });
  }

  // Recalculate overall confidence (MRZ checksummed fields only)
  const mandatoryScores = [
    merged.passport_number.score,
    merged.date_of_birth.score,
    merged.expiry_date.score,
  ];
  merged.overallConfidenceScore = Math.min(...mandatoryScores);
  merged.overallConfidenceTier = getConfidenceTier(merged.overallConfidenceScore);

  return merged;
}

/**
 * Attempts to extract father's name from raw OCR text using heuristics specific
 * to Indian passports. The observation page lists:
 *   Father's Name / FATHER'S NAME: <name>
 *   or a full-caps name block near the "EMIGRATION CHECK" section.
 */
function extractFatherNameFromText(text: string, holderName: string): string {
  const upper = text.toUpperCase();
  const lines = upper.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Strategy 1: "FATHER" keyword on a line, name follows on same or next line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/FATHER/.test(line)) {
      // Extract inline name after keyword
      const inline = line.replace(/FATHER['\u2019S]*\s*(NAME)?[:\s\/]*/i, '').trim();
      if (inline.length > 4 && /^[A-Z][A-Z\s]+$/.test(inline) && inline !== holderName.toUpperCase()) {
        return inline;
      }
      // Next line may have the name
      const nextLine = (lines[i + 1] || '').trim();
      if (nextLine.length > 4 && /^[A-Z][A-Z\s]+$/.test(nextLine) && nextLine !== holderName.toUpperCase()) {
        return nextLine;
      }
    }
  }

  // Strategy 2: In Indian passports, after "SATRA BANU..." or "MOTHER" line is the father block
  // The father's name is typically the SECOND full-caps name block on the observation page
  // that is different from the holder's own name
  const holderParts = holderName.toUpperCase().split(/\s+/).filter(Boolean);
  const nameBlockLines = lines.filter((l) => /^[A-Z]{3,}(\s[A-Z]{3,})+$/.test(l));

  for (const nameLine of nameBlockLines) {
    const isHolder = holderParts.every((part) => nameLine.includes(part));
    if (!isHolder && nameLine.length > 8) {
      return nameLine;
    }
  }

  return '';
}

export async function processPassportScan(
  imageSource: HTMLImageElement | HTMLCanvasElement,
  userRequestedAngle: number = 0
): Promise<OcrExtractionResult> {
  // Test rotation angles starting from requested, then 0, 90, 270, 180
  const rotationAngles = Array.from(new Set([userRequestedAngle, 0, 90, 270, 180]));

  let bestResult: OcrExtractionResult | null = null;
  let bestMrz: ParsedPassportMrz | null = null;
  let bestAngle = userRequestedAngle;

  for (const angle of rotationAngles) {
    const preprocessed = preprocessImageForOcr(imageSource, { enhanceContrast: true, rotateAngle: angle });

    // Run OCR on MRZ crop + full image
    const fullOcr: OcrEngineOutput = await runOfflineOcr(preprocessed.dataUrl);
    let mrzOcr: OcrEngineOutput = {
      rawText: '', lines: [], engineName: fullOcr.engineName, engineVersion: fullOcr.engineVersion,
      processedAt: fullOcr.processedAt, averageConfidence: 0,
    };
    if (preprocessed.mrzDataUrl) {
      mrzOcr = await runOfflineOcr(preprocessed.mrzDataUrl);
    }

    const combinedRawText = `${mrzOcr.rawText}\n${fullOcr.rawText}`.trim();
    const combinedLines = [...mrzOcr.lines, ...fullOcr.lines];

    // Try MRZ parsing at this rotation
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

    // Always extract visual fields to supplement MRZ
    const visualFields = extractVisualPassportFields(combinedRawText);

    // If we found a valid MRZ — merge visual fields in and select this as best
    if (parsedMrz && parsedMrz.mrzValid) {
      const enriched = mergeMrzWithVisual(parsedMrz, visualFields, combinedRawText);
      bestMrz = enriched;
      bestAngle = angle;
      bestResult = {
        parsedPassport: enriched,
        rawText: combinedRawText,
        diagnosticMetadata: {
          ocrEngine: fullOcr.engineName,
          ocrEngineVersion: fullOcr.engineVersion,
          ocrProcessedAt: fullOcr.processedAt,
          mrzValidationResult: true,
          averageConfidenceScore: enriched.overallConfidenceScore,
          documentClassification: 'Passport',
          discrepancyCount: 0,
          detectedRotationAngle: angle,
        },
        preprocessedImage: preprocessed,
      };
      break; // optimal orientation found
    }

    // Partial MRZ or visual-only match
    if (!bestMrz && (parsedMrz || visualFields.passportNumber)) {
      const enriched = parsedMrz
        ? mergeMrzWithVisual(parsedMrz, visualFields, combinedRawText)
        : null;
      bestMrz = enriched;
      bestAngle = angle;
      bestResult = {
        parsedPassport: enriched,
        rawText: combinedRawText,
        diagnosticMetadata: {
          ocrEngine: fullOcr.engineName,
          ocrEngineVersion: fullOcr.engineVersion,
          ocrProcessedAt: fullOcr.processedAt,
          mrzValidationResult: false,
          averageConfidenceScore: enriched?.overallConfidenceScore || 40,
          documentClassification: 'Passport',
          discrepancyCount: 0,
          detectedRotationAngle: angle,
        },
        preprocessedImage: preprocessed,
      };
    }
  }

  // Final fallback — no MRZ found at any angle
  if (!bestResult) {
    const fallbackPreprocessed = preprocessImageForOcr(imageSource, { enhanceContrast: true, rotateAngle: userRequestedAngle });
    const fallbackOcr = await runOfflineOcr(fallbackPreprocessed.dataUrl);
    const fallbackText = fallbackOcr.rawText;
    const visualFields = extractVisualPassportFields(fallbackText);

    // Build a visual-only result so the user can still see extracted fields
    let visualOnlyParsed: ParsedPassportMrz | null = null;
    if (visualFields.fullName || visualFields.passportNumber) {
      visualOnlyParsed = {
        full_name: makeVisualField(visualFields.fullName, 'Full Name', 60, { x: 5, y: 15, width: 50, height: 15 }),
        passport_number: makeVisualField(visualFields.passportNumber, 'Passport Number', 55, { x: 5, y: 70, width: 25, height: 10 }),
        nationality: makeVisualField('', 'Nationality', 0, { x: 30, y: 35, width: 20, height: 10 }),
        date_of_birth: makeVisualField(normalizeVisualDate(visualFields.dateOfBirth), 'Date of Birth', 55, { x: 30, y: 70, width: 20, height: 10 }),
        gender: makeVisualField(visualFields.gender, 'Gender', 60, { x: 50, y: 35, width: 10, height: 10 }),
        expiry_date: makeVisualField(normalizeVisualDate(visualFields.expiryDate), 'Expiry Date', 55, { x: 55, y: 70, width: 20, height: 10 }),
        father_name: makeVisualField(visualFields.fatherName, "Father's Name", 55, { x: 5, y: 45, width: 50, height: 10 }),
        issue_date: makeVisualField(normalizeVisualDate(visualFields.issueDate), 'Issue Date', 55, { x: 5, y: 55, width: 25, height: 10 }),
        place_of_issue: makeVisualField(visualFields.placeOfIssue, 'Place of Issue', 55, { x: 30, y: 55, width: 30, height: 10 }),
        place_of_birth: makeVisualField(visualFields.placeOfBirth, 'Place of Birth', 55, { x: 5, y: 60, width: 30, height: 10 }),
        mrzValid: false,
        mrzRawLine1: '',
        mrzRawLine2: '',
        documentType: 'Passport',
        overallConfidenceScore: 50,
        overallConfidenceTier: 'Low',
      };
    }

    bestResult = {
      parsedPassport: visualOnlyParsed,
      rawText: fallbackText,
      diagnosticMetadata: {
        ocrEngine: fallbackOcr.engineName,
        ocrEngineVersion: fallbackOcr.engineVersion,
        ocrProcessedAt: fallbackOcr.processedAt,
        mrzValidationResult: false,
        averageConfidenceScore: 0,
        documentClassification: 'Passport',
        discrepancyCount: 0,
        detectedRotationAngle: userRequestedAngle,
      },
      preprocessedImage: fallbackPreprocessed,
    };
  }

  return bestResult;
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
      detectedRotationAngle: 0,
    },
  };
}
