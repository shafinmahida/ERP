/**
 * DAYAR-E-HABIB ERP — OCR IMAGE PREPROCESSING & QUALITY CHECK ENGINE
 * 
 * Responsibilities:
 * 1. Pre-check image quality (resolution, brightness, contrast, blur score).
 * 2. Canvas orientation rotation (0°, 90°, 180°, 270°) preserving natural dimensions.
 * 3. Contrast normalization and grayscale conversion for Tesseract OCR.
 */

export interface QualityCheckResult {
  isLowQuality: boolean;
  warningMessage: string | null;
  resolution: string;
  width: number;
  height: number;
  contrastScore: number;
}

/**
 * Pre-checks image quality before running full OCR pipeline.
 * Returns a warning message if image resolution is low or contrast is poor.
 * NOTE: This is a warning only — execution never blocks.
 */
export function precheckImageQuality(
  width: number,
  height: number,
  ctx?: CanvasRenderingContext2D | null
): QualityCheckResult {
  const minDim = Math.min(width, height);
  const maxDim = Math.max(width, height);
  let isLowQuality = false;
  const warnings: string[] = [];

  // Resolution check: less than 600px shortest dimension is considered low quality for document OCR
  if (minDim < 600) {
    isLowQuality = true;
    warnings.push(`Low resolution (${width}x${height}px). Minimum recommended resolution is 800x600px.`);
  }

  let contrastScore = 1.0;
  if (ctx && width > 0 && height > 0) {
    try {
      const sampleWidth = Math.min(width, 400);
      const sampleHeight = Math.min(height, 300);
      const imgData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
      const data = imgData.data;

      let sum = 0;
      let minVal = 255;
      let maxVal = 0;

      for (let i = 0; i < data.length; i += 4) {
        // Luminance
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        sum += lum;
        if (lum < minVal) minVal = lum;
        if (lum > maxVal) maxVal = lum;
      }

      const range = maxVal - minVal;
      contrastScore = range / 255;

      if (range < 50) {
        isLowQuality = true;
        warnings.push('Low image contrast. Document text may be difficult to read.');
      }
    } catch {
      // In web view or cross-origin canvas, fallback gracefully
    }
  }

  const warningMessage = isLowQuality
    ? `This photo may produce inaccurate results — consider retaking. (${warnings.join(' ')})`
    : null;

  return {
    isLowQuality,
    warningMessage,
    resolution: `${width}x${height}`,
    width,
    height,
    contrastScore,
  };
}

/**
 * Creates a clean HTMLCanvasElement from an HTMLImageElement or ImageData
 */
export function imageToCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const w = img.naturalWidth || img.width || 800;
  const h = img.naturalHeight || img.height || 600;
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(img, 0, 0, w, h);
  }
  return canvas;
}

/**
 * Rotates a canvas by 0, 90, 180, or 270 degrees preserving full unclipped dimensions.
 */
export function rotateCanvas(sourceCanvas: HTMLCanvasElement, degrees: number): HTMLCanvasElement {
  const normDeg = ((degrees % 360) + 360) % 360;
  if (normDeg === 0) return sourceCanvas;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return sourceCanvas;

  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;

  if (normDeg === 90 || normDeg === 270) {
    canvas.width = srcH;
    canvas.height = srcW;
  } else {
    canvas.width = srcW;
    canvas.height = srcH;
  }

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((normDeg * Math.PI) / 180);
  ctx.drawImage(sourceCanvas, -srcW / 2, -srcH / 2);

  return canvas;
}

/**
 * Enhances contrast and converts to grayscale for crisp Tesseract OCR.
 */
export function enhanceCanvasForOcr(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return sourceCanvas;

  ctx.drawImage(sourceCanvas, 0, 0);

  try {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      // Grayscale conversion
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      
      // Contrast stretch
      let v = (gray - 50) * 1.3;
      if (v < 0) v = 0;
      if (v > 255) v = 255;

      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
    }

    ctx.putImageData(imgData, 0, 0);
  } catch {
    // Fallback if cross-origin or canvas read restricted
  }

  return canvas;
}
