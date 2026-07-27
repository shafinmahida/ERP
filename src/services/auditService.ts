import { getRawDb } from '../db';
import { AuditLog } from '../db/schema';

export interface AuditParams {
  entityType: 'Customer' | 'CustomerIdentity' | 'Registration' | 'Payment' | 'Document' | 'DocumentVersion' | 'DocumentType' | 'Season' | 'SeasonType' | 'Package' | 'Settings';
  entityId: string | number;

  action: 'Created' | 'Updated' | 'Deleted' | 'Printed' | 'Restored';
  fieldChanged?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  notes?: string | null;
}

export function recordAudit(params: AuditParams): void {
  try {
    const db = getRawDb();
    const stmt = db.prepare(`
      INSERT INTO audit_log (entity_type, entity_id, action, field_changed, old_value, new_value, timestamp, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      params.entityType,
      String(params.entityId),
      params.action,
      params.fieldChanged || null,
      params.oldValue !== undefined ? params.oldValue : null,
      params.newValue !== undefined ? params.newValue : null,
      new Date().toISOString(),
      params.notes || null
    );
  } catch (err) {
    console.error('Failed to write AuditLog entry:', err);
  }
}

export function getAllAuditLogs(limit: number = 100): AuditLog[] {
  const db = getRawDb();
  const stmt = db.prepare(`
    SELECT * FROM audit_log ORDER BY log_id DESC LIMIT ?
  `);
  return stmt.all(limit) as unknown as AuditLog[];
}
