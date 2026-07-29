import { initializeFoundationDatabase } from '../src/db';
import { createCustomer } from '../src/services/customerService';
import { createRegistration, updateRegistrationStatus, getAllRegistrations } from '../src/services/registrationService';
import {
  createRegistrationCharge,
  createRegistrationTax,
  createPayment,
  getRegistrationFinancialSummary,
  rupeesToPaise,
  paiseToRupees,
  updateRegistrationPaymentStatus,
} from '../src/services/financialService';

async function runTargetedFixesVerification() {
  console.log('=================================================================');
  console.log('   DAYAR-E-HABIB ERP — SPRINT 2 TARGETED FIXES VERIFICATION');
  console.log('=================================================================\n');

  initializeFoundationDatabase();

  // ── FIX 1: MONEY PRECISION (Integer Paise) ─────────────────────────────────
  console.log('--- FIX 1: Money Precision (Integer Paise Verification) ---');
  const testRupees = 1234.56;
  const testPaise = rupeesToPaise(testRupees);
  console.log(`Rupees ₹${testRupees} -> Stored Integer Paise: ${testPaise}`);
  if (testPaise !== 123456) throw new Error('Paise conversion failed!');
  console.log(`Integer Paise ${testPaise} -> UI Display Rupees: ₹${paiseToRupees(testPaise)}`);
  if (paiseToRupees(testPaise) !== 1234.56) throw new Error('Rupees conversion failed!');
  console.log('✅ Fix 1 Money Precision conversion verified.\n');

  // Create customer & registration
  const cust = createCustomer({
    full_name: 'Targeted Fixes Test Customer',
    father_name: 'Test Father',
    date_of_birth: '1990-01-01',
    gender: 'Male',
    nationality: 'Indian',
    mobile_number: '+919999988888',
    state: 'Maharashtra',
  });

  const reg = createRegistration({
    customer_id: cust.customer_id,
    season_id: 1,
    package_id: 1,
    status: 'Draft',
  });
  console.log(`Created Registration #${reg.registration_number} [ID ${reg.registration_id}]`);

  // ── FIX 2: EXCHANGE RATE HISTORY & INR-ONLY NULL RULE ────────────────────────
  console.log('\n--- FIX 2: Exchange Rate History Verification ---');
  // INR-Only Charge -> exchange_rate_used MUST be null!
  const chargeInrOnly = createRegistrationCharge({
    registration_id: reg.registration_id,
    charge_type: 'Visa',
    rate_inr: 25000,
    quantity: 1,
  });
  console.log(`INR-Only Charge: rate_usd is null -> exchange_rate_used in DB is: ${chargeInrOnly.exchange_rate_used}`);
  if (chargeInrOnly.exchange_rate_used !== null && chargeInrOnly.exchange_rate_used !== undefined) {
    throw new Error('INR-only charge exchange_rate_used should be null!');
  }

  // USD Charge -> exchange_rate_used captured
  const chargeUsd = createRegistrationCharge({
    registration_id: reg.registration_id,
    charge_type: 'Adult',
    rate_inr: 150000,
    rate_usd: 1800,
    exchange_rate_used: 83.33,
    quantity: 1,
  });
  console.log(`USD Charge: rate_usd=$1800 -> exchange_rate_used captured in DB: ${chargeUsd.exchange_rate_used}`);
  if (chargeUsd.exchange_rate_used !== 83.33) throw new Error('USD Exchange rate history not captured!');
  console.log('✅ Fix 2 Exchange Rate History & Null Rule verified.\n');

  // ── FIX 4: VERIFY SPLIT PAYMENTS ─────────────────────────────────────────────
  console.log('--- FIX 4: Verify Split Payments (Multiple Payment Types) ---');
  // Record Payment 1: Cash ₹50,000
  const p1 = createPayment({
    registration_id: reg.registration_id,
    amount: 50000,
    payment_type: 'Cash',
    payment_date: '2026-07-28',
    preferred_status: 'Advance Received',
  });
  console.log(`Recorded Payment 1 (Cash): ₹${p1.amount} [Classification: Advance Received]`);

  // Record Payment 2: Cheque ₹50,000
  const p2 = createPayment({
    registration_id: reg.registration_id,
    amount: 50000,
    payment_type: 'Cheque',
    cheque_number: '881023',
    bank_name: 'State Bank of India',
    payment_date: '2026-07-28',
    preferred_status: 'Partially Paid',
  });
  console.log(`Recorded Payment 2 (Cheque #${p2.cheque_number}): ₹${p2.amount} [Classification: Partially Paid]`);

  // Record Payment 3: Bank Transfer ₹75,000 (Full Settlement)
  const p3 = createPayment({
    registration_id: reg.registration_id,
    amount: 75000,
    payment_type: 'Bank Transfer',
    reference_number: 'UPI/9981203810',
    bank_name: 'ICICI Bank',
    payment_date: '2026-07-28',
  });
  console.log(`Recorded Payment 3 (Bank Transfer ${p3.reference_number}): ₹${p3.amount}`);

  let summary = getRegistrationFinancialSummary(reg.registration_id);
  console.log(`Total Payments Recorded against Reg #${reg.registration_id}: ${summary.payments.length}`);
  console.log(`Total Paid: ₹${summary.totalPaid} (Paise: ${summary.totalPaidPaise})`);
  console.log(`Net Total:  ₹${summary.netTotal} (Paise: ${summary.netTotalPaise})`);
  console.log(`Balance:    ₹${summary.balanceAmount} (Paise: ${summary.balanceAmountPaise})`);
  if (summary.payments.length !== 3) throw new Error('Split payments count mismatch!');
  if (summary.totalPaid !== 175000) throw new Error('Split payments sum mismatch!');
  console.log('✅ Fix 4 Split Payments verified.\n');

  // ── FIX 3: PAYMENT STATUS STATE MACHINE (NO INVENTED THRESHOLDS) ─────────────
  console.log('--- FIX 3: Objective Payment Status State Machine ---');
  console.log(`Booking Stage Status: "${reg.status}"`);
  console.log(`Payment Stage Status: "${summary.paymentStatus}" (Objective Auto-matched: Fully Paid)`);
  if (summary.paymentStatus !== 'Fully Paid') throw new Error('Payment status state machine failed!');

  // Test Booking status change to Visa Processing
  updateRegistrationStatus(reg.registration_id, 'Visa Processing');
  const updatedReg = getAllRegistrations().find(r => r.registration_id === reg.registration_id)!;
  console.log(`Updated Booking Stage Status: "${updatedReg.status}"`);
  console.log(`Payment Stage Status remains: "${updatedReg.payment_status}"`);
  if (updatedReg.status !== 'Visa Processing' || updatedReg.payment_status !== 'Fully Paid') {
    throw new Error('Booking status and Payment status interfered with each other!');
  }

  // Test Cancellation -> Refund Pending state machine
  updateRegistrationStatus(reg.registration_id, 'Cancelled');
  summary = getRegistrationFinancialSummary(reg.registration_id);
  console.log(`After Booking Cancellation -> Booking Status: "Cancelled", Payment Status: "${summary.paymentStatus}"`);
  if (summary.paymentStatus !== 'Refund Pending') throw new Error('Cancellation refund state machine failed!');

  console.log('✅ Fix 3 Objective Payment Status State Machine verified.\n');

  console.log('=================================================================');
  console.log('  ✅ ALL TARGETED FIXES REVISED & VERIFIED WITH 100% ACCURACY!');
  console.log('=================================================================');
}

runTargetedFixesVerification().catch(console.error);
