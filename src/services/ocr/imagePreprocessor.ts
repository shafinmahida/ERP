/**
 * DAYAR-E-HABIB ERP — PRODUCTION-GRADE OCR IMAGE PREPROCESSING PIPELINE
 *
 * DESIGN PRINCIPLES:
 * 1. Never modify or mutate the uploaded original image.
 * 2. All enhancements operate on temporary in-memory Canvas copies only.
 * 3. MRZ crop covers 45%–100% of image height to handle combined multi-page scans
 *    (e.g. bio page + observation page in a single image) instead of hardcoding bottom 35%.
 * 4. Binarization parameters are tuned to be readable by Tesseract — not overly aggressive.
 * 5. No scale-up: keeps OCR pass time predictable and avoids Tesseract timeouts.
 */

export interface PreprocessedImageResult {
  workingCanvas: HTMLCanvasElement | null;
  mrzCroppedCanvas: HTMLCanvasElement | null;
  dataUrl: string;
  mrzDataUrl: string;
  isRotated: boolean;
  angle: number;
}

export function preprocessImageForOcr(
  imageSource: HTMLImageElement | HTMLCanvasElement,
  options: { enhanceContrast?: boolean; rotateAngle?: number } = {}
): PreprocessedImageResult {
  if (typeof document === 'undefined') {
    return { workingCanvas: null, mrzCroppedCanvas: null, dataUrl: '', mrzDataUrl: '', isRotated: false, angle: 0 };
  }

  const srcWidth = imageSource.width || 800;
  const srcHeight = imageSource.height || 600;
  const angle = options.rotateAngle || 0;
  const isRotated = angle !== 0;

  // ─── Step 1: Rotate ────────────────────────────────────────────────────────────
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return { workingCanvas: null, mrzCroppedCanvas: null, dataUrl: '', mrzDataUrl: '', isRotated: false, angle: 0 };
  }

  if (angle === 90 || angle === 270) {
    canvas.width = srcHeight;
    canvas.height = srcWidth;
  } else {
    canvas.width = srcWidth;
    canvas.height = srcHeight;
  }

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((angle * Math.PI) / 180);
  ctx.drawImage(imageSource, -srcWidth / 2, -srcHeight / 2);
  ctx.restore();

  // ─── Step 2: Grayscale + Moderate Contrast Enhancement ────────────────────────
  // Contrast multiplier 1.8 is well-tested. Threshold 120 gives clean binarization
  // without destroying low-contrast text areas (common on watermarked passport pages).
  if (options.enhanceContrast !== false) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Luminance-weighted grayscale
      let gray = 0.299 * r + 0.587 * g + 0.114 * b;
      // Contrast stretch
      gray = (gray - 128) * 1.8 + 128;
      gray = Math.max(0, Math.min(255, gray));
      // Moderate binarization
      const finalVal = gray < 120 ? Math.max(0, gray - 30) : Math.min(255, gray + 30);

      data[i] = finalVal;
      data[i + 1] = finalVal;
      data[i + 2] = finalVal;
    }

    ctx.putImageData(imageData, 0, 0);
  }

  const fullDataUrl = canvas.toDataURL('image/png');

  // ─── Step 3: MRZ Region Crop ───────────────────────────────────────────────────
  // FIX: Previously hardcoded to bottom 35% (height * 0.65 → height).
  // Indian passport scans often come as combined two-page images (bio page + back page).
  // MRZ lines fall in the LOWER HALF of the bio page = roughly 40%–60% of the combined image.
  // Solution: expand MRZ crop to cover 45%–100% of total image height.
  // This is still fast (55% of image) but catches MRZ wherever it appears.
  const mrzCanvas = document.createElement('canvas');
  const mrzCtx = mrzCanvas.getContext('2d', { willReadFrequently: true });

  const mrzStartY = Math.floor(canvas.height * 0.45); // was 0.65
  const mrzH = canvas.height - mrzStartY;

  mrzCanvas.width = canvas.width;
  mrzCanvas.height = mrzH;

  let mrzDataUrl = '';
  if (mrzCtx) {
    mrzCtx.drawImage(canvas, 0, mrzStartY, canvas.width, mrzH, 0, 0, canvas.width, mrzH);
    // Slightly more aggressive contrast specifically for MRZ zone
    const mrzData = mrzCtx.getImageData(0, 0, mrzCanvas.width, mrzCanvas.height);
    const md = mrzData.data;
    for (let i = 0; i < md.length; i += 4) {
      let g = md[i]; // already grayscale from step 2
      g = (g - 128) * 1.3 + 128; // additional 1.3× contrast boost for MRZ
      g = Math.max(0, Math.min(255, g));
      const v = g < 110 ? 0 : 255; // hard threshold for clean MRZ lines
      md[i] = v; md[i + 1] = v; md[i + 2] = v;
    }
    mrzCtx.putImageData(mrzData, 0, 0);
    mrzDataUrl = mrzCanvas.toDataURL('image/png');
  }

  return {
    workingCanvas: canvas,
    mrzCroppedCanvas: mrzCanvas,
    dataUrl: fullDataUrl,
    mrzDataUrl,
    isRotated,
    angle,
  };
}
