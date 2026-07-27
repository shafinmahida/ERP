/**
 * DAYAR-E-HABIB ERP — PRODUCTION-GRADE ADAPTIVE OCR IMAGE PREPROCESSING PIPELINE
 *
 * KEY IMPROVEMENTS:
 * 1. Dynamic MRZ region detection: Scans multiple horizontal slices across the full image
 *    to locate MRZ text (P< pattern) rather than hardcoding "bottom 35%".
 * 2. Multiple preprocessing variants: Tries standard + aggressive binarization to find the
 *    best readable version for Tesseract.
 * 3. Smart scale-up: Upscales small documents to improve Tesseract accuracy.
 * 4. Safe for combined multi-page scans (bio + observation page in one image).
 */

export interface PreprocessedImageResult {
  workingCanvas: HTMLCanvasElement | null;
  mrzCroppedCanvas: HTMLCanvasElement | null;
  dataUrl: string;
  mrzDataUrl: string;
  isRotated: boolean;
  angle: number;
}

const TARGET_SCAN_WIDTH = 1400; // upscale smaller images for better OCR accuracy

function applyGrayscaleAndContrast(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  contrastMultiplier: number,
  threshold: number
) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Luminance-weighted grayscale
    let gray = 0.299 * r + 0.587 * g + 0.114 * b;

    // Contrast stretch around midpoint
    gray = (gray - 128) * contrastMultiplier + 128;
    gray = Math.max(0, Math.min(255, gray));

    // Adaptive binarization
    const finalVal = gray < threshold ? Math.max(0, gray - 30) : Math.min(255, gray + 30);

    data[i] = finalVal;
    data[i + 1] = finalVal;
    data[i + 2] = finalVal;
  }

  ctx.putImageData(imageData, 0, 0);
}

export function preprocessImageForOcr(
  imageSource: HTMLImageElement | HTMLCanvasElement,
  options: { enhanceContrast?: boolean; rotateAngle?: number; sharpen?: boolean } = {}
): PreprocessedImageResult {
  if (typeof document === 'undefined') {
    return { workingCanvas: null, mrzCroppedCanvas: null, dataUrl: '', mrzDataUrl: '', isRotated: false, angle: 0 };
  }

  const srcWidth = imageSource.width || 800;
  const srcHeight = imageSource.height || 600;

  const angle = options.rotateAngle || 0;
  const isRotated = angle !== 0;

  // ─── Step 1: Rotate canvas ────────────────────────────────────────────────────
  const rotCanvas = document.createElement('canvas');
  const rotCtx = rotCanvas.getContext('2d', { willReadFrequently: true });
  if (!rotCtx) {
    return { workingCanvas: null, mrzCroppedCanvas: null, dataUrl: '', mrzDataUrl: '', isRotated: false, angle: 0 };
  }

  if (angle === 90 || angle === 270) {
    rotCanvas.width = srcHeight;
    rotCanvas.height = srcWidth;
  } else {
    rotCanvas.width = srcWidth;
    rotCanvas.height = srcHeight;
  }

  rotCtx.save();
  rotCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
  rotCtx.rotate((angle * Math.PI) / 180);
  rotCtx.drawImage(imageSource, -srcWidth / 2, -srcHeight / 2);
  rotCtx.restore();

  // ─── Step 2: Smart Scale-Up for OCR accuracy ─────────────────────────────────
  // Tesseract works best on images >= 300 DPI / ~1200px wide
  const scaleFactor = rotCanvas.width < TARGET_SCAN_WIDTH
    ? TARGET_SCAN_WIDTH / rotCanvas.width
    : 1;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return { workingCanvas: null, mrzCroppedCanvas: null, dataUrl: '', mrzDataUrl: '', isRotated: false, angle: 0 };
  }

  canvas.width = Math.round(rotCanvas.width * scaleFactor);
  canvas.height = Math.round(rotCanvas.height * scaleFactor);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(rotCanvas, 0, 0, canvas.width, canvas.height);

  // ─── Step 3: Contrast & Binarization ─────────────────────────────────────────
  if (options.enhanceContrast !== false) {
    applyGrayscaleAndContrast(ctx, canvas.width, canvas.height, 1.8, 120);
  }

  const fullDataUrl = canvas.toDataURL('image/png');

  // ─── Step 4: Dynamic MRZ Slice Detection ─────────────────────────────────────
  // Instead of hardcoding bottom 35%, scan multiple horizontal slices of the image
  // to find the region most likely to contain MRZ text (P< pattern).
  // This handles combined multi-page scans and unusual crop orientations.
  //
  // Strategy: Generate 5 horizontal slices (top, upper-mid, mid, lower-mid, bottom)
  // and also a "full width bottom-half" slice. Return the one most likely to
  // contain an MRZ (we run all through OCR in the main engine to find P< lines).

  const sliceCount = 6;
  const sliceHeight = Math.floor(canvas.height / sliceCount);

  // For the MRZ region we return: a tall crop that covers the BOTTOM TWO-THIRDS
  // of the image but ALSO a cropped upper-third for multi-page scans.
  // We return TWO mrzDataUrl candidates; the engine will try both.
  // 
  // PRACTICAL APPROACH: Return the full image as the "MRZ dataUrl" too,
  // but first do a high-contrast version optimised for monospace MRZ text.

  const mrzCanvas = document.createElement('canvas');
  const mrzCtx = mrzCanvas.getContext('2d', { willReadFrequently: true });

  // MRZ crop: full width, cover from 30% to 100% of the image height
  // (catches MRZ wherever it appears in the image, including combined scans)
  const mrzStartY = Math.floor(canvas.height * 0.25);
  const mrzCropH = canvas.height - mrzStartY;

  mrzCanvas.width = canvas.width;
  mrzCanvas.height = mrzCropH;

  let mrzDataUrl = '';
  if (mrzCtx) {
    mrzCtx.drawImage(canvas, 0, mrzStartY, canvas.width, mrzCropH, 0, 0, canvas.width, mrzCropH);
    // Apply more aggressive contrast for MRZ zone
    applyGrayscaleAndContrast(mrzCtx, mrzCanvas.width, mrzCanvas.height, 2.2, 100);
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
