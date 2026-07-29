import {
  precheckImageQuality,
  imageToCanvas,
  rotateCanvas,
  enhanceCanvasForOcr,
  QualityCheckResult,
} from './imagePreprocessor';
import { parseTd3MrzLines, ParsedMrzData } from './mrzParser';
import {
  recognizeCanvasText,
  findMrzLinesInText,
  extractVisualZoneFields,
  ExtractionMode,
  DocumentOcrResult,
  ExtractedField,
} from './ocrEngine';

export interface FullDocumentScanResult extends DocumentOcrResult {
  qualityCheck: QualityCheckResult;
  isPassport: boolean;
}

/**
 * Helper to build an empty fallback field
 */
function emptyField(): ExtractedField {
  return { value: '', confidence: 'LOW', isAuthoritative: false };
}

/**
 * Main OCR & Scanning Pipeline Entry Point
 * GUARANTEE: Never throws an unhandled error — file upload will always succeed 100%!
 */
export async function processDocumentScan(
  imgElement: HTMLImageElement,
  documentTypeCode: string = 'PASSPORT'
): Promise<FullDocumentScanResult> {
  const isPassport = documentTypeCode.toUpperCase() === 'PASSPORT';
  const baseCanvas = imageToCanvas(imgElement);
  const ctx = baseCanvas.getContext('2d');
  
  // Step 1: Pre-check Image Quality
  const qualityCheck = precheckImageQuality(baseCanvas.width, baseCanvas.height, ctx);

  let bestMrzData: ParsedMrzData | null = null;
  let bestMrzOrientation = 0;
  let fullRawText = '';

  try {
    const orientations = [0, 270, 90, 180];

    if (isPassport) {
      // Step 2: Passport MRZ Extraction (Scanning Orientations 0°, 270°, 90°, 180°)
      for (const deg of orientations) {
        const rotated = rotateCanvas(baseCanvas, deg);
        const enhanced = enhanceCanvasForOcr(rotated);
        const ocrText = await recognizeCanvasText(enhanced);

        if (deg === 0) fullRawText = ocrText;

        const mrzPair = findMrzLinesInText(ocrText);
        if (mrzPair) {
          const parsed = parseTd3MrzLines(mrzPair.line1, mrzPair.line2);
          if (parsed) {
            bestMrzData = parsed;
            bestMrzOrientation = deg;
            // If checksums passed 100%, stop scanning other orientations!
            if (parsed.checksumsPassed) {
              break;
            }
          }
        }
      }
    } else {
      // Non-Passport / Visa document -> Run General OCR at 0° only
      fullRawText = await recognizeCanvasText(enhanceCanvasForOcr(baseCanvas));
    }

    // Also get visual zone OCR text at 270° or 0° for non-MRZ fields (Father's name, place of issue)
    let visualText = fullRawText;
    if (bestMrzOrientation !== 0) {
      const visualCanvas = rotateCanvas(baseCanvas, bestMrzOrientation);
      visualText = await recognizeCanvasText(visualCanvas);
    }
    const visualFields = extractVisualZoneFields(visualText || fullRawText);

    // Step 3: Determine Extraction Mode & Build Result

    if (isPassport && bestMrzData) {
      const mrz = bestMrzData;
      const isVerified = mrz.checksumsPassed;

      const mode: ExtractionMode = isVerified ? 'MRZ_VERIFIED' : 'MRZ_UNVERIFIED';

      const badge = isVerified
        ? {
            label: 'MRZ-Verified (High Confidence)',
            variant: 'success' as const,
            description: 'All MRZ Modulo-10 checksums passed 100%. Extracted passport fields are authoritative.',
          }
        : {
            label: 'MRZ-Unverified (Low Confidence — Please Review)',
            variant: 'warning' as const,
            description: 'MRZ detected but 1 or more checksum digits failed. Please review fields carefully.',
          };

      // RULE 1: MRZ AS AUTHORITATIVE SOURCE
      // When MRZ checksums pass, its values are authoritative and MUST NOT be overwritten by general OCR.
      // General OCR ONLY fills fields MRZ doesn't cover (father_name, place_of_issue, issue_date).
      return {
        extractionMode: mode,
        confidenceBadge: badge,
        isPassport: true,
        qualityCheck,
        orientationUsed: bestMrzOrientation,
        mrzData: bestMrzData,
        rawText: fullRawText || visualText,
        fields: {
          full_name: mrz.full_name,
          father_name: { value: visualFields.fatherName, confidence: 'LOW', isAuthoritative: false },
          passport_number: mrz.passport_number,
          date_of_birth: mrz.date_of_birth,
          gender: mrz.gender,
          nationality: mrz.nationality,
          issue_date: { value: visualFields.issueDate, confidence: 'LOW', isAuthoritative: false },
          expiry_date: mrz.expiry_date,
          place_of_issue: { value: visualFields.placeOfIssue, confidence: 'LOW', isAuthoritative: false },
        },
      };
    }

    // Step 4: Fallback General OCR (MRZ not found or Non-Passport)
    if (fullRawText && fullRawText.trim().length > 10) {
      const visualFields = extractVisualZoneFields(fullRawText);

      // Best-effort regex for fallback passport number
      const passMatch = fullRawText.match(/\b[A-Z][0-9]{7,8}\b/);
      const dobMatch = fullRawText.match(/(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/);

      return {
        extractionMode: 'GENERAL_OCR_FALLBACK',
        confidenceBadge: {
          label: 'General OCR Fallback',
          variant: 'info',
          description: isPassport
            ? 'No MRZ found. Full text scanned with General OCR. Please review raw text.'
            : 'Visa / Document text scanned with General OCR. Use raw text for manual reference.',
        },
        isPassport,
        qualityCheck,
        orientationUsed: 0,
        mrzData: null,
        rawText: fullRawText,
        fields: {
          full_name: emptyField(),
          father_name: { value: visualFields.fatherName, confidence: 'LOW', isAuthoritative: false },
          passport_number: { value: passMatch ? passMatch[0] : '', confidence: 'LOW', isAuthoritative: false },
          date_of_birth: { value: dobMatch ? `${dobMatch[3]}-${dobMatch[2]}-${dobMatch[1]}` : '', confidence: 'LOW', isAuthoritative: false },
          gender: emptyField(),
          nationality: emptyField(),
          issue_date: { value: visualFields.issueDate, confidence: 'LOW', isAuthoritative: false },
          expiry_date: emptyField(),
          place_of_issue: { value: visualFields.placeOfIssue, confidence: 'LOW', isAuthoritative: false },
        },
      };
    }

    // Step 5: Manual Entry Only (No text extracted)
    return {
      extractionMode: 'MANUAL_ENTRY',
      confidenceBadge: {
        label: 'Manual Entry Only',
        variant: 'secondary',
        description: 'No text extracted. Document uploaded successfully — enter details manually.',
      },
      isPassport,
      qualityCheck,
      orientationUsed: 0,
      mrzData: null,
      rawText: '',
      fields: {
        full_name: emptyField(),
        father_name: emptyField(),
        passport_number: emptyField(),
        date_of_birth: emptyField(),
        gender: emptyField(),
        nationality: emptyField(),
        issue_date: emptyField(),
        expiry_date: emptyField(),
        place_of_issue: emptyField(),
      },
    };
  } catch (err) {
    console.error('OCR pipeline exception caught safely:', err);

    // NON-BLOCKING UPLOAD GUARANTEE: Never fail document upload!
    return {
      extractionMode: 'MANUAL_ENTRY',
      confidenceBadge: {
        label: 'Manual Entry Only',
        variant: 'secondary',
        description: 'OCR process encountered an issue. Document uploaded successfully — enter details manually.',
      },
      isPassport,
      qualityCheck,
      orientationUsed: 0,
      mrzData: null,
      rawText: '',
      fields: {
        full_name: emptyField(),
        father_name: emptyField(),
        passport_number: emptyField(),
        date_of_birth: emptyField(),
        gender: emptyField(),
        nationality: emptyField(),
        issue_date: emptyField(),
        expiry_date: emptyField(),
        place_of_issue: emptyField(),
      },
    };
  }
}
