import { getRawDb } from '../db/index';
import { recordAudit } from './auditService';
import { VisaOperation, FlightOperation, HotelOperation } from '../db/schema';

export interface VisaStatusData {
  visa_id?: number;
  registration_id: number;
  pax_id?: number;
  visa_status: 'Pending' | 'Submitted' | 'Approved' | 'Rejected';
  embassy_reference?: string;
  visa_number?: string;
  submission_date?: string;
  approval_date?: string;
  rejection_reason?: string;
  batch_number?: string;
  notes?: string;
}

export interface FlightData {
  flight_op_id?: number;
  registration_id: number;
  pax_id?: number;
  airline: string;
  flight_number: string;
  pnr: string;
  departure_airport?: string;
  arrival_airport?: string;
  departure_date?: string;
  arrival_date?: string;
  ticket_number?: string;
  ticket_document_path?: string;
}

export interface HotelData {
  hotel_op_id?: number;
  registration_id: number;
  city: 'Makkah' | 'Madinah';
  hotel_name: string;
  room_type: string;
  room_number?: string;
  occupancy_count?: number;
  checkin_date?: string;
  checkout_date?: string;
  notes?: string;
}

// --- VISA OPERATIONS ---

export function getVisaOperations(registrationId: number): VisaOperation[] {
  const db = getRawDb();
  try {
    return db
      .prepare(`SELECT * FROM visa_operation WHERE registration_id = ? ORDER BY visa_id ASC`)
      .all(registrationId) as VisaOperation[];
  } catch (e) {
    return [];
  }
}

export function saveVisaOperation(data: VisaStatusData): VisaOperation {
  const db = getRawDb();
  const now = new Date().toISOString();

  let existing: VisaOperation | undefined;
  if (data.visa_id) {
    existing = db.prepare(`SELECT * FROM visa_operation WHERE visa_id = ?`).get(data.visa_id);
  } else {
    existing = db
      .prepare(`SELECT * FROM visa_operation WHERE registration_id = ? AND (pax_id = ? OR pax_id IS NULL)`)
      .get(data.registration_id, data.pax_id || null);
  }

  if (existing) {
    db.prepare(`
      UPDATE visa_operation
      SET visa_status = ?, embassy_reference = ?, visa_number = ?, submission_date = ?, approval_date = ?, rejection_reason = ?, batch_number = ?, notes = ?, updated_at = ?
      WHERE visa_id = ?
    `).run(
      data.visa_status,
      data.embassy_reference || null,
      data.visa_number || null,
      data.submission_date || null,
      data.approval_date || null,
      data.rejection_reason || null,
      data.batch_number || null,
      data.notes || null,
      now,
      existing.visa_id
    );

    recordAudit({
      entityType: 'Registration',
      entityId: data.registration_id,
      action: 'StatusUpdated',
      fieldChanged: 'visa_status',
      oldValue: existing.visa_status,
      newValue: data.visa_status,
      notes: `Updated visa operational status to ${data.visa_status}. Ref: ${data.embassy_reference || 'N/A'}`,
    });

    return db.prepare(`SELECT * FROM visa_operation WHERE visa_id = ?`).get(existing.visa_id);
  } else {
    const res = db.prepare(`
      INSERT INTO visa_operation (registration_id, pax_id, visa_status, embassy_reference, visa_number, submission_date, approval_date, rejection_reason, batch_number, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.registration_id,
      data.pax_id || null,
      data.visa_status,
      data.embassy_reference || null,
      data.visa_number || null,
      data.submission_date || null,
      data.approval_date || null,
      data.rejection_reason || null,
      data.batch_number || null,
      data.notes || null,
      now,
      now
    );

    recordAudit({
      entityType: 'Registration',
      entityId: data.registration_id,
      action: 'Created',
      fieldChanged: 'visa_status',
      oldValue: 'None',
      newValue: data.visa_status,
      notes: `Created visa operation record with status ${data.visa_status}`,
    });

    return db.prepare(`SELECT * FROM visa_operation WHERE visa_id = ?`).get(res.lastInsertRowid);
  }
}

// --- FLIGHT OPERATIONS ---

export function getFlightOperations(registrationId: number): FlightOperation[] {
  const db = getRawDb();
  try {
    return db
      .prepare(`SELECT * FROM flight_operation WHERE registration_id = ? ORDER BY flight_op_id ASC`)
      .all(registrationId) as FlightOperation[];
  } catch (e) {
    return [];
  }
}

export function saveFlightOperation(data: FlightData): FlightOperation {
  const db = getRawDb();
  const now = new Date().toISOString();

  let existing: FlightOperation | undefined;
  if (data.flight_op_id) {
    existing = db.prepare(`SELECT * FROM flight_operation WHERE flight_op_id = ?`).get(data.flight_op_id);
  } else {
    existing = db
      .prepare(`SELECT * FROM flight_operation WHERE registration_id = ?`)
      .get(data.registration_id);
  }

  if (existing) {
    db.prepare(`
      UPDATE flight_operation
      SET airline = ?, flight_number = ?, pnr = ?, departure_airport = ?, arrival_airport = ?, departure_date = ?, arrival_date = ?, ticket_number = ?, ticket_document_path = ?, updated_at = ?
      WHERE flight_op_id = ?
    `).run(
      data.airline,
      data.flight_number,
      data.pnr,
      data.departure_airport || null,
      data.arrival_airport || null,
      data.departure_date || null,
      data.arrival_date || null,
      data.ticket_number || null,
      data.ticket_document_path || null,
      now,
      existing.flight_op_id
    );

    recordAudit({
      entityType: 'Registration',
      entityId: data.registration_id,
      action: 'StatusUpdated',
      fieldChanged: 'pnr',
      oldValue: existing.pnr || 'None',
      newValue: data.pnr,
      notes: `Updated Flight PNR to ${data.pnr} (${data.airline} ${data.flight_number})`,
    });

    return db.prepare(`SELECT * FROM flight_operation WHERE flight_op_id = ?`).get(existing.flight_op_id);
  } else {
    const res = db.prepare(`
      INSERT INTO flight_operation (registration_id, pax_id, airline, flight_number, pnr, departure_airport, arrival_airport, departure_date, arrival_date, ticket_number, ticket_document_path, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.registration_id,
      data.pax_id || null,
      data.airline,
      data.flight_number,
      data.pnr,
      data.departure_airport || null,
      data.arrival_airport || null,
      data.departure_date || null,
      data.arrival_date || null,
      data.ticket_number || null,
      data.ticket_document_path || null,
      now,
      now
    );

    recordAudit({
      entityType: 'Registration',
      entityId: data.registration_id,
      action: 'Created',
      fieldChanged: 'pnr',
      oldValue: 'None',
      newValue: data.pnr,
      notes: `Assigned Flight ${data.airline} ${data.flight_number} with PNR ${data.pnr}`,
    });

    return db.prepare(`SELECT * FROM flight_operation WHERE flight_op_id = ?`).get(res.lastInsertRowid);
  }
}

// --- HOTEL OPERATIONS ---

export function getHotelOperations(registrationId: number): HotelOperation[] {
  const db = getRawDb();
  try {
    return db
      .prepare(`SELECT * FROM hotel_operation WHERE registration_id = ? ORDER BY hotel_op_id ASC`)
      .all(registrationId) as HotelOperation[];
  } catch (e) {
    return [];
  }
}

export function saveHotelOperation(data: HotelData): HotelOperation {
  const db = getRawDb();
  const now = new Date().toISOString();

  let existing: HotelOperation | undefined;
  if (data.hotel_op_id) {
    existing = db.prepare(`SELECT * FROM hotel_operation WHERE hotel_op_id = ?`).get(data.hotel_op_id);
  } else {
    existing = db
      .prepare(`SELECT * FROM hotel_operation WHERE registration_id = ? AND city = ?`)
      .get(data.registration_id, data.city);
  }

  if (existing) {
    db.prepare(`
      UPDATE hotel_operation
      SET hotel_name = ?, room_type = ?, room_number = ?, occupancy_count = ?, checkin_date = ?, checkout_date = ?, notes = ?, updated_at = ?
      WHERE hotel_op_id = ?
    `).run(
      data.hotel_name,
      data.room_type,
      data.room_number || null,
      data.occupancy_count || 1,
      data.checkin_date || null,
      data.checkout_date || null,
      data.notes || null,
      now,
      existing.hotel_op_id
    );

    recordAudit({
      entityType: 'Registration',
      entityId: data.registration_id,
      action: 'StatusUpdated',
      fieldChanged: 'room_number',
      oldValue: existing.room_number || 'None',
      newValue: data.room_number || 'Assigned',
      notes: `Assigned ${data.city} Hotel: ${data.hotel_name} (Room ${data.room_number || 'TBD'})`,
    });

    return db.prepare(`SELECT * FROM hotel_operation WHERE hotel_op_id = ?`).get(existing.hotel_op_id);
  } else {
    const res = db.prepare(`
      INSERT INTO hotel_operation (registration_id, city, hotel_name, room_type, room_number, occupancy_count, checkin_date, checkout_date, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.registration_id,
      data.city,
      data.hotel_name,
      data.room_type,
      data.room_number || null,
      data.occupancy_count || 1,
      data.checkin_date || null,
      data.checkout_date || null,
      data.notes || null,
      now,
      now
    );

    recordAudit({
      entityType: 'Registration',
      entityId: data.registration_id,
      action: 'Created',
      fieldChanged: 'hotel_name',
      oldValue: 'None',
      newValue: data.hotel_name,
      notes: `Assigned ${data.city} Hotel: ${data.hotel_name} (${data.room_type})`,
    });

    return db.prepare(`SELECT * FROM hotel_operation WHERE hotel_op_id = ?`).get(res.lastInsertRowid);
  }
}
