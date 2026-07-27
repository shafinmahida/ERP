import { getRawDb, getDataDirectory } from '../db';
import { Registration, Customer, Season, Package, CustomerIdentity } from '../db/schema';
import { recordAudit } from './auditService';
import { getSeasonById } from './seasonPackageService';

function getNodeRequire() {
  if (typeof window !== 'undefined') return null;
  try {
    const fn = new Function('return typeof require !== "undefined" ? require : null');
    return fn();
  } catch {
    return null;
  }
}

export interface RegistrationWithDetails extends Registration {
  customerName: string;
  fatherName: string;
  passportNumber: string;
  seasonLabel: string;
  seasonYear: number;
  packageName: string;
}

export type RegistrationStatus =
  | 'Draft'
  | 'Confirmed'
  | 'Payment Pending'
  | 'Partially Paid'
  | 'Fully Paid'
  | 'Visa Processing'
  | 'Visa Approved'
  | 'Ticket Issued'
  | 'Ready for Travel'
  | 'Completed'
  | 'Cancelled';

export const REGISTRATION_STATUSES: RegistrationStatus[] = [
  'Draft',
  'Confirmed',
  'Payment Pending',
  'Partially Paid',
  'Fully Paid',
  'Visa Processing',
  'Visa Approved',
  'Ticket Issued',
  'Ready for Travel',
  'Completed',
  'Cancelled',
];

export function generateRegistrationNumber(seasonId: number): string {
  const targetSeason = getSeasonById(seasonId);
  if (!targetSeason) throw new Error(`Season #${seasonId} not found`);

  const code = targetSeason.seasonTypeCode || 'REG';
  const year = targetSeason.year;

  const db = getRawDb();
  const existingForSeason = db.prepare(`SELECT * FROM registration WHERE season_id = ?`).all(seasonId) as unknown as Registration[];

  let seqNum = existingForSeason.length + 1;
  let regNum = `DH-${year}-${code}-${seqNum.toString().padStart(6, '0')}`;

  while (db.prepare(`SELECT * FROM registration WHERE registration_number = ?`).get(regNum)) {
    seqNum++;
    regNum = `DH-${year}-${code}-${seqNum.toString().padStart(6, '0')}`;
  }

  return regNum;
}


export function getAllRegistrations(): RegistrationWithDetails[] {
  const db = getRawDb();
  const regList = db.prepare(`SELECT * FROM registration ORDER BY registration_id DESC`).all() as unknown as Registration[];

  return regList.map((reg) => {
    const cust = db.prepare(`SELECT * FROM customer WHERE customer_id = ?`).get(reg.customer_id) as unknown as Customer | undefined;
    const passport = db.prepare(`SELECT * FROM customer_identity WHERE customer_id = ? AND identity_status = 'ACTIVE'`).get(reg.customer_id) as unknown as CustomerIdentity | undefined;
    const seas = getSeasonById(reg.season_id);
    const pkg = db.prepare(`SELECT * FROM package WHERE package_id = ?`).get(reg.package_id) as unknown as Package | undefined;

    return {
      ...reg,
      customerName: cust?.full_name || 'Unknown',
      fatherName: cust?.father_name || 'Unknown',
      passportNumber: passport?.passport_number || '',
      seasonLabel: seas?.label || 'Unknown',
      seasonYear: seas?.year || 2026,
      packageName: pkg?.name || 'Unknown',
    };
  });
}

export function createRegistration(data: {
  customer_id: number;
  season_id: number;
  package_id: number;
  status?: RegistrationStatus;
}): RegistrationWithDetails {
  const db = getRawDb();
  const now = new Date().toISOString();

  const regNum = generateRegistrationNumber(data.season_id);
  const initialStatus: RegistrationStatus = data.status || 'Draft';

  const insertStmt = db.prepare(`
    INSERT INTO registration (registration_number, customer_id, season_id, package_id, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const res = insertStmt.run(regNum, data.customer_id, data.season_id, data.package_id, initialStatus, now, now);
  const insertedId = Number(res.lastInsertRowid);

  // Create flat customer document directory: Documents/{registration_number}/
  const req = getNodeRequire();
  if (req) {
    try {
      const fs = req('fs');
      const path = req('path');
      const baseDataDir = getDataDirectory();
      const regDocDir = path.join(baseDataDir, 'Documents', regNum);
      if (!fs.existsSync(regDocDir)) {
        fs.mkdirSync(regDocDir, { recursive: true });
      }
    } catch (e) {
      console.error(e);
    }
  }

  recordAudit({
    entityType: 'Registration',
    entityId: insertedId,
    action: 'Created',
    notes: `Registration ${regNum} created with status ${initialStatus}`,
  });

  return getRegistrationById(insertedId)!;
}

export function updateRegistrationStatus(
  registrationId: number,
  newStatus: RegistrationStatus
): RegistrationWithDetails {
  const db = getRawDb();
  const existing = db.prepare(`SELECT * FROM registration WHERE registration_id = ?`).get(registrationId) as unknown as Registration | undefined;
  if (!existing) throw new Error(`Registration #${registrationId} not found`);

  const now = new Date().toISOString();
  db.prepare(`UPDATE registration SET status = ?, updated_at = ? WHERE registration_id = ?`).run(newStatus, now, registrationId);

  recordAudit({
    entityType: 'Registration',
    entityId: registrationId,
    action: 'Updated',
    fieldChanged: 'status',
    oldValue: existing.status,
    newValue: newStatus,
    notes: `Registration ${existing.registration_number} status updated to ${newStatus}`,
  });

  return getRegistrationById(registrationId)!;
}

export function getRegistrationById(registrationId: number): RegistrationWithDetails | null {
  const db = getRawDb();
  const reg = db.prepare(`SELECT * FROM registration WHERE registration_id = ?`).get(registrationId) as unknown as Registration | undefined;
  if (!reg) return null;

  const cust = db.prepare(`SELECT * FROM customer WHERE customer_id = ?`).get(reg.customer_id) as unknown as Customer | undefined;
  const passport = db.prepare(`SELECT * FROM customer_identity WHERE customer_id = ? AND identity_status = 'ACTIVE'`).get(reg.customer_id) as unknown as CustomerIdentity | undefined;
  const seas = getSeasonById(reg.season_id);
  const pkg = db.prepare(`SELECT * FROM package WHERE package_id = ?`).get(reg.package_id) as unknown as Package | undefined;

  return {
    ...reg,
    customerName: cust?.full_name || 'Unknown',
    fatherName: cust?.father_name || 'Unknown',
    passportNumber: passport?.passport_number || '',
    seasonLabel: seas?.label || 'Unknown',
    seasonYear: seas?.year || 2026,
    packageName: pkg?.name || 'Unknown',
  };
}
