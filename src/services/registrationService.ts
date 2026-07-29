import { getRawDb } from '../db';
import { Registration, Customer, Package, CustomerIdentity, RegistrationPax } from '../db/schema';
import { recordAudit } from './auditService';
import { getSeasonById } from './seasonPackageService';
import { getRegistrationFinancialSummary, PaymentStatus } from './financialService';

export interface PaxInputData {
  pax_id?: number;
  customer_id?: number;
  fullName?: string;
  full_name?: string;
  fatherName?: string;
  father_name?: string;
  dob?: string;
  date_of_birth?: string;
  gender?: string;
  nationality?: string;
  mobile?: string;
  mobile_number?: string;
  passportNumber?: string;
  passport_number?: string;
  issueDate?: string;
  issue_date?: string;
  expiryDate?: string;
  expiry_date?: string;
  placeOfIssue?: string;
  place_of_issue?: string;
  relationship?: string;
  is_primary?: boolean | number;
  addressLine1?: string;
  address_line1?: string;
  addressLine2?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  pin_code?: string;
  email?: string;
}

export interface PaxDetailJoined extends RegistrationPax {
  fullName: string;
  fatherName: string;
  dob: string;
  gender: string;
  nationality: string;
  mobile: string;
  passportNumber: string;
  issueDate: string;
  expiryDate: string;
  placeOfIssue: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  email?: string;
}

export interface RegistrationWithDetails extends Registration {
  customerName: string;
  fatherName: string;
  customerState: string;
  passportNumber: string;
  seasonLabel: string;
  seasonYear: number;
  seasonTypeCode: string;
  packageName: string;
  paxCount: number;
  paxList: PaxDetailJoined[];
  netTotal: number;
  totalPaid: number;
  balanceAmount: number;
  payment_status: PaymentStatus;
  progressPercent: number;
  progressBreakdown: {
    customerLinked: boolean;
    paxCount: number;
    passportsUploaded: boolean;
    visasApproved: boolean;
    paymentsCompleted: boolean;
    travelPnrSet: boolean;
    roomAssigned: boolean;
  };
}

export type RegistrationStatus =
  | 'Draft'
  | 'Confirmed'
  | 'Documents Pending'
  | 'Visa Processing'
  | 'Visa Approved'
  | 'Ticketed'
  | 'Travel Ready'
  | 'Departed'
  | 'Completed'
  | 'Cancelled';

export const REGISTRATION_STATUSES: RegistrationStatus[] = [
  'Draft',
  'Confirmed',
  'Documents Pending',
  'Visa Processing',
  'Visa Approved',
  'Ticketed',
  'Travel Ready',
  'Departed',
  'Completed',
  'Cancelled',
];

export function generateRegistrationNumber(seasonId: number): string {
  const targetSeason = getSeasonById(seasonId);
  const rawCode = targetSeason?.seasonTypeCode ? targetSeason.seasonTypeCode.trim().toUpperCase() : '';
  const labelUpper = targetSeason?.label ? targetSeason.label.toUpperCase() : '';

  let code = 'HAJJ';
  if (rawCode && rawCode !== 'REG' && rawCode !== 'UNKNOWN') {
    code = rawCode;
  } else if (labelUpper.includes('UMR') || labelUpper.includes('UMRAH')) {
    code = 'UMR';
  } else if (labelUpper.includes('RAM') || labelUpper.includes('RAMADAN')) {
    code = 'RAM';
  }

  const letterPrefix = code.charAt(0) || 'H';
  const yr = targetSeason?.year || new Date().getFullYear();
  const shortYear = (yr % 100).toString().padStart(2, '0');
  const prefixGroup = `DH-${letterPrefix}${shortYear}`;

  const db = getRawDb();
  const existingMatches = db
    .prepare(`SELECT registration_number FROM registration WHERE registration_number LIKE ?`)
    .all(`${prefixGroup}-%`) as any[];

  let seqNum = existingMatches.length + 1;
  let regNum = `${prefixGroup}-${seqNum.toString().padStart(3, '0')}`;

  while (db.prepare(`SELECT registration_id FROM registration WHERE registration_number = ?`).get(regNum)) {
    seqNum++;
    regNum = `${prefixGroup}-${seqNum.toString().padStart(3, '0')}`;
  }

  return regNum;
}

export function getRegistrationPaxList(registrationId: number): PaxDetailJoined[] {
  const db = getRawDb();
  const paxRows = db
    .prepare(`SELECT * FROM registration_pax WHERE registration_id = ? ORDER BY is_primary DESC, pax_sequence ASC`)
    .all(registrationId) as unknown as RegistrationPax[];

  return paxRows.map((p) => {
    const cust = db.prepare(`SELECT * FROM customer WHERE customer_id = ?`).get(p.customer_id) as unknown as Customer | undefined;
    let identity = db
      .prepare(`SELECT * FROM customer_identity WHERE customer_id = ? AND identity_status = 'ACTIVE' ORDER BY identity_id DESC`)
      .get(p.customer_id) as unknown as CustomerIdentity | undefined;

    if (!identity) {
      identity = db
        .prepare(`SELECT * FROM customer_identity WHERE customer_id = ? ORDER BY identity_id DESC`)
        .get(p.customer_id) as unknown as CustomerIdentity | undefined;
    }

    return {
      ...p,
      fullName: cust?.full_name || 'Pilgrim',
      fatherName: cust?.father_name || '',
      dob: cust?.date_of_birth || '',
      gender: cust?.gender || 'Male',
      nationality: cust?.nationality || 'Indian',
      mobile: cust?.mobile_number || '',
      passportNumber: identity?.passport_number || '',
      issueDate: identity?.issue_date || '',
      expiryDate: identity?.expiry_date || '',
      placeOfIssue: identity?.place_of_issue || '',
      addressLine1: cust?.address_line1 || '',
      addressLine2: cust?.address_line2 || '',
      city: cust?.city || '',
      state: cust?.state || 'Maharashtra',
      pinCode: cust?.pin_code || '',
      email: cust?.email || '',
    };
  });
}

export function calculateRegistrationProgress(registrationId: number): {
  percent: number;
  breakdown: {
    customerLinked: boolean;
    paxCount: number;
    passportsUploaded: boolean;
    visasApproved: boolean;
    paymentsCompleted: boolean;
    travelPnrSet: boolean;
    roomAssigned: boolean;
  };
} {
  const db = getRawDb();
  const reg = db.prepare(`SELECT * FROM registration WHERE registration_id = ?`).get(registrationId) as any;
  if (!reg) {
    return {
      percent: 0,
      breakdown: {
        customerLinked: false,
        paxCount: 0,
        passportsUploaded: false,
        visasApproved: false,
        paymentsCompleted: false,
        travelPnrSet: false,
        roomAssigned: false,
      },
    };
  }

  const paxList = getRegistrationPaxList(registrationId);
  const fin = getRegistrationFinancialSummary(registrationId);

  const customerLinked = paxList.length > 0 && !!paxList[0].fullName;
  const passportsUploaded = paxList.length > 0 && paxList.every((p) => !!p.passportNumber && p.passportNumber !== 'N/A');
  const visasApproved = reg.status === 'Visa Approved' || reg.status === 'Ticketed' || reg.status === 'Travel Ready' || reg.status === 'Completed';
  const paymentsCompleted = fin.paymentStatus === 'Fully Paid' || fin.paymentStatus === 'Overpaid';
  const travelPnrSet = !!reg.pnr || !!reg.flight_number;
  const roomAssigned = paxList.some((p) => !!p.room_preference || !!p.bus_assignment) || !!reg.room_preference;

  let totalScore = 0;
  if (customerLinked) totalScore += 20;
  if (passportsUploaded) totalScore += 20;
  if (visasApproved) totalScore += 20;
  if (paymentsCompleted) totalScore += 20;
  if (travelPnrSet) totalScore += 10;
  if (roomAssigned) totalScore += 10;

  return {
    percent: Math.min(100, totalScore),
    breakdown: {
      customerLinked,
      paxCount: paxList.length,
      passportsUploaded,
      visasApproved,
      paymentsCompleted,
      travelPnrSet,
      roomAssigned,
    },
  };
}

export function getRegistrationWithDetails(registrationId: number): RegistrationWithDetails | null {
  const db = getRawDb();
  const reg = db.prepare(`SELECT * FROM registration WHERE registration_id = ?`).get(registrationId) as unknown as Registration | undefined;
  if (!reg) return null;

  const paxList = getRegistrationPaxList(registrationId);
  const primaryPax = paxList.find((p) => p.is_primary === 1) || paxList[0];

  const cust = primaryPax
    ? (db.prepare(`SELECT * FROM customer WHERE customer_id = ?`).get(primaryPax.customer_id) as unknown as Customer)
    : (db.prepare(`SELECT * FROM customer WHERE customer_id = ?`).get(reg.customer_id) as unknown as Customer);

  const passport = primaryPax
    ? primaryPax.passportNumber
    : ((db.prepare(`SELECT passport_number FROM customer_identity WHERE customer_id = ? AND identity_status = 'ACTIVE'`).get(reg.customer_id) as any)?.passport_number || '');

  const seas = getSeasonById(reg.season_id);
  const pkg = db.prepare(`SELECT * FROM package WHERE package_id = ?`).get(reg.package_id) as unknown as Package | undefined;
  const fin = getRegistrationFinancialSummary(reg.registration_id);
  const prog = calculateRegistrationProgress(reg.registration_id);

  return {
    ...reg,
    payment_status: fin.paymentStatus,
    customerName: cust?.full_name || 'Unknown',
    fatherName: cust?.father_name || 'Unknown',
    customerState: cust?.state || 'Maharashtra',
    passportNumber: passport,
    seasonLabel: reg.season_label_snapshot || seas?.label || 'Unknown',
    seasonYear: seas?.year || 2026,
    seasonTypeCode: reg.season_type_code_snapshot || seas?.seasonTypeCode || 'REG',
    packageName: reg.package_name_snapshot || pkg?.name || 'Unknown',
    paxCount: paxList.length,
    paxList,
    netTotal: fin.netTotal,
    totalPaid: fin.totalPaid,
    balanceAmount: fin.balanceAmount,
    progressPercent: prog.percent,
    progressBreakdown: prog.breakdown,
  };
}

export function getAllRegistrations(): RegistrationWithDetails[] {
  const db = getRawDb();
  const regList = db.prepare(`SELECT registration_id FROM registration ORDER BY registration_id DESC`).all() as { registration_id: number }[];

  return regList.map((r) => getRegistrationWithDetails(r.registration_id)!).filter(Boolean);
}

export function createRegistrationWithPax(data: {
  season_id: number;
  package_id: number;
  status?: RegistrationStatus;
  representative?: string;
  tour_name?: string;
  booking_date?: string;
  airline?: string;
  sector?: string;
  flight_number?: string;
  pnr?: string;
  saudi_agent?: string;
  departure_date?: string;
  arrival_date?: string;
  room_preference?: string;
  bus_number?: string;
  remarks?: string;
  paxList: PaxInputData[];
}): RegistrationWithDetails {
  const db = getRawDb();
  const now = new Date().toISOString();

  if (!data.paxList || data.paxList.length === 0) {
    throw new Error('Cannot create Registration without at least one Primary Pilgrim (PAX).');
  }

  const seasonObj = getSeasonById(data.season_id);
  const pkgObj = db.prepare(`SELECT * FROM package WHERE package_id = ?`).get(data.package_id) as unknown as Package | undefined;
  if (!seasonObj) throw new Error(`Season #${data.season_id} not found.`);
  if (!pkgObj) throw new Error(`Package #${data.package_id} not found.`);

  const regNum = generateRegistrationNumber(data.season_id);
  const initialStatus = data.status || 'Draft';

  const getName = (p: PaxInputData) => (p.fullName || p.full_name || 'Pilgrim').trim();
  const getFather = (p: PaxInputData) => (p.fatherName || p.father_name || '').trim();
  const getDob = (p: PaxInputData) => (p.dob || p.date_of_birth || '2000-01-01').trim();
  const getGender = (p: PaxInputData) => (p.gender || 'Male').trim();
  const getNat = (p: PaxInputData) => (p.nationality || 'Indian').trim();
  const getMob = (p: PaxInputData) => (p.mobile || p.mobile_number || '+910000000000').trim();
  const getPass = (p: PaxInputData) => (p.passportNumber || p.passport_number || '').trim();
  const getIss = (p: PaxInputData) => (p.issueDate || p.issue_date || '').trim();
  const getExp = (p: PaxInputData) => (p.expiryDate || p.expiry_date || '').trim();
  const getPlace = (p: PaxInputData) => (p.placeOfIssue || p.place_of_issue || '').trim();
  const getAddr1 = (p: PaxInputData) => (p.addressLine1 || p.address_line1 || null);
  const getAddr2 = (p: PaxInputData) => (p.addressLine2 || p.address_line2 || null);
  const getPin = (p: PaxInputData) => (p.pinCode || p.pin_code || null);

  // Process Primary Customer first
  const primaryPaxData = data.paxList.find((p) => p.is_primary) || data.paxList[0];
  let primaryCustomerId = primaryPaxData.customer_id;

  if (!primaryCustomerId) {
    const cRes = db
      .prepare(
        `INSERT INTO customer (full_name, father_name, date_of_birth, gender, nationality, mobile_number, state, address_line1, address_line2, city, pin_code, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        getName(primaryPaxData),
        getFather(primaryPaxData),
        getDob(primaryPaxData),
        getGender(primaryPaxData),
        getNat(primaryPaxData),
        getMob(primaryPaxData),
        primaryPaxData.state || 'Maharashtra',
        getAddr1(primaryPaxData),
        getAddr2(primaryPaxData),
        primaryPaxData.city || null,
        getPin(primaryPaxData),
        primaryPaxData.email || null,
        now,
        now
      );
    primaryCustomerId = Number(cRes.lastInsertRowid);
  }

  // Insert Registration Master Record
  const regRes = db
    .prepare(
      `INSERT INTO registration (
        registration_number, customer_id, season_id, package_id, status, payment_status,
        package_name_snapshot, package_price_snapshot, season_label_snapshot, season_type_code_snapshot,
        representative, tour_name, booking_date, airline, sector, flight_number, pnr, saudi_agent,
        departure_date, arrival_date, room_preference, bus_number, remarks,
        makkah_hotel, madinah_hotel, makkah_checkin, makkah_checkout, madinah_checkin, madinah_checkout, meal_plan, room_type, room_number, accommodation_notes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      regNum,
      primaryCustomerId,
      data.season_id,
      data.package_id,
      initialStatus,
      'Pending',
      pkgObj.name,
      pkgObj.base_price_paise || 0,
      seasonObj.label,
      seasonObj.seasonTypeCode,
      data.representative || null,
      data.tour_name || null,
      data.booking_date || now.split('T')[0],
      data.airline || null,
      data.sector || null,
      data.flight_number || null,
      data.pnr || null,
      data.saudi_agent || null,
      data.departure_date || null,
      data.arrival_date || null,
      data.room_preference || null,
      data.bus_number || null,
      data.remarks || null,
      (data as any).makkah_hotel || null,
      (data as any).madinah_hotel || null,
      (data as any).makkah_checkin || null,
      (data as any).makkah_checkout || null,
      (data as any).madinah_checkin || null,
      (data as any).madinah_checkout || null,
      (data as any).meal_plan || null,
      (data as any).room_type || null,
      (data as any).room_number || null,
      (data as any).accommodation_notes || null,
      now,
      now
    );

  const regId = Number(regRes.lastInsertRowid);

  const insertPaxStmt = db.prepare(`
    INSERT INTO registration_pax (registration_id, customer_id, is_primary, pax_sequence, relationship, room_preference, bus_assignment, pax_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
  `);

  data.paxList.forEach((pax, idx) => {
    let custId = pax.customer_id;
    if (!custId) {
      const cRes = db
        .prepare(
          `INSERT INTO customer (full_name, father_name, date_of_birth, gender, nationality, mobile_number, state, address_line1, address_line2, city, pin_code, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          getName(pax),
          getFather(pax),
          getDob(pax),
          getGender(pax),
          getNat(pax),
          getMob(pax),
          pax.state || 'Maharashtra',
          getAddr1(pax),
          getAddr2(pax),
          pax.city || null,
          getPin(pax),
          pax.email || null,
          now,
          now
        );
      custId = Number(cRes.lastInsertRowid);
    } else {
      // Update customer master demographic fields if customer_id is supplied
      db.prepare(
        `UPDATE customer SET full_name = ?, father_name = ?, date_of_birth = ?, gender = ?, nationality = ?, mobile_number = ?, state = ?, address_line1 = ?, address_line2 = ?, city = ?, pin_code = ?, email = ?, updated_at = ? WHERE customer_id = ?`
      ).run(
        getName(pax),
        getFather(pax),
        getDob(pax),
        getGender(pax),
        getNat(pax),
        getMob(pax),
        pax.state || 'Maharashtra',
        getAddr1(pax),
        getAddr2(pax),
        pax.city || null,
        getPin(pax),
        pax.email || null,
        now,
        custId
      );
    }

    const passNum = getPass(pax);
    if (passNum !== '') {
      const existingIdent = db
        .prepare(`SELECT identity_id FROM customer_identity WHERE customer_id = ? AND passport_number = ?`)
        .get(custId, passNum);

      if (!existingIdent) {
        db.prepare(
          `INSERT INTO customer_identity (customer_id, passport_number, issue_date, expiry_date, place_of_issue, identity_status, created_at) VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?)`
        ).run(
          custId,
          passNum,
          getIss(pax),
          getExp(pax),
          getPlace(pax),
          now
        );
      } else {
        db.prepare(
          `UPDATE customer_identity SET issue_date = ?, expiry_date = ?, place_of_issue = ? WHERE identity_id = ?`
        ).run(getIss(pax), getExp(pax), getPlace(pax), (existingIdent as any).identity_id);
      }
    }

    insertPaxStmt.run(
      regId,
      custId,
      pax.is_primary ? 1 : 0,
      idx + 1,
      pax.relationship || (pax.is_primary ? 'Primary' : 'Relative'),
      data.room_preference || null,
      data.bus_number || null,
      now,
      now
    );
  });

  const created = getRegistrationWithDetails(regId)!;

  recordAudit({
    entityType: 'Registration',
    entityId: regId,
    action: 'Created',
    newValue: JSON.stringify(created),
    notes: `Registration ${regNum} created with ${data.paxList.length} Pax`,
  });

  return created;
}

export function updateRegistrationWithPax(
  registrationId: number,
  data: Omit<Partial<RegistrationWithDetails>, 'paxList'> & {
    paxList?: PaxInputData[];
  }
): RegistrationWithDetails {
  const db = getRawDb();
  const existing = getRegistrationWithDetails(registrationId);
  if (!existing) throw new Error(`Registration #${registrationId} not found`);

  const now = new Date().toISOString();

  const getName = (p: PaxInputData) => (p.fullName || p.full_name || 'Pilgrim').trim();
  const getFather = (p: PaxInputData) => (p.fatherName || p.father_name || '').trim();
  const getDob = (p: PaxInputData) => (p.dob || p.date_of_birth || '2000-01-01').trim();
  const getGender = (p: PaxInputData) => (p.gender || 'Male').trim();
  const getNat = (p: PaxInputData) => (p.nationality || 'Indian').trim();
  const getMob = (p: PaxInputData) => (p.mobile || p.mobile_number || '+910000000000').trim();
  const getPass = (p: PaxInputData) => (p.passportNumber || p.passport_number || '').trim();
  const getIss = (p: PaxInputData) => (p.issueDate || p.issue_date || '').trim();
  const getExp = (p: PaxInputData) => (p.expiryDate || p.expiry_date || '').trim();
  const getPlace = (p: PaxInputData) => (p.placeOfIssue || p.place_of_issue || '').trim();
  const getAddr1 = (p: PaxInputData) => (p.addressLine1 || p.address_line1 || null);
  const getAddr2 = (p: PaxInputData) => (p.addressLine2 || p.address_line2 || null);
  const getPin = (p: PaxInputData) => (p.pinCode || p.pin_code || null);

  // Sync Primary Customer ID
  let primaryCustomerId = existing.customer_id;
  if (data.paxList && data.paxList.length > 0) {
    const primaryPax = data.paxList.find((p) => p.is_primary) || data.paxList[0];
    if (primaryPax.customer_id) {
      primaryCustomerId = primaryPax.customer_id;
    }
  }

  // Update Registration master fields (including primary customer_id)
  db.prepare(
    `UPDATE registration SET
      customer_id = ?,
      status = COALESCE(?, status),
      season_id = COALESCE(?, season_id),
      package_id = COALESCE(?, package_id),
      representative = ?,
      tour_name = ?,
      booking_date = ?,
      airline = ?,
      sector = ?,
      flight_number = ?,
      pnr = ?,
      saudi_agent = ?,
      departure_date = ?,
      arrival_date = ?,
      room_preference = ?,
      bus_number = ?,
      remarks = ?,
      makkah_hotel = ?,
      madinah_hotel = ?,
      makkah_checkin = ?,
      makkah_checkout = ?,
      madinah_checkin = ?,
      madinah_checkout = ?,
      meal_plan = ?,
      room_type = ?,
      room_number = ?,
      accommodation_notes = ?,
      updated_at = ?
    WHERE registration_id = ?`
  ).run(
    primaryCustomerId,
    data.status || null,
    data.season_id || null,
    data.package_id || null,
    data.representative || null,
    data.tour_name || null,
    data.booking_date || null,
    data.airline || null,
    data.sector || null,
    data.flight_number || null,
    data.pnr || null,
    data.saudi_agent || null,
    data.departure_date || null,
    data.arrival_date || null,
    data.room_preference || null,
    data.bus_number || null,
    data.remarks || null,
    (data as any).makkah_hotel || null,
    (data as any).madinah_hotel || null,
    (data as any).makkah_checkin || null,
    (data as any).makkah_checkout || null,
    (data as any).madinah_checkin || null,
    (data as any).madinah_checkout || null,
    (data as any).meal_plan || null,
    (data as any).room_type || null,
    (data as any).room_number || null,
    (data as any).accommodation_notes || null,
    now,
    registrationId
  );

  // Update PAX list if supplied
  if (data.paxList && data.paxList.length > 0) {
    db.prepare(`DELETE FROM registration_pax WHERE registration_id = ?`).run(registrationId);

    const insertPaxStmt = db.prepare(`
      INSERT INTO registration_pax (registration_id, customer_id, is_primary, pax_sequence, relationship, room_preference, bus_assignment, pax_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
    `);

    data.paxList.forEach((pax, idx) => {
      let custId = pax.customer_id;
      if (!custId) {
        const cRes = db
          .prepare(
            `INSERT INTO customer (full_name, father_name, date_of_birth, gender, nationality, mobile_number, state, address_line1, address_line2, city, pin_code, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            getName(pax),
            getFather(pax),
            getDob(pax),
            getGender(pax),
            getNat(pax),
            getMob(pax),
            pax.state || 'Maharashtra',
            getAddr1(pax),
            getAddr2(pax),
            pax.city || null,
            getPin(pax),
            pax.email || null,
            now,
            now
          );
        custId = Number(cRes.lastInsertRowid);
      } else {
        db.prepare(
          `UPDATE customer SET full_name = ?, father_name = ?, date_of_birth = ?, gender = ?, nationality = ?, mobile_number = ?, state = ?, address_line1 = ?, address_line2 = ?, city = ?, pin_code = ?, email = ?, updated_at = ? WHERE customer_id = ?`
        ).run(
          getName(pax),
          getFather(pax),
          getDob(pax),
          getGender(pax),
          getNat(pax),
          getMob(pax),
          pax.state || 'Maharashtra',
          getAddr1(pax),
          getAddr2(pax),
          pax.city || null,
          getPin(pax),
          pax.email || null,
          now,
          custId
        );
      }

      const passNum = getPass(pax);
      if (passNum !== '') {
        const existingIdent = db
          .prepare(`SELECT identity_id FROM customer_identity WHERE customer_id = ? AND passport_number = ?`)
          .get(custId, passNum);

        if (!existingIdent) {
          db.prepare(
            `INSERT INTO customer_identity (customer_id, passport_number, issue_date, expiry_date, place_of_issue, identity_status, created_at) VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?)`
          ).run(
            custId,
            passNum,
            getIss(pax),
            getExp(pax),
            getPlace(pax),
            now
          );
        } else {
          db.prepare(
            `UPDATE customer_identity SET issue_date = ?, expiry_date = ?, place_of_issue = ? WHERE identity_id = ?`
          ).run(getIss(pax), getExp(pax), getPlace(pax), (existingIdent as any).identity_id);
        }
      }

      insertPaxStmt.run(
        registrationId,
        custId,
        pax.is_primary ? 1 : 0,
        idx + 1,
        pax.relationship || (pax.is_primary ? 'Primary' : 'Relative'),
        data.room_preference || null,
        data.bus_number || null,
        now,
        now
      );
    });
  }

  const updated = getRegistrationWithDetails(registrationId)!;

  recordAudit({
    entityType: 'Registration',
    entityId: registrationId,
    action: 'Updated',
    newValue: JSON.stringify(updated),
    notes: `Registration ${updated.registration_number} updated`,
  });

  return updated;
}

export function createRegistration(data: {
  customer_id: number;
  season_id: number;
  package_id: number;
  status?: RegistrationStatus;
}): RegistrationWithDetails {
  const db = getRawDb();
  const cust = db.prepare(`SELECT * FROM customer WHERE customer_id = ?`).get(data.customer_id) as any;
  const ident = db.prepare(`SELECT * FROM customer_identity WHERE customer_id = ? AND identity_status = 'ACTIVE'`).get(data.customer_id) as any;

  return createRegistrationWithPax({
    season_id: data.season_id,
    package_id: data.package_id,
    status: data.status || 'Draft',
    paxList: [
      {
        customer_id: data.customer_id,
        full_name: cust?.full_name || 'Pilgrim',
        father_name: cust?.father_name || '',
        date_of_birth: cust?.date_of_birth || '2000-01-01',
        gender: cust?.gender || 'Male',
        nationality: cust?.nationality || 'Indian',
        mobile_number: cust?.mobile_number || '+910000000000',
        passport_number: ident?.passport_number,
        issue_date: ident?.issue_date,
        expiry_date: ident?.expiry_date,
        place_of_issue: ident?.place_of_issue,
        relationship: 'Primary',
        is_primary: true,
      },
    ],
  });
}

export function updateRegistrationStatus(registrationId: number, newStatus: RegistrationStatus): RegistrationWithDetails {
  return updateRegistrationWithPax(registrationId, { status: newStatus as any });
}
