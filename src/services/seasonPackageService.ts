import { getRawDb } from '../db';
import { Season, Package } from '../db/schema';
import { recordAudit } from './auditService';
import { getSeasonTypeById } from './seasonTypeService';

export interface SeasonWithDetails extends Season {
  seasonTypeName: string;
  seasonTypeCode: string;
  is_active: number;
}

export function getAllSeasons(): SeasonWithDetails[] {
  const db = getRawDb();
  const seasons = db.prepare(`SELECT * FROM season ORDER BY year DESC, season_id DESC`).all() as unknown as Season[];

  return seasons.map((s) => {
    const st = getSeasonTypeById(s.season_type_id);
    return {
      ...s,
      is_active: s.is_active !== undefined ? s.is_active : 1,
      seasonTypeName: st?.name || 'Unknown',
      seasonTypeCode: st?.code || 'REG',
    };
  });
}

export function getActiveSeasons(): SeasonWithDetails[] {
  const db = getRawDb();
  const seasons = db.prepare(`SELECT * FROM season WHERE is_active = 1 ORDER BY year DESC, season_id DESC`).all() as unknown as Season[];

  return seasons.map((s) => {
    const st = getSeasonTypeById(s.season_type_id);
    return {
      ...s,
      is_active: 1,
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
    is_active: s.is_active !== undefined ? s.is_active : 1,
    seasonTypeName: st?.name || 'Unknown',
    seasonTypeCode: st?.code || 'REG',
  };
}

export function createSeason(seasonTypeId: number, year: number, label: string): SeasonWithDetails {
  const db = getRawDb();
  const cleanLabel = label.trim();
  const now = new Date().toISOString();

  const res = db.prepare(`
    INSERT INTO season (season_type_id, year, label, is_active, created_at, updated_at)
    VALUES (?, ?, ?, 1, ?, ?)
  `).run(seasonTypeId, year, cleanLabel, now, now);

  const insertedId = Number(res.lastInsertRowid);
  let fetched = getSeasonById(insertedId);

  const st = getSeasonTypeById(seasonTypeId);
  const inserted: SeasonWithDetails = fetched || {
    season_id: insertedId,
    season_type_id: seasonTypeId,
    year,
    label: cleanLabel,
    is_active: 1,
    created_at: now,
    updated_at: now,
    seasonTypeName: st?.name || 'Hajj',
    seasonTypeCode: st?.code || 'HAJJ',
  };

  // Auto-seed default packages for new Season (Deluxe & Economy)
  try {
    createPackage(insertedId, `${inserted.seasonTypeName} Deluxe`, 'Deluxe Package with Star Accommodation', 0);
    createPackage(insertedId, `${inserted.seasonTypeName} Economy`, 'Standard Economy Package', 0);
  } catch (e) {
    console.error('Auto package seed notice:', e);
  }

  recordAudit({
    entityType: 'Season',
    entityId: insertedId,
    action: 'Created',
    newValue: JSON.stringify(inserted),
    notes: `Season ${inserted.label} (${inserted.year}) created with SeasonType #${seasonTypeId}`,
  });

  return inserted;
}

export function updateSeason(seasonId: number, seasonTypeId: number, year: number, label: string): SeasonWithDetails {
  const db = getRawDb();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE season 
    SET season_type_id = ?, year = ?, label = ?, updated_at = ?
    WHERE season_id = ?
  `).run(seasonTypeId, year, label.trim(), now, seasonId);

  const updated = getSeasonById(seasonId)!;

  recordAudit({
    entityType: 'Season',
    entityId: seasonId,
    action: 'Updated',
    newValue: JSON.stringify(updated),
    notes: `Season #${seasonId} updated to ${updated.label} (${updated.year})`,
  });

  return updated;
}

export function toggleSeasonActive(seasonId: number, isActive: number): SeasonWithDetails {
  const db = getRawDb();
  const now = new Date().toISOString();

  db.prepare(`UPDATE season SET is_active = ?, updated_at = ? WHERE season_id = ?`).run(isActive, now, seasonId);
  const updated = getSeasonById(seasonId)!;

  recordAudit({
    entityType: 'Season',
    entityId: seasonId,
    action: isActive ? 'Activated' : 'Deactivated',
    newValue: JSON.stringify(updated),
    notes: `Season #${seasonId} set is_active = ${isActive}`,
  });

  return updated;
}

export function deleteSeason(seasonId: number): boolean {
  const db = getRawDb();
  
  // Guard check: cannot delete season with active registrations
  const regCountRes = db.prepare(`SELECT COUNT(*) as cnt FROM registration WHERE season_id = ?`).get(seasonId) as any;
  if (regCountRes?.cnt > 0) {
    throw new Error(`Cannot delete Season #${seasonId}: It has ${regCountRes.cnt} linked registrations.`);
  }

  // Delete linked packages first
  db.prepare(`DELETE FROM package WHERE season_id = ?`).run(seasonId);
  db.prepare(`DELETE FROM season WHERE season_id = ?`).run(seasonId);

  recordAudit({
    entityType: 'Season',
    entityId: seasonId,
    action: 'Deleted',
    notes: `Season #${seasonId} deleted`,
  });

  return true;
}

export function getPackagesBySeason(seasonId: number): Package[] {
  const db = getRawDb();
  return db.prepare(`SELECT * FROM package WHERE season_id = ? ORDER BY package_id ASC`).all(seasonId) as unknown as Package[];
}

export function createPackage(seasonId: number, name: string, description: string, basePricePaise: number = 0): Package {
  const db = getRawDb();
  const res = db.prepare(`
    INSERT INTO package (season_id, name, description, base_price_paise)
    VALUES (?, ?, ?, ?)
  `).run(seasonId, name.trim(), description.trim(), basePricePaise);

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

  return inserted || { package_id: insertedId, season_id: seasonId, name, description, base_price_paise: basePricePaise };
}

export function updatePackage(packageId: number, name: string, description: string, basePricePaise: number): Package {
  const db = getRawDb();
  db.prepare(`UPDATE package SET name = ?, description = ?, base_price_paise = ? WHERE package_id = ?`)
    .run(name.trim(), description.trim(), basePricePaise, packageId);

  return db.prepare(`SELECT * FROM package WHERE package_id = ?`).get(packageId) as unknown as Package;
}

export function deletePackage(packageId: number): boolean {
  const db = getRawDb();
  const regCount = db.prepare(`SELECT COUNT(*) as cnt FROM registration WHERE package_id = ?`).get(packageId) as any;
  if (regCount?.cnt > 0) {
    throw new Error(`Cannot delete Package #${packageId}: It has ${regCount.cnt} linked registrations.`);
  }

  db.prepare(`DELETE FROM package WHERE package_id = ?`).run(packageId);
  return true;
}
