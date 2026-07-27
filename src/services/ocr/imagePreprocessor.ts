/**
 * NON-DESTRUCTIVE OCR IMAGE PREPROCESSING PIPELINE
 * 
 * CRITICAL SAFETY REQUIREMENT:
 * Never modify or mutate the uploaded original image byte-for-byte.
 * All image enhancements (grayscale, contrast boost, binarization, deskewing)
 * operate strictly on temporary working Canvas/Buffer copies in memory.
 */

export interface PreprocessedImageResult {
  workingCanvas: HTMLCanvasElement | null;
  dataUrl: string;
  isRotated: boolean;
}

export function preprocessImageForOcr(
  imageSource: HTMLImageElement | HTMLCanvasElement,
  options: { enhanceContrast?: boolean; rotateAngle?: number } = {}
): PreprocessedImageResult {
  if (typeof document === 'undefined') {
    return { workingCanvas: null, dataUrl: '', isRotated: false };
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { workingCanvas: null, dataUrl: '', isRotated: false };
  }

  const srcWidth = imageSource.width;
  const srcHeight = imageSource.height;

  const angle = options.rotateAngle || 0;
  const isRotated = angle !== 0;

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

  // Contrast & Grayscale Enhancement on Temporary Memory Copy
  if (options.enhanceContrast !== false) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Luminance Grayscale
      let gray = 0.299 * r + 0.587 * g + 0.114 * b;

      // High Contrast Curve
      gray = (gray - 128) * 1.5 + 128;
      gray = Math.max(0, Math.min(255, gray));

      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }

    ctx.putImageData(imageData, 0, 0);
  }

  return {
    workingCanvas: canvas,
    dataUrl: canvas.toDataURL('image/png'),
    isRotated,
  };
}
