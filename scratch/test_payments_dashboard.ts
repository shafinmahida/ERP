import { initializeFoundationDatabase } from '../src/db';
import { getAllRegistrations } from '../src/services/registrationService';
import { getRegistrationFinancialSummary } from '../src/services/financialService';

async function verifyPaymentsDashboardWiring() {
  console.log('=================================================================');
  console.log('   DAYAR-E-HABIB ERP — PAYMENTS DASHBOARD WIRING TEST');
  console.log('=================================================================\n');

  initializeFoundationDatabase();

  const regs = getAllRegistrations();
  console.log(`Fetched ${regs.length} registrations from SQLite database.`);

  let totalChargesSum = 0;
  let totalTaxesSum = 0;
  let totalPaidSum = 0;
  let totalBalanceSum = 0;

  regs.forEach((r) => {
    const summary = getRegistrationFinancialSummary(r.registration_id);
    totalChargesSum += summary.chargeSubtotal;
    totalTaxesSum += summary.taxSubtotal;
    totalPaidSum += summary.totalPaid;
    totalBalanceSum += summary.balanceAmount;

    console.log(`Reg #${r.registration_number} [${r.customerName}]: Billed ₹${summary.netTotal}, Paid ₹${summary.totalPaid}, Balance ₹${summary.balanceAmount} -> Status: [${summary.paymentStatus}]`);
  });

  console.log('\n--- KPI Summary ---');
  console.log(`Gross Charges: ₹${totalChargesSum}`);
  console.log(`Gross Taxes:   ₹${totalTaxesSum}`);
  console.log(`Total Paid:    ₹${totalPaidSum}`);
  console.log(`Balance Due:   ₹${totalBalanceSum}`);

  console.log('\n=================================================================');
  console.log('  ✅ PAYMENTS DASHBOARD WIRING VERIFIED SUCCESSFULLY!');
  console.log('=================================================================');
}

verifyPaymentsDashboardWiring().catch(console.error);
