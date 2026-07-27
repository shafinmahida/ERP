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
