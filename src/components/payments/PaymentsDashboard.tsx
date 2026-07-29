import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  Receipt,
  Clock,
  Sparkles,
  Wallet,
  CheckCircle2,
} from 'lucide-react';
import { RegistrationWithDetails } from '../../services/registrationService';
import { SeasonWithDetails } from '../../services/seasonPackageService';
import {
  getRegistrationFinancialSummary,
  PAYMENT_STATUSES,
  PaymentStatus,
} from '../../services/financialService';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/card';
import { RegistrationFinancialsModal } from '../registrations/RegistrationFinancialsModal';
import { HelpTooltip } from '../common/HelpTooltip';

interface PaymentsDashboardProps {
  registrations: RegistrationWithDetails[];
  seasons: SeasonWithDetails[];
  onRefreshRegistrations: () => void;
}

export function PaymentsDashboard({
  registrations,
  seasons,
  onRefreshRegistrations,
}: PaymentsDashboardProps) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [selectedFinancialReg, setSelectedFinancialReg] = useState<RegistrationWithDetails | null>(null);

  const regFinancialsList = useMemo(() => {
    return registrations.map((reg) => {
      const summary = getRegistrationFinancialSummary(reg.registration_id);
      return {
        registration: reg,
        summary,
      };
    });
  }, [registrations]);

  const kpis = useMemo(() => {
    let grossCharges = 0;
    let totalTaxes = 0;
    let netTotal = 0;
    let totalPaid = 0;
    let balanceDue = 0;

    regFinancialsList.forEach(({ summary }) => {
      grossCharges += summary.chargeSubtotal;
      totalTaxes += summary.taxSubtotal;
      netTotal += summary.netTotal;
      totalPaid += summary.totalPaid;
      balanceDue += summary.balanceAmount;
    });

    return {
      grossCharges,
      totalTaxes,
      netTotal,
      totalPaid,
      balanceDue,
      totalCount: registrations.length,
    };
  }, [regFinancialsList, registrations]);

  const filteredRegs = useMemo(() => {
    return regFinancialsList.filter(({ registration, summary }) => {
      if (paymentStatusFilter !== 'all' && summary.paymentStatus !== paymentStatusFilter) {
        return false;
      }
      if (!globalFilter.trim()) return true;

      const q = globalFilter.toLowerCase().trim();
      return (
        registration.registration_number.toLowerCase().includes(q) ||
        registration.customerName.toLowerCase().includes(q) ||
        registration.passportNumber.toLowerCase().includes(q) ||
        registration.packageName.toLowerCase().includes(q)
      );
    });
  }, [regFinancialsList, globalFilter, paymentStatusFilter]);

  const getPaymentStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'Fully Paid':
        return <Badge variant="emerald">Fully Paid ✓</Badge>;
      case 'Partially Paid':
        return <Badge variant="gold">Partially Paid</Badge>;
      case 'Advance Received':
        return <Badge variant="gold">Advance Received</Badge>;
      case 'Overpaid':
        return <Badge variant="info">Overpaid</Badge>;
      case 'Refund Pending':
        return <Badge variant="destructive">Refund Pending</Badge>;
      case 'Refunded':
        return <Badge variant="destructive">Refunded</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-5">
      {/* Title Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-emerald-800" />
            Payments & Financial Master Ledger
            <HelpTooltip text="View total charges, GST taxes billed, payments collected, and real-time pilgrim balances." />
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Track pilgrim financial ledgers, record cash/bank receipts, and issue GST tax invoices
          </p>
        </div>
      </div>

      {/* Soft KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-stone-200/80 bg-white p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span className="font-bold uppercase tracking-wider text-[10px]">Gross Charges Billed</span>
            <Receipt className="h-4 w-4 text-emerald-800" />
          </div>
          <p className="text-2xl font-bold text-stone-900 font-mono">
            ₹{kpis.grossCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-stone-500">Subtotal across package charges</p>
        </div>

        <div className="rounded-xl border border-stone-200/80 bg-white p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span className="font-bold uppercase tracking-wider text-[10px]">Taxes Billed (GST)</span>
            <Sparkles className="h-4 w-4 text-amber-700" />
          </div>
          <p className="text-2xl font-bold text-amber-900 font-mono">
            ₹{kpis.totalTaxes.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-stone-500">CGST, SGST & IGST breakdown</p>
        </div>

        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-emerald-800">
            <span className="font-bold uppercase tracking-wider text-[10px]">Total Payments Collected</span>
            <Wallet className="h-4 w-4 text-emerald-800" />
          </div>
          <p className="text-2xl font-bold text-emerald-900 font-mono">
            ₹{kpis.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-emerald-800/80 font-medium">Recorded receipts in bank/cash</p>
        </div>

        <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-amber-900">
            <span className="font-bold uppercase tracking-wider text-[10px]">Outstanding Balance Due</span>
            <Clock className="h-4 w-4 text-amber-800" />
          </div>
          <p className="text-2xl font-bold text-amber-900 font-mono">
            ₹{kpis.balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-amber-800/80 font-medium">Remaining to collect</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="rounded-xl border border-stone-200/80 bg-white p-4 flex items-center justify-between gap-3 flex-wrap shadow-2xs">
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
            <Input
              placeholder="Search Reg #, Pilgrim Name, Passport..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-stone-400" />
          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            className="h-10 rounded-lg border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/30 cursor-pointer"
          >
            <option value="all">All Payment Statuses</option>
            {PAYMENT_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Financial Master Ledger Table */}
      <div className="rounded-xl border border-stone-200/80 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/80 text-stone-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="p-3.5 pl-4">Reg No.</th>
                <th className="p-3.5">Main Pilgrim Details</th>
                <th className="p-3.5">Season & Package</th>
                <th className="p-3.5 text-right">Net Total (₹)</th>
                <th className="p-3.5 text-right">Total Paid (₹)</th>
                <th className="p-3.5 text-right">Balance Due (₹)</th>
                <th className="p-3.5 text-center">Payment Status</th>
                <th className="p-3.5 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredRegs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-stone-500 italic">
                    No financial records match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredRegs.map(({ registration: r, summary }) => (
                  <tr key={r.registration_id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="p-3.5 pl-4 font-mono font-bold text-amber-900">
                      {r.registration_number}
                    </td>
                    <td className="p-3.5">
                      <p className="font-bold text-stone-900">{r.customerName}</p>
                      <p className="text-[11px] text-stone-500 font-mono mt-0.5">
                        Passport: {r.passportNumber || 'N/A'}
                      </p>
                    </td>
                    <td className="p-3.5">
                      <p className="font-semibold text-stone-800">{r.packageName}</p>
                      <p className="text-[11px] text-stone-500 mt-0.5">{r.seasonLabel}</p>
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-stone-900">
                      ₹{summary.netTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-emerald-800">
                      ₹{summary.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-amber-900">
                      ₹{summary.balanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-center">{getPaymentStatusBadge(summary.paymentStatus)}</td>
                    <td className="p-3.5 text-right pr-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedFinancialReg(r)}
                        className="text-xs font-semibold border-amber-300 text-amber-900 hover:bg-amber-50"
                      >
                        <CreditCard className="h-3.5 w-3.5 mr-1 text-amber-700" />
                        Record Payment / Ledger
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financials & Payment Recording Modal */}
      {selectedFinancialReg && (
        <RegistrationFinancialsModal
          isOpen={!!selectedFinancialReg}
          onClose={() => setSelectedFinancialReg(null)}
          registration={selectedFinancialReg}
          onFinancialsUpdated={() => {
            onRefreshRegistrations();
          }}
        />
      )}
    </div>
  );
}
