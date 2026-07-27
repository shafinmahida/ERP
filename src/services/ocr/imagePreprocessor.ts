/**
 * DAYAR-E-HABIB ERP — PRODUCTION-GRADE NON-DESTRUCTIVE OCR IMAGE PREPROCESSING
 *
 * CRITICAL SAFETY & QUALITY REQUIREMENTS:
 * 1. Never modify or mutate the uploaded original image.
 * 2. All enhancements operate on temporary in-memory Canvas copies only.
 * 3. MRZ crop starts at 45% of image height (was 65%) to handle combined
 *    two-page passport scans where MRZ appears in the mid-section.
 * 4. DO NOT apply any additional thresholding to the MRZ zone beyond what
 *    is already applied to the full image — over-processing destroys text.
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
    return {
      workingCanvas: null,
      mrzCroppedCanvas: null,
      dataUrl: '',
      mrzDataUrl: '',
      isRotated: false,
      angle: 0,
    };
  }

  const srcWidth = imageSource.width || 800;
  const srcHeight = imageSource.height || 600;

  // Step 1: Rotation
  const angle = options.rotateAngle || 0;
  const isRotated = angle !== 0;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return {
      workingCanvas: null,
      mrzCroppedCanvas: null,
      dataUrl: '',
      mrzDataUrl: '',
      isRotated: false,
      angle: 0,
    };
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

  // Step 2: Grayscale + Contrast Enhancement
  if (options.enhanceContrast !== false) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Luminance grayscale
      let gray = 0.299 * r + 0.587 * g + 0.114 * b;

      // Contrast stretch
      gray = (gray - 128) * 1.8 + 128;
      gray = Math.max(0, Math.min(255, gray));

      // Adaptive binarization
      const finalVal = gray < 120 ? Math.max(0, gray - 30) : Math.min(255, gray + 30);

      data[i] = finalVal;
      data[i + 1] = finalVal;
      data[i + 2] = finalVal;
    }

    ctx.putImageData(imageData, 0, 0);
  }

  // Step 3: MRZ Region Crop
  // Starts at 45% of image height (not 65%) to capture MRZ in combined
  // two-page passport scans where the MRZ appears in the mid-lower section.
  // NO additional processing applied to the MRZ zone — the image was already
  // enhanced in Step 2. Over-processing destroys readable text.
  const mrzCanvas = document.createElement('canvas');
  const mrzCtx = mrzCanvas.getContext('2d', { willReadFrequently: true });

  const mrzX = 0;
  const mrzY = Math.floor(canvas.height * 0.45);
  const mrzW = canvas.width;
  const mrzH = Math.floor(canvas.height * 0.55);

  mrzCanvas.width = mrzW;
  mrzCanvas.height = mrzH;

  let mrzDataUrl = '';
  if (mrzCtx) {
    mrzCtx.drawImage(canvas, mrzX, mrzY, mrzW, mrzH, 0, 0, mrzW, mrzH);
    mrzDataUrl = mrzCanvas.toDataURL('image/png');
  }

  return {
    workingCanvas: canvas,
    mrzCroppedCanvas: mrzCanvas,
    dataUrl: canvas.toDataURL('image/png'),
    mrzDataUrl,
    isRotated,
    angle,
  };
}
