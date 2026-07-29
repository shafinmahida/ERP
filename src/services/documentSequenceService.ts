import { getRawDb } from '../db';
import { recordAudit } from './auditService';

export type PrintableDocumentType = 'Receipt' | 'Voucher' | 'Invoice';

export interface GeneratedDocumentNumber {
  fullNumber: string; // e.g. RCP-2026-000019
  documentType: PrintableDocumentType;
  year: number;
  sequenceNumber: number;
}

const PREFIX_MAP: Record<PrintableDocumentType, string> = {
  Receipt: 'RCP',
  Voucher: 'VCH',
  Invoice: 'INV',
};

/**
 * Generates the next sequential gapless document number for a given type & year.
 * Prefix format: {PREFIX}-{YEAR}-{6_DIGIT_SEQUENCE} (e.g. RCP-2026-000001)
 */
export function getNextDocumentNumber(
  docType: PrintableDocumentType,
  overrideYear?: number
): GeneratedDocumentNumber {
  const db = getRawDb();
  const year = overrideYear || new Date().getFullYear();
  const prefix = PREFIX_MAP[docType] || 'DOC';

  // Atomic fetch & increment
  let seqRecord = db
    .prepare(`SELECT * FROM document_sequence WHERE document_type = ? AND year = ?`)
    .get(docType, year) as any;

  let nextNum = 1;
  if (seqRecord) {
    nextNum = seqRecord.last_number + 1;
    db.prepare(`UPDATE document_sequence SET last_number = ? WHERE sequence_id = ?`).run(
      nextNum,
      seqRecord.sequence_id
    );
  } else {
    db.prepare(`INSERT INTO document_sequence (document_type, year, last_number) VALUES (?, ?, ?)`).run(
      docType,
      year,
      nextNum
    );
  }

  const paddedSeq = nextNum.toString().padStart(6, '0');
  const fullNumber = `${prefix}-${year}-${paddedSeq}`;

  recordAudit({
    entityType: 'DocumentSequence',
    entityId: `${docType}_${year}`,
    action: 'SequenceGenerated',
    notes: `Generated ${docType} Number: ${fullNumber}`,
  });

  return {
    fullNumber,
    documentType: docType,
    year,
    sequenceNumber: nextNum,
  };
}
