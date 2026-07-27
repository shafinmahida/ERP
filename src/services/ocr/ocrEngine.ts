/**
 * DAYAR-E-HABIB ERP — PRODUCTION-GRADE OCR ENGINE (ZERO MOCK DATA)
 * 
 * ARCHITECTURAL INTEGRITY RULES:
 * 1. ZERO mock, hardcoded, dummy, fallback, or sample identity data.
 * 2. Every extracted character MUST originate directly from the actual image.
 * 3. Uses a singleton Tesseract.js worker (initialized once, reused for all scans)
 *    to avoid re-downloading language packs on every rotation attempt.
 * 4. Falls back to Tauri Rust IPC backend if running in desktop shell.
 */

import { createWorker, Worker } from 'tesseract.js';

export interface OcrEngineOutput {
  rawText: string;
  lines: string[];
  engineName: string;
  engineVersion: string;
  processedAt: string;
  averageConfidence: number;
}

// ─── Singleton Tesseract Worker ───────────────────────────────────────────────
// The worker is created once and reused for all scan operations.
// This prevents re-downloading 10MB language packs on every rotation attempt.
let _workerInstance: Worker | null = null;
let _workerInitializing: Promise<Worker> | null = null;

async function getTesseractWorker(): Promise<Worker> {
  if (_workerInstance) return _workerInstance;

  // If already being initialized (e.g. concurrent calls), await the in-flight promise
  if (_workerInitializing) return _workerInitializing;

  _workerInitializing = createWorker('eng', 1, {
    // Use local cache dir to avoid re-downloading
    cacheMethod: 'write',
    gzip: true,
  }).then((w) => {
    _workerInstance = w;
    _workerInitializing = null;
    return w;
  });

  return _workerInitializing;
}

// Call this when the app unmounts (optional clean-up)
export async function terminateTesseractWorker() {
  if (_workerInstance) {
    await _workerInstance.terminate();
    _workerInstance = null;
  }
}

// ─── Main OCR Entry Point ─────────────────────────────────────────────────────

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
      console.warn('[OCR] Tauri Rust backend returned empty/failed — falling back to Tesseract.js:', e);
    }
  }

  // Stage 2: Singleton Tesseract.js Engine (reuse worker across all rotation attempts)
  try {
    const worker = await getTesseractWorker();
    const ret = await worker.recognize(imageDataUrl);

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
    console.error('[OCR] Tesseract.js engine error:', err);
    // Reset worker on error so next call gets a fresh one
    _workerInstance = null;
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
