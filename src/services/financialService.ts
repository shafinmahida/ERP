import { getRawDb } from '../db';
import { RegistrationCharge, RegistrationTax, Payment } from '../db/schema';
import { recordAudit } from './auditService';

export type ChargeType =
  | 'Adult'
  | 'ChildWithBed'
  | 'ChildWithoutBed'
  | 'Infant'
  | 'Visa'
  | 'Miscellaneous'
  | 'Discount'
  | 'FareDifference'
  | 'Cancellation';

export const CHARGE_TYPES: ChargeType[] = [
  'Adult',
  'ChildWithBed',
  'ChildWithoutBed',
  'Infant',
  'Visa',
  'Miscellaneous',
  'Discount',
  'FareDifference',
  'Cancellation',
];

export type TaxType = 'CGST' | 'SGST' | 'IGST' | 'TCS';

export const TAX_TYPES: TaxType[] = ['CGST', 'SGST', 'IGST', 'TCS'];

export type PaymentType = 'Cash' | 'Cheque' | 'Bank Transfer';

export const PAYMENT_TYPES: PaymentType[] = ['Cash', 'Cheque', 'Bank Transfer'];

export type PaymentStatus =
  | 'Pending'
  | 'Advance Received'
  | 'Partially Paid'
  | 'Fully Paid'
  | 'Overpaid'
  | 'Refund Pending'
  | 'Refunded';

export const PAYMENT_STATUSES: PaymentStatus[] = [
  'Pending',
  'Advance Received',
  'Partially Paid',
  'Fully Paid',
  'Overpaid',
  'Refund Pending',
  'Refunded',
];

// Helper functions for UI Boundary Conversion
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function usdToCents(usd: number): number {
  return Math.round(usd * 100);
}

export function centsToUsd(cents: number): number {
  return cents / 100;
}

export interface FormattedCharge extends RegistrationCharge {
  rate_inr: number;
  rate_usd?: number;
  amount: number;
}

export interface FormattedTax extends RegistrationTax {
  amount: number;
}

export interface FormattedPayment extends Payment {
  amount: number;
}

export interface RegistrationFinancialSummary {
  registrationId: number;
  charges: FormattedCharge[];
  taxes: FormattedTax[];
  payments: FormattedPayment[];
  chargeSubtotalPaise: number;
  taxSubtotalPaise: number;
  netTotalPaise: number;
  totalPaidPaise: number;
  balanceAmountPaise: number;
  // UI Display Formats (Rupees)
  chargeSubtotal: number;
  taxSubtotal: number;
  netTotal: number;
  totalPaid: number;
  balanceAmount: number;
  isOverpaid: boolean;
  creditAmount: number;
  netBalanceDue: number;
  paymentStatus: PaymentStatus;
}

export interface SuggestedTaxItem {
  tax_type: TaxType;
  rate_percent: number;
  suggested_amount_paise: number;
  suggested_amount: number;
  reason: string;
}

// ─── Company / Agency Settings ────────────────────────────────────────────────

export function getAgencyRegisteredState(): string {
  const db = getRawDb();
  const setting = db.prepare(`SELECT * FROM company_settings WHERE setting_key = 'agency_registered_state'`).get() as any;
  return setting?.setting_value || 'Maharashtra';
}

export function updateAgencyRegisteredState(newState: string): string {
  const db = getRawDb();
  const trimmed = newState.trim();
  const oldState = getAgencyRegisteredState();
  const now = new Date().toISOString();

  const existing = db.prepare(`SELECT * FROM company_settings WHERE setting_key = 'agency_registered_state'`).get();
  if (existing) {
    db.prepare(`UPDATE company_settings SET setting_value = ?, updated_at = ? WHERE setting_key = 'agency_registered_state'`).run(trimmed, now);
  } else {
    db.prepare(`INSERT INTO company_settings (setting_key, setting_value, updated_at) VALUES ('agency_registered_state', ?, ?)`).run(trimmed, now);
  }

  recordAudit({
    entityType: 'CompanySettings',
    entityId: 'agency_registered_state',
    action: 'Updated',
    oldValue: oldState,
    newValue: trimmed,
    notes: 'Agency registered state updated for GST calculations',
  });

  return trimmed;
}

// ─── Charges ──────────────────────────────────────────────────────────────────

export function getRegistrationCharges(registrationId: number): FormattedCharge[] {
  const db = getRawDb();
  const rawList = db
    .prepare(`SELECT * FROM registration_charge WHERE registration_id = ? ORDER BY charge_id ASC`)
    .all(registrationId) as any[];

  return rawList.map((c) => {
    const amountPaise = c.amount_paise !== undefined && c.amount_paise !== 0 ? c.amount_paise : Math.round((c.amount || 0) * 100);
    const rateInrPaise = c.rate_inr_paise !== undefined && c.rate_inr_paise !== 0 ? c.rate_inr_paise : Math.round((c.rate_inr || 0) * 100);
    const rateUsdCents = c.rate_usd_cents !== undefined ? c.rate_usd_cents : (c.rate_usd ? Math.round(c.rate_usd * 100) : undefined);

    return {
      ...c,
      rate_inr_paise: rateInrPaise,
      rate_usd_cents: rateUsdCents,
      amount_paise: amountPaise,
      rate_inr: paiseToRupees(rateInrPaise),
      rate_usd: rateUsdCents !== undefined ? centsToUsd(rateUsdCents) : undefined,
      amount: paiseToRupees(amountPaise),
    };
  });
}

export function createRegistrationCharge(data: {
  registration_id: number;
  charge_type: ChargeType;
  rate_inr?: number; // UI Rupees
  rate_usd?: number; // UI USD
  exchange_rate_used?: number; // Exchange rate captured at creation time
  quantity?: number;
}): FormattedCharge {
  const db = getRawDb();
  const qty = data.quantity && data.quantity > 0 ? data.quantity : 1;
  const rateInrPaise = rupeesToPaise(data.rate_inr || 0);
  const rateUsdCents = data.rate_usd !== undefined ? usdToCents(data.rate_usd) : undefined;
  
  // Rule: exchange_rate_used is ONLY populated when a USD rate is present; null for INR-only charges!
  const exRate = (data.rate_usd && data.rate_usd > 0) ? (data.exchange_rate_used || 85.5) : null;

  let calculatedAmountPaise = Math.round(rateInrPaise * qty);
  if (data.charge_type === 'Discount') {
    calculatedAmountPaise = -Math.abs(calculatedAmountPaise);
  }

  const now = new Date().toISOString();
  const rateInrRupees = paiseToRupees(rateInrPaise);
  const amountRupees = paiseToRupees(calculatedAmountPaise);

  const res = db
    .prepare(
      `INSERT INTO registration_charge (registration_id, charge_type, rate_inr, rate_inr_paise, rate_usd, rate_usd_cents, exchange_rate_used, quantity, amount, amount_paise, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.registration_id,
      data.charge_type,
      rateInrRupees,
      rateInrPaise,
      data.rate_usd || null,
      rateUsdCents || null,
      exRate,
      qty,
      amountRupees,
      calculatedAmountPaise,
      now,
      now
    );

  const chargeId = Number(res.lastInsertRowid);
  const charges = getRegistrationCharges(data.registration_id);
  const created = charges.find((c) => c.charge_id === chargeId)!;

  recordAudit({
    entityType: 'RegistrationCharge',
    entityId: chargeId,
    action: 'Created',
    newValue: JSON.stringify(created),
    notes: `Added ${data.charge_type} charge line item (₹${created.amount}) to Registration #${data.registration_id}`,
  });

  syncRegistrationPaymentStatus(data.registration_id);

  return created;
}

export function updateRegistrationCharge(
  chargeId: number,
  data: {
    charge_type?: ChargeType;
    rate_inr?: number;
    rate_usd?: number;
    exchange_rate_used?: number;
    quantity?: number;
  }
): FormattedCharge {
  const db = getRawDb();
  const old = db.prepare(`SELECT * FROM registration_charge WHERE charge_id = ?`).get(chargeId) as any;
  if (!old) throw new Error(`Registration Charge #${chargeId} not found`);

  const chargeType = data.charge_type || old.charge_type;
  const qty = data.quantity !== undefined ? data.quantity : old.quantity;
  const rateInrPaise = data.rate_inr !== undefined ? rupeesToPaise(data.rate_inr) : (old.rate_inr_paise || Math.round((old.rate_inr || 0) * 100));
  const rateUsdCents = data.rate_usd !== undefined ? usdToCents(data.rate_usd) : old.rate_usd_cents;

  const hasUsd = rateUsdCents !== undefined && rateUsdCents > 0;
  const exRate = hasUsd ? (data.exchange_rate_used !== undefined ? data.exchange_rate_used : (old.exchange_rate_used || 85.5)) : null;

  let newAmountPaise = Math.round(rateInrPaise * qty);
  if (chargeType === 'Discount') {
    newAmountPaise = -Math.abs(newAmountPaise);
  }

  const now = new Date().toISOString();
  const rateInrRupees = paiseToRupees(rateInrPaise);
  const amountRupees = paiseToRupees(newAmountPaise);

  db.prepare(
    `UPDATE registration_charge SET charge_type = ?, rate_inr = ?, rate_inr_paise = ?, rate_usd_cents = ?, exchange_rate_used = ?, quantity = ?, amount = ?, amount_paise = ?, updated_at = ? WHERE charge_id = ?`
  ).run(chargeType, rateInrRupees, rateInrPaise, rateUsdCents || null, exRate, qty, amountRupees, newAmountPaise, now, chargeId);

  const charges = getRegistrationCharges(old.registration_id);
  const updated = charges.find((c) => c.charge_id === chargeId)!;

  recordAudit({
    entityType: 'RegistrationCharge',
    entityId: chargeId,
    action: 'Updated',
    oldValue: JSON.stringify(old),
    newValue: JSON.stringify(updated),
    notes: `Updated charge #${chargeId} amount to ₹${updated.amount}`,
  });

  syncRegistrationPaymentStatus(old.registration_id);

  return updated;
}

export function deleteRegistrationCharge(chargeId: number): void {
  const db = getRawDb();
  const old = db.prepare(`SELECT * FROM registration_charge WHERE charge_id = ?`).get(chargeId) as any;
  if (!old) return;

  db.prepare(`DELETE FROM registration_charge WHERE charge_id = ?`).run(chargeId);

  recordAudit({
    entityType: 'RegistrationCharge',
    entityId: chargeId,
    action: 'Deleted',
    oldValue: JSON.stringify(old),
    notes: `Deleted ${old.charge_type} charge line item from Registration #${old.registration_id}`,
  });

  syncRegistrationPaymentStatus(old.registration_id);
}

// ─── Taxes ────────────────────────────────────────────────────────────────────

export function getRegistrationTaxes(registrationId: number): FormattedTax[] {
  const db = getRawDb();
  const rawList = db
    .prepare(`SELECT * FROM registration_tax WHERE registration_id = ? ORDER BY tax_id ASC`)
    .all(registrationId) as any[];

  return rawList.map((t) => {
    const amountPaise = t.amount_paise !== undefined && t.amount_paise !== 0 ? t.amount_paise : Math.round((t.amount || 0) * 100);
    return {
      ...t,
      amount_paise: amountPaise,
      amount: paiseToRupees(amountPaise),
    };
  });
}

export function createRegistrationTax(data: {
  registration_id: number;
  tax_type: TaxType;
  rate_percent: number;
  custom_base_subtotal_paise?: number;
}): FormattedTax {
  const db = getRawDb();

  let basePaise = data.custom_base_subtotal_paise;
  if (basePaise === undefined) {
    const charges = getRegistrationCharges(data.registration_id);
    basePaise = charges.reduce((acc, c) => acc + c.amount_paise, 0);
  }

  const taxAmountPaise = Math.round(Math.max(0, basePaise) * (data.rate_percent / 100));
  const taxAmountRupees = paiseToRupees(taxAmountPaise);
  const now = new Date().toISOString();

  const res = db
    .prepare(
      `INSERT INTO registration_tax (registration_id, tax_type, rate_percent, amount, amount_paise, created_at) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(data.registration_id, data.tax_type, data.rate_percent, taxAmountRupees, taxAmountPaise, now);

  const taxId = Number(res.lastInsertRowid);
  const taxes = getRegistrationTaxes(data.registration_id);
  const created = taxes.find((t) => t.tax_id === taxId)!;

  recordAudit({
    entityType: 'RegistrationTax',
    entityId: taxId,
    action: 'Created',
    newValue: JSON.stringify(created),
    notes: `Added ${data.tax_type} (${data.rate_percent}%, ₹${created.amount}) to Registration #${data.registration_id}`,
  });

  syncRegistrationPaymentStatus(data.registration_id);

  return created;
}

export function deleteRegistrationTax(taxId: number): void {
  const db = getRawDb();
  const old = db.prepare(`SELECT * FROM registration_tax WHERE tax_id = ?`).get(taxId) as any;
  if (!old) return;

  db.prepare(`DELETE FROM registration_tax WHERE tax_id = ?`).run(taxId);

  recordAudit({
    entityType: 'RegistrationTax',
    entityId: taxId,
    action: 'Deleted',
    oldValue: JSON.stringify(old),
    notes: `Deleted ${old.tax_type} tax line item from Registration #${old.registration_id}`,
  });

  syncRegistrationPaymentStatus(old.registration_id);
}

// ─── Tax Suggestion Engine ────────────────────────────────────────────────────

export function getSuggestedTaxes(customerState: string, chargeSubtotalPaise: number): SuggestedTaxItem[] {
  const agencyState = getAgencyRegisteredState();
  const normCustomer = (customerState || '').trim().toLowerCase();
  const normAgency = (agencyState || '').trim().toLowerCase();

  const isSameState = normCustomer && normAgency && normCustomer === normAgency;
  const safeSubtotal = Math.max(0, chargeSubtotalPaise);

  if (isSameState) {
    const halfAmountPaise = Math.round(safeSubtotal * 0.025);
    return [
      {
        tax_type: 'CGST',
        rate_percent: 2.5,
        suggested_amount_paise: halfAmountPaise,
        suggested_amount: paiseToRupees(halfAmountPaise),
        reason: `Same-state customer (${customerState || 'Maharashtra'}) matches agency location (${agencyState}). Suggested CGST 2.5%.`,
      },
      {
        tax_type: 'SGST',
        rate_percent: 2.5,
        suggested_amount_paise: halfAmountPaise,
        suggested_amount: paiseToRupees(halfAmountPaise),
        reason: `Same-state customer (${customerState || 'Maharashtra'}) matches agency location (${agencyState}). Suggested SGST 2.5%.`,
      },
    ];
  } else {
    const igstAmountPaise = Math.round(safeSubtotal * 0.05);
    return [
      {
        tax_type: 'IGST',
        rate_percent: 5.0,
        suggested_amount_paise: igstAmountPaise,
        suggested_amount: paiseToRupees(igstAmountPaise),
        reason: `Inter-state customer (${customerState || 'Out of State'}) differs from agency location (${agencyState}). Suggested IGST 5.0%.`,
      },
    ];
  }
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export function getRegistrationPayments(registrationId: number): FormattedPayment[] {
  const db = getRawDb();
  const rawList = db
    .prepare(`SELECT * FROM payment WHERE registration_id = ? ORDER BY payment_id ASC`)
    .all(registrationId) as any[];

  return rawList.map((p) => {
    const amountPaise = p.amount_paise !== undefined && p.amount_paise !== 0 ? p.amount_paise : Math.round((p.amount || 0) * 100);
    return {
      ...p,
      amount_paise: amountPaise,
      amount: paiseToRupees(amountPaise),
    };
  });
}

export function createPayment(data: {
  registration_id: number;
  amount?: number; // UI Rupees
  amount_paise?: number; // Integer Paise
  payment_type?: PaymentType;
  payment_mode?: string;
  cheque_number?: string;
  bank_name?: string;
  reference_number?: string;
  payment_date?: string;
  preferred_status?: 'Advance Received' | 'Partially Paid';
}): FormattedPayment {
  const db = getRawDb();
  const amtPaise = data.amount_paise !== undefined ? data.amount_paise : rupeesToPaise(data.amount || 0);
  if (amtPaise <= 0) throw new Error('Payment amount must be greater than 0');

  const now = new Date().toISOString();
  const amtRupees = paiseToRupees(amtPaise);
  const pType = data.payment_type || (data.payment_mode as PaymentType) || 'Bank Transfer';
  const pDate = data.payment_date || now.split('T')[0];

  const res = db
    .prepare(
      `INSERT INTO payment (registration_id, amount, amount_paise, payment_type, cheque_number, bank_name, reference_number, payment_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.registration_id,
      amtRupees,
      amtPaise,
      pType,
      data.cheque_number || null,
      data.bank_name || null,
      data.reference_number || null,
      pDate,
      now
    );

  const paymentId = Number(res.lastInsertRowid);
  const payments = getRegistrationPayments(data.registration_id);
  const created = payments.find((p) => p.payment_id === paymentId)!;

  recordAudit({
    entityType: 'Payment',
    entityId: paymentId,
    action: 'Created',
    newValue: JSON.stringify(created),
    notes: `Recorded ${data.payment_type} payment of ₹${created.amount} for Registration #${data.registration_id}`,
  });

  syncRegistrationPaymentStatus(data.registration_id, data.preferred_status);

  return created;
}

export function deletePayment(paymentId: number): void {
  const db = getRawDb();
  const old = db.prepare(`SELECT * FROM payment WHERE payment_id = ?`).get(paymentId) as any;
  if (!old) return;

  db.prepare(`DELETE FROM payment WHERE payment_id = ?`).run(paymentId);

  recordAudit({
    entityType: 'Payment',
    entityId: paymentId,
    action: 'Deleted',
    oldValue: JSON.stringify(old),
    notes: `Deleted payment #${paymentId} from Registration #${old.registration_id}`,
  });

  syncRegistrationPaymentStatus(old.registration_id);
}

// ─── Financial Summary Computation ───────────────────────────────────────────

export function getRegistrationFinancialSummary(registrationId: number): RegistrationFinancialSummary {
  const charges = getRegistrationCharges(registrationId);
  const taxes = getRegistrationTaxes(registrationId);
  const payments = getRegistrationPayments(registrationId);

  const chargeSubtotalPaise = charges.reduce((acc, c) => acc + c.amount_paise, 0);
  const taxSubtotalPaise = taxes.reduce((acc, t) => acc + t.amount_paise, 0);
  const netTotalPaise = chargeSubtotalPaise + taxSubtotalPaise;
  const totalPaidPaise = payments.reduce((acc, p) => acc + p.amount_paise, 0);
  const balanceAmountPaise = netTotalPaise - totalPaidPaise;
  const isOverpaid = balanceAmountPaise < 0;
  const creditAmountPaise = isOverpaid ? Math.abs(balanceAmountPaise) : 0;
  const netBalanceDuePaise = Math.max(0, balanceAmountPaise);

  const db = getRawDb();
  const reg = db.prepare(`SELECT * FROM registration WHERE registration_id = ?`).get(registrationId) as any;
  const currentPayStatus = reg?.payment_status || 'Pending';
  const paymentStatus = computePaymentStatus(reg?.status || 'Draft', netTotalPaise, totalPaidPaise, currentPayStatus);

  return {
    registrationId,
    charges,
    taxes,
    payments,
    chargeSubtotalPaise,
    taxSubtotalPaise,
    netTotalPaise,
    totalPaidPaise,
    balanceAmountPaise,
    // UI Boundary Display Values (Rupees)
    chargeSubtotal: paiseToRupees(chargeSubtotalPaise),
    taxSubtotal: paiseToRupees(taxSubtotalPaise),
    netTotal: paiseToRupees(netTotalPaise),
    totalPaid: paiseToRupees(totalPaidPaise),
    balanceAmount: paiseToRupees(balanceAmountPaise),
    isOverpaid,
    creditAmount: paiseToRupees(creditAmountPaise),
    netBalanceDue: paiseToRupees(netBalanceDuePaise),
    paymentStatus,
  };
}

// ─── Payment Status State Machine ─────────────────────────────────────────────
// OBJECTIVE AUTOMATIC TRANSITIONS ONLY (No invented percentage thresholds):
// 1. Cancelled & totalPaid > 0 -> Refund Pending (or Refunded)
// 2. totalPaid == 0 -> Pending
// 3. totalPaid == Net Total (and > 0) -> Fully Paid
// 4. totalPaid > Net Total -> Overpaid
// 5. 0 < totalPaid < Net Total -> Operator selected 'Advance Received' or 'Partially Paid' (default)

export function computePaymentStatus(
  bookingStatus: string,
  netTotalPaise: number,
  totalPaidPaise: number,
  existingPaymentStatus: PaymentStatus = 'Pending'
): PaymentStatus {
  if (bookingStatus === 'Cancelled') {
    return totalPaidPaise > 0 ? (existingPaymentStatus === 'Refunded' ? 'Refunded' : 'Refund Pending') : 'Pending';
  }

  if (totalPaidPaise === 0) {
    return 'Pending';
  }

  if (totalPaidPaise === netTotalPaise && netTotalPaise > 0) {
    return 'Fully Paid';
  }

  if (totalPaidPaise > netTotalPaise) {
    return 'Overpaid';
  }

  if (totalPaidPaise > 0 && totalPaidPaise < netTotalPaise) {
    // Preserve operator's manual selection if already set to Advance Received or Refund Pending/Refunded
    if (existingPaymentStatus === 'Advance Received') {
      return 'Advance Received';
    }
    return 'Partially Paid';
  }

  return 'Pending';
}

export function updateRegistrationPaymentStatus(registrationId: number, newStatus: PaymentStatus): void {
  const db = getRawDb();
  const reg = db.prepare(`SELECT * FROM registration WHERE registration_id = ?`).get(registrationId) as any;
  if (!reg) return;

  const now = new Date().toISOString();
  db.prepare(`UPDATE registration SET payment_status = ?, updated_at = ? WHERE registration_id = ?`).run(
    newStatus,
    now,
    registrationId
  );

  recordAudit({
    entityType: 'Registration',
    entityId: String(registrationId),
    action: 'StatusChanged',
    oldValue: reg.payment_status || 'Pending',
    newValue: newStatus,
    notes: `Operator manually set payment_status to "${newStatus}"`,
  });
}

function syncRegistrationPaymentStatus(registrationId: number, preferredStatus?: PaymentStatus): void {
  const db = getRawDb();
  const reg = db.prepare(`SELECT * FROM registration WHERE registration_id = ?`).get(registrationId) as any;
  if (!reg) return;

  const currentStatus = preferredStatus || reg.payment_status || 'Pending';
  const summary = getRegistrationFinancialSummary(registrationId);
  const newPaymentStatus = computePaymentStatus(reg.status || 'Draft', summary.netTotalPaise, summary.totalPaidPaise, currentStatus);

  if (newPaymentStatus !== reg.payment_status) {
    const now = new Date().toISOString();
    db.prepare(`UPDATE registration SET payment_status = ?, updated_at = ? WHERE registration_id = ?`).run(
      newPaymentStatus,
      now,
      registrationId
    );

    recordAudit({
      entityType: 'Registration',
      entityId: String(registrationId),
      action: 'StatusChanged',
      oldValue: reg.payment_status || 'Pending',
      newValue: newPaymentStatus,
      notes: `Registration payment_status updated to "${newPaymentStatus}" (Net Total: ₹${summary.netTotal}, Total Paid: ₹${summary.totalPaid})`,
    });
  }
}
