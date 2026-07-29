import { getRawDb } from '../db';
import { SeasonType } from '../db/schema';
import { recordAudit } from './auditService';

export function getAllSeasonTypes(): SeasonType[] {
  const db = getRawDb();
  return db.prepare(`SELECT * FROM season_type ORDER BY season_type_id ASC`).all() as unknown as SeasonType[];
}

export function getActiveSeasonTypes(): SeasonType[] {
  const db = getRawDb();
  return db.prepare(`SELECT * FROM season_type WHERE is_active = 1 ORDER BY season_type_id ASC`).all() as unknown as SeasonType[];
}

export function getSeasonTypeById(id: number): SeasonType | null {
  const db = getRawDb();
  const res = db.prepare(`SELECT * FROM season_type WHERE season_type_id = ?`).get(id) as unknown as SeasonType | undefined;
  return res || null;
}

export function createSeasonType(data: { name: string; code: string; description: string; is_active?: number }): SeasonType {
  const db = getRawDb();
  const cleanCode = data.code.trim().toUpperCase();
  const cleanName = data.name.trim();
  const cleanDesc = data.description.trim();
  const isActive = data.is_active !== undefined ? data.is_active : 1;

  // Check if code already exists
  const existing = db.prepare(`SELECT * FROM season_type WHERE code = ?`).get(cleanCode);
  if (existing) {
    throw new Error(`Season Type Code "${cleanCode}" already exists. Please choose a unique code.`);
  }

  const res = db.prepare(`
    INSERT INTO season_type (name, code, description, is_active)
    VALUES (?, ?, ?, ?)
  `).run(cleanName, cleanCode, cleanDesc, isActive);

  const insertedId = Number(res.lastInsertRowid);
  const inserted = getSeasonTypeById(insertedId)!;

  recordAudit({
    entityType: 'SeasonType',
    entityId: insertedId,
    action: 'Created',
    newValue: JSON.stringify(inserted),
    notes: `SeasonType ${cleanName} (${cleanCode}) created`,
  });

  return inserted;
}

export function toggleSeasonTypeActive(seasonTypeId: number, targetStatus?: number): void {
  const db = getRawDb();
  const current = getSeasonTypeById(seasonTypeId);
  if (!current) throw new Error(`SeasonType #${seasonTypeId} not found`);

  const nextStatus = targetStatus !== undefined ? targetStatus : current.is_active ? 0 : 1;
  db.prepare(`UPDATE season_type SET is_active = ? WHERE season_type_id = ?`).run(nextStatus, seasonTypeId);

  recordAudit({
    entityType: 'SeasonType',
    entityId: seasonTypeId,
    action: nextStatus ? 'Activated' : 'Deactivated',
    notes: `SeasonType #${seasonTypeId} set to ${nextStatus ? 'ACTIVE' : 'INACTIVE'}`,
  });
}

export function deleteSeasonType(seasonTypeId: number): void {
  const db = getRawDb();
  // Check if any seasons reference this season type
  const countRes = db.prepare(`SELECT COUNT(*) as cnt FROM season WHERE season_type_id = ?`).get(seasonTypeId) as any;
  if (countRes?.cnt > 0) {
    throw new Error(`Cannot delete SeasonType #${seasonTypeId}: ${countRes.cnt} active Season(s) are linked to it.`);
  }

  db.prepare(`DELETE FROM season_type WHERE season_type_id = ?`).run(seasonTypeId);

  recordAudit({
    entityType: 'SeasonType',
    entityId: seasonTypeId,
    action: 'Deleted',
    notes: `SeasonType #${seasonTypeId} deleted`,
  });
}
