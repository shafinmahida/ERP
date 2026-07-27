import { getRawDb } from '../db';
import { Season, Package, SeasonType } from '../db/schema';
import { recordAudit } from './auditService';
import { getSeasonTypeById } from './seasonTypeService';

export interface SeasonWithDetails extends Season {
  seasonTypeName: string;
  seasonTypeCode: string;
}

export function getAllSeasons(): SeasonWithDetails[] {
  const db = getRawDb();
  const seasons = db.prepare(`SELECT * FROM season ORDER BY year DESC, season_id DESC`).all() as unknown as Season[];

  return seasons.map((s) => {
    const st = getSeasonTypeById(s.season_type_id);
    return {
      ...s,
      seasonTypeName: st?.name || 'Unknown',
      seasonTypeCode: st?.code || 'REG',
    };
  });
}

export function getSeasonById(seasonId: number): SeasonWithDetails | null {
  const db = getRawDb();
  const s = db.prepare(`SELECT * FROM season WHERE season_id = ?`).get(seasonId) as unknown as Season | undefined;
  if (!s) return null;
  const st = getSeasonTypeById(s.season_type_id);
  return {
    ...s,
    seasonTypeName: st?.name || 'Unknown',
    seasonTypeCode: st?.code || 'REG',
  };
}

export function getPackagesBySeason(seasonId: number): Package[] {
  const db = getRawDb();
  return db.prepare(`SELECT * FROM package WHERE season_id = ? ORDER BY package_id ASC`).all(seasonId) as unknown as Package[];
}

export function createSeason(seasonTypeId: number, year: number, label: string): SeasonWithDetails {
  const db = getRawDb();
  const res = db.prepare(`INSERT INTO season (season_type_id, year, label) VALUES (?, ?, ?)`).run(seasonTypeId, year, label.trim());
  const insertedId = Number(res.lastInsertRowid);
  const inserted = getSeasonById(insertedId)!;

  recordAudit({
    entityType: 'Season',
    entityId: insertedId,
    action: 'Created',
    newValue: JSON.stringify(inserted),
    notes: `Season ${inserted.label} (${inserted.year}) created with SeasonType #${seasonTypeId}`,
  });

  return inserted;
}

export function createPackage(seasonId: number, name: string, description: string): Package {
  const db = getRawDb();
  const res = db.prepare(`INSERT INTO package (season_id, name, description) VALUES (?, ?, ?)`).run(seasonId, name.trim(), description.trim());
  const insertedId = Number(res.lastInsertRowid);
  const inserted = db.prepare(`SELECT * FROM package WHERE package_id = ?`).get(insertedId) as unknown as Package;

  if (inserted) {
    recordAudit({
      entityType: 'Package',
      entityId: inserted.package_id,
      action: 'Created',
      newValue: JSON.stringify(inserted),
      notes: `Package ${inserted.name} created for season #${seasonId}`,
    });
  }

  return inserted || { package_id: insertedId, season_id: seasonId, name, description };
}
