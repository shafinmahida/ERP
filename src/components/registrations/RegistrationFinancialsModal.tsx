import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  CheckCircle2,
  Receipt,
  CreditCard,
  Building2,
  FileText,
  AlertCircle,
  HelpCircle,
  Printer,
} from 'lucide-react';
import { generateReceiptForPayment, printDocumentHtml, saveReceiptToDisk } from '../../services/print/printEngine';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label, Badge } from '../ui/card';
import { RegistrationWithDetails } from '../../services/registrationService';
import {
  getRegistrationFinancialSummary,
  createRegistrationCharge,
  updateRegistrationCharge,
  deleteRegistrationCharge,
  createRegistrationTax,
  deleteRegistrationTax,
  createPayment,
  deletePayment,
  getSuggestedTaxes,
  getAgencyRegisteredState,
  CHARGE_TYPES,
  TAX_TYPES,
  PAYMENT_TYPES,
  ChargeType,
  TaxType,
  PaymentType,
  RegistrationFinancialSummary,
  SuggestedTaxItem,
} from '../../services/financialService';

interface RegistrationFinancialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  registration: RegistrationWithDetails | null;
  onFinancialsUpdated: () => void;
}

export function RegistrationFinancialsModal({
  isOpen,
  onClose,
  registration,
  onFinancialsUpdated,
}: RegistrationFinancialsModalProps) {
  if (!isOpen || !registration) return null;

  const [activeTab, setActiveTab] = useState<'charges' | 'payments'>('charges');
  const [finSummary, setFinSummary] = useState<RegistrationFinancialSummary | null>(null);
  const [agencyState, setAgencyState] = useState<string>('Maharashtra');

  // Form states for Add/Edit Charge
  const [showChargeForm, setShowChargeForm] = useState(false);
  const [editingChargeId, setEditingChargeId] = useState<number | null>(null);
  const [chargeType, setChargeType] = useState<ChargeType>('Adult');
  const [rateInr, setRateInr] = useState<string>('');
  const [rateUsd, setRateUsd] = useState<string>('');
  const [exchangeRate, setExchangeRate] = useState<string>('85.50');
  const [quantity, setQuantity] = useState<string>('1');

  // Form states for Add Tax
  const [showTaxForm, setShowTaxForm] = useState(false);
  const [taxType, setTaxType] = useState<TaxType>('CGST');
  const [taxRatePercent, setTaxRatePercent] = useState<string>('2.5');

  // Form states for Add Payment
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentType, setPaymentType] = useState<PaymentType>('Cash');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [preferredStatus, setPreferredStatus] = useState<'Partially Paid' | 'Advance Received'>('Partially Paid');
  const [chequeNumber, setChequeNumber] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [refNumber, setRefNumber] = useState<string>('');

  const loadData = () => {
    if (registration) {
      const summary = getRegistrationFinancialSummary(registration.registration_id);
      setFinSummary(summary);
      setAgencyState(getAgencyRegisteredState());
    }
  };

  useEffect(() => {
    loadData();
  }, [registration, isOpen]);

  if (!finSummary) return null;

  const calculatedChargeAmount = (() => {
    const r = parseFloat(rateInr) || 0;
    const q = parseFloat(quantity) || 1;
    let amt = r * q;
    if (chargeType === 'Discount') amt = -Math.abs(amt);
    return Math.round(amt * 100) / 100;
  })();

  const calculatedTaxAmount = (() => {
    const rate = parseFloat(taxRatePercent) || 0;
    const base = Math.max(0, finSummary.chargeSubtotal);
    return Math.round(base * (rate / 100) * 100) / 100;
  })();

  // ── Charge Actions ─────────────────────────────────────────────────────────

  const handleOpenNewCharge = () => {
    setEditingChargeId(null);
    setChargeType('Adult');
    setRateInr('');
    setRateUsd('');
    setQuantity('1');
    setShowChargeForm(true);
  };

  const handleOpenEditCharge = (c: any) => {
    setEditingChargeId(c.charge_id);
    setChargeType(c.charge_type);
    setRateInr(c.rate_inr ? String(c.rate_inr) : '');
    setRateUsd(c.rate_usd ? String(c.rate_usd) : '');
    setQuantity(String(c.quantity || 1));
    setShowChargeForm(true);
  };

  const handleSaveCharge = (e: React.FormEvent) => {
    e.preventDefault();
    const rInr = parseFloat(rateInr) || 0;
    const rUsd = rateUsd ? parseFloat(rateUsd) : undefined;
    const exRate = parseFloat(exchangeRate) || 85.5;
    const qty = parseFloat(quantity) || 1;

    if (editingChargeId) {
      updateRegistrationCharge(editingChargeId, {
        charge_type: chargeType,
        rate_inr: rInr,
        rate_usd: rUsd,
        exchange_rate_used: exRate,
        quantity: qty,
      });
    } else {
      createRegistrationCharge({
        registration_id: registration.registration_id,
        charge_type: chargeType,
        rate_inr: rInr,
        rate_usd: rUsd,
        exchange_rate_used: exRate,
        quantity: qty,
      });
    }

    setShowChargeForm(false);
    loadData();
    onFinancialsUpdated();
  };

  const handleDeleteCharge = (chargeId: number) => {
    if (confirm('Are you sure you want to delete this charge line item?')) {
      deleteRegistrationCharge(chargeId);
      loadData();
      onFinancialsUpdated();
    }
  };

  // ── Tax Actions ────────────────────────────────────────────────────────────

  const handleApplySuggestedTaxes = () => {
    const suggestions = getSuggestedTaxes(registration.customerState, finSummary.chargeSubtotal);
    for (const sug of suggestions) {
      createRegistrationTax({
        registration_id: registration.registration_id,
        tax_type: sug.tax_type,
        rate_percent: sug.rate_percent,
      });
    }
    loadData();
    onFinancialsUpdated();
  };

  const handleSaveTax = (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(taxRatePercent) || 0;
    if (rate <= 0) return alert('Tax percentage must be greater than 0');

    createRegistrationTax({
      registration_id: registration.registration_id,
      tax_type: taxType,
      rate_percent: rate,
    });

    setShowTaxForm(false);
    loadData();
    onFinancialsUpdated();
  };

  const handleDeleteTax = (taxId: number) => {
    if (confirm('Are you sure you want to remove this tax line item?')) {
      deleteRegistrationTax(taxId);
      loadData();
      onFinancialsUpdated();
    }
  };

  // ── Payment Actions ────────────────────────────────────────────────────────

  const handleOpenRecordPayment = () => {
    setPaymentAmount(finSummary.balanceAmount > 0 ? String(finSummary.balanceAmount) : '');
    setPaymentType('Cash');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setChequeNumber('');
    setBankName('');
    setRefNumber('');
    setShowPaymentForm(true);
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(paymentAmount) || 0;
    if (amt <= 0) return alert('Payment amount must be greater than 0');

    createPayment({
      registration_id: registration.registration_id,
      amount: amt,
      payment_type: paymentType,
      payment_date: paymentDate,
      cheque_number: chequeNumber || undefined,
      bank_name: bankName || undefined,
      reference_number: refNumber || undefined,
      preferred_status: preferredStatus,
    });

    setShowPaymentForm(false);
    loadData();
    onFinancialsUpdated();
  };

  const handleDeletePayment = (paymentId: number) => {
    if (confirm('Are you sure you want to delete this payment record? Balance will be recalculated.')) {
      deletePayment(paymentId);
      loadData();
      onFinancialsUpdated();
    }
  };

  const handlePrintReceipt = async (paymentId: number) => {
    try {
      const { html, receiptData, pdfDoc } = generateReceiptForPayment(paymentId);
      printDocumentHtml(html);
      await saveReceiptToDisk(registration.registration_number, receiptData.receiptNumber, html, pdfDoc);
    } catch (err: any) {
      alert('Failed to print receipt: ' + err.message);
    }
  };

  const suggestedGST = getSuggestedTaxes(registration.customerState, finSummary.chargeSubtotal);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-slate-900 border-slate-800 text-slate-100 p-6 rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Receipt className="h-5 w-5 text-emerald-400" />
                Financial Management — {registration.registration_number}
              </DialogTitle>
              <p className="text-xs text-slate-400 mt-1">
                Pilgrim: <span className="text-slate-200 font-semibold">{registration.customerName}</span> (State: {registration.customerState}) • Season: {registration.seasonLabel} ({registration.packageName})
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-slate-700 text-slate-300 text-xs">
                Agency Location: {agencyState}
              </Badge>
              <Badge variant={finSummary.paymentStatus === 'Fully Paid' ? 'default' : 'gold'}>
                Payment Status: {finSummary.paymentStatus}
              </Badge>
            </div>
          </div>

          {/* Live Financial Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Charges Subtotal</p>
              <p className="text-sm font-mono font-bold text-slate-100 mt-1">₹{finSummary.chargeSubtotal.toLocaleString('en-IN')}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Taxes Subtotal</p>
              <p className="text-sm font-mono font-bold text-slate-100 mt-1">₹{finSummary.taxSubtotal.toLocaleString('en-IN')}</p>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Net Total (Calculated)</p>
              <p className="text-base font-mono font-bold text-emerald-300 mt-0.5">₹{finSummary.netTotal.toLocaleString('en-IN')}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Payments</p>
              <p className="text-sm font-mono font-bold text-emerald-400 mt-1">₹{finSummary.totalPaid.toLocaleString('en-IN')}</p>
            </div>
            <div className={`rounded-xl border p-3 ${finSummary.balanceAmount > 0 ? 'border-amber-500/40 bg-amber-950/20' : finSummary.balanceAmount < 0 ? 'border-rose-500/40 bg-rose-950/20' : 'border-emerald-500/30 bg-slate-950'}`}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Balance Outstanding</p>
              <p className={`text-base font-mono font-bold mt-0.5 ${finSummary.balanceAmount > 0 ? 'text-amber-400' : finSummary.balanceAmount < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                ₹{finSummary.balanceAmount.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 mt-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('charges')}
            className={`pb-2.5 px-4 flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'charges' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Receipt className="h-4 w-4" />
            Charges & Taxes ({finSummary.charges.length + finSummary.taxes.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`pb-2.5 px-4 flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'payments' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Payments & Balance ({finSummary.payments.length})
          </button>
        </div>

        {/* TAB 1: CHARGES & TAXES */}
        {activeTab === 'charges' && (
          <div className="space-y-6 pt-4">
            {/* Section 1: Charges */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-400" /> Line Item Charges
                </h3>
                <Button size="sm" onClick={handleOpenNewCharge} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Charge Line Item
                </Button>
              </div>

              {/* Charge Form Modal/Dropdown */}
              {showChargeForm && (
                <form onSubmit={handleSaveCharge} className="rounded-xl border border-slate-700 bg-slate-950 p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-200 border-b border-slate-800 pb-2">
                    <span>{editingChargeId ? 'Edit Charge Line Item' : 'New Charge Line Item'}</span>
                    <button type="button" onClick={() => setShowChargeForm(false)} className="text-slate-400 hover:text-slate-200">✕</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-[11px]">Charge Type *</Label>
                      <select
                        value={chargeType}
                        onChange={(e) => setChargeType(e.target.value as ChargeType)}
                        className="h-8 w-full rounded border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100 mt-1 cursor-pointer"
                      >
                        {CHARGE_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-[11px]">Rate (INR ₹) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={rateInr}
                        onChange={(e) => setRateInr(e.target.value)}
                        className="h-8 bg-slate-900 border-slate-700 text-xs font-mono mt-1"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">Rate (USD $) (Optional)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={rateUsd}
                        onChange={(e) => setRateUsd(e.target.value)}
                        className="h-8 bg-slate-900 border-slate-700 text-xs font-mono mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">Quantity *</Label>
                      <Input
                        type="number"
                        step="1"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="h-8 bg-slate-900 border-slate-700 text-xs font-mono mt-1"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <span className="text-slate-400 text-xs">
                      Auto-Calculated Amount: <span className="font-mono font-bold text-emerald-400">₹{calculatedChargeAmount.toLocaleString('en-IN')}</span>
                    </span>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowChargeForm(false)} className="h-7 text-xs border-slate-700">Cancel</Button>
                      <Button type="submit" size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700">Save Charge</Button>
                    </div>
                  </div>
                </form>
              )}

              {/* Charges Table */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 font-semibold">
                    <tr>
                      <th className="px-3 py-2">Charge Type</th>
                      <th className="px-3 py-2">Rate (INR)</th>
                      <th className="px-3 py-2">Rate (USD)</th>
                      <th className="px-3 py-2">Qty</th>
                      <th className="px-3 py-2 text-right">Stored Amount (INR)</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {finSummary.charges.length > 0 ? (
                      finSummary.charges.map((c) => (
                        <tr key={c.charge_id} className="hover:bg-slate-900/50">
                          <td className="px-3 py-2 font-medium text-slate-200">
                            {c.charge_type}
                            {c.charge_type === 'Discount' && <Badge variant="destructive" className="ml-2 text-[9px] py-0">Discount</Badge>}
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-300">₹{c.rate_inr ? c.rate_inr.toLocaleString('en-IN') : '0'}</td>
                          <td className="px-3 py-2 font-mono text-slate-400">{c.rate_usd ? `$${c.rate_usd.toLocaleString()}` : '—'}</td>
                          <td className="px-3 py-2 font-mono text-slate-300">{c.quantity}</td>
                          <td className={`px-3 py-2 font-mono text-right font-bold ${c.amount < 0 ? 'text-rose-400' : 'text-slate-100'}`}>
                            ₹{c.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button size="sm" variant="ghost" onClick={() => handleOpenEditCharge(c)} className="h-6 w-6 p-0 text-slate-400 hover:text-slate-200">
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteCharge(c.charge_id)} className="h-6 w-6 p-0 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-slate-500 italic">No charges added yet. Click "+ Add Charge Line Item" to begin.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 2: Taxes */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-emerald-400" /> Taxes & GST Structure
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Calculated dynamically based on charge subtotal (₹{finSummary.chargeSubtotal.toLocaleString('en-IN')})</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={handleApplySuggestedTaxes} className="h-7 text-xs border-amber-500/40 text-amber-300 hover:bg-amber-950/40">
                    <Sparkles className="h-3.5 w-3.5 mr-1" /> Suggest GST Split
                  </Button>
                  <Button size="sm" onClick={() => setShowTaxForm(true)} className="h-7 text-xs bg-slate-800 hover:bg-slate-700">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Custom Tax
                  </Button>
                </div>
              </div>

              {/* GST Suggestion Banner */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-300 flex items-start gap-2.5">
                <Sparkles className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-200">System Suggestion Pattern ("System Suggests, Operator Decides"):</p>
                  {suggestedGST.map((sug, idx) => (
                    <p key={idx} className="text-[11px] text-amber-300/90 leading-relaxed">• {sug.reason}</p>
                  ))}
                  <p className="text-[10px] text-slate-400 italic">Note: Operator can override or add custom tax lines. System does not enforce hardcoded tax logic.</p>
                </div>
              </div>

              {/* Tax Form Modal */}
              {showTaxForm && (
                <form onSubmit={handleSaveTax} className="rounded-xl border border-slate-700 bg-slate-950 p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-200 border-b border-slate-800 pb-2">
                    <span>Add Tax Line Item</span>
                    <button type="button" onClick={() => setShowTaxForm(false)} className="text-slate-400 hover:text-slate-200">✕</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[11px]">Tax Type *</Label>
                      <select
                        value={taxType}
                        onChange={(e) => setTaxType(e.target.value as TaxType)}
                        className="h-8 w-full rounded border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100 mt-1 cursor-pointer"
                      >
                        {TAX_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-[11px]">Rate % *</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="2.5"
                        value={taxRatePercent}
                        onChange={(e) => setTaxRatePercent(e.target.value)}
                        className="h-8 bg-slate-900 border-slate-700 text-xs font-mono mt-1"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <span className="text-slate-400 text-xs">
                      Calculated Tax Amount: <span className="font-mono font-bold text-amber-400">₹{calculatedTaxAmount.toLocaleString('en-IN')}</span>
                    </span>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowTaxForm(false)} className="h-7 text-xs border-slate-700">Cancel</Button>
                      <Button type="submit" size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700">Add Tax</Button>
                    </div>
                  </div>
                </form>
              )}

              {/* Taxes Table */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 font-semibold">
                    <tr>
                      <th className="px-3 py-2">Tax Type</th>
                      <th className="px-3 py-2">Rate %</th>
                      <th className="px-3 py-2 text-right">Amount (INR)</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {finSummary.taxes.length > 0 ? (
                      finSummary.taxes.map((t) => (
                        <tr key={t.tax_id} className="hover:bg-slate-900/50">
                          <td className="px-3 py-2 font-medium text-slate-200">{t.tax_type}</td>
                          <td className="px-3 py-2 font-mono text-slate-300">{t.rate_percent}%</td>
                          <td className="px-3 py-2 font-mono text-right font-bold text-amber-300">₹{t.amount.toLocaleString('en-IN')}</td>
                          <td className="px-3 py-2 text-right">
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteTax(t.tax_id)} className="h-6 w-6 p-0 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-slate-500 italic">No tax line items added. Click "✨ Suggest GST Split" to auto-apply.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PAYMENTS & BALANCE TRACKING */}
        {activeTab === 'payments' && (
          <div className="space-y-5 pt-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-400" /> Recorded Payments & Receipts
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Net Total: <span className="font-mono text-emerald-400">₹{finSummary.netTotal.toLocaleString('en-IN')}</span> • Total Paid: <span className="font-mono text-emerald-400">₹{finSummary.totalPaid.toLocaleString('en-IN')}</span>
                </p>
              </div>
              <Button size="sm" onClick={handleOpenRecordPayment} className="h-8 bg-emerald-600 hover:bg-emerald-700 text-xs">
                <Plus className="h-4 w-4 mr-1.5" /> + Record Payment
              </Button>
            </div>

            {/* Record Payment Form Modal */}
            {showPaymentForm && (
              <form onSubmit={handleSavePayment} className="rounded-xl border border-slate-700 bg-slate-950 p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between font-bold text-slate-200 border-b border-slate-800 pb-2">
                  <span>Record Payment Entry</span>
                  <button type="button" onClick={() => setShowPaymentForm(false)} className="text-slate-400 hover:text-slate-200">✕</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-[11px]">Payment Amount (INR ₹) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="h-8 bg-slate-900 border-slate-700 text-xs font-mono mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Payment Mode *</Label>
                    <select
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                      className="h-8 w-full rounded border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100 mt-1 cursor-pointer"
                    >
                      {PAYMENT_TYPES.map((pt) => (
                        <option key={pt} value={pt}>{pt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-[11px]">Payment Date *</Label>
                    <Input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="h-8 bg-slate-900 border-slate-700 text-xs mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Payment Classification</Label>
                    <select
                      value={preferredStatus}
                      onChange={(e) => setPreferredStatus(e.target.value as any)}
                      className="h-8 w-full rounded border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100 mt-1 cursor-pointer"
                    >
                      <option value="Partially Paid">Partially Paid</option>
                      <option value="Advance Received">Advance Received</option>
                    </select>
                  </div>
                </div>

                {/* Conditional Payment Instrument Details */}
                {paymentType === 'Cheque' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <Label className="text-[11px]">Cheque Number</Label>
                      <Input
                        placeholder="e.g. 000124"
                        value={chequeNumber}
                        onChange={(e) => setChequeNumber(e.target.value)}
                        className="h-8 bg-slate-900 border-slate-700 text-xs font-mono mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">Bank Name</Label>
                      <Input
                        placeholder="e.g. HDFC Bank, Mumbai Branch"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="h-8 bg-slate-900 border-slate-700 text-xs mt-1"
                      />
                    </div>
                  </div>
                )}

                {paymentType === 'Bank Transfer' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <Label className="text-[11px]">Reference Number (UPI/NEFT/RTGS)</Label>
                      <Input
                        placeholder="e.g. UPI/3491823901/NEFT"
                        value={refNumber}
                        onChange={(e) => setRefNumber(e.target.value)}
                        className="h-8 bg-slate-900 border-slate-700 text-xs font-mono mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">Bank Name</Label>
                      <Input
                        placeholder="e.g. ICICI Bank"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="h-8 bg-slate-900 border-slate-700 text-xs mt-1"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowPaymentForm(false)} className="h-7 text-xs border-slate-700">Cancel</Button>
                  <Button type="submit" size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700">Record Payment</Button>
                </div>
              </form>
            )}

            {/* Payment History Table */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 font-semibold">
                  <tr>
                    <th className="px-3 py-2">Payment Date</th>
                    <th className="px-3 py-2">Mode</th>
                    <th className="px-3 py-2">Cheque / Bank / Ref No</th>
                    <th className="px-3 py-2 text-right">Amount Paid (INR)</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {finSummary.payments.length > 0 ? (
                    finSummary.payments.map((p) => (
                      <tr key={p.payment_id} className="hover:bg-slate-900/50">
                        <td className="px-3 py-2 font-mono text-slate-300">{p.payment_date}</td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className="border-emerald-500/30 text-emerald-300 text-[10px]">
                            {p.payment_type}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-400">
                          {p.cheque_number ? `Chq: #${p.cheque_number} (${p.bank_name || ''})` : p.reference_number ? `Ref: ${p.reference_number} (${p.bank_name || ''})` : 'Cash Receipt'}
                        </td>
                        <td className="px-3 py-2 font-mono text-right font-bold text-emerald-400">
                          ₹{p.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePrintReceipt(p.payment_id)}
                              className="h-6 border-emerald-600/50 hover:bg-emerald-600/20 text-emerald-300 text-[10px] px-2 gap-1"
                              title="Print & Save Official Receipt PDF/HTML"
                            >
                              <Printer className="h-3 w-3 text-emerald-400" />
                              Print Receipt
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeletePayment(p.payment_id)} className="h-6 w-6 p-0 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-slate-500 italic">No payments recorded yet. Click "+ Record Payment" to log a payment.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
