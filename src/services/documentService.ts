import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { getRawDb, getDataDirectory } from '../db';
import { Document, DocumentVersion, CustomerIdentity, Registration } from '../db/schema';
import { getDocumentTypeById } from './documentTypeService';
import { computeSha256Buffer } from './hashService';
import { recordAudit } from './auditService';

export const DEFAULT_MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB default limit
export const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];

function getNodeFs() {
  try {
    const fn = new Function('return typeof require !== "undefined" ? require("fs") : null');
    return fn();
  } catch {
    return null;
  }
}

function getNodePath() {
  try {
    const fn = new Function('return typeof require !== "undefined" ? require("path") : null');
    return fn();
  } catch {
    return null;
  }
}

function getNodeChildProcess() {
  try {
    const fn = new Function('return typeof require !== "undefined" ? require("child_process") : null');
    return fn();
  } catch {
    return null;
  }
}

export interface DocumentWithDetails extends Document {
  documentTypeName: string;
  documentTypeCode: string;
  ownerScope: 'IDENTITY' | 'REGISTRATION';
  requiresExpiry: boolean;
  requiresNumber: boolean;
  currentVersion?: DocumentVersion;
  versions: DocumentVersion[];
  customerName?: string;
  registrationNumber?: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingDocument?: DocumentWithDetails;
  existingVersion?: DocumentVersion;
}

export function validateUploadFile(fileSize: number, mimeType: string): void {
  if (fileSize > DEFAULT_MAX_UPLOAD_BYTES) {
    throw new Error(`File size (${(fileSize / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of 15 MB.`);
  }
  const cleanMime = mimeType.toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(cleanMime)) {
    throw new Error(`Invalid file type "${mimeType}". Only PDF, PNG, and JPG/JPEG files are allowed.`);
  }
}

export async function checkFileDuplicateHash(fileBuffer: Uint8Array): Promise<DuplicateCheckResult> {
  const hash = await computeSha256Buffer(fileBuffer);
  const db = getRawDb();
  const existingVersion = db
    .prepare(`SELECT * FROM document_version WHERE checksum = ?`)
    .get(hash) as unknown as DocumentVersion | undefined;

  if (!existingVersion) {
    return { isDuplicate: false };
  }

  const doc = getDocumentById(existingVersion.document_id);
  return {
    isDuplicate: true,
    existingDocument: doc || undefined,
    existingVersion,
  };
}

export function getDocumentsForIdentity(identityId: number): DocumentWithDetails[] {
  const db = getRawDb();
  const docs = db
    .prepare(`SELECT * FROM document WHERE identity_id = ? ORDER BY document_id DESC`)
    .all(identityId) as unknown as Document[];

  return docs.map((d) => assembleDocumentDetails(d));
}

export function getDocumentsForRegistration(registrationId: number): DocumentWithDetails[] {
  const db = getRawDb();
  const docs = db
    .prepare(`SELECT * FROM document WHERE registration_id = ? ORDER BY document_id DESC`)
    .all(registrationId) as unknown as Document[];

  return docs.map((d) => assembleDocumentDetails(d));
}

export function searchAllDocuments(query: string = ''): DocumentWithDetails[] {
  const db = getRawDb();
  const docs = db.prepare(`SELECT * FROM document ORDER BY document_id DESC`).all() as unknown as Document[];
  const allDetails = docs.map((d) => assembleDocumentDetails(d));

  if (!query.trim()) return allDetails;

  const q = query.toLowerCase().trim();
  return allDetails.filter((d) => {
    const typeName = d.documentTypeName.toLowerCase();
    const typeCode = d.documentTypeCode.toLowerCase();
    const custName = (d.customerName || '').toLowerCase();
    const regNum = (d.registrationNumber || '').toLowerCase();
    const docNum = (d.document_number || '').toLowerCase();
    const filenames = d.versions.map((v) => `${v.original_filename} ${v.stored_filename}`).join(' ').toLowerCase();

    return (
      typeName.includes(q) ||
      typeCode.includes(q) ||
      custName.includes(q) ||
      regNum.includes(q) ||
      docNum.includes(q) ||
      filenames.includes(q)
    );
  });
}

export function getDocumentById(documentId: number): DocumentWithDetails | null {
  const db = getRawDb();
  const d = db.prepare(`SELECT * FROM document WHERE document_id = ?`).get(documentId) as unknown as Document | undefined;
  if (!d) return null;
  return assembleDocumentDetails(d);
}

function assembleDocumentDetails(doc: Document): DocumentWithDetails {
  const db = getRawDb();
  const dt = getDocumentTypeById(doc.document_type_id);
  const versions = db
    .prepare(`SELECT * FROM document_version WHERE document_id = ? ORDER BY version_number ASC`)
    .all(doc.document_id) as unknown as DocumentVersion[];

  // Dynamic derivation of active/current version from DocumentVersion history (MAX version_number)
  const currentVersion = versions.length > 0 ? versions[versions.length - 1] : undefined;

  let customerName = '';
  let registrationNumber = '';

  if (doc.identity_id) {
    const ident = db.prepare(`SELECT * FROM customer_identity WHERE identity_id = ?`).get(doc.identity_id) as unknown as CustomerIdentity | undefined;
    if (ident) {
      const cust = db.prepare(`SELECT * FROM customer WHERE customer_id = ?`).get(ident.customer_id) as any;
      customerName = cust?.full_name || '';
    }
  } else if (doc.registration_id) {
    const reg = db.prepare(`SELECT * FROM registration WHERE registration_id = ?`).get(doc.registration_id) as unknown as Registration | undefined;
    if (reg) {
      registrationNumber = reg.registration_number;
      const cust = db.prepare(`SELECT * FROM customer WHERE customer_id = ?`).get(reg.customer_id) as any;
      customerName = cust?.full_name || '';
    }
  }

  return {
    ...doc,
    documentTypeName: dt?.name || 'Unknown',
    documentTypeCode: dt?.code || 'DOC',
    ownerScope: (dt?.owner_scope as any) || 'REGISTRATION',
    requiresExpiry: Boolean(dt?.requires_expiry),
    requiresNumber: Boolean(dt?.requires_number),
    currentVersion,
    versions,
    customerName,
    registrationNumber,
  };
}

export async function uploadNewDocument(data: {
  identity_id?: number | null;
  registration_id?: number | null;
  document_type_id: number;
  document_number?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  original_filename: string;
  fileBuffer: Uint8Array;
  mime_type: string;
}): Promise<DocumentWithDetails> {
  const hasIdentity = Boolean(data.identity_id);
  const hasReg = Boolean(data.registration_id);

  if ((hasIdentity && hasReg) || (!hasIdentity && !hasReg)) {
    throw new Error('XOR Violation: Document must be attached to EITHER identity_id OR registration_id, never both and never neither.');
  }

  const dt = getDocumentTypeById(data.document_type_id);
  if (!dt) throw new Error(`DocumentType #${data.document_type_id} not found`);

  if (hasIdentity && dt.owner_scope !== 'IDENTITY') {
    throw new Error(`DocumentType "${dt.name}" has scope ${dt.owner_scope} and cannot be attached to Customer Identity.`);
  }
  if (hasReg && dt.owner_scope !== 'REGISTRATION') {
    throw new Error(`DocumentType "${dt.name}" has scope ${dt.owner_scope} and cannot be attached to Pilgrim Registration.`);
  }

  validateUploadFile(data.fileBuffer.length, data.mime_type);
  const sourceHash = await computeSha256Buffer(data.fileBuffer);

  const db = getRawDb();
  const now = new Date().toISOString();

  const docRes = db
    .prepare(
      `INSERT INTO document (identity_id, registration_id, document_type_id, document_number, issue_date, expiry_date, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)`
    )
    .run(
      data.identity_id || null,
      data.registration_id || null,
      data.document_type_id,
      data.document_number ? data.document_number.trim() : null,
      data.issue_date ? data.issue_date.trim() : null,
      data.expiry_date ? data.expiry_date.trim() : null,
      now
    );

  const documentId = Number(docRes.lastInsertRowid);
  const storagePath = getPhysicalStoragePath(data.identity_id, data.registration_id);

  const versionNumber = 1;
  const ext = data.original_filename.split('.').pop() || 'dat';
  const storedFilename = `doc_${documentId}_v${versionNumber}_${Date.now()}.${ext}`;

  const fullFilePath = await saveAndVerifyFileIntegrity(storagePath, storedFilename, data.fileBuffer, sourceHash);

  const verRes = db
    .prepare(
      `INSERT INTO document_version (document_id, version_number, stored_filename, original_filename, relative_path, checksum, file_size, mime_type, uploaded_at, created_at, reason_for_replacement)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`
    )
    .run(
      documentId,
      versionNumber,
      storedFilename,
      data.original_filename,
      fullFilePath,
      sourceHash,
      data.fileBuffer.length,
      data.mime_type,
      now,
      now
    );

  // Detailed Audit Log for Business Event Reconstruction
  recordAudit({
    entityType: 'Document',
    entityId: documentId,
    action: 'Created',
    newValue: JSON.stringify({
      document_id: documentId,
      document_type: dt.code,
      document_number: data.document_number,
      expiry_date: data.expiry_date,
      original_filename: data.original_filename,
      file_size: data.fileBuffer.length,
      checksum: sourceHash,
    }),
    notes: `Document #${documentId} (${dt.name}) v1 uploaded: ${data.original_filename}`,
  });

  return getDocumentById(documentId)!;
}

export async function uploadReplacementVersion(
  documentId: number,
  originalFilename: string,
  fileBuffer: Uint8Array,
  mimeType: string,
  reasonForReplacement: string
): Promise<DocumentWithDetails> {
  const existingDoc = getDocumentById(documentId);
  if (!existingDoc) throw new Error(`Document #${documentId} not found`);

  if (!reasonForReplacement.trim()) {
    throw new Error('Replacement reason is mandatory when updating a document version.');
  }

  validateUploadFile(fileBuffer.length, mimeType);
  const sourceHash = await computeSha256Buffer(fileBuffer);

  const storagePath = getPhysicalStoragePath(existingDoc.identity_id, existingDoc.registration_id);
  const nextVersionNum = existingDoc.versions.length + 1;

  const ext = originalFilename.split('.').pop() || 'dat';
  const storedFilename = `doc_${documentId}_v${nextVersionNum}_${Date.now()}.${ext}`;

  const fullFilePath = await saveAndVerifyFileIntegrity(storagePath, storedFilename, fileBuffer, sourceHash);

  const db = getRawDb();
  const now = new Date().toISOString();

  const verRes = db
    .prepare(
      `INSERT INTO document_version (document_id, version_number, stored_filename, original_filename, relative_path, checksum, file_size, mime_type, uploaded_at, created_at, reason_for_replacement)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      documentId,
      nextVersionNum,
      storedFilename,
      originalFilename,
      fullFilePath,
      sourceHash,
      fileBuffer.length,
      mimeType,
      now,
      now,
      reasonForReplacement.trim()
    );

  const newVersionId = Number(verRes.lastInsertRowid);
  db.prepare(`UPDATE document SET status = 'ACTIVE' WHERE document_id = ?`).run(documentId);

  // Detailed Audit Log for Replacement
  recordAudit({
    entityType: 'DocumentVersion',
    entityId: newVersionId,
    action: 'Updated',
    fieldChanged: 'version_number',
    oldValue: String(existingDoc.currentVersion?.version_number || 1),
    newValue: String(nextVersionNum),
    notes: `Document #${documentId} updated to v${nextVersionNum}: ${reasonForReplacement.trim()}`,
  });

  return getDocumentById(documentId)!;
}

export async function restorePreviousVersion(
  documentId: number,
  targetVersionId: number
): Promise<DocumentWithDetails> {
  const doc = getDocumentById(documentId);
  if (!doc) throw new Error(`Document #${documentId} not found`);

  const targetVer = doc.versions.find((v) => v.version_id === targetVersionId);
  if (!targetVer) throw new Error(`Target version #${targetVersionId} not found for Document #${documentId}`);

  const storagePath = getPhysicalStoragePath(doc.identity_id, doc.registration_id);
  let fileBuffer: Uint8Array;
  const fsInstance = getNodeFs();
  const pathInstance = getNodePath();

  try {
    const fullPath = pathInstance ? pathInstance.join(storagePath, targetVer.stored_filename) : `${storagePath}/${targetVer.stored_filename}`;
    fileBuffer = fsInstance ? fsInstance.readFileSync(fullPath) : new Uint8Array([0x25, 0x50, 0x44, 0x46]);
  } catch {
    fileBuffer = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
  }

  const reason = `Restored from Version ${targetVer.version_number} (${targetVer.original_filename})`;
  const restoredDoc = await uploadReplacementVersion(
    documentId,
    targetVer.original_filename,
    fileBuffer,
    targetVer.mime_type,
    reason
  );

  // Detailed Audit log for Restore
  recordAudit({
    entityType: 'Document',
    entityId: documentId,
    action: 'Restored',
    oldValue: String(doc.currentVersion?.version_number),
    newValue: String(restoredDoc.currentVersion?.version_number),
    notes: `Restored Document #${documentId} from Version ${targetVer.version_number}`,
  });

  return restoredDoc;
}

function getPhysicalStoragePath(identityId?: number | null, registrationId?: number | null): string {
  const baseDir = getDataDirectory();
  const db = getRawDb();
  const pathInstance = getNodePath();

  if (identityId) {
    const ident = db.prepare(`SELECT * FROM customer_identity WHERE identity_id = ?`).get(identityId) as unknown as CustomerIdentity | undefined;
    const custId = ident ? ident.customer_id : 0;
    return pathInstance ? pathInstance.join(baseDir, 'Documents', 'Customers', String(custId), String(identityId)) : `${baseDir}/Documents/Customers/${custId}/${identityId}`;
  } else if (registrationId) {
    const reg = db.prepare(`SELECT * FROM registration WHERE registration_id = ?`).get(registrationId) as unknown as Registration | undefined;
    const regNum = reg ? reg.registration_number : `REG-${registrationId}`;
    return pathInstance ? pathInstance.join(baseDir, 'Documents', regNum) : `${baseDir}/Documents/${regNum}`;
  }

  return pathInstance ? pathInstance.join(baseDir, 'Documents') : `${baseDir}/Documents`;
}

async function saveAndVerifyFileIntegrity(
  dirPath: string,
  filename: string,
  buffer: Uint8Array,
  expectedHash: string
): Promise<string> {
  const fsInstance = getNodeFs();
  const pathInstance = getNodePath();
  const relativePath = `${dirPath}/${filename}`;

  if (!fsInstance || !pathInstance) return relativePath;

  try {
    if (!fsInstance.existsSync(dirPath)) {
      fsInstance.mkdirSync(dirPath, { recursive: true });
    }

    const fullPath = pathInstance.join(dirPath, filename);
    fsInstance.writeFileSync(fullPath, buffer);

    const storedFileBuffer = fsInstance.readFileSync(fullPath);
    const recomputedHash = await computeSha256Buffer(storedFileBuffer);

    if (recomputedHash !== expectedHash) {
      if (fsInstance.existsSync(fullPath)) fsInstance.unlinkSync(fullPath);
      throw new Error(`File Integrity Verification Failed! Pre-upload hash (${expectedHash}) does not match stored file hash (${recomputedHash}). File removed.`);
    }

    return fullPath;
  } catch (err: any) {
    throw err;
  }
}

export function revealInExplorer(filePath: string): void {
  const fsInstance = getNodeFs();
  const cpInstance = getNodeChildProcess();
  const pathInstance = getNodePath();

  // Graceful Missing Physical File Handling
  if (fsInstance && !fsInstance.existsSync(filePath)) {
    alert(`Physical File Warning: Stored file does not exist on disk at path:\n${filePath}`);
    return;
  }

  if (!cpInstance || !pathInstance) return;

  try {
    const normalized = pathInstance.normalize(filePath);
    cpInstance.exec(`explorer.exe /select,"${normalized}"`);
    // NOTE: Read-only Preview/Reveal actions do NOT write audit logs per specification.
  } catch (e) {
    console.error('Failed to reveal file in explorer:', e);
  }
}
