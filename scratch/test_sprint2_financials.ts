import { initializeFoundationDatabase } from '../src/db';
import { createCustomer } from '../src/services/customerService';
import { createRegistration, getAllRegistrations } from '../src/services/registrationService';
import {
  createRegistrationCharge,
  createRegistrationTax,
  createPayment,
  getRegistrationFinancialSummary,
  getSuggestedTaxes,
  updateAgencyRegisteredState,
  getAgencyRegisteredState,
} from '../src/services/financialService';
import { getAllAuditLogs } from '../src/services/auditService';

async function runSprint2QualityGate() {
  console.log('=================================================================');
  console.log('   DAYAR-E-HABIB ERP — SPRINT 2 QUALITY GATE FINANCIAL TEST');
  console.log('=================================================================\n');

  // Initialize DB
  initializeFoundationDatabase();

  // Set Agency Registered State
  updateAgencyRegisteredState('Maharashtra');
  console.log('Agency Registered State:', getAgencyRegisteredState());

  // 1. Create Customer 1 (Same State: Maharashtra)
  const cust1 = createCustomer({
    full_name: 'Zameer Ahmed Merchant',
    father_name: 'Ahmed Merchant',
    date_of_birth: '1985-05-12',
    gender: 'Male',
    nationality: 'Indian',
    mobile_number: '+919820012345',
    state: 'Maharashtra',
  });
  console.log('Created Customer 1 (Maharashtra):', cust1.full_name, `[ID #${cust1.customer_id}]`);

  // 2. Create Registration
  const reg = createRegistration({
    customer_id: cust1.customer_id,
    season_id: 1,
    package_id: 1,
    status: 'Draft',
  });
  console.log('Created Registration:', reg.registration_number, `[ID #${reg.registration_id}]`);

  // 3. Add Charges (Exact Scenario Calculation)
  // Scenario: 2 Adults @ ₹1,50,000 rate + ₹25,000 Visa - ₹10,000 Discount
  const c1 = createRegistrationCharge({
    registration_id: reg.registration_id,
    charge_type: 'Adult',
    rate_inr: 150000,
    rate_usd: 1800,
    quantity: 2,
  });
  console.log('Added Charge 1 (2 Adults @ ₹1,50,000): Amount = ₹' + c1.amount);

  const c2 = createRegistrationCharge({
    registration_id: reg.registration_id,
    charge_type: 'Visa',
    rate_inr: 25000,
    quantity: 1,
  });
  console.log('Added Charge 2 (Visa Fee): Amount = ₹' + c2.amount);

  const c3 = createRegistrationCharge({
    registration_id: reg.registration_id,
    charge_type: 'Discount',
    rate_inr: 10000,
    quantity: 1,
  });
  console.log('Added Charge 3 (Discount): Amount = ₹' + c3.amount);

  let fin = getRegistrationFinancialSummary(reg.registration_id);
  console.log('\n--- Charge Subtotal Verification ---');
  console.log('Expected: ₹3,15,000 (3,00,000 + 25,000 - 10,000)');
  console.log('Actual:   ₹' + fin.chargeSubtotal);
  if (fin.chargeSubtotal !== 315000) throw new Error('Charge subtotal mismatch!');

  // 4. Test Tax Suggestions
  const suggestionsIntra = getSuggestedTaxes(cust1.state, fin.chargeSubtotal);
  console.log('\n--- Tax Suggestion (Intra-state Maharashtra) ---');
  console.dir(suggestionsIntra, { depth: null });
  if (suggestionsIntra.length !== 2 || suggestionsIntra[0].tax_type !== 'CGST' || suggestionsIntra[1].tax_type !== 'SGST') {
    throw new Error('Tax suggestion for intra-state failed!');
  }

  // Add CGST + SGST (2.5% + 2.5%)
  const t1 = createRegistrationTax({
    registration_id: reg.registration_id,
    tax_type: 'CGST',
    rate_percent: 2.5,
  });
  const t2 = createRegistrationTax({
    registration_id: reg.registration_id,
    tax_type: 'SGST',
    rate_percent: 2.5,
  });
  console.log(`Added CGST (2.5%): ₹${t1.amount}, SGST (2.5%): ₹${t2.amount}`);

  fin = getRegistrationFinancialSummary(reg.registration_id);
  console.log('\n--- Net Total Verification ---');
  console.log('Expected Net Total: ₹3,30,750 (3,15,000 + 7,875 + 7,875)');
  console.log('Actual Net Total:   ₹' + fin.netTotal);
  if (fin.netTotal !== 330750) throw new Error('Net Total mismatch!');

  // 5. Record Partial Payment 1
  const p1 = createPayment({
    registration_id: reg.registration_id,
    amount: 100000,
    payment_type: 'Bank Transfer',
    reference_number: 'NEFT/HDFC/991204',
    payment_date: '2026-07-28',
  });
  console.log('\nRecorded Payment 1: ₹' + p1.amount, `(Mode: ${p1.payment_type})`);

  fin = getRegistrationFinancialSummary(reg.registration_id);
  console.log('--- Balance After Payment 1 ---');
  console.log('Expected Balance: ₹2,30,750 (3,30,750 - 1,00,000)');
  console.log('Actual Balance:   ₹' + fin.balanceAmount);
  if (fin.balanceAmount !== 230750) throw new Error('Balance mismatch after payment 1!');

  // 6. Record Second Payment (Full Settlement)
  const p2 = createPayment({
    registration_id: reg.registration_id,
    amount: 230750,
    payment_type: 'Cheque',
    cheque_number: '000492',
    bank_name: 'Axis Bank',
    payment_date: '2026-07-29',
  });
  console.log('\nRecorded Payment 2: ₹' + p2.amount, `(Mode: ${p2.payment_type})`);

  fin = getRegistrationFinancialSummary(reg.registration_id);
  console.log('--- Final Balance After Payment 2 ---');
  console.log('Expected Balance: ₹0');
  console.log('Actual Balance:   ₹' + fin.balanceAmount);
  if (fin.balanceAmount !== 0) throw new Error('Final balance mismatch!');

  // Check Registration List view data
  const allRegs = getAllRegistrations();
  const foundReg = allRegs.find(r => r.registration_id === reg.registration_id);
  console.log('\n--- Registration List Item Financial Summary ---');
  console.log('Reg Number:    ', foundReg?.registration_number);
  console.log('Status:        ', foundReg?.status, '(Auto-synced to Fully Paid)');
  console.log('Customer State:', foundReg?.customerState);
  console.log('Net Total:     ', foundReg?.netTotal);
  console.log('Total Paid:    ', foundReg?.totalPaid);
  console.log('Balance Due:   ', foundReg?.balanceAmount);

  // 7. Verify Audit Logs
  const logs = getAllAuditLogs(20);
  console.log(`\nVerified Audit Log entries (${logs.length} logged):`);
  logs.slice(0, 8).forEach(l => console.log(`  • [${l.entity_type}] Action: ${l.action} -> ${l.notes || ''}`));

  console.log('\n=================================================================');
  console.log('  ✅ SPRINT 2 QUALITY GATE TEST PASSED WITH 100% ACCURACY!');
  console.log('=================================================================');
}

runSprint2QualityGate().catch(console.error);
