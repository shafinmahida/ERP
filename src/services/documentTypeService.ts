import { getRawDb } from '../db';
import { DocumentType } from '../db/schema';
import { recordAudit } from './auditService';

export type { DocumentType };
export type OwnerScope = 'IDENTITY' | 'REGISTRATION';


export interface CreateDocumentTypeInput {
  name: string;
  code: string;
  owner_scope: OwnerScope;
  requires_expiry?: boolean;
  requires_number?: boolean;
  is_active?: number;
  sort_order?: number;
}

const DEFAULT_DOCUMENT_TYPES: CreateDocumentTypeInput[] = [
  { name: 'Passport', code: 'PASSPORT', owner_scope: 'IDENTITY', requires_expiry: true, requires_number: true, sort_order: 1 },
  { name: 'Visa', code: 'VISA', owner_scope: 'REGISTRATION', requires_expiry: true, requires_number: true, sort_order: 2 },
  { name: 'Ticket', code: 'TICKET', owner_scope: 'REGISTRATION', requires_expiry: false, requires_number: true, sort_order: 3 },
  { name: 'Hotel Voucher', code: 'HOTEL', owner_scope: 'REGISTRATION', requires_expiry: false, requires_number: false, sort_order: 4 },
  { name: 'Medical Certificate', code: 'MEDICAL', owner_scope: 'REGISTRATION', requires_expiry: false, requires_number: false, sort_order: 5 },
  { name: 'Other Document', code: 'OTHER', owner_scope: 'REGISTRATION', requires_expiry: false, requires_number: false, sort_order: 6 },
];

export function ensureDefaultDocumentTypesSeeded(): void {
  const db = getRawDb();
  const countObj = db.prepare(`SELECT COUNT(*) as count FROM document_type`).get() as any;
  if (countObj && countObj.count > 0) {
    // Seeding runs ONLY when table is completely empty. Preserves operator edits & deletions!
    return;
  }

  for (const dt of DEFAULT_DOCUMENT_TYPES) {
    createDocumentType(dt, false);
  }
}

export function getAllDocumentTypes(): DocumentType[] {
  const db = getRawDb();
  ensureDefaultDocumentTypesSeeded();
  return db.prepare(`SELECT * FROM document_type ORDER BY sort_order ASC, name ASC`).all() as unknown as DocumentType[];
}

export function getActiveDocumentTypes(): DocumentType[] {
  const db = getRawDb();
  ensureDefaultDocumentTypesSeeded();
  return db.prepare(`SELECT * FROM document_type WHERE is_active = 1 ORDER BY sort_order ASC, name ASC`).all() as unknown as DocumentType[];
}

export function getActiveDocumentTypesByScope(scope: OwnerScope): DocumentType[] {
  const all = getActiveDocumentTypes();
  return all.filter((dt) => dt.owner_scope === scope);
}

export function getDocumentTypeById(id: number): DocumentType | null {
  const db = getRawDb();
  const res = db.prepare(`SELECT * FROM document_type WHERE document_type_id = ?`).get(id) as unknown as DocumentType | undefined;
  return res || null;
}

export function getDocumentTypeByCode(code: string): DocumentType | null {
  const db = getRawDb();
  const cleanCode = code.trim().toUpperCase();
  const res = db.prepare(`SELECT * FROM document_type WHERE code = ?`).get(cleanCode) as unknown as DocumentType | undefined;
  return res || null;
}

export function createDocumentType(data: CreateDocumentTypeInput, audit: boolean = true): DocumentType {
  if (data.owner_scope !== 'IDENTITY' && data.owner_scope !== 'REGISTRATION') {
    throw new Error(`Invalid owner_scope "${data.owner_scope}". Must be IDENTITY or REGISTRATION.`);
  }

  const db = getRawDb();
  const code = data.code.trim().toUpperCase();
  const reqExpiry = data.requires_expiry ? 1 : 0;
  const reqNum = data.requires_number ? 1 : 0;
  const isActive = data.is_active !== undefined ? data.is_active : 1;
  const sortOrder = data.sort_order || 0;

  const res = db
    .prepare(
      `INSERT INTO document_type (name, code, owner_scope, requires_expiry, requires_number, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(data.name.trim(), code, data.owner_scope, reqExpiry, reqNum, isActive, sortOrder);

  const insertedId = Number(res.lastInsertRowid);
  const inserted = getDocumentTypeById(insertedId)!;

  if (audit) {
    recordAudit({
      entityType: 'DocumentType',
      entityId: insertedId,
      action: 'Created',
      newValue: JSON.stringify(inserted),
      notes: `DocumentType ${inserted.name} (${inserted.code}) created with scope ${inserted.owner_scope}`,
    });
  }

  return inserted;
}
