import { getRawDb } from '../db';
import { Customer, CustomerIdentity } from '../db/schema';
import { recordAudit } from './auditService';

export interface CustomerWithIdentity extends Customer {
  identities: CustomerIdentity[];
  currentPassport?: string;
}

export type DuplicateConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'CONFLICT';

export interface DuplicateMatch {
  existingCustomer: CustomerWithIdentity;
  confidenceScore: number; // 0 to 100
  confidenceLevel: DuplicateConfidenceLevel;
  matchedFields: string[];
  isDataConflict?: boolean;
}

function normalize(str: string): string {
  return (str || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array.from({ length: b.length + 1 }, () => 0)
  );

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

export function getAllCustomers(): CustomerWithIdentity[] {
  const db = getRawDb();
  const customers = db.prepare(`SELECT * FROM customer ORDER BY customer_id ASC`).all() as unknown as Customer[];
  const identities = db.prepare(`SELECT * FROM customer_identity`).all() as unknown as CustomerIdentity[];

  return customers.map((c) => {
    const custIdentities = identities.filter((id) => Number(id.customer_id) === Number(c.customer_id));
    const activeId = custIdentities.find((id) => id.identity_status === 'ACTIVE') || custIdentities[0];
    return {
      ...c,
      identities: custIdentities,
      currentPassport: activeId?.passport_number || '',
    };
  });
}

export function searchCustomers(query: string): CustomerWithIdentity[] {
  const all = getAllCustomers();
  if (!query || !query.trim()) return all;
  const q = query.toLowerCase().trim();
  return all.filter(
    (c) =>
      c.full_name.toLowerCase().includes(q) ||
      c.father_name.toLowerCase().includes(q) ||
      (c.mobile_number || '').includes(q) ||
      (c.currentPassport || '').toLowerCase().includes(q)
  );
}

export function getCustomerById(id: number): CustomerWithIdentity | null {
  const db = getRawDb();
  const c = db.prepare(`SELECT * FROM customer WHERE customer_id = ?`).get(id) as unknown as Customer | undefined;
  if (!c) return null;

  const identities = db
    .prepare(`SELECT * FROM customer_identity WHERE customer_id = ?`)
    .all(id) as unknown as CustomerIdentity[];

  const activeId = identities.find((id) => id.identity_status === 'ACTIVE') || identities[0];
  return {
    ...c,
    identities,
    currentPassport: activeId?.passport_number || '',
  };
}

export function checkForDuplicates(input: {
  full_name: string;
  father_name: string;
  date_of_birth: string;
  passport_number?: string;
  excludeCustomerId?: number;
}): DuplicateMatch[] {
  const all = getAllCustomers();
  const matches: DuplicateMatch[] = [];

  const inputName = normalize(input.full_name);
  const inputFather = normalize(input.father_name);
  const inputDob = (input.date_of_birth || '').trim();
  const inputPassport = input.passport_number ? normalize(input.passport_number) : '';

  for (const existing of all) {
    if (input.excludeCustomerId && existing.customer_id === input.excludeCustomerId) {
      continue;
    }

    const exName = normalize(existing.full_name);
    const exFather = normalize(existing.father_name);
    const exDob = (existing.date_of_birth || '').trim();
    const exPassports = existing.identities.map((id) => normalize(id.passport_number));

    const matchedFields: string[] = [];
    let score = 0;
    let level: DuplicateConfidenceLevel = 'MEDIUM';
    let isDataConflict = false;

    const isNameExact = inputName === exName;
    const isFatherExact = inputFather === exFather;
    const isDobExact = inputDob === exDob;
    const isPassportExact = inputPassport !== '' && exPassports.includes(inputPassport);

    if (isPassportExact && !isNameExact) {
      // DATA CONFLICT REQUIREMENT: Passport match with differing name MUST NOT be high confidence
      matchedFields.push('Passport Number (Name Mismatch)');
      score = 50;
      level = 'CONFLICT';
      isDataConflict = true;
    } else if (isNameExact && isDobExact && isFatherExact) {
      matchedFields.push('Full Name', 'Father Name', 'Date of Birth');
      score = 100;
      level = 'HIGH';
    } else if (isPassportExact && isNameExact) {
      matchedFields.push('Passport Number', 'Full Name');
      score = 95;
      level = 'HIGH';
    } else if (isNameExact && isDobExact) {
      matchedFields.push('Full Name', 'Date of Birth');
      score = 85;
      level = 'MEDIUM';
    } else if (isNameExact && isFatherExact) {
      matchedFields.push('Full Name', 'Father Name');
      score = 75;
      level = 'MEDIUM';
    } else if (isDobExact && levenshtein(inputName, exName) <= 2) {
      matchedFields.push('Similar Name', 'Date of Birth');
      score = 70;
      level = 'MEDIUM';
    }

    if (score > 0) {
      matches.push({
        existingCustomer: existing,
        confidenceScore: score,
        confidenceLevel: level,
        matchedFields,
        isDataConflict,
      });
    }
  }

  return matches.sort((a, b) => b.confidenceScore - a.confidenceScore);
}

export function createCustomer(data: {
  full_name: string;
  father_name: string;
  date_of_birth: string;
  gender: string;
  nationality: string;
  mobile_number: string;
  state?: string;
  passport_number?: string;
  issue_date?: string;
  expiry_date?: string;
  place_of_issue?: string;
}): CustomerWithIdentity {
  const db = getRawDb();
  const now = new Date().toISOString();

  const custState = data.state?.trim() || 'Maharashtra';

  const insertCustStmt = db.prepare(`
    INSERT INTO customer (full_name, father_name, date_of_birth, gender, nationality, mobile_number, state, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const res = insertCustStmt.run(
    data.full_name.trim(),
    data.father_name.trim(),
    data.date_of_birth.trim(),
    data.gender,
    data.nationality.trim() || 'Indian',
    data.mobile_number.trim(),
    custState,
    now,
    now
  );

  const customerId = Number(res.lastInsertRowid);

  if (data.passport_number) {
    const insertIdStmt = db.prepare(`
      INSERT INTO customer_identity (customer_id, passport_number, issue_date, expiry_date, place_of_issue, identity_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const passportNo = data.passport_number.trim().toUpperCase();
    const idRes = insertIdStmt.run(
      customerId,
      passportNo,
      data.issue_date?.trim() || '',
      data.expiry_date?.trim() || '',
      data.place_of_issue?.trim() || '',
      'ACTIVE',
      now
    );

    recordAudit({
      entityType: 'CustomerIdentity',
      entityId: Number(idRes.lastInsertRowid),
      action: 'Created',
      notes: `Passport ${passportNo} (ACTIVE) attached to customer #${customerId}`,
    });
  }

  const insertedCustomer = getCustomerById(customerId)!;

  recordAudit({
    entityType: 'Customer',
    entityId: customerId,
    action: 'Created',
    newValue: JSON.stringify(insertedCustomer),
    notes: `Customer ${insertedCustomer.full_name} created`,
  });

  return insertedCustomer;
}

export function updateCustomer(
  id: number,
  data: {
    full_name?: string;
    father_name?: string;
    date_of_birth?: string;
    gender?: string;
    nationality?: string;
    mobile_number?: string;
    state?: string;
    passport_number?: string;
    issue_date?: string;
    expiry_date?: string;
    place_of_issue?: string;
  }
): CustomerWithIdentity {
  const db = getRawDb();
  const existing = getCustomerById(id);
  if (!existing) throw new Error(`Customer with ID ${id} not found`);

  const now = new Date().toISOString();

  const updateStmt = db.prepare(`
    UPDATE customer
    SET full_name = COALESCE(?, full_name),
        father_name = COALESCE(?, father_name),
        date_of_birth = COALESCE(?, date_of_birth),
        gender = COALESCE(?, gender),
        nationality = COALESCE(?, nationality),
        mobile_number = COALESCE(?, mobile_number),
        state = COALESCE(?, state),
        updated_at = ?
    WHERE customer_id = ?
  `);

  updateStmt.run(
    data.full_name ? data.full_name.trim() : null,
    data.father_name ? data.father_name.trim() : null,
    data.date_of_birth ? data.date_of_birth.trim() : null,
    data.gender || null,
    data.nationality ? data.nationality.trim() : null,
    data.mobile_number ? data.mobile_number.trim() : null,
    data.state ? data.state.trim() : null,
    now,
    id
  );

  recordAudit({
    entityType: 'Customer',
    entityId: id,
    action: 'Updated',
    oldValue: JSON.stringify(existing),
    newValue: JSON.stringify(data),
    notes: `Updated customer #${id}`,
  });

  if (data.passport_number) {
    const passportNo = data.passport_number.trim().toUpperCase();
    const existingPassport = existing.identities.find(
      (i) => normalize(i.passport_number) === normalize(passportNo)
    );

    if (!existingPassport) {
      db.prepare(`UPDATE customer_identity SET identity_status = 'REPLACED' WHERE customer_id = ? AND identity_status = 'ACTIVE'`).run(id);

      const idRes = db
        .prepare(
          `INSERT INTO customer_identity (customer_id, passport_number, issue_date, expiry_date, place_of_issue, identity_status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          passportNo,
          data.issue_date?.trim() || '',
          data.expiry_date?.trim() || '',
          data.place_of_issue?.trim() || '',
          'ACTIVE',
          now
        );

      recordAudit({
        entityType: 'CustomerIdentity',
        entityId: Number(idRes.lastInsertRowid),
        action: 'Created',
        notes: `New passport ${passportNo} (ACTIVE) added for customer #${id}`,
      });
    }
  }

  return getCustomerById(id)!;
}
