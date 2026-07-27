/**
 * DAYAR-E-HABIB ERP — PRODUCTION-GRADE OCR ENGINE (ZERO MOCK DATA)
 * 
 * ARCHITECTURAL INTEGRITY RULES:
 * 1. ZERO mock, hardcoded, dummy, fallback, or sample identity data.
 * 2. Every extracted character MUST originate directly from the actual image.
 * 3. Uses Tesseract.js engine or Tauri Rust IPC backend for real image text recognition.
 */

import { createWorker } from 'tesseract.js';

export interface OcrEngineOutput {
  rawText: string;
  lines: string[];
  engineName: string;
  engineVersion: string;
  processedAt: string;
  averageConfidence: number;
}

export async function runOfflineOcr(imageDataUrl: string): Promise<OcrEngineOutput> {
  const processedAt = new Date().toISOString();

  if (!imageDataUrl || imageDataUrl.trim() === '') {
    return {
      rawText: '',
      lines: [],
      engineName: 'Tesseract.js / Rust Native Engine',
      engineVersion: '7.0.0',
      processedAt,
      averageConfidence: 0,
    };
  }

  // Stage 1: Try Tauri 2 Rust Backend IPC Command if running in desktop shell
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    try {
      const { invoke } = (window as any).__TAURI_INTERNALS__;
      const res: any = await invoke('perform_backend_ocr', { imageDataBase64: imageDataUrl });
      if (res && res.lines && res.lines.length > 0) {
        return {
          rawText: res.raw_text,
          lines: res.lines,
          engineName: res.engine_name,
          engineVersion: res.engine_version,
          processedAt: res.processed_at,
          averageConfidence: res.average_confidence,
        };
      }
    } catch (e) {
      console.warn('Tauri Rust backend OCR IPC command returned empty/unhandled, running Tesseract.js engine:', e);
    }
  }

  // Stage 2: Tesseract.js Engine Real Image Character Recognition
  try {
    const worker = await createWorker('eng');
    const ret = await worker.recognize(imageDataUrl);
    await worker.terminate();

    const rawText = ret.data.text || '';
    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const averageConfidence = ret.data.confidence || 0;

    return {
      rawText,
      lines,
      engineName: 'Tesseract.js OCR Engine',
      engineVersion: '7.0.0',
      processedAt,
      averageConfidence: Math.round(averageConfidence),
    };
  } catch (err) {
    console.error('Tesseract.js OCR execution error:', err);
    return {
      rawText: '',
      lines: [],
      engineName: 'Tesseract.js OCR Engine (Error)',
      engineVersion: '7.0.0',
      processedAt,
      averageConfidence: 0,
    };
  }
}
